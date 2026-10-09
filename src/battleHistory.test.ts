import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, DEFEND, MAX_TURNS, start } from './engine';
import type { Order, State } from './engine';
import { applyBattleEvents, buildTimeline } from './playback';
import { resultFacts } from './battleInsights';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

describe('authoritative full battle history', () => {
  it('starts fresh and records the whole turn, its actual commands, and its new text log', () => {
    const initial = start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 2026);
    expect(initial.history).toEqual([]);
    const orders = [{ key: 'a0', skill: 2 }];
    const snapshot = structuredClone(initial);
    const result = advanceWithEvents(freeze(initial), freeze(orders));
    expect(initial).toEqual(snapshot);
    expect(result.state.history).toHaveLength(1);
    expect(result.state.history![0]).toMatchObject({ turn: 1, events: result.events, log: result.state.log.slice(initial.log.length) });
    expect(result.state.history![0].orders).toHaveLength(10);
    expect(result.state.history![0].orders[0]).toMatchObject({ key: 'a0', skill: 2, skillName: '炎嵐', skillKind: 'hit', accepted: true, source: 'explicit' });
    expect(result.state.history![0].orders.find(order => order.key === 'a1')).toMatchObject({ source: 'automatic' });
    for (const cast of result.events.filter(event => event.kind === 'cast')) {
      expect(result.state.history![0].orders.find(order => order.key === cast.actor)).toMatchObject({ skillName: cast.skill, accepted: true });
    }
    expect(start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 2026)).toEqual(snapshot);
  });

  it('takes independent snapshots of returned events, cast target arrays, and caller orders', () => {
    const initial = start([0], [1, 5]);
    const orders: Order[] = [{ key: 'a0', skill: 2 }];
    const result = advanceWithEvents(initial, orders);
    const history = structuredClone(result.state.history);
    orders[0].skill = DEFEND;
    result.events.find(event => event.targets)?.targets?.push('not-a-target');
    result.events[0].effect = 'changed';
    result.events.length = 0;
    expect(result.state.history).toEqual(history);
  });

  it('accepts an older state without inventing missing prior turns', () => {
    const initial = start([0], [1]);
    delete initial.history;
    initial.turn = 7;
    const next = advanceWithEvents(initial, []).state;
    expect(next.history).toHaveLength(1);
    expect(next.history![0].turn).toBe(7);
    expect(initial.history).toBeUndefined();
  });

  it('records rejected orders accurately without converting them into scheduled actions', () => {
    const initial = start([2, 3, 4], [1]);
    initial.allies[2].mp = 0;
    const next = advanceWithEvents(initial, [
      { key: 'a0', skill: 99 }, { key: 'a1', skill: 1, target: 'e0' }, { key: 'a2', skill: 1 },
    ]).state;
    expect(next.history![0].orders.slice(0, 3).map(order => [order.accepted, order.rejection]))
      .toEqual([[false, 'invalid-skill'], [false, 'invalid-target'], [false, 'insufficient-mp']]);
  });

  it('retains every event and log through all 20 turns, without mutating earlier turns or appending after completion', () => {
    const initial = start([1, 2, 5, 7, 10], [1, 2, 5, 7, 10], 19);
    for (const unit of [...initial.allies, ...initial.enemies]) {
      unit.monster = { ...unit.monster, atk: 0, skills: [{ name: '静かな守り', kind: 'guard', power: 0, priority: 1, mpCost: 0 }] };
    }
    let state = initial;
    const allEvents = [];
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      const before = structuredClone(state);
      const result = advanceWithEvents(freeze(state), state.allies.map(unit => ({ key: unit.key, skill: DEFEND })));
      expect(state).toEqual(before);
      allEvents.push(...result.events);
      state = result.state;
      expect(state.history!.map(record => record.turn)).toEqual(Array.from({ length: turn }, (_, index) => index + 1));
      expect(state.history!.slice(0, -1)).toEqual(before.history);
    }
    expect(state.history!.flatMap(record => record.events)).toEqual(allEvents);
    expect(allEvents.length).toBeGreaterThan(1000);
    expect(state.history!.flatMap(record => record.log)).toEqual(state.log.slice(initial.log.length));
    expect(state.winner).toBe('draw');
    expect(advanceWithEvents(state, [])).toEqual({ state, events: [] });
  });

  it('is deterministic across complete battles and equal for natural versus skipped playback', () => {
    const play = (natural: boolean): State => {
      let state = start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 92);
      while (!state.winner) {
        const resolution = advanceWithEvents(state, autoOrders(state));
        if (natural) {
          const oldHistory = state.history;
          for (const cue of buildTimeline(resolution.events).cues) {
            state = applyBattleEvents(state, [...(cue.updates ?? []), ...cue.impacts]);
            expect(state.history).toBe(oldHistory);
          }
          expect(state.allies).toEqual(resolution.state.allies);
          expect(state.enemies).toEqual(resolution.state.enemies);
        }
        state = resolution.state;
      }
      return state;
    };
    const skipped = play(false);
    const natural = play(true);
    expect(natural).toEqual(skipped);
    expect(play(false)).toEqual(skipped);
    expect(resultFacts(natural)).toEqual(resultFacts(skipped));
    const repeatedCues = applyBattleEvents(skipped, skipped.history!.at(-1)!.events);
    expect(repeatedCues.history).toBe(skipped.history);
    expect(resultFacts(repeatedCues)).toEqual(resultFacts(skipped));
  });
});
