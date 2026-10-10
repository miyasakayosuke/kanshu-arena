import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, NATURE_WARD_PERCENT } from './engine';
// @ts-ignore Development-only JavaScript CLI, shared with Node's native TypeScript loader.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';

vi.mock('./engine', async importOriginal => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});

const request = { teamA: [14, 3, 6, 9, 10], teamB: [12, 0, 2, 11, 13], seed: 42 };
beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});

describe('ward failure snapshots and resource invariants', () => {
  it('retains opening ward and effective percentage before an engine exception', () => {
    vi.mocked(advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected failure before ward expires'); });
    try {
      runMatch({ ...request, overrides: { openingWard: { percent: 15, turns: 3 } } });
      expect.fail('Expected a MatchFailure');
    } catch (error) {
      expect(error).toBeInstanceOf(MatchFailure);
      const failure = error as { trace: { activeAttempt: { unitsBefore: object[] } } };
      expect(failure.trace.activeAttempt.unitsBefore).toContainEqual(expect.objectContaining({ key: 'a0', ward: 3, wardPercent: 15 }));
      expect(failure.trace.activeAttempt.unitsBefore).toContainEqual(expect.objectContaining({ key: 'e0', ward: 0, wardPercent: NATURE_WARD_PERCENT, rally: 2 }));
    }
  });

  it.each([
    { ward: -1 }, { ward: 0.5 }, { ward: 21 }, { ward: Number.NaN }, { ward: Number.POSITIVE_INFINITY },
    { wardPercent: -1 }, { wardPercent: 101 }, { wardPercent: Number.NaN }, { wardPercent: Number.POSITIVE_INFINITY },
  ])('rejects a broken resolved ward resource and retains the offending turn: %#', async patch => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      Object.assign(resolved.state.allies[0], patch);
      return resolved;
    });
    try {
      runMatch(request);
      expect.fail('Expected a MatchFailure');
    } catch (error) {
      expect(error).toBeInstanceOf(MatchFailure);
      const failure = error as { message: string; trace: { activeAttempt: { turn: number }; turns: { unitsAfter: object[] }[] } };
      expect(failure.message).toMatch(/resource invariant.*a0/);
      expect(failure.trace.activeAttempt.turn).toBe(1);
      expect(failure.trace.turns).toHaveLength(1);
      expect(failure.trace.turns[0].unitsAfter).toContainEqual(expect.objectContaining({ key: 'a0', ...patch }));
    }
  });
});
