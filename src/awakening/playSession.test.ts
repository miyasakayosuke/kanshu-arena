import { describe, expect, it } from 'vitest';
import { monsters, start, advanceWithEvents, automaticOrders } from '../engine';
import { FakeTransactionalStorage } from './fakeStorage';
import { AwakeningStorage } from './storage';
import { AwakeningPlaySession, rosterIds, trialRules } from './playSession';
import { approvedTrialRules, deriveAwakeningMonster, createProgress, beginBattle, settleBattle, upgradeOnce, claimSelection, STAT_RULE_VERSION } from './domain';
const context = { initialStateJson: '{}', mode: 'standard', teamId: 'party', statRuleVersion: STAT_RULE_VERSION } as const;
function setup() { const driver = new FakeTransactionalStorage(); const storage = new AwakeningStorage(driver, rosterIds, trialRules); return { driver, storage, session: new AwakeningPlaySession(storage) }; }
const team = [0, 2, 3, 4, 6];
describe('approved provisional economy', () => {
  it('uses flat ten costs and banks nonexpiring tenth-win choices without roster-selection grants', () => {
    const rules = approvedTrialRules(); expect(rules.stepCosts).toEqual(Array(99).fill(10));
    let progress = createProgress(rosterIds, rules);
    for (let n = 1; n <= 20; n++) { progress = beginBattle(progress, context, rules); progress = settleBattle(progress, n, { kind: 'engine-terminal', engineState: { winner: 'win' } }).state; }
    expect(progress.common).toBe(100); expect(progress.wins).toBe(20); expect(progress.selections.map(x => x.id)).toEqual(['wins-10', 'wins-20']);
    progress = claimSelection(progress, 'wins-10', '0', rosterIds, rules);
    const upgraded = upgradeOnce(progress, '0', 0, rosterIds, rules);
    expect(upgraded.monsters['0']).toEqual({ level: 1, essence: 0 }); expect(upgraded.common).toBe(100);
    expect(() => claimSelection(upgraded, 'wins-10', '0', rosterIds, rules)).toThrow();
  });
  it('fast losses give exactly one each, never wins or choices; abandoned games give zero', () => {
    let progress = createProgress(rosterIds, trialRules);
    for (let n = 1; n <= 100; n++) { progress = beginBattle(progress, context, trialRules); progress = settleBattle(progress, n, { kind: 'engine-terminal', engineState: { winner: 'lose' } }).state; }
    expect(progress.common).toBe(100); expect(progress.wins).toBe(0); expect(progress.selections).toEqual([]);
    progress = beginBattle(progress, context, trialRules); progress = settleBattle(progress, 101, { kind: 'abandoned' }).state;
    expect(progress.common).toBe(100); expect(progress.receipt?.common).toBe(0);
  });
  it('charges ten for the final stage and rejects repeated or over-cap upgrades', () => {
    const progress = createProgress(rosterIds, trialRules); progress.common = 10; progress.monsters['0'].level = 98;
    const next = upgradeOnce(progress, '0', 98, rosterIds, trialRules); expect(next.common).toBe(0); expect(next.monsters['0'].level).toBe(99);
    expect(() => upgradeOnce(next, '0', 98, rosterIds, trialRules)).toThrow(); expect(() => upgradeOnce(next, '0', 99, rosterIds, trialRules)).toThrow();
  });
});
describe('engine and durable session boundary', () => {
  it('preserves zero baseline and enemy stats, derives before leaders, and never mutates roster', () => {
    const original = JSON.stringify(monsters); const baseline = start(team, team, 42, { leaders: true });
    expect(start(team, team, 42, { leaders: true, allyAwakeningStats: {} })).toEqual(baseline);
    const grown = start(team, team, 42, { leaders: true, allyAwakeningStats: { '0': deriveAwakeningMonster(monsters[0], 99), '2': deriveAwakeningMonster(monsters[2], 4) } });
    expect(grown.enemies).toEqual(baseline.enemies); expect(grown.allies[0].monster.hp).toBeGreaterThan(baseline.allies[0].monster.hp);
    expect(grown.allies.map(x => [x.mp, x.monster.speed])).toEqual(baseline.allies.map(x => [x.mp, x.monster.speed])); expect(JSON.stringify(monsters)).toBe(original);
  });
  it('persists actual initial state before returning and settles an actual engine terminal exactly once', async () => {
    const { session, storage } = setup(); await session.load(); let state = await session.begin(team, team, 42, 'standard');
    expect(JSON.parse(session.snapshot!.progress.activeBattle!.context.initialStateJson).state).toEqual(state);
    const sequence = session.sequence!;
    for (let turn = 0; turn < 20 && !state.winner; turn++) state = advanceWithEvents(state, automaticOrders(state, [])).state;
    expect(state.winner).not.toBeNull(); await session.terminal(state); await session.terminal(state); await session.abandon();
    const before = session.snapshot!.token;
    const duplicate = await storage.dispatch(before, { kind: 'settle', sequence, completion: { kind: 'engine-terminal', engineState: { winner: 'win' } } });
    expect(duplicate.duplicate).toBe(true); expect(duplicate.snapshot.token).toBe(before); expect(session.snapshot!.progress.common).toBe(state.winner === 'win' ? 5 : 1);
  });
  it('retains a terminal reward across commit failure and later abandonment, then safely retries', async () => {
    const { session, driver } = setup(); await session.load(); const state = await session.begin(team, team, 1, 'standard'); const before = driver.inspect();
    driver.failNext('write'); await expect(session.terminal({ ...state, winner: 'win' })).rejects.toThrow(); expect(driver.inspect()).toEqual(before); expect(session.pending).not.toBeNull();
    await session.abandon(); expect(session.snapshot!.progress.common).toBe(5); expect(session.snapshot!.progress.wins).toBe(1); expect(session.pending).toBeNull();
  });
  it('blocks concurrent starts, preserves reload active sessions and requires explicit zero-reward discard', async () => {
    const { session, storage } = setup(); await session.load(); const first = session.begin(team, team, 1, 'standard'); await expect(session.begin(team, team, 2, 'standard')).rejects.toThrow(); await first;
    const reopened = new AwakeningPlaySession(storage); const active = await reopened.load(); expect(active.progress.common).toBe(0);
    await expect(reopened.begin(team, team, 3, 'standard')).rejects.toThrow();
    await reopened.discardInterrupted(active.token, active.progress.activeBattle!.sequence); expect(reopened.snapshot!.progress.receipt?.common).toBe(0);
    await expect(session.terminal({ ...start(team, team), winner: 'win' })).resolves.toBeUndefined(); expect(session.snapshot!.progress.common).toBe(0);
  });
  it('preserves corrupt bytes and never initializes over them', async () => {
    const driver = new FakeTransactionalStorage({ head: '{bad', backup: null }); const session = new AwakeningPlaySession(new AwakeningStorage(driver, rosterIds, trialRules));
    await expect(session.load()).rejects.toThrow(); expect(driver.inspect().head).toBe('{bad'); expect(session.snapshot).toBeNull();
  });
});
