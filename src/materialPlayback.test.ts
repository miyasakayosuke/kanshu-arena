import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, DEFEND, start, type BattleEvent, type State } from './engine';
import { ACTION_DURATION_MS, applyBattleEvents, buildTimeline, CAST_IMPACT_MS } from './playback';

const materials = [19, 20, 21, 22, 23];
const defend = (state: State, side: 'allies' | 'enemies') => state[side].map(unit => ({ key: unit.key, skill: DEFEND }));
const resolve = (state: State) => advanceWithEvents(state, defend(state, 'allies'), { enemyOrders: defend(state, 'enemies') });
const fixture = () => { const state = start(materials, [1]); state.allies.forEach(unit => { unit.hp -= 50; }); return state; };
const replay = (state: State, events: BattleEvent[]) => buildTimeline(events).cues.reduce((value, cue) => applyBattleEvents(value, [...(cue.updates ?? []), ...cue.impacts]), state);

describe('material repair presentation-only cue contract', () => {
  it('isolates repair after poison, labels it as passive, and never mutates history or invents authoritative casts', () => {
    const state = fixture(); state.allies[1].poison = 2;
    const result = resolve(state), snapshot = structuredClone(result), timeline = buildTimeline(result.events);
    const startCue = timeline.cues.find(cue => cue.passive && !cue.impacts.length)!;
    const impact = timeline.cues.find(cue => cue.passive && cue.impacts.length)!;
    expect(startCue.cast).toMatchObject({ kind: 'cast', passive: 'material-repair', effect: 'heal', skill: '炉心の修復', actor: 'a0', scope: 'all', targets: ['a0', 'a1', 'a2', 'a3', 'a4'] });
    expect(startCue.cast).not.toHaveProperty('target');
    expect(startCue.passive).toBe('material-repair'); expect(impact.passive).toBe('material-repair');
    expect(impact.at - startCue.at).toBe(CAST_IMPACT_MS);
    expect(timeline.duration - startCue.at).toBe(ACTION_DURATION_MS + 150);
    const poison = timeline.cues.find(cue => cue.impacts.some(event => event.effect === 'poison'))!;
    expect(poison.cast).toBeNull(); expect(poison.passive).toBeUndefined();
    expect(startCue.at).toBeGreaterThan(poison.at);
    expect(impact.impacts.every(event => event.kind === 'heal' && event.effect === 'material-repair')).toBe(true);
    expect(timeline.cues.filter(cue => cue.cast && !cue.passive && !cue.impacts.length)).toHaveLength(result.events.filter(event => event.kind === 'cast').length);
    expect(result.events.some(event => event.kind === 'cast' && event.skill === '炉心の修復')).toBe(false);
    expect(result).toEqual(snapshot);
  });
  it('changes readiness at the passive start, then absolute HP at the800ms impact, with no MP change', () => {
    const state = fixture(), result = resolve(state), timeline = buildTimeline(result.events);
    const index = timeline.cues.findIndex(cue => cue.passive && !cue.impacts.length);
    let played = state;
    for (const cue of timeline.cues.slice(0, index)) played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
    expect(played.allies[0].repairReady).toBe(true);
    const before = played.allies.map(unit => ({ hp: unit.hp, mp: unit.mp }));
    const startCue = timeline.cues[index], impact = timeline.cues[index + 1];
    expect(startCue.updates).toEqual([expect.objectContaining({ kind: 'passive', target: 'a0', repairReady: false })]);
    played = applyBattleEvents(played, startCue.updates!);
    expect(played.allies[0].repairReady).toBe(false);
    expect(played.allies.map(unit => ({ hp: unit.hp, mp: unit.mp }))).toEqual(before);
    played = applyBattleEvents(played, impact.impacts);
    expect(played.allies.map(unit => unit.hp)).toEqual(result.state.allies.map(unit => unit.hp));
    expect(played.allies.map(unit => unit.mp)).toEqual(before.map(unit => unit.mp));
  });
  it('creates a separate repair sequence for each side, and all poison HP updates precede both', () => {
    const state = start(materials, materials);
    for (const unit of [...state.allies, ...state.enemies]) { unit.hp -= 70; unit.poison = 1; }
    const result = resolve(state), timeline = buildTimeline(result.events);
    const passives = timeline.cues.filter(cue => cue.passive && !cue.impacts.length);
    expect(passives.map(cue => cue.cast!.actor)).toEqual(['a0', 'e0']);
    expect(passives[1].at - passives[0].at).toBe(ACTION_DURATION_MS);
    expect(passives[0].at).toBeGreaterThan(Math.max(...timeline.cues.filter(cue => cue.impacts.some(event => event.effect === 'poison')).map(cue => cue.at)));
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
    expect(replay(state, result.events).enemies).toEqual(result.state.enemies);
  });
  it('keeps explicit all-target scope with only one surviving material recipient', () => {
    const state = fixture(); state.allies.slice(1).forEach(unit => { unit.hp = 0; });
    const result = resolve(state), cues = buildTimeline(result.events).cues.filter(cue => cue.passive);
    expect(cues).toHaveLength(2);
    for (const cue of cues) expect(cue.cast).toMatchObject({ scope: 'all', targets: ['a0'] });
    expect(cues[1].impacts).toHaveLength(1);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
  });
  it('still emits visible finite readiness consumption for fullHP or0% repair', () => {
    for (const zeroPercent of [false, true]) {
      const state = start(materials, [1]);
      if (zeroPercent) { state.allies[0].repairPercent = 0; state.allies.forEach(unit => { unit.hp -= 50; }); }
      const result = resolve(state), cues = buildTimeline(result.events).cues.filter(cue => cue.passive);
      expect(cues).toHaveLength(2);
      expect(cues[1].impacts.map(event => event.amount)).toEqual([0, 0, 0, 0, 0]);
      expect(replay(state, result.events).allies).toEqual(result.state.allies);
      expect(result.state.allies[0].repairReady).toBe(false);
    }
  });
  it('updates readiness idempotently without adding a marker to ineligible recipients', () => {
    const state = fixture(), passive: BattleEvent = { kind: 'passive', actor: 'a0', target: 'a0', targets: ['a0', 'a1'], scope: 'all', repairReady: false, effect: 'material-repair' };
    const once = applyBattleEvents(state, [passive]);
    expect(applyBattleEvents(once, [passive])).toEqual(once);
    expect(once.allies[0].repairReady).toBe(false); expect(once.allies[1].repairReady).toBeUndefined();
    expect(state.allies[0].repairReady).toBe(true);
    expect(applyBattleEvents(state, [{ kind: 'defeat', target: 'a0', hp: 0 }]).allies[0].repairReady).toBe(false);
    expect(applyBattleEvents(state, [{ kind: 'defeat', target: 'a1', hp: 0 }]).allies[1].repairReady).toBeUndefined();
  });
  it('replays before/after strip and lethal-hit readiness cancellation without a repair cue', () => {
    for (const attacker of [8, 12]) for (const lethal of [false, true]) {
      const state = start([attacker], materials);
      state.enemies.slice(1).forEach(unit => { unit.hp = 0; });
      if (lethal) state.enemies[0].hp = 1;
      const result = advanceWithEvents(state, [{ key: 'a0', skill: attacker === 8 ? 3 : 0 }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
      expect(buildTimeline(result.events).cues.some(cue => cue.passive)).toBe(false);
      expect(replay(state, result.events).allies).toEqual(result.state.allies);
      expect(replay(state, result.events).enemies).toEqual(result.state.enemies);
      expect(result.state.enemies[0].repairReady).toBe(false);
    }
  });
  it('replays poison death and initial dead-core cleanup without reviving or leaving stale readiness', () => {
    for (const initialHp of [0, 1]) {
      const state = fixture(); state.allies[0].hp = initialHp; state.allies[0].poison = 1;
      const result = resolve(state);
      expect(buildTimeline(result.events).cues.some(cue => cue.passive)).toBe(false);
      expect(replay(state, result.events).allies).toEqual(result.state.allies);
      expect(result.state.allies[0]).toMatchObject({ hp: 0, repairReady: false });
    }
  });
  it('normal,2x,repeated-cue and skip playback agree throughout a full deterministic material battle', () => {
    let state = start(materials, [14, 3, 6, 9, 10], 42, { leaders: true });
    while (!state.winner) {
      const result = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
      const timeline = buildTimeline(result.events);
      let normal = state, double = state, repeated = state;
      const atRate = timeline.cues.map((cue, index) => ({ ...cue, at: cue.at / 2, index })).sort((a, b) => a.at - b.at || a.index - b.index);
      for (const cue of timeline.cues) {
        const updates = [...(cue.updates ?? []), ...cue.impacts];
        normal = applyBattleEvents(normal, updates);
        repeated = applyBattleEvents(applyBattleEvents(repeated, updates), updates);
      }
      for (const cue of atRate) double = applyBattleEvents(double, [...(cue.updates ?? []), ...cue.impacts]);
      const skip = applyBattleEvents(state, result.events);
      for (const played of [normal, double, repeated, skip]) {
        expect(played.allies).toEqual(result.state.allies); expect(played.enemies).toEqual(result.state.enemies);
      }
      state = result.state;
    }
  });
  it('does not misgroup repair with the last cast when no poison exists, or with later repair on the other side', () => {
    const state = fixture();
    const result = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: BASIC_ATTACK })), { enemyOrders: defend(state, 'enemies') });
    const timeline = buildTimeline(result.events), lastCast = timeline.cues.slice().reverse().find(cue => cue.cast && !cue.passive)!;
    const passive = timeline.cues.find(cue => cue.passive)!;
    expect(passive.at).toBeGreaterThan(lastCast.at);
    expect(lastCast.impacts.some(event => event.effect === 'material-repair')).toBe(false);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
  });
});
