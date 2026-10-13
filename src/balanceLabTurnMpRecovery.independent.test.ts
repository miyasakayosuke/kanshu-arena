import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, type BattleEvent, type State } from './engine';
// @ts-ignore Development-only JavaScript Lab shared with the native Node loader.
import { MatchFailure, METRIC_DEFINITIONS, runMatch, summarize } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine', async original => {
  const actual = await original<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});
const ordinary = [0, 2, 3, 4, 6], enemy = [1, 5, 8, 10, 6];
const request = { teamA: ordinary, teamB: enemy, seed: 42 };
type Resolution = ReturnType<typeof advanceWithEvents>;
type Fault = (result: Resolution, before: State) => boolean;
type Failure = Error & { request: typeof request; trace: { turns: { turn: number; events: BattleEvent[] }[]; activeAttempt: { turn: number }; lastState: State } };
const boundary = (r: Resolution) => r.events.findIndex(e => e.kind === 'phase' && e.phase === 'next-turn-start');
const recovery = (r: Resolution) => r.events.findIndex(e => e.kind === 'resource-gain' && e.effect === 'turn-mp-recovery');
const units = (s: State) => [...s.allies, ...s.enemies];
beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});
async function assertRejected(fault: Fault, options = request) {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  let changed = false, corruptEvents: BattleEvent[] = [];
  vi.mocked(advanceWithEvents).mockImplementation((s, o, p) => {
    const r = actual.advanceWithEvents(s, o, p);
    if (!changed && fault(r, s)) { changed = true; corruptEvents = structuredClone(r.events); }
    return r;
  });
  let caught: unknown;
  try { runMatch(options); } catch (error) { caught = error; }
  expect(changed, 'the requested corruption must actually be injected').toBe(true);
  expect(caught).toBeInstanceOf(MatchFailure);
  const failure = caught as Failure;
  expect(failure.message).toMatch(/turn recovery|recovery policy|MP ledger|slime supply|resource|unexpected event|unknown field/i);
  expect(failure.request).toMatchObject(options);
  expect(failure.trace.activeAttempt).toBeDefined();
  expect(failure.trace.turns.at(-1)!.events).toEqual(corruptEvents);
  expect(failure.trace.activeAttempt.turn).toBe(failure.trace.turns.at(-1)!.turn);
}
const gainFault = (mutate: (gain: BattleEvent, r: Resolution, i: number) => void): Fault => r => {
  const i = recovery(r); if (i < 0) return false; mutate(r.events[i], r, i); return true;
};
const boundaryFault = (mutate: (event: BattleEvent, r: Resolution, i: number) => void): Fault => r => {
  const i = boundary(r); if (i < 0) return false; mutate(r.events[i], r, i); return true;
};

describe('independent Lab recurring MP fault preservation', () => {
  const corruptions: [string, Fault][] = [
    ['missing credit', gainFault((_e, r, i) => { r.events.splice(i, 1); })],
    ['duplicate credit', gainFault((e, r, i) => { r.events.splice(i + 1, 0, { ...e }); })],
    ['zero credit', gainFault(e => { e.amount = 0; })],
    ['negative credit', gainFault(e => { e.amount = -1; })],
    ['fractional credit', gainFault(e => { e.amount = 1.5; })],
    ['wrong positive credit', gainFault(e => { e.amount!++; })],
    ['nonfinite credit', gainFault(e => { e.amount = NaN; })],
    ['wrong absolute MP', gainFault(e => { e.mp!++; })],
    ['unknown recipient', gainFault(e => { e.target = 'a999'; })],
    ['missing recipient', gainFault(e => { delete e.target; })],
    ['actor-bearing credit', gainFault(e => { e.actor = 'a0'; })],
    ['HP-bearing credit', gainFault(e => { e.hp = 1; })],
    ['wrong source tag', gainFault(e => { e.effect = 'slime-supply'; })],
    ['wrong credit phase', gainFault(e => { e.phase = 'turn-end'; })],
    ['wrong credit turn', gainFault(e => { e.nextTurn!++; })],
    ['missing credit turn', gainFault(e => { delete e.nextTurn; })],
    ['credit before boundary', gainFault((e, r, i) => { r.events.splice(i, 1); r.events.splice(boundary(r), 0, e); })],
    ['missing boundary', boundaryFault((_e, r, i) => { r.events.splice(i, 1); })],
    ['missing entire recovery suffix', boundaryFault((_e, r, i) => { r.events.splice(i); })],
    ['duplicate boundary', boundaryFault((e, r, i) => { r.events.splice(i + 1, 0, { ...e }); })],
    ['actor-bearing boundary', boundaryFault(e => { e.actor = 'a0'; })],
    ['target-bearing boundary', boundaryFault(e => { e.target = 'a0'; })],
    ['amount-bearing boundary', boundaryFault(e => { e.amount = 2; })],
    ['wrong boundary turn', boundaryFault(e => { e.nextTurn!++; })],
    ['missing boundary turn', boundaryFault(e => { delete e.nextTurn; })],
    ['wrong boundary kind', boundaryFault(e => { e.kind = 'expire'; })],
    ['boundary before turn end', boundaryFault((_e, r, i) => { const suffix = r.events.splice(i); r.events.splice(r.events.findIndex(e => e.kind === 'phase' && e.phase === 'turn-end'), 0, ...suffix); })],
    ['event after recovery suffix', boundaryFault((_e, r) => { r.events.push({ kind: 'expire', phase: 'next-turn-start', target: 'a0', guard: false }); })],
    ['missing turn-end phase', boundaryFault((_e, r) => { r.events = r.events.filter(e => !(e.kind === 'phase' && e.phase === 'turn-end')); })],
  ];
  it.each(corruptions)('rejects %s and preserves the exact failed stream', async (_label, fault) => { await assertRejected(fault); });

  it('rejects a credit for an actor already dead before the current turn', async () => {
    await assertRejected((r, before) => {
      const dead = units(before).find(u => u.hp <= 0), i = recovery(r);
      if (!dead || i < 0) return false;
      r.events[i].target = dead.key; return true;
    });
  });
  it('rejects a credit for an actor killed during the current turn', async () => {
    await assertRejected(r => {
      const dead = r.events.find(e => e.kind === 'defeat'), i = recovery(r);
      if (!dead || i < 0) return false;
      r.events[i].target = dead.target; return true;
    });
  });
  it('rejects a credit for a full-MP recipient', async () => {
    await assertRejected(r => {
      const full = units(r.state).find(u => u.key === 'a0' && u.hp > 0 && u.mp === u.monster.mp), i = recovery(r);
      if (!full || i < 0) return false;
      r.events[i].target = full.key; r.events[i].mp = full.mp; return true;
    }, { ...request, overrides: { monsters: { 0: { skills: [] } } } } as typeof request);
  });
  it('rejects post-terminal recovery before checking its recipients', async () => {
    await assertRejected(r => {
      if (!r.state.winner) return false;
      r.events.push({ kind: 'phase', phase: 'next-turn-start', nextTurn: r.state.turn }, { kind: 'resource-gain', phase: 'next-turn-start', nextTurn: r.state.turn, target: 'a0', amount: 2, mp: 2, effect: 'turn-mp-recovery' });
      return true;
    });
  });
  it('rejects an unrecorded MP credit even if the final value stays below maximum', async () => {
    await assertRejected(r => { const u = units(r.state).find(u => u.hp > 0 && u.mp < u.monster.mp); if (!u) return false; u.mp++; return true; });
  });
  it('rejects recovery policy drift instead of silently relabeling a different economy', async () => {
    await assertRejected(r => { r.state.turnMpRecovery = 0; return true; });
  });
});

type Metric = { key: string; initialMp: number; mpGenerated: number; mpSpent: number; mpDamageReceived: number; finalMp: number; turnMpRecovered: number; supplyReceived: number; supplyGenerated: number; peakMp: number; maximumMp: number };
type LabResult = { units: Metric[]; sides: Record<'allies' | 'enemies', Metric>; trace: { turns: { events: BattleEvent[] }[] } };
describe('independent Lab recurring/supply metric separation', () => {
  it.each([false, true])('reconciles exact recurring and slime credits on both physical sides (%s)', reverse => {
    const pure = [24, 25, 26, 27, 28], nature = [14, 3, 6, 9, 10];
    const result: LabResult = runMatch({ teamA: reverse ? nature : pure, teamB: reverse ? pure : nature, seed: 42, trace: true, overrides: { monsters: Object.fromEntries(pure.map(id => [id, { hp: 1200, mp: 30 }])) } });
    const events = result.trace.turns.flatMap(t => t.events);
    for (const metric of result.units) {
      const recurring = events.filter(e => e.effect === 'turn-mp-recovery' && e.target === metric.key).reduce((n, e) => n + e.amount!, 0);
      const supply = events.filter(e => e.kind === 'resource-gain' && e.effect === 'slime-supply' && e.target === metric.key).reduce((n, e) => n + e.amount!, 0);
      expect(metric.turnMpRecovered).toBe(recurring); expect(metric.supplyReceived).toBe(supply); expect(metric.mpGenerated).toBe(recurring + supply);
      expect(metric.initialMp + metric.mpGenerated - metric.mpSpent - metric.mpDamageReceived).toBe(metric.finalMp);
      expect(metric.peakMp).toBeLessThanOrEqual(metric.maximumMp);
    }
    for (const [side, prefix] of [['allies', 'a'], ['enemies', 'e']] as const) {
      const rows = result.units.filter(u => u.key.startsWith(prefix));
      expect(result.sides[side].turnMpRecovered).toBe(rows.reduce((n, u) => n + u.turnMpRecovered, 0));
      expect(result.sides[side].mpGenerated).toBe(result.sides[side].turnMpRecovered + result.sides[side].supplyGenerated);
    }
    expect(result.sides[reverse ? 'enemies' : 'allies'].supplyGenerated).toBeGreaterThan(0);
    expect(result.sides.allies.turnMpRecovered).toBeGreaterThan(0); expect(result.sides.enemies.turnMpRecovered).toBeGreaterThan(0);
    const summary = summarize([{ orientation: 'a-left', result }]);
    expect(summary.meanTurnMpRecovered).toBe(result.sides.allies.turnMpRecovered);
  });
  it('accepts an empty credit list when every continuing recipient is already full', () => {
    const ids = [...new Set([...ordinary, ...enemy])];
    const result: LabResult = runMatch({ ...request, trace: true, overrides: { monsters: Object.fromEntries(ids.map(id => [id, { hp: 1000, atk: 0, mp: 10, skills: [] }])) } });
    const events = result.trace.turns.flatMap(t => t.events);
    expect(events.some(e => e.phase === 'next-turn-start')).toBe(true);
    expect(events.filter(e => e.effect === 'turn-mp-recovery')).toEqual([]);
    for (const metric of result.units) { expect(metric.turnMpRecovered).toBe(0); expect(metric.mpGenerated).toBe(0); expect(metric.finalMp).toBe(metric.maximumMp); }
  });
  it('accepts exact one-MP clipping under the ordinary two-MP rule', () => {
    const ids = [...new Set([...ordinary, ...enemy])];
    const skill = { name: '監査小攻撃', kind: 'hit', power: 20, priority: 0, mpCost: 1 };
    const result: LabResult = runMatch({ ...request, trace: true, overrides: { monsters: Object.fromEntries(ids.map(id => [id, { hp: 1000, atk: 0, mp: 1, skills: [skill] }])) } });
    const credits = result.trace.turns.flatMap(t => t.events).filter(e => e.effect === 'turn-mp-recovery');
    expect(credits.length).toBeGreaterThan(0); expect(credits.every(e => e.amount === 1 && e.mp === 1)).toBe(true);
    expect(result.units.reduce((n, u) => n + u.turnMpRecovered, 0)).toBe(credits.length);
  });
  it('documents the recurring recovery summary separately from the total and slime supply', () => {
    expect(METRIC_DEFINITIONS.meanTurnMpRecovered).toEqual(expect.any(String));
    expect(METRIC_DEFINITIONS.meanTurnMpRecovered.length).toBeGreaterThan(30);
  });
});
