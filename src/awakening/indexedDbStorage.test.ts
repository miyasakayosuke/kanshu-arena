import { describe, expect, it, vi } from 'vitest';
import { IndexedDbTransactionalStorage } from './indexedDbStorage';
import { AwakeningStorage, type StorageRecord, type TransactionResult } from './storage';
import * as D from './domain';

// Deliberately scripted IDB events, NOT an IndexedDB emulator or browser proof.
// The test controls request success separately from transaction commit/abort.
function harness(seed?: unknown) {
  let durable = structuredClone(seed);
  const opens: ReturnType<typeof connection>[] = [];
  const factory = { open: vi.fn(() => {
    const c = connection(); opens.push(c); return c.open;
  }) } as unknown as IDBFactory;
  function connection() {
    let pending: unknown;
    let wrote = false;
    const names = { length: 1, contains: (name: string): boolean => name === 'awakening-record' };
    const read = { result: undefined as unknown, error: null as unknown, onsuccess: () => {}, onerror: () => {} };
    const write = { error: null as unknown, onsuccess: () => {}, onerror: () => {} };
    const store = {
      keyPath: null as string | null, autoIncrement: false, indexNames: { length: 0 },
      get: vi.fn(() => read), put: vi.fn((value: unknown) => { pending = structuredClone(value); wrote = true; return write; }),
    };
    const tx = {
      error: null as unknown, onabort: () => {}, oncomplete: () => {}, onerror: () => {},
      objectStore: vi.fn(() => store), abort: vi.fn(() => { queueMicrotask(() => tx.onabort()); }),
    };
    const db = {
      version: 1, objectStoreNames: names, close: vi.fn(), onversionchange: () => {}, onclose: () => {},
      createObjectStore: vi.fn(), transaction: vi.fn(() => tx),
    };
    const open = {
      result: db, transaction: tx, error: null as unknown,
      onerror: () => {}, onblocked: () => {}, onsuccess: () => {}, onupgradeneeded: (_event: { oldVersion: number }) => {},
    };
    return { open, db, tx, store, read, write,
      readNow() { read.result = structuredClone(durable); read.onsuccess(); },
      complete() { if (wrote) durable = structuredClone(pending); tx.oncomplete(); },
      abort(error = new Error('commit failure')) { tx.error = error; tx.onabort(); },
    };
  }
  const driver = (legacy: string | null = null) => new IndexedDbTransactionalStorage(factory, 'isolated-driver-fixture', legacy);
  return { factory, opens, driver, inspect: () => structuredClone(durable),
    async run<T>(job: () => Promise<T>): Promise<T> {
      const promise = job(); const c = opens.at(-1)!;
      c.open.onsuccess(); c.readNow(); c.complete(); return promise;
    },
  };
}
const empty = (): StorageRecord => ({ head: null, backup: null, legacyRaw: null });
const change = (current: StorageRecord) => ({ record: { ...current, head: 'new-head', backup: current.head }, result: { ok: true } });

describe('injected IndexedDB driver event contract (not browser conformance)', () => {
  it('uses one fixed record and readwrite scope, resolves only at completion', async () => {
    const h = harness(empty()); let resolved = false;
    const p = h.driver().transaction(change).then(value => { resolved = true; return value; });
    const c = h.opens[0]; c.open.onsuccess(); c.readNow(); c.write.onsuccess();
    await Promise.resolve(); expect(resolved).toBe(false); expect(h.inspect()).toEqual(empty());
    expect(h.factory.open).toHaveBeenCalledWith('isolated-driver-fixture', 1);
    expect(c.db.transaction).toHaveBeenCalledWith('awakening-record', 'readwrite');
    expect(c.tx.objectStore).toHaveBeenCalledWith('awakening-record');
    expect(c.store.get).toHaveBeenCalledWith('state');
    expect(c.store.put).toHaveBeenCalledWith({ ...empty(), head: 'new-head' }, 'state');
    c.complete(); expect(await p).toEqual({ ok: true }); expect(c.db.close).toHaveBeenCalledOnce();
  });
  it('does not put unchanged reads or create a missing record during a read', async () => {
    const h = harness(); await h.run(() => h.driver().transaction(record => ({ record, result: record })));
    expect(h.opens[0].store.put).not.toHaveBeenCalled(); expect(h.inspect()).toBeUndefined();
  });
  it('creates only the dedicated store on first upgrade', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    c.db.objectStoreNames.length = 0; c.open.onupgradeneeded({ oldVersion: 0 });
    expect(c.db.createObjectStore).toHaveBeenCalledWith('awakening-record');
    c.db.objectStoreNames.length = 1; c.open.onsuccess(); c.readNow(); c.complete(); await p;
  });
  it('captures exact legacy bytes on first changed write, ignoring later seed inputs', async () => {
    const h = harness(); const bytes = ' \n{"schemaVersion":1}\n';
    await h.run(() => h.driver(bytes).transaction(change));
    await h.run(() => h.driver('different').transaction(record => ({ record, result: null })));
    expect(h.inspect()).toEqual({ head: 'new-head', backup: null, legacyRaw: bytes });
  });
  it('rejects legacy mutation without changing durable data', async () => {
    const h = harness({ ...empty(), legacyRaw: 'original' });
    const p = h.driver().transaction(record => ({ record: { ...record, legacyRaw: 'changed' }, result: null }));
    const c = h.opens[0]; c.open.onsuccess(); c.readNow();
    await expect(p).rejects.toThrow('immutable'); expect(c.tx.abort).toHaveBeenCalledOnce();
    expect(h.inspect()).toEqual({ ...empty(), legacyRaw: 'original' });
  });
  it('aborts even after successful put when commit fails', async () => {
    const h = harness(empty()); const p = h.driver().transaction(change); const c = h.opens[0];
    c.open.onsuccess(); c.readNow(); c.write.onsuccess(); c.abort();
    await expect(p).rejects.toThrow('commit failure'); expect(h.inspect()).toEqual(empty());
  });
  it.each(['read', 'write'] as const)('preserves request %s failure and awaits abort', async stage => {
    const h = harness(empty()); let settled = false;
    const p = h.driver().transaction(change); void p.catch(() => { settled = true; });
    const c = h.opens[0]; c.open.onsuccess(); if (stage === 'write') c.readNow();
    const error = new Error(`${stage} failed`); c[stage].error = error; c[stage].onerror();
    await Promise.resolve(); expect(settled).toBe(false); c.abort();
    await expect(p).rejects.toBe(error); expect(h.inspect()).toEqual(empty());
  });
  it('preserves callback error identity and aborts', async () => {
    const h = harness(empty()); const error = new Error('domain failure');
    const p = h.driver().transaction(() => { throw error; }); const c = h.opens[0];
    c.open.onsuccess(); c.readNow(); await expect(p).rejects.toBe(error); expect(c.store.put).not.toHaveBeenCalled();
  });
  it('clones callback result before put; clone failure aborts', async () => {
    const h = harness(empty()); const p = h.driver().transaction(record => ({ record: { ...record, head: 'x' }, result: () => {} }));
    const c = h.opens[0]; c.open.onsuccess(); c.readNow(); await expect(p).rejects.toBeDefined();
    expect(c.store.put).not.toHaveBeenCalled(); expect(h.inspect()).toEqual(empty());
  });
  it('detaches result and record from retained callback references', async () => {
    const h = harness(empty()); const result = { values: [1] }; const next = { ...empty(), head: 'x' };
    const p = h.driver().transaction(() => ({ record: next, result })); const c = h.opens[0];
    c.open.onsuccess(); c.readNow(); next.head = 'mutated'; result.values.push(2); c.complete();
    expect(await p).toEqual({ values: [1] }); expect(h.inspect()).toEqual({ ...empty(), head: 'x' });
  });
  it('detects in-place callback mutations when deciding to put', async () => {
    const h = harness(empty()); await h.run(() => h.driver().transaction(record => { record.head = 'x'; return { record, result: null }; }));
    expect(h.inspect()).toEqual({ ...empty(), head: 'x' });
  });
  it.each([null, [], {}, { ...empty(), extra: 1 }, { ...empty(), head: 4 }])('fails closed on corrupt stored shape %j', async seed => {
    const h = harness(seed); const callback = vi.fn(change); const p = h.driver().transaction(callback);
    const c = h.opens[0]; c.open.onsuccess(); c.readNow(); await expect(p).rejects.toBeDefined();
    expect(callback).not.toHaveBeenCalled(); expect(h.inspect()).toEqual(seed);
  });
  it('rejects async callbacks without writing', async () => {
    const h = harness(empty());
    const callback = (async (record: StorageRecord) => ({ record, result: null })) as unknown as (record: StorageRecord) => TransactionResult<null>;
    const p = h.driver().transaction(callback); const c = h.opens[0]; c.open.onsuccess(); c.readNow();
    await expect(p).rejects.toThrow('Synchronous'); expect(c.store.put).not.toHaveBeenCalled();
  });
  it.each([null, {}, { record: null, result: 1 }, { record: { ...empty(), backup: 8 }, result: 1 },
    { record: empty(), result: 1, then() {} }])('rejects invalid callback return %j without writing', async returned => {
    const h = harness(empty());
    const p = h.driver().transaction(() => returned as unknown as TransactionResult<number>);
    const c = h.opens[0]; c.open.onsuccess(); c.readNow(); await expect(p).rejects.toBeDefined();
    expect(c.store.put).not.toHaveBeenCalled(); expect(h.inspect()).toEqual(empty());
  });
  it('closes late open success after blocked rejection without opening a transaction', async () => {
    const h = harness(); const callback = vi.fn(change); const p = h.driver().transaction(callback); const c = h.opens[0];
    c.open.onblocked(); await expect(p).rejects.toThrow('blocked'); c.open.onsuccess();
    expect(c.db.close).toHaveBeenCalledOnce(); expect(c.db.transaction).not.toHaveBeenCalled(); expect(callback).not.toHaveBeenCalled();
  });
  it('rejects missing object store and impossible completion without read success', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    c.db.objectStoreNames.contains = () => false; c.open.onsuccess(); await expect(p).rejects.toThrow('Unsupported');
    const p2 = h.driver().transaction(change); const c2 = h.opens[1]; c2.open.onsuccess(); c2.complete();
    await expect(p2).rejects.toThrow('without a result');
  });
  it.each(['keyPath', 'autoIncrement', 'indexes', 'store-count', 'version'] as const)('rejects incompatible %s schema', async variant => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    if (variant === 'keyPath') c.store.keyPath = 'id';
    if (variant === 'autoIncrement') c.store.autoIncrement = true;
    if (variant === 'indexes') c.store.indexNames.length = 1;
    if (variant === 'store-count') c.db.objectStoreNames.length = 2;
    if (variant === 'version') c.db.version = 2;
    c.open.onsuccess(); await expect(p).rejects.toThrow('Unsupported'); expect(c.store.get).not.toHaveBeenCalled();
  });
  it('rejects blocked opens, aborts late upgrade, closes late success, never calls transition', async () => {
    const h = harness(); const callback = vi.fn(change); const p = h.driver().transaction(callback); const c = h.opens[0];
    c.open.onblocked(); await expect(p).rejects.toThrow('blocked');
    c.open.onupgradeneeded({ oldVersion: 0 }); c.open.onsuccess();
    expect(c.tx.abort).toHaveBeenCalled(); expect(c.db.close).toHaveBeenCalled();
    expect(c.db.createObjectStore).not.toHaveBeenCalled(); expect(callback).not.toHaveBeenCalled();
  });
  it('rejects unexpected upgrade instead of migrating an unknown schema', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    c.open.onupgradeneeded({ oldVersion: 1 }); await expect(p).rejects.toThrow('Unsupported'); expect(c.tx.abort).toHaveBeenCalled();
  });
  it('closes obsolete connection on versionchange while pending transaction awaits terminal event', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    c.open.onsuccess(); c.db.onversionchange(); expect(c.db.close).toHaveBeenCalledOnce();
    c.readNow(); c.complete(); await p;
  });
  it('rejects abnormal connection close', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0]; c.open.onsuccess(); c.db.onclose();
    await expect(p).rejects.toThrow('closed unexpectedly');
  });
  it('propagates open failure and can retry with a fresh connection', async () => {
    const h = harness(); const p = h.driver().transaction(change); const c = h.opens[0];
    const error = new Error('security denied'); c.open.error = error; c.open.onerror(); await expect(p).rejects.toBe(error);
    await h.run(() => h.driver().transaction(change)); expect(h.opens).toHaveLength(2);
  });
  it('rejects synchronous open, transaction, get and put exceptions', async () => {
    for (const stage of ['open', 'transaction', 'get', 'put'] as const) {
      const h = harness(); const error = new Error(stage);
      if (stage === 'open') vi.mocked(h.factory.open).mockImplementationOnce(() => { throw error; });
      const p = h.driver().transaction(change);
      if (stage !== 'open') {
        const c = h.opens[0];
        (stage === 'transaction' ? c.db.transaction : c.store[stage]).mockImplementationOnce(() => { throw error; });
        c.open.onsuccess(); if (stage === 'put') c.readNow();
      }
      await expect(p).rejects.toBe(error); expect(h.inspect()).toBeUndefined();
    }
  });
  it('uses independent connections without an application-local serialization queue', async () => {
    const h = harness(empty()); const a = h.driver().transaction(change); const b = h.driver().transaction(change);
    expect(h.opens).toHaveLength(2); h.opens.forEach(c => c.open.onsuccess());
    // This explicit ordering models the browser guarantee; it does not prove it.
    h.opens[0].readNow(); h.opens[0].complete(); h.opens[1].readNow(); h.opens[1].complete();
    await Promise.all([a, b]); expect(h.inspect()).toEqual({ ...empty(), head: 'new-head', backup: 'new-head' });
  });
});

describe('adapter composition over scripted driver events', () => {
  const rules = (): D.EconomyRules => ({ version: 'driver-fixture-v1', stepCosts: Array(99).fill(7), completionCommon: 3, winBonusCommon: 6, selectionEveryWins: 2, essencePerSelection: 4 });
  it('imports legacy, preserves stages 0/4/99 and other stats, and remains idempotent', async () => {
    const progress = D.createProgress(['zero', 'four', 'max'], rules());
    progress.monsters.four.level = 4; progress.monsters.max.level = 99;
    const bytes = '\n' + JSON.stringify(progress, null, 2) + '\n'; const h = harness();
    const adapter = new AwakeningStorage(h.driver(bytes), ['zero', 'four', 'max'], rules());
    const initial = await h.run(() => adapter.initialize()); const durable = h.inspect();
    expect(await h.run(() => adapter.initialize())).toEqual(initial); expect(h.inspect()).toEqual(durable);
    expect((durable as StorageRecord).legacyRaw).toBe(bytes);
    const base = { hp: 950, atk: 190, mp: 77, def: 65, spd: 54 };
    expect(['zero', 'four', 'max'].map(id => D.deriveAwakeningMonster(base, initial.progress.monsters[id].level)))
      .toEqual([{ ...base, hp: 950, atk: 190 }, { ...base, hp: 980, atk: 196 }, { ...base, hp: 1000, atk: 200 }]);
  });
  it('maps late commit failure to unavailable and permits safe reload/retry', async () => {
    const h = harness(); const adapter = new AwakeningStorage(h.driver(), ['unit'], rules());
    const p = adapter.initialize(); const c = h.opens[0]; c.open.onsuccess(); c.readNow(); c.abort();
    await expect(p).rejects.toMatchObject({ code: 'unavailable' });
    expect(await h.run(() => adapter.load())).toEqual({ status: 'empty' });
    expect((await h.run(() => adapter.initialize())).revision).toBe(1);
  });
  it('retains stale-write protection across fresh driver instances', async () => {
    const h = harness(); const a = new AwakeningStorage(h.driver(), ['unit'], rules());
    const initial = await h.run(() => a.initialize());
    const b = new AwakeningStorage(h.driver(), ['unit'], rules());
    const context: D.BattleContext = { initialStateJson: '{}', mode: 'test', teamId: 'fixture', statRuleVersion: D.STAT_RULE_VERSION };
    await h.run(() => b.dispatch(initial.token, { kind: 'begin', context })); const before = h.inspect();
    const p = a.dispatch(initial.token, { kind: 'begin', context }); const c = h.opens.at(-1)!; c.open.onsuccess(); c.readNow();
    await expect(p).rejects.toMatchObject({ code: 'stale' }); expect(h.inspect()).toEqual(before);
  });
});
