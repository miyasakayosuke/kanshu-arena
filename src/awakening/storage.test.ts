import { describe, it, expect } from 'vitest';
import * as D from './domain';
import { AwakeningStorage, type Snapshot, type Command } from './storage';
import { FakeTransactionalStorage } from './fakeStorage';
import { monsters } from '../engine';
import { parseTeamWorkshop } from '../teamWorkshop';
const ids = monsters.map((_, i) => String(i));
// Deliberately different from the proposal: fixture economics are not policy.
const rules = (): D.EconomyRules => ({ version: 'storage-test-v1', stepCosts: Array(99).fill(3), completionCommon: 2, winBonusCommon: 5, selectionEveryWins: 1, essencePerSelection: 2 });
const context = (): D.BattleContext => ({ initialStateJson: '{"seed":42}', mode: 'test', teamId: 'team-1', statRuleVersion: D.STAT_RULE_VERSION });
const win: Command = { kind: 'settle', sequence: 1, completion: { kind: 'engine-terminal', engineState: { winner: 'win' } } };
function setup(seed: ConstructorParameters<typeof FakeTransactionalStorage>[0] = {}) {
  const store = new FakeTransactionalStorage(seed);
  return { store, adapter: new AwakeningStorage(store, ids, rules()) };
}
async function start(adapter: AwakeningStorage) {
  const fresh = await adapter.initialize();
  return (await adapter.dispatch(fresh.token, { kind: 'begin', context: context() })).snapshot;
}
async function finish(adapter: AwakeningStorage) { const active = await start(adapter); return adapter.dispatch(active.token, win); }
async function loaded(adapter: AwakeningStorage): Promise<Snapshot> { const result = await adapter.load(); if (result.status !== 'ready') throw new Error(result.status); return result.snapshot; }
describe('isolated transactional awakening storage', () => {
  it('initializes exactly 37 roster entries, no materials, and is byte-idempotent', async () => {
    const { store, adapter } = setup(); expect(await adapter.load()).toEqual({ status: 'empty' });
    const first = await adapter.initialize(); const bytes = store.inspect();
    expect(Object.keys(first.progress.monsters)).toHaveLength(37); expect(first.progress.common).toBe(0);
    expect(await adapter.initialize()).toEqual(first); expect(store.inspect()).toEqual(bytes);
  });
  it('preserves all existing roster records and all three real-format team slots', async () => {
    const rosterBefore = structuredClone(monsters);
    const teams = { version: 2, selected: 0, teams: [{ team: [0], rule: 'standard' }, { team: [1], rule: 'light' }, { team: [2], rule: 'standard' }], draft: null, previous: null };
    expect(parseTeamWorkshop(teams)?.teams).toHaveLength(3);
    const teamBytes = JSON.stringify(teams), external = new Map([['kanshu-team-workshop-v2', teamBytes]]);
    const { adapter } = setup(); await finish(adapter); await adapter.initialize();
    expect(monsters).toEqual(rosterBefore); expect(external.get('kanshu-team-workshop-v2')).toBe(teamBytes);
    expect(D.planMigration(null, teams, ids, rules())).toMatchObject({ existingTeamSave: teams });
    const plan = D.planMigration(null, teams, ids, rules()); expect(plan.existingTeamSave).toBe(teams);
  });
  it('imports legacy raw bytes once and preserves them exactly including whitespace', async () => {
    const progress = D.createProgress(ids, rules()); progress.common = 19;
    const legacyRaw = '\n' + JSON.stringify(progress, null, 2) + '\n';
    const { adapter, store } = setup({ legacyRaw }); const imported = await adapter.initialize();
    expect(imported.progress.common).toBe(19); expect(store.inspect().legacyRaw).toBe(legacyRaw);
    expect(await adapter.initialize()).toEqual(imported);
  });
  it('adds new species at zero, preserves retired IDs and balances, atomically backs up exact head', async () => {
    const { store, adapter } = setup(); const old = await adapter.initialize();
    const next = new AwakeningStorage(store, [...ids.slice(1), 'future'], rules());
    expect((await next.load()).status).toBe('blocked'); const migrated = await next.initialize();
    expect(migrated.progress.monsters['0']).toEqual(old.progress.monsters['0']);
    expect(migrated.progress.monsters.future).toEqual({ level: 0, essence: 0 });
    expect(store.inspect().backup).toBe(old.token); expect(migrated.revision).toBe(2);
    expect(await next.initialize()).toEqual(migrated);
  });
  it('aborts roster migration completely on quota failure and can retry', async () => {
    const { store, adapter } = setup(); await adapter.initialize(); const before = store.inspect();
    const next = new AwakeningStorage(store, [...ids, 'future'], rules()); store.failNext('write');
    await expect(next.initialize()).rejects.toMatchObject({ code: 'unavailable' }); expect(store.inspect()).toEqual(before);
    expect((await next.initialize()).progress.monsters.future.level).toBe(0);
  });
  it.each(['{', 'null', '{"schemaVersion":2}', '[]', '0'])('blocks invalid legacy %s without resetting', async legacyRaw => {
    const { store, adapter } = setup({ legacyRaw }); const before = store.inspect();
    await expect(adapter.initialize()).rejects.toMatchObject({ code: 'blocked' }); expect(store.inspect()).toEqual(before);
  });
  it.each(['{', 'null', '{"storageVersion":2}', '[]'])('blocks invalid envelope %s, preserving bytes', async head => {
    const { store, adapter } = setup({ head }); const before = store.inspect();
    expect((await adapter.load()).status).toBe('blocked'); await expect(adapter.initialize()).rejects.toMatchObject({ code: 'blocked' });
    expect(store.inspect()).toEqual(before);
  });
  it('persists stable receipt and never duplicates rewards after reload/replay with changed result', async () => {
    const { store, adapter } = setup(); const active = await start(adapter); const first = await adapter.dispatch(active.token, win);
    const before = store.inspect(); const reload = new AwakeningStorage(store, ids, rules());
    const replay = await reload.dispatch(active.token, { kind: 'settle', sequence: 1, completion: { kind: 'surrender' } });
    expect(replay.duplicate).toBe(true); expect(replay.receipt).toEqual(first.receipt); expect(replay.snapshot.progress.common).toBe(7);
    expect(replay.snapshot.progress.wins).toBe(1); expect(replay.snapshot.progress.selections).toHaveLength(1); expect(store.inspect()).toEqual(before);
  });
  it('keeps a receipt stable after spending its selection and common materials', async () => {
    const { store, adapter } = setup(); const first = await finish(adapter);
    const claimed = await adapter.dispatch(first.snapshot.token, { kind: 'claim', selectionId: 'wins-1', speciesId: '0' });
    const upgraded = await adapter.dispatch(claimed.snapshot.token, { kind: 'upgrade', speciesId: '0', expectedLevel: 0 });
    const before = store.inspect(); const replay = await adapter.dispatch(first.snapshot.token, win);
    expect(replay.receipt).toEqual(first.receipt); expect(replay.snapshot).toEqual(upgraded.snapshot); expect(store.inspect()).toEqual(before);
    await expect(adapter.dispatch(upgraded.snapshot.token, { kind: 'claim', selectionId: 'wins-1', speciesId: '0' })).rejects.toThrow();
  });
  it('serializes two clients settling the same result without duplicate grants', async () => {
    const { store, adapter } = setup(); const active = await start(adapter); const other = new AwakeningStorage(store, ids, rules());
    const results = await Promise.all([adapter.dispatch(active.token, win), other.dispatch(active.token, win)]);
    expect(results.map(r => r.duplicate)).toEqual([false, true]); expect((await loaded(other)).progress.common).toBe(7);
  });
  it('serializes competing starts and rejects the stale writer', async () => {
    const { store, adapter } = setup(); const first = await adapter.initialize(); const other = new AwakeningStorage(store, ids, rules());
    const results = await Promise.allSettled([adapter.dispatch(first.token, { kind: 'begin', context: context() }), other.dispatch(first.token, { kind: 'begin', context: context() })]);
    expect(results[0].status).toBe('fulfilled'); expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'stale' } });
    expect((await loaded(adapter)).progress.nextBattleSequence).toBe(2);
  });
  it('rejects stale spending even when the displayed level has not changed', async () => {
    const { adapter } = setup(); const first = await finish(adapter);
    await adapter.dispatch(first.snapshot.token, { kind: 'claim', selectionId: 'wins-1', speciesId: '0' });
    await expect(adapter.dispatch(first.snapshot.token, { kind: 'upgrade', speciesId: '1', expectedLevel: 0 })).rejects.toMatchObject({ code: 'stale' });
  });
  it('rejects old settlement after a newer battle starts, without touching newer state', async () => {
    const { adapter, store } = setup(); const first = await finish(adapter);
    const second = await adapter.dispatch(first.snapshot.token, { kind: 'begin', context: context() }); const before = store.inspect();
    await expect(adapter.dispatch(second.snapshot.token, win)).rejects.toThrow('No matching active battle'); expect(store.inspect()).toEqual(before);
  });
  it('does not settle or reward an interrupted active battle merely by reloading', async () => {
    const { store, adapter } = setup(); const active = await start(adapter); const other = new AwakeningStorage(store, ids, rules());
    expect(await loaded(other)).toEqual(active); expect((await other.initialize()).progress.common).toBe(0);
  });
  it.each(['surrender', 'abandoned'] as const)('persists zero reward for %s', async kind => {
    const { adapter } = setup(); const active = await start(adapter);
    const settled = await adapter.dispatch(active.token, { kind: 'settle', sequence: 1, completion: { kind } });
    expect(settled.receipt?.common).toBe(0); expect((await loaded(adapter)).progress.common).toBe(0);
  });
  it('aborts settlement and backup on quota failure, then grants exactly once on retry', async () => {
    const { store, adapter } = setup(); const active = await start(adapter); const before = store.inspect(); store.failNext('write');
    await expect(adapter.dispatch(active.token, win)).rejects.toMatchObject({ code: 'unavailable' }); expect(store.inspect()).toEqual(before);
    expect((await adapter.dispatch(active.token, win)).duplicate).toBe(false);
    expect((await adapter.dispatch(active.token, win)).duplicate).toBe(true); expect((await loaded(adapter)).progress.common).toBe(7);
  });
  it('reports read failure and succeeds after backend is usable again', async () => {
    const { store, adapter } = setup(); store.failNext('read'); await expect(adapter.load()).rejects.toMatchObject({ code: 'unavailable' });
    expect(await adapter.load()).toEqual({ status: 'empty' });
  });
  it('aborts initialization on quota failure without leaving a partial marker', async () => {
    const { store, adapter } = setup(); store.failNext('write'); await expect(adapter.initialize()).rejects.toMatchObject({ code: 'unavailable' });
    expect(store.inspect()).toEqual({ head: null, backup: null, legacyRaw: null }); expect((await adapter.initialize()).revision).toBe(1);
  });
  it('offers valid backup read-only and blocks replay rather than rewinding balances', async () => {
    const { adapter } = setup(); const completed = await finish(adapter);
    const { store, adapter: broken } = setup({ head: '{corrupt', backup: completed.snapshot.token }); const before = store.inspect();
    const result = await broken.load(); expect(result).toMatchObject({ status: 'blocked', recovery: completed.snapshot });
    await expect(broken.initialize()).rejects.toMatchObject({ code: 'blocked' });
    await expect(broken.dispatch(completed.snapshot.token, win)).rejects.toMatchObject({ code: 'blocked' }); expect(store.inspect()).toEqual(before);
  });
  it('never initializes a missing head over retained backup', async () => {
    const { adapter } = setup(); const saved = await adapter.initialize(); const { adapter: broken } = setup({ backup: saved.token });
    expect(await broken.load()).toMatchObject({ status: 'blocked', recovery: saved }); await expect(broken.initialize()).rejects.toMatchObject({ code: 'blocked' });
  });
  it('preserves both corrupt records when no valid recovery is available', async () => {
    const { store, adapter } = setup({ head: '{bad', backup: '{worse' }); const before = store.inspect();
    expect(await adapter.load()).toMatchObject({ status: 'blocked', recovery: null }); expect(store.inspect()).toEqual(before);
  });
  it('blocks economy-version mismatch without mutating the save', async () => {
    const { store, adapter } = setup(); await adapter.initialize(); const before = store.inspect();
    const other = new AwakeningStorage(store, ids, { ...rules(), version: 'other-v1' });
    expect((await other.load()).status).toBe('blocked'); await expect(other.initialize()).rejects.toMatchObject({ code: 'blocked' }); expect(store.inspect()).toEqual(before);
  });
  it('rejects revision overflow before changing anything', async () => {
    const { adapter } = setup(); const first = await adapter.initialize(); const value = JSON.parse(first.token); value.revision = Number.MAX_SAFE_INTEGER;
    const { store, adapter: full } = setup({ head: JSON.stringify(value) }); const before = store.inspect();
    await expect(full.dispatch(before.head!, { kind: 'begin', context: context() })).rejects.toMatchObject({ code: 'overflow' }); expect(store.inspect()).toEqual(before);
  });
  it('isolates returned snapshots and config from external mutation', async () => {
    const store = new FakeTransactionalStorage(); const config = rules(); const roster = [...ids]; const adapter = new AwakeningStorage(store, roster, config);
    config.completionCommon = 900; roster.length = 0; const first = await adapter.initialize(); first.progress.common = 999;
    expect((await loaded(adapter)).progress.common).toBe(0); expect((await finish(adapter)).snapshot.progress.common).toBe(7);
  });
  it('does not grant rewards for invalid terminal state or unrecognized command', async () => {
    const { adapter, store } = setup(); const active = await start(adapter); const before = store.inspect();
    await expect(adapter.dispatch(active.token, { kind: 'settle', sequence: 1, completion: { kind: 'engine-terminal', engineState: { winner: null } } })).rejects.toThrow();
    await expect(adapter.dispatch(active.token, { kind: 'invented' } as unknown as Command)).rejects.toThrow(); expect(store.inspect()).toEqual(before);
  });
  it.each([
    ['future storage', (v: any) => { v.storageVersion = 2; }],
    ['future domain', (v: any) => { v.progress.schemaVersion = 2; }],
    ['future stat rule', (v: any) => { v.progress.statRuleVersion = 'future'; }],
    ['negative balance', (v: any) => { v.progress.common = -1; }],
    ['fractional balance', (v: any) => { v.progress.common = 0.5; }],
    ['bad level', (v: any) => { v.progress.monsters['0'].level = 100; }],
    ['wrong marker', (v: any) => { v.marker = 'other'; }],
    ['negative revision', (v: any) => { v.revision = -1; }],
    ['extra fields', (v: any) => { v.unknown = true; }],
  ])('blocks %s in a stored envelope', async (_name, mutate) => {
    const { adapter } = setup(); const first = await adapter.initialize(); const value = JSON.parse(first.token); mutate(value);
    const { adapter: bad, store } = setup({ head: JSON.stringify(value) }); const before = store.inspect();
    expect(await bad.load()).toMatchObject({ status: 'blocked', recovery: null });
    await expect(bad.initialize()).rejects.toMatchObject({ code: 'blocked' }); expect(store.inspect()).toEqual(before);
  });
  it('concurrent initializations commit one migration only', async () => {
    const { store, adapter } = setup(); const other = new AwakeningStorage(store, ids, rules());
    const results = await Promise.all([adapter.initialize(), other.initialize()]);
    expect(results[0]).toEqual(results[1]); expect(results[0].revision).toBe(1); expect(store.inspect().backup).toBeNull();
  });
  it('serializes competing upgrades at the same level without double spending', async () => {
    const { store, adapter } = setup(); const done = await finish(adapter); const other = new AwakeningStorage(store, ids, rules());
    const command: Command = { kind: 'upgrade', speciesId: '0', expectedLevel: 0 };
    const results = await Promise.allSettled([adapter.dispatch(done.snapshot.token, command), other.dispatch(done.snapshot.token, command)]);
    expect(results[0].status).toBe('fulfilled'); expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'stale' } });
    const current = await loaded(other); expect(current.progress.common).toBe(4); expect(current.progress.monsters['0'].level).toBe(1);
  });
  it('aborts a selection claim on failure without losing or duplicating its right', async () => {
    const { store, adapter } = setup(); const done = await finish(adapter); const before = store.inspect(); store.failNext('write');
    const command: Command = { kind: 'claim', selectionId: 'wins-1', speciesId: '0' };
    await expect(adapter.dispatch(done.snapshot.token, command)).rejects.toMatchObject({ code: 'unavailable' }); expect(store.inspect()).toEqual(before);
    const retry = await adapter.dispatch(done.snapshot.token, command); expect(retry.snapshot.progress.monsters['0'].essence).toBe(2);
    expect(retry.snapshot.progress.selections).toHaveLength(0);
  });
  it('rejects malformed progress in backup rather than presenting it as recovery', async () => {
    const { adapter } = setup(); const saved = await adapter.initialize(); const backup = JSON.parse(saved.token); backup.progress.common = -5;
    const { adapter: bad } = setup({ head: '{bad', backup: JSON.stringify(backup) });
    expect(await bad.load()).toMatchObject({ status: 'blocked', recovery: null });
  });

});
