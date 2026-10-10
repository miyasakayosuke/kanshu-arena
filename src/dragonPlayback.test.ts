import { describe, expect, it } from 'vitest';
import { advanceWithEvents, BASIC_ATTACK, DEFEND, start, type BattleEvent, type State, type Unit } from './engine';
import { applyBattleEvents, buildTimeline, CAST_IMPACT_MS, MULTIHIT_INTERVAL_MS } from './playback';

const dragons = [15, 5, 16, 17, 18];
const target = (key: string, hp = 5000): Unit => ({ key, monster: { id: -1, name: '標的', icon: '', cost: 1, hp, mp: 0, atk: 0, speed: 0, skills: [] }, hp, mp: 0, guard: false, poison: 0 });
const fixture = () => ({ ...start(dragons, [], 42), enemies: [target('e0'), target('e1')] });
const resolve = (state: State, skill: number, actor = 'a0') => advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: unit.key === actor ? skill : DEFEND })), { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: BASIC_ATTACK })) });
const replay = (state: State, events: BattleEvent[]) => buildTimeline(events).cues.reduce((value, cue) => applyBattleEvents(value, [...(cue.updates ?? []), ...cue.impacts]), state);

describe('dragon charge authoritative playback', () => {
  it('spends at the finisher cast, before HP changes, and retains spent-count metadata', () => {
    const state = fixture(); state.allies[0].dragonCharge = 5;
    const result = resolve(state, 0), timeline = buildTimeline(result.events);
    const cast = timeline.cues.find(cue => cue.cast?.actor === 'a0' && !cue.impacts.length)!;
    expect(cast.cast).toMatchObject({ dragonChargeSpent: 5, scope: 'all' });
    expect(cast.updates).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'charge', dragonCharge: 0 })]));
    const atCast = applyBattleEvents(state, cast.updates!);
    expect(atCast.allies[0]).toMatchObject({ mp: 34, dragonCharge: 0 });
    expect(atCast.enemies.map(unit => unit.hp)).toEqual([5000, 5000]);
    const impact = timeline.cues.find(cue => cue.cast?.actor === 'a0' && cue.impacts.some(event => event.kind === 'damage'))!;
    expect(impact.at - cast.at).toBe(CAST_IMPACT_MS);
    expect(impact.cast).toMatchObject({ dragonChargeSpent: 5 });
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
    expect(replay(state, result.events).enemies).toEqual(result.state.enemies);
  });
  it('gains quietly after the last actual random impact without adding a cast or moving to round-end', () => {
    const state = fixture(), result = resolve(state, 0, 'a3');
    const timeline = buildTimeline(result.events);
    const cast = timeline.cues.find(cue => cue.cast?.actor === 'a3' && !cue.impacts.length)!;
    const gainIndex = timeline.cues.findIndex(cue => cue.updates?.some(event => event.effect === 'dragon-charge-gain'));
    const gain = timeline.cues[gainIndex];
    expect(gain).toMatchObject({ at: cast.at + CAST_IMPACT_MS + MULTIHIT_INTERVAL_MS, cast: null, impacts: [] });
    expect(timeline.cues[gainIndex - 1].impacts).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'damage', hitIndex: 1 })]));
    expect(timeline.cues.filter(cue => cue.cast && !cue.impacts.length)).toHaveLength(result.events.filter(event => event.kind === 'cast').length);
    expect(gain.at).toBeLessThan(timeline.duration - 150);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
    expect(replay(state, result.events).enemies).toEqual(result.state.enemies);
  });
  it('uses one actual impact when a random cast defeats the only remaining enemy', () => {
    const state = fixture(); state.enemies = [target('e0', 1)];
    const result = resolve(state, 0, 'a3'), timeline = buildTimeline(result.events);
    const cast = timeline.cues.find(cue => cue.cast?.actor === 'a3' && !cue.impacts.length)!;
    expect(cast.cast!.hitTargets).toHaveLength(1);
    const gain = timeline.cues.find(cue => cue.updates?.some(event => event.effect === 'dragon-charge-gain'))!;
    expect(gain.at).toBe(cast.at + CAST_IMPACT_MS);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
  });
  it('applies absolute charge events idempotently and leaves unrelated units unmodified', () => {
    const state = fixture(), event: BattleEvent = { kind: 'charge', actor: 'a3', target: 'a0', dragonCharge: 2, effect: 'dragon-charge-gain', phase: 'action-end' };
    const once = applyBattleEvents(state, [event]);
    expect(applyBattleEvents(once, [event])).toEqual(once);
    expect(once.allies[0].dragonCharge).toBe(2); expect(once.allies[1].dragonCharge).toBeUndefined();
    expect(state.allies[0].dragonCharge).toBe(0);
  });
  it('replays before/after dispels and poison death charge resets exactly', () => {
    for (const attacker of [8, 12]) {
      const state = start([attacker], dragons, 42); state.enemies[0].dragonCharge = 5;
      state.enemies.slice(1).forEach(unit => { unit.hp = 0; });
      const result = advanceWithEvents(state, [{ key: 'a0', skill: attacker === 8 ? 3 : 0 }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
      expect(replay(state, result.events).enemies).toEqual(result.state.enemies);
    }
    const state = fixture(); state.allies[0].hp = 1; state.allies[0].poison = 1; state.allies[0].dragonCharge = 5;
    const result = resolve(state, DEFEND);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
    expect(result.state.allies[0]).toMatchObject({ hp: 0, dragonCharge: 0 });
  });
  it('normal/repeated-event playback and skip agree on all units for a full charge-and-release turn', () => {
    const state = fixture();
    const result = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: 0 })), { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: BASIC_ATTACK })) });
    const timeline = buildTimeline(result.events);
    let normal = state, repeated = state;
    for (const cue of timeline.cues) {
      const updates = [...(cue.updates ?? []), ...cue.impacts];
      normal = applyBattleEvents(normal, updates);
      repeated = applyBattleEvents(applyBattleEvents(repeated, updates), updates);
    }
    expect(normal.allies).toEqual(result.state.allies); expect(normal.enemies).toEqual(result.state.enemies);
    expect(repeated.allies).toEqual(result.state.allies); expect(repeated.enemies).toEqual(result.state.enemies);
  });
});
