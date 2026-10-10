import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents } from './engine';
// @ts-ignore Development-only JavaScript shared with Node's native loader.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine', async importOriginal => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});
const dragon = [15, 5, 16, 17, 18];
const nature = [14, 3, 6, 9, 10];
beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});
const capture = (request: object) => {
  try { runMatch(request); } catch (error) { expect(error).toBeInstanceOf(MatchFailure); return error as Error & { trace: { activeAttempt: { unitsBefore: object[] }; turns: { unitsAfter: object[] }[] } }; }
  throw new Error('Expected failure');
};
describe('dragon failure evidence and immutable enablement', () => {
  it.each(['allies', 'enemies'] as const)('retains optional charge/perPoint in pre-failure %s snapshot', async side => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected second-turn dragon failure'); });
    const failure = capture({ teamA: side === 'allies' ? dragon : nature, teamB: side === 'allies' ? nature : dragon, seed: 42, overrides: { dragonCharge: { perPoint: 11 } } });
    expect(failure.trace.turns).toHaveLength(1);
    const key = side === 'allies' ? 'a0' : 'e0';
    expect(failure.trace.activeAttempt.unitsBefore).toContainEqual(expect.objectContaining({ key, dragonChargePerPoint: 11 }));
    for (const unit of failure.trace.activeAttempt.unitsBefore as { key: string; dragonCharge?: number }[]) if (unit.key !== key) expect(Object.hasOwn(unit, 'dragonCharge')).toBe(false);
  });
  it.each([{ dragonCharge: -1 }, { dragonCharge: 6 }, { dragonCharge: 0.5 }, { dragonCharge: NaN }, { dragonCharge: Infinity }, { dragonCharge: undefined }, { dragonChargePerPoint: 12 }])('captures invalid resolved charge resource %#', async patch => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const result = actual.advanceWithEvents(state, orders, options); Object.assign(result.state.allies[0], patch); return result;
    });
    const failure = capture({ teamA: dragon, teamB: nature, seed: 42, overrides: { dragonCharge: { perPoint: 11 } } });
    expect(failure.message).toMatch(/resource invariant.*a0/); expect(failure.trace.turns).toHaveLength(1);
  });
  it.each([true, false])('rejects a magically enabled noncore or disabled core (disabled=%s)', async disabled => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const result = actual.advanceWithEvents(state, orders, options); result.state.allies[disabled ? 0 : 1].dragonCharge = 0; return result;
    });
    expect(capture({ teamA: dragon, teamB: nature, seed: 42, overrides: disabled ? { dragonCharge: { enabled: false } } : {} }).message).toMatch(/resource invariant/);
  });
  it('rejects an event/state charge mismatch and retains the corrupt event trace', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const result = actual.advanceWithEvents(state, orders, options);
      result.events.push({ kind: 'charge', actor: 'a0', target: 'a0', dragonCharge: result.state.allies[0].dragonCharge === 5 ? 4 : 5, effect: 'corrupt' }); return result;
    });
    expect(capture({ teamA: dragon, teamB: nature, seed: 42 }).message).toMatch(/charge event\/state mismatch/);
  });
});
