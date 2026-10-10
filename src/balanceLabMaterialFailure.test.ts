import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents } from './engine';
import type { BattleEvent, State } from './engine';
// @ts-ignore Development-only JavaScript shared with Node's native TypeScript loader.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';

vi.mock('./engine', async importOriginal => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});
const material = [19, 20, 21, 22, 23];
const nature = [14, 3, 6, 9, 10];
type Snapshot = { key: string; repairReady?: boolean; repairPercent?: number };
type Failure = Error & { trace: { initialState: State; lastState: State;
  activeAttempt: { turn: number; unitsBefore: Snapshot[] }; turns: { events: BattleEvent[]; unitsAfter: Snapshot[] }[] } };
beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});
const capture = (request: object): Failure => {
  try { runMatch(request); } catch (error) { expect(error).toBeInstanceOf(MatchFailure); return error as Failure; }
  throw new Error('Expected a preserved material failure');
};
const request = { teamA: material, teamB: nature, seed: 42, overrides: { materialRepair: { percent: 11 } } };

describe('material failure snapshots and immutable eligibility', () => {
  it.each([false, true])('retains waiting/consumed optional resources before failed engine calls (material on right=%s)', async reverse => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    for (const percent of [undefined, 11]) for (const failedTurn of [1, 2]) {
      vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
      if (failedTurn === 2) vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents);
      vi.mocked(advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected material resolver failure'); });
      const failure = capture({ teamA: reverse ? nature : material, teamB: reverse ? material : nature, seed: 42,
        overrides: percent === undefined ? {} : { materialRepair: { percent } } });
      const key = reverse ? 'e0' : 'a0';
      expect(failure.trace.turns).toHaveLength(failedTurn - 1);
      expect(failure.trace.activeAttempt.turn).toBe(failedTurn);
      const core = failure.trace.activeAttempt.unitsBefore.find(unit => unit.key === key)!;
      expect(core.repairReady).toBe(failedTurn === 1);
      if (percent === undefined) expect(Object.hasOwn(core, 'repairPercent')).toBe(false);
      else expect(core.repairPercent).toBe(percent);
      for (const unit of failure.trace.activeAttempt.unitsBefore) if (unit.key !== key) {
        expect(Object.hasOwn(unit, 'repairReady')).toBe(false);
        expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
      }
      expect(JSON.parse(JSON.stringify(failure.trace))).toEqual(failure.trace);
    }
  });

  it.each([
    { repairReady: -1 }, { repairReady: 0 }, { repairReady: 'false' }, { repairReady: null },
    { repairReady: undefined }, { repairReady: true }, { repairPercent: 12 }, { repairPercent: undefined },
    { repairPercent: -1 }, { repairPercent: 101 }, { repairPercent: 1.5 }, { repairPercent: NaN }, { repairPercent: Infinity },
  ])('captures malformed or changed repair resources %#', async patch => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      Object.assign(resolved.state.allies[0], patch);
      return resolved;
    });
    const failure = capture(request);
    expect(failure.message).toMatch(/resource invariant.*a0/);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.activeAttempt.turn).toBe(1);
  });

  it.each([true, false])('rejects magically present repair state on a noncore or disabled core (disabled=%s)', async disabled => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      resolved.state.allies[disabled ? 0 : 1].repairReady = false;
      return resolved;
    });
    expect(capture({ ...request, overrides: disabled ? { materialRepair: { enabled: false } } : {} }).message).toMatch(/resource invariant/);
  });

  it('rejects an unrecorded cancellation and retains the offending resolved snapshot', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      resolved.events = resolved.events.filter(event => event.effect !== 'material-repair');
      return resolved;
    });
    const failure = capture(request);
    expect(failure.message).toMatch(/repair event\/state mismatch.*a0/);
    expect(failure.trace.turns[0].unitsAfter).toContainEqual(expect.objectContaining({ key: 'a0', repairReady: false, repairPercent: 11 }));
  });
});

describe('material event-stream accounting invariants', () => {
  it.each([
    ['trigger-repeat', /invalid material repair trigger/],
    ['trigger-target', /invalid material repair trigger/],
    ['trigger-phase', /material repair|repair.*phase/],
    ['unrelated-passive', /unexpected material repair cancellation|invalid material repair/],
    ['cast-effect', /material repair/],
    ['wrong-recipient', /material repair recipients/],
    ['duplicate-recipient', /material repair recipients/],
    ['missing-heal', /material repair missing recipient/],
    ['duplicate-heal', /material repair healing\/recipient/],
    ['wrong-amount', /material repair healing\/recipient/],
    ['wrong-hp', /material repair healing\/recipient/],
    ['heal-phase', /material repair|repair.*phase/],
    ['reenabled-event', /event enables disabled or consumed material repair/],
    ['repair-mp-before', /material repair|repair.*MP|MP.*repair/],
    ['repair-mp-after', /material repair cannot spend MP|action, MP debit or poison occurred after material repair/],
    ['poison-after', /action, MP debit or poison occurred after material repair/],
  ] as const)('captures %s corruption with the full failing turn', async (kind, message) => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      const passiveIndex = resolved.events.findIndex(event => event.kind === 'passive' && event.effect === 'material-repair');
      const healIndex = resolved.events.findIndex(event => event.kind === 'heal' && event.effect === 'material-repair');
      expect(passiveIndex).toBeGreaterThanOrEqual(0);
      expect(healIndex).toBeGreaterThan(passiveIndex);
      const passive = resolved.events[passiveIndex];
      const heal = resolved.events[healIndex];
      if (kind === 'trigger-repeat') resolved.events.splice(passiveIndex + 1, 0, structuredClone(passive));
      else if (kind === 'trigger-target') passive.target = 'a1';
      else if (kind === 'trigger-phase') passive.phase = 'action';
      else if (kind === 'unrelated-passive') {
        resolved.events = resolved.events.filter(event => event.effect !== 'material-repair');
        resolved.events.push({ kind: 'passive', actor: 'a0', target: 'a0', effect: 'unrelated-fixture', repairReady: false, phase: 'turn-end' });
      }
      else if (kind === 'cast-effect') resolved.events.splice(passiveIndex, 0, { kind: 'cast', actor: 'a0', target: 'e0', effect: 'material-repair', phase: 'action' });
      else if (kind === 'wrong-recipient') passive.targets = ['e0'];
      else if (kind === 'duplicate-recipient') passive.targets!.push(passive.targets![0]);
      else if (kind === 'missing-heal') resolved.events.splice(healIndex, 1);
      else if (kind === 'duplicate-heal') resolved.events.splice(healIndex + 1, 0, structuredClone(heal));
      else if (kind === 'wrong-amount') heal.amount = (heal.amount ?? 0) + 1;
      else if (kind === 'wrong-hp') heal.hp = (heal.hp ?? 0) + 1;
      else if (kind === 'heal-phase') heal.phase = 'action';
      else if (kind === 'reenabled-event') resolved.events.push({ kind: 'expire', target: 'a0', repairReady: true });
      else if (kind === 'repair-mp-before' || kind === 'repair-mp-after') resolved.events.splice(passiveIndex + (kind === 'repair-mp-before' ? 0 : 1), 0,
        { kind: 'resource', actor: 'a0', target: 'a0', amount: 1, mp: resolved.state.allies[0].mp - 1, effect: 'material-repair', phase: 'turn-end' });
      else if (kind === 'poison-after') resolved.events.push({ kind: 'damage', target: 'a0', amount: 1, effect: 'poison', phase: 'turn-end' });
      return resolved;
    });
    const failure = capture(request);
    expect(failure.message).toMatch(message);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.turns[0].events.length).toBeGreaterThan(0);
  });
});
