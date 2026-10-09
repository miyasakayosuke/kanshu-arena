import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, autoOrders } from './engine';
import type { BattleEvent, Order, State } from './engine';
// The JavaScript CLI module is shared with Node's native TypeScript loader.
// @ts-ignore No declaration file is needed for this test-only CLI module.
import { createBattle, MatchFailure, runMatch, runSuite } from '../scripts/balance-lab/core.mjs';

vi.mock('./engine', async importOriginal => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});

const teamA = [12, 0, 2, 6, 10];
const teamB = [1, 2, 7, 10, 6];
const request = { teamA, teamB, seed: 42, overrides: {} };
type Failure = Error & {
  request: typeof request;
  matchId?: string;
  trace: {
    initialState: State;
    turns: { turn: number; events: BattleEvent[]; unitsAfter: { key: string; hp: number; mp: number }[] }[];
    activeAttempt: { turn: number; seedBefore: number; orders: Order[]; enemyOrders: Order[]; unitsBefore: { key: string; hp: number; mp: number }[] };
    lastState: State;
  };
};
function capture(action: () => unknown): Failure {
  try { action(); } catch (error) {
    expect(error).toBeInstanceOf(MatchFailure);
    return error as Failure;
  }
  throw new Error('Expected the injected resolver failure to be preserved');
}

beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});

describe('balance lab failure evidence', () => {
  it('preserves the exact initial request, both proposed policies, and state when the resolver throws', () => {
    vi.mocked(advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected resolver failure'); });
    const initial: State = createBattle(teamA, teamB, 42);
    const failure = capture(() => runMatch(request));
    expect(failure.message).toBe('Injected resolver failure');
    expect(failure.request).toEqual(request);
    expect(failure.trace.initialState).toEqual(initial);
    expect(failure.trace.lastState).toEqual(initial);
    expect(failure.trace.turns).toEqual([]);
    expect(failure.trace.activeAttempt).toMatchObject({
      turn: 1, seedBefore: 42, orders: autoOrders(initial), enemyOrders: autoOrders(initial, 'enemies'),
    });
    expect(failure.trace.activeAttempt.unitsBefore).toHaveLength(10);
    expect(JSON.parse(JSON.stringify(failure.trace))).toEqual(failure.trace);
  });

  it('retains completed-turn evidence and the next attempted turn when a later resolver call fails', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents)
      .mockImplementationOnce(actual.advanceWithEvents)
      .mockImplementationOnce(() => { throw new Error('Injected turn-two failure'); });
    const failure = capture(() => runMatch(request));
    const initial: State = createBattle(teamA, teamB, 42);
    const first = actual.advanceWithEvents(initial, autoOrders(initial), { enemyOrders: autoOrders(initial, 'enemies') });
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.turns[0].events).toEqual(first.events);
    expect(failure.trace.lastState).toEqual(first.state);
    expect(failure.trace.activeAttempt).toMatchObject({ turn: 2, seedBefore: first.state.seed });
  });

  it('captures resolved events and illegal resource snapshots when an invariant fails', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      resolved.state.allies[0].mp = -1;
      return resolved;
    });
    const failure = capture(() => runMatch(request));
    expect(failure.message).toMatch(/resource invariant.*a0/);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.turns[0].events.length).toBeGreaterThan(0);
    expect(failure.trace.turns[0].unitsAfter).toContainEqual(expect.objectContaining({ key: 'a0', mp: -1 }));
    expect(failure.trace.activeAttempt.turn).toBe(1);
  });

  it('adds the scheduled match ID to a suite failure without swallowing the underlying evidence', () => {
    vi.mocked(advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected suite failure'); });
    const failure = capture(() => runSuite({
      schemaVersion: 1, suiteId: 'failure-test', seeds: [42], costLimit: 17,
      teams: [{ id: 'a', role: 'beasts', ids: teamA }, { id: 'b', role: 'guards', ids: teamB }],
      scenarios: [{ id: 'a-vs-b', a: 'a', b: 'b', complaintIds: [] }],
      candidate: { id: 'identity', label: 'Unchanged rules', overrides: {} },
    }));
    expect(failure.matchId).toBe('a-vs-b__s42__a-left__baseline');
    expect(failure.message).toBe('Injected suite failure');
    expect(failure.request).toEqual(request);
    expect(failure.trace.activeAttempt.orders).toHaveLength(5);
    expect(failure.trace.activeAttempt.enemyOrders).toHaveLength(5);
  });
});
