import { test, expect } from './fixtures.mjs';

// Imports execute the exact candidate TypeScript via Vite in each independent page.
// Fixture economy is intentionally arbitrary and is not product policy.
async function connect(page, databaseName, { roster = ['0', '1'], legacyRaw = null } = {}) {
  return page.evaluate(async ({ databaseName, roster, legacyRaw }) => {
    const { IndexedDbTransactionalStorage } = await import('/kanshu-arena/src/awakening/indexedDbStorage.ts');
    const { AwakeningStorage } = await import('/kanshu-arena/src/awakening/storage.ts');
    const D = await import('/kanshu-arena/src/awakening/domain.ts');
    const rules = { version: 'browser-qa-v1', stepCosts: Array(99).fill(3), completionCommon: 2, winBonusCommon: 5, selectionEveryWins: 1, essencePerSelection: 2 };
    const backend = new IndexedDbTransactionalStorage(indexedDB, databaseName, legacyRaw);
    window.qa = { backend, adapter: new AwakeningStorage(backend, roster, rules), D, rules,
      context: { initialStateJson: '{"seed":42}', mode: 'test', teamId: 'team-1', statRuleVersion: D.STAT_RULE_VERSION } };
  }, { databaseName, roster, legacyRaw });
}
async function raw(page) {
  return page.evaluate(() => window.qa.backend.transaction(record => ({ record, result: record })));
}
async function begin(page, token, at = Date.now()) {
  return page.evaluate(async ({ token, at }) => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, at - Date.now())));
    try { return { ok: true, value: await window.qa.adapter.dispatch(token, { kind: 'begin', context: window.qa.context }) }; }
    catch (error) { return { ok: false, code: error.code, message: error.message }; }
  }, { token, at });
}
async function settle(page, token, at) {
  return page.evaluate(async ({ token, at }) => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, at - Date.now())));
    return window.qa.adapter.dispatch(token, { kind: 'settle', sequence: 1, completion: { kind: 'engine-terminal', engineState: { winner: 'win' } } });
  }, { token, at });
}

test('real same-origin pages serialize competing heads, stale writes and duplicate rewards', async ({ context, page }, info) => {
  test.skip(process.env.QA_CANDIDATE !== 'storage', 'Driver exists only on the storage candidate');
  const second = await context.newPage();
  await Promise.all([page.goto('./'), second.goto('./')]);
  expect(await page.evaluate(() => location.origin)).toBe(await second.evaluate(() => location.origin));
  const reports = [];
  // Repeat independent races; either page may win, exactly one may commit.
  for (let round = 0; round < 5; round++) {
    const db = `qa-race-${info.project.name}-${round}`;
    await Promise.all([connect(page, db), connect(second, db)]);
    const initialized = await Promise.all([page.evaluate(() => window.qa.adapter.initialize()), second.evaluate(() => window.qa.adapter.initialize())]);
    expect(initialized[0]).toEqual(initialized[1]);
    const token = initialized[0].token;
    const at = Date.now() + 200;
    const starts = await Promise.all([begin(page, token, at), begin(second, token, at)]);
    expect(starts.filter(result => result.ok)).toHaveLength(1);
    expect(starts.find(result => !result.ok).code).toBe('stale');
    const winner = starts.find(result => result.ok).value.snapshot;
    const recordAfterBegin = await raw(page);
    expect(recordAfterBegin.head).toBe(winner.token);
    expect(recordAfterBegin.backup).toBe(token);
    expect(await raw(second)).toEqual(recordAfterBegin);
    await second.reload(); await connect(second, db);
    expect(await second.evaluate(() => window.qa.adapter.load())).toEqual({ status: 'ready', snapshot: winner });
    expect(winner.progress.common).toBe(0); // Reload does not reward an interrupted battle.
    const settled = await Promise.all([settle(page, winner.token, Date.now() + 200), settle(second, winner.token, Date.now() + 200)]);
    expect(settled.map(item => item.duplicate).sort()).toEqual([false, true]);
    expect(settled[0].snapshot).toEqual(settled[1].snapshot);
    expect(settled[0].snapshot.progress.common).toBe(7);
    expect(settled[0].snapshot.progress.wins).toBe(1);
    expect(settled[0].snapshot.progress.selections).toHaveLength(1);
    const finalRecord = await raw(page);
    const stale = await begin(second, token);
    expect(stale).toMatchObject({ ok: false, code: 'stale' });
    expect(await raw(second)).toEqual(finalRecord);
    reports.push({ round, winnerPage: starts[0].ok ? 1 : 2, revision: settled[0].snapshot.revision, common: 7, duplicateCount: 1 });
  }
  await info.attach('real-two-page-races', { body: JSON.stringify(reports, null, 2), contentType: 'application/json' });
});

test('explicit legacy import, roster migration, real abort and reload preserve exact bytes', async ({ page }, info) => {
  test.skip(process.env.QA_CANDIDATE !== 'storage', 'Driver exists only on the storage candidate');
  await page.goto('./');
  const db = `qa-migration-${info.project.name}`;
  await connect(page, db);
  const teamBefore = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const legacyRaw = await page.evaluate(() => {
    const state = window.qa.D.createProgress(['0', '1'], window.qa.rules); state.common = 19;
    return '\n' + JSON.stringify(state, null, 2) + '\n';
  });
  await connect(page, db, { legacyRaw });
  const imported = await page.evaluate(() => window.qa.adapter.initialize());
  expect(imported.progress.common).toBe(19);
  expect((await raw(page)).legacyRaw).toBe(legacyRaw);
  expect(await page.evaluate(() => window.qa.adapter.initialize())).toEqual(imported);
  await connect(page, db, { roster: ['0', '1', 'future'], legacyRaw: 'ignored because a record exists' });
  expect((await page.evaluate(() => window.qa.adapter.load())).status).toBe('blocked');
  const migrated = await page.evaluate(() => window.qa.adapter.initialize());
  expect(migrated.revision).toBe(imported.revision + 1);
  expect(migrated.progress.monsters.future).toEqual({ level: 0, essence: 0 });
  expect(migrated.progress.common).toBe(19);
  const beforeAbort = await raw(page);
  expect(beforeAbort.backup).toBe(imported.token);
  expect(beforeAbort.legacyRaw).toBe(legacyRaw);
  const aborted = await page.evaluate(async token => {
    const original = IDBObjectStore.prototype.put;
    let writes = 0;
    // The real browser write request is queued, then its real transaction aborts.
    // The driver and adapter are unmodified; this is deterministic fault injection.
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args); writes++; this.transaction.abort(); return request;
    };
    try {
      await window.qa.adapter.dispatch(token, { kind: 'begin', context: window.qa.context });
      return { resolved: true, writes };
    } catch (error) { return { resolved: false, writes, code: error.code }; }
    finally { IDBObjectStore.prototype.put = original; }
  }, migrated.token);
  expect(aborted).toEqual({ resolved: false, writes: 1, code: 'unavailable' });
  expect(await raw(page)).toEqual(beforeAbort);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(teamBefore);
  await page.reload(); await connect(page, db, { roster: ['0', '1', 'future'] });
  expect(await raw(page)).toEqual(beforeAbort);
  expect(await page.evaluate(() => window.qa.adapter.load())).toEqual({ status: 'ready', snapshot: migrated });
  const retry = await begin(page, migrated.token);
  expect(retry.ok).toBe(true);
  expect(retry.value.snapshot.revision).toBe(migrated.revision + 1);
  await info.attach('migration-abort-reload', { body: JSON.stringify({ importedRevision: imported.revision, migratedRevision: migrated.revision, aborted, reloadedExactBytes: true, teamBytesUnchangedDuringDriverOperations: true }), contentType: 'application/json' });
});

test('real IndexedDB schema and future-version refusal leave existing bytes intact', async ({ page }, info) => {
  test.skip(process.env.QA_CANDIDATE !== 'storage', 'Driver exists only on the storage candidate');
  await page.goto('./');
  for (const fixture of [
    { label: 'unknown-store', version: 1, store: 'unrelated', keyPath: null, autoIncrement: false, indexed: false },
    { label: 'future-version', version: 2, store: 'awakening-record', keyPath: null, autoIncrement: false, indexed: false },
    { label: 'unexpected-index', version: 1, store: 'awakening-record', keyPath: null, autoIncrement: false, indexed: true },
  ]) {
    const name = `qa-refusal-${info.project.name}-${fixture.label}`;
    await page.evaluate(async ({ name, fixture }) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(name, fixture.version);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore(fixture.store);
          if (fixture.indexed) store.createIndex('unexpected', 'head');
          store.put({ head: 'unchanged-sentinel', backup: null, legacyRaw: 'original bytes' }, 'state');
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { request.result.close(); resolve(); };
      });
    }, { name, fixture });
    await connect(page, name);
    const refusal = await page.evaluate(async () => {
      try { await window.qa.adapter.initialize(); return 'unexpected-success'; }
      catch (error) { return error.code; }
    });
    expect(refusal).toBe('unavailable');
    const preserved = await page.evaluate(async ({ name, fixture }) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, fixture.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(fixture.store, 'readonly');
        let value;
        const read = tx.objectStore(fixture.store).get('state');
        read.onsuccess = () => { value = read.result; };
        tx.oncomplete = () => { db.close(); resolve(value); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    }), { name, fixture });
    expect(preserved).toEqual({ head: 'unchanged-sentinel', backup: null, legacyRaw: 'original bytes' });
  }
});
