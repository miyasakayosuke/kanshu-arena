import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, monsters } from './engine';
import type { BattleEvent, Skill, State } from './engine';
// @ts-ignore Development-only JavaScript shared with Node's native TypeScript loader.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';

vi.mock('./engine', async importOriginal => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, advanceWithEvents: vi.fn(actual.advanceWithEvents) };
});
const demons = [29, 1, 8, 30, 31], nature = [14, 3, 6, 9, 10];
const paid: Skill = { name: 'Fixture paid anchor', kind: 'hit', power: 40, mpCost: 16, priority: -2 };
const pressure = { monsters: Object.fromEntries([...demons, ...nature].map(id => [id,
  { hp: 1500, atk: 0, speed: id === 29 ? 100 : 0, mp: id === 29 ? 64 : 16,
    skills: id === 29 ? [monsters[29].skills[0]!] : nature.includes(id) ? [paid] : [] }])) };
const request = { teamA: demons, teamB: nature, seed: 42, overrides: pressure };
type Snapshot = { key: string; hp: number; mp: number; mpDamageBonus?: number };
type Failure = Error & { trace: { initialState: State; lastState: State;
  activeAttempt: { turn: number; unitsBefore: Snapshot[] };
  turns: { events: BattleEvent[]; unitsAfter: Snapshot[] }[] } };
const capture = (input: object = request): Failure => {
  try { runMatch(input); } catch (error) { expect(error).toBeInstanceOf(MatchFailure); return error as Failure; }
  throw new Error('Expected a preserved demon contract failure');
};
beforeEach(async () => {
  const actual = await vi.importActual<typeof import('./engine')>('./engine');
  vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
});

describe('demon immutable opening bonus and failure evidence', () => {
  it.each([false, true])('preserves absent/default/explicit-zero bonus on a failed attempt, right=%s', async reverse => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    for (const tuning of [{}, { bonus: 0 }, { enabled: false }]) for (const failedTurn of [1, 2]) {
      vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);
      if (failedTurn === 2) vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents);
      vi.mocked(advanceWithEvents).mockImplementationOnce(() => { throw new Error('Injected demon resolver failure'); });
      const failure = capture({ teamA: reverse ? nature : demons, teamB: reverse ? demons : nature, seed: 42,
        overrides: { ...pressure, demonPressure: tuning } });
      expect(failure.message).toBe('Injected demon resolver failure');
      expect(failure.trace.turns).toHaveLength(failedTurn - 1);
      expect(failure.trace.activeAttempt.turn).toBe(failedTurn);
      const coreKey = reverse ? 'e0' : 'a0';
      for (const unit of failure.trace.activeAttempt.unitsBefore) {
        if (unit.key === coreKey && !('enabled' in tuning)) expect(unit.mpDamageBonus).toBe('bonus' in tuning ? 0 : 4);
        else expect(Object.hasOwn(unit, 'mpDamageBonus')).toBe(false);
      }
      expect(JSON.parse(JSON.stringify(failure.trace))).toEqual(failure.trace);
    }
  });

  it.each([undefined, null, false, '4', -1, 0, 5, 31, 1.5, NaN, Infinity])('rejects replaced or malformed fixed bonus %#', async mpDamageBonus => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      Object.assign(resolved.state.allies[0], { mpDamageBonus });
      return resolved;
    });
    const failure = capture();
    expect(failure.message).toMatch(/resource invariant.*a0/);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.activeAttempt.turn).toBe(1);
  });

  it.each([false, true])('rejects bonus created on a noncore or disabled core (%s)', async disabled => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      resolved.state.allies[disabled ? 0 : 1].mpDamageBonus = 0;
      return resolved;
    });
    expect(capture({ ...request, overrides: { ...pressure, ...(disabled ? { demonPressure: { enabled: false } } : {}) } }).message).toMatch(/resource invariant/);
  });

  it('rejects unrecorded MP gain by the pressure source even below its maximum', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      resolved.state.allies[0].mp++;
      return resolved;
    });
    expect(capture().message).toMatch(/MP ledger/);
  });
});

describe('demon authoritative resource-loss invariants', () => {
  it.each(['missing-loss', 'duplicate-loss', 'before-hp-hit', 'missing-hp-hit', 'killed-target', 'wrong-actor', 'wrong-target',
    'self-loss', 'negative-amount', 'fractional-amount', 'wrong-amount', 'wrong-absolute-mp', 'missing-absolute-mp', 'wrong-skill',
    'wrong-phase', 'wrong-effect', 'random-hit-index', 'loss-as-debit', 'self-gain', 'loss-changes-hp'] as const)
  ('rejects %s and retains the full failing event stream', async kind => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      const index = resolved.events.findIndex(event => event.kind === 'resource-loss');
      expect(index).toBeGreaterThan(0);
      const loss = resolved.events[index], hit = resolved.events[index - 1];
      expect(hit).toMatchObject({ kind: 'damage', actor: loss.actor, target: loss.target });
      if (kind === 'missing-loss') resolved.events.splice(index, 1);
      else if (kind === 'duplicate-loss') resolved.events.splice(index + 1, 0, structuredClone(loss));
      else if (kind === 'before-hp-hit') [resolved.events[index - 1], resolved.events[index]] = [loss, hit];
      else if (kind === 'missing-hp-hit') resolved.events.splice(index - 1, 1);
      else if (kind === 'killed-target') hit.hp = 0;
      else if (kind === 'wrong-actor') loss.actor = 'a1';
      else if (kind === 'wrong-target') loss.target = loss.target === 'e0' ? 'e1' : 'e0';
      else if (kind === 'self-loss') loss.target = loss.actor;
      else if (kind === 'negative-amount') loss.amount = -1;
      else if (kind === 'fractional-amount') loss.amount! += 0.5;
      else if (kind === 'wrong-amount') loss.amount!++;
      else if (kind === 'wrong-absolute-mp') loss.mp!++;
      else if (kind === 'missing-absolute-mp') delete loss.mp;
      else if (kind === 'wrong-skill') loss.skill = paid.name;
      else if (kind === 'wrong-phase') loss.phase = 'turn-end';
      else if (kind === 'wrong-effect') loss.effect = 'mp';
      else if (kind === 'random-hit-index') loss.hitIndex = 0;
      else if (kind === 'loss-as-debit') loss.kind = 'resource';
      else if (kind === 'self-gain') resolved.events.splice(index + 1, 0,
        { kind: 'resource-gain', actor: loss.actor, target: loss.actor, amount: loss.amount, mp: 64, effect: 'mp-damage', phase: 'action' });
      else if (kind === 'loss-changes-hp') loss.hp = hit.hp! + 1;
      return resolved;
    });
    const failure = capture();
    expect(failure.message).toMatch(/MP|mp|loss|resource/);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.turns[0].events.length).toBeGreaterThan(0);
    expect(failure.trace.activeAttempt.turn).toBe(1);
  });
});

describe('demon fallback action evidence invariants', () => {
  it.each(['missing-fallback', 'duplicate-fallback', 'wrong-from', 'wrong-to', 'wrong-priority', 'wrong-cost', 'wrong-available-mp',
    'wrong-reason', 'wrong-phase', 'wrong-skill', 'friendly-target', 'missing-basic', 'paid-cast', 'paid-debit', 'second-cast'] as const)
  ('rejects %s instead of charging or counting the original paid command', async kind => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state, orders, options) => {
      const resolved = actual.advanceWithEvents(state, orders, options);
      const index = resolved.events.findIndex(event => event.kind === 'fallback');
      expect(index).toBeGreaterThan(0);
      const fallback = resolved.events[index];
      const castIndex = resolved.events.findIndex((event, i) => i > index && event.kind === 'cast' && event.actor === fallback.actor);
      expect(castIndex).toBeGreaterThan(index);
      const cast = resolved.events[castIndex];
      if (kind === 'missing-fallback') resolved.events.splice(index, 1);
      else if (kind === 'duplicate-fallback') resolved.events.splice(index + 1, 0, structuredClone(fallback));
      else if (kind === 'wrong-from') fallback.fromSkill = 1;
      else if (kind === 'wrong-to') fallback.toSkill = 0;
      else if (kind === 'wrong-priority') fallback.queuePriority = 0;
      else if (kind === 'wrong-cost') fallback.requiredMP!++;
      else if (kind === 'wrong-available-mp') fallback.availableMP!++;
      else if (kind === 'wrong-reason') delete fallback.reason;
      else if (kind === 'wrong-phase') fallback.phase = 'turn-end';
      else if (kind === 'wrong-skill') fallback.skill = '通常攻撃';
      else if (kind === 'friendly-target') fallback.target = fallback.actor;
      else if (kind === 'missing-basic') resolved.events.splice(castIndex, 1);
      else if (kind === 'paid-cast') cast.skill = paid.name;
      else if (kind === 'paid-debit') resolved.events.splice(castIndex + 1, 0,
        { kind: 'resource', actor: fallback.actor, target: fallback.actor, amount: 16, mp: fallback.availableMP! - 16, effect: 'mp', phase: 'action' });
      else if (kind === 'second-cast') resolved.events.splice(castIndex + 1, 0, structuredClone(cast));
      return resolved;
    });
    const failure = capture();
    expect(failure.message).toMatch(/fallback|MP|cast|queue/);
    expect(failure.trace.turns).toHaveLength(1);
    expect(failure.trace.turns[0].events.some(event => event.kind === 'resource-loss')).toBe(true);
  });
});
