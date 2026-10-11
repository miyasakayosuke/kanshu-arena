import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, DEFEND, start, type BattleEvent, type State } from './engine';
import { ACTION_DURATION_MS, applyBattleEvents, buildTimeline, CAST_IMPACT_MS, effectType } from './playback';

const slimes = [24, 25, 26, 27, 28];
const defend = (state: State, side: 'allies' | 'enemies') => state[side].map(unit => ({ key: unit.key, skill: DEFEND }));
const supply = (state: State, side: 'allies' | 'enemies') => defend(state, side).map(order => order.key === state[side].find(unit => unit.monster.id === 24)?.key ? { key: order.key, skill: 0 } : order);
const resolve = (state: State) => advanceWithEvents(state, supply(state, 'allies'), { enemyOrders: defend(state, 'enemies') });
const fixture = () => { const state = start(slimes, [1]); state.allies.forEach(unit => { unit.mp -= 8; }); return state; };
const replay = (state: State, events: BattleEvent[]) => buildTimeline(events).cues.reduce((value, cue) => applyBattleEvents(value, [...(cue.updates ?? []), ...cue.impacts]), state);

describe('finite slime supply cast and MP-impact playback', () => {
  it('keeps the chosen supply cast separate from its cast-start allowance and800ms MP-only impacts', () => {
    const state = fixture(), result = resolve(state), before = structuredClone(result), timeline = buildTimeline(result.events);
    const startCue = timeline.cues.find(cue => cue.cast?.effect === 'restoreMp' && !cue.impacts.length)!;
    const impactCue = timeline.cues.find(cue => cue.cast?.effect === 'restoreMp' && cue.impacts.length)!;
    expect(startCue.cast).toMatchObject({ kind: 'cast', skill: '蓄え分け', effect: 'restoreMp', scope: 'all', targets: ['a0', 'a1', 'a2', 'a3', 'a4'] });
    expect(startCue.cast).not.toHaveProperty('target'); expect(startCue.cast).not.toHaveProperty('passive');
    expect(startCue.updates).toEqual([expect.objectContaining({ kind: 'supply', effect: 'slime-supply-spend', target: 'a0', supplyReady: false })]);
    expect(impactCue.at - startCue.at).toBe(CAST_IMPACT_MS);
    expect(timeline.duration - startCue.at).toBe(ACTION_DURATION_MS + 150);
    expect(impactCue.impacts).toHaveLength(5);
    expect(impactCue.impacts.every(event => event.kind === 'resource-gain' && event.effect === 'slime-supply' && event.amount === 8 && event.hp === undefined)).toBe(true);
    expect(effectType('蓄え分け', 'restoreMp')).toBe('water'); expect(result).toEqual(before);
  });
  it('changes allowance immediately and absolute MP only at impact, preserving HP and poison', () => {
    const state = fixture(); state.allies[1].poison = 2;
    const result = resolve(state), timeline = buildTimeline(result.events);
    const index = timeline.cues.findIndex(cue => cue.cast?.effect === 'restoreMp' && !cue.impacts.length);
    let played = state;
    for (const cue of timeline.cues.slice(0, index)) played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
    const before = played.allies.map(unit => ({ hp: unit.hp, mp: unit.mp, poison: unit.poison }));
    expect(played.allies[0].supplyReady).toBe(true);
    played = applyBattleEvents(played, timeline.cues[index].updates!);
    expect(played.allies[0].supplyReady).toBe(false);
    expect(played.allies.map(unit => ({ hp: unit.hp, mp: unit.mp, poison: unit.poison }))).toEqual(before);
    played = applyBattleEvents(played, timeline.cues[index + 1].impacts);
    expect(played.allies.map(unit => unit.mp)).toEqual(state.allies.map(unit => unit.monster.mp));
    expect(played.allies.map(unit => ({ hp: unit.hp, poison: unit.poison }))).toEqual(before.map(({ hp, poison }) => ({ hp, poison })));
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
  });
  it('absolute zero and capped individual gains do not imply HP healing or a full8MP gain', () => {
    const state = fixture(); state.allies[1].mp = state.allies[1].monster.mp; state.allies[2].mp = state.allies[2].monster.mp - 1;
    const result = resolve(state), impact = buildTimeline(result.events).cues.find(cue => cue.cast?.effect === 'restoreMp' && cue.impacts.length)!;
    expect(impact.impacts.map(event => event.amount)).toEqual([8, 0, 1, 8, 8]);
    expect(impact.impacts.some(event => event.kind === 'heal' || event.kind === 'resource')).toBe(false);
    expect(replay(state, result.events).allies).toEqual(result.state.allies);
  });
  it('zero-amount isolated ablation keeps visible finite-use consumption and zero MP impacts', () => {
    const state = fixture(); state.allies[0].supplyAmount = 0;
    const result = resolve(state), cues = buildTimeline(result.events).cues.filter(cue => cue.cast?.effect === 'restoreMp');
    expect(cues).toHaveLength(2); expect(cues[0].updates![0]).toMatchObject({ supplyReady: false });
    expect(cues[1].impacts.map(event => event.amount)).toEqual([0, 0, 0, 0, 0]);
    const played = replay(state, result.events); expect(played.allies).toEqual(result.state.allies);
    expect(played.allies.map(unit => unit.mp)).toEqual(state.allies.map(unit => unit.mp));
  });
  it('keeps all-target scope with only the core alive and never adds readiness to other units', () => {
    const state = fixture(); state.allies.slice(1).forEach(unit => { unit.hp = 0; });
    const result = resolve(state), cues = buildTimeline(result.events).cues.filter(cue => cue.cast?.effect === 'restoreMp');
    expect(cues).toHaveLength(2);
    for (const cue of cues) expect(cue.cast).toMatchObject({ scope: 'all', targets: ['a0'] });
    const played = replay(state, result.events); expect(played.allies).toEqual(result.state.allies);
    expect(played.allies.slice(1).every(unit => !Object.hasOwn(unit, 'supplyReady'))).toBe(true);
  });
  it('places each side’s normal supply in its own action and keeps gain events with the correct actor', () => {
    const state = start(slimes, slimes); [...state.allies, ...state.enemies].forEach(unit => { unit.mp -= 8; });
    const result = advanceWithEvents(state, supply(state, 'allies'), { enemyOrders: supply(state, 'enemies') });
    const cues = buildTimeline(result.events).cues.filter(cue => cue.cast?.effect === 'restoreMp');
    expect(cues).toHaveLength(4);
    const startCues = cues.filter(cue => !cue.impacts.length); expect(new Set(startCues.map(cue => cue.cast!.actor))).toEqual(new Set(['a0', 'e0']));
    for (const cue of cues.filter(cue => cue.impacts.length)) expect(cue.impacts.every(event => event.actor === cue.cast!.actor)).toBe(true);
    const played = replay(state, result.events); expect(played.allies).toEqual(result.state.allies); expect(played.enemies).toEqual(result.state.enemies);
  });
  it('keeps later paid action debits after earlier supply gains rather than moving all MP updates to cast start', () => {
    const state = fixture(); state.allies[2].mp = 8;
    const orders = supply(state, 'allies'); orders[2] = { key: 'a2', skill: 1 };
    const result = advanceWithEvents(state, orders, { enemyOrders: defend(state, 'enemies') });
    const timeline = buildTimeline(result.events), gainCue = timeline.cues.find(cue => cue.impacts.some(event => event.kind === 'resource-gain' && event.target === 'a2'))!;
    const debitCue = timeline.cues.find(cue => cue.updates?.some(event => event.kind === 'resource' && event.target === 'a2'))!;
    expect(debitCue.at).toBeGreaterThan(gainCue.at);
    const played = replay(state, result.events); expect(played.allies[2].mp).toBe(8); expect(played.allies).toEqual(result.state.allies);
  });
  it('all-full, ineligible and already-used commands produce no phantom cast or gains', () => {
    for (const mode of ['full', 'ineligible', 'spent'] as const) {
      const state = start(mode === 'ineligible' ? [24, 25] : slimes, [1]);
      if (mode !== 'full') state.allies[0].mp = 0;
      if (mode === 'spent') state.allies[0].supplyReady = false;
      const result = resolve(state), timeline = buildTimeline(result.events);
      expect(timeline.cues.some(cue => cue.cast?.effect === 'restoreMp' || cue.impacts.some(event => event.kind === 'resource-gain'))).toBe(false);
      expect(replay(state, result.events).allies).toEqual(result.state.allies);
    }
  });
  it('replays pre-action, poison and injected-dead core KO cancellation without stale readiness', () => {
    for (const mode of ['direct', 'poison', 'dead'] as const) {
      const state = fixture(); state.allies[0].hp = mode === 'dead' ? 0 : 1;
      let result;
      if (mode === 'direct') {
        state.enemies[0].monster = { ...state.enemies[0].monster, speed: 100 };
        result = advanceWithEvents(state, supply(state, 'allies'), { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK, target: 'a0' }] });
      } else {
        state.allies[0].poison = 1;
        result = advanceWithEvents(state, defend(state, 'allies'), { enemyOrders: defend(state, 'enemies') });
      }
      expect(buildTimeline(result.events).cues.some(cue => cue.cast?.effect === 'restoreMp')).toBe(false);
      const played = replay(state, result.events); expect(played.allies).toEqual(result.state.allies); expect(played.allies[0]).toMatchObject({ hp: 0, supplyReady: false });
    }
  });
  it('before-hit and after-hit dispel playback leaves unused supply ready', () => {
    for (const [id, skill] of [[11, 3], [12, 0]]) {
      const state = start([id], slimes); state.enemies.slice(1).forEach(unit => { unit.hp = 0; });
      const result = advanceWithEvents(state, [{ key: 'a0', skill, target: 'e0' }], { enemyOrders: defend(state, 'enemies') });
      const played = replay(state, result.events); expect(played.enemies).toEqual(result.state.enemies); expect(played.enemies[0].supplyReady).toBe(true);
      expect(buildTimeline(result.events).cues.some(cue => cue.impacts.some(event => event.supplyReady !== undefined))).toBe(false);
    }
  });
  it('normal,2x,repeated-cue and skip replay agree on every complete deterministic battle turn', () => {
    for (const enemy of [slimes, [19, 20, 21, 22, 23]]) {
      let state = start(slimes, enemy, 42, { leaders: true }); let supplied = false;
      // Make the finite resource mechanic observable even when an opening burst would otherwise end the match first.
      state.allies[0].mp = 16;
      while (!state.winner) {
        const result = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
        supplied ||= result.events.some(event => event.kind === 'supply');
        const timeline = buildTimeline(result.events), snapshot = structuredClone(result);
        let normal = state, double = state, repeated = state;
        for (const cue of timeline.cues) {
          const events = [...(cue.updates ?? []), ...cue.impacts]; normal = applyBattleEvents(normal, events);
          repeated = applyBattleEvents(applyBattleEvents(repeated, events), events);
        }
        for (const cue of timeline.cues.map((cue, index) => ({ ...cue, at: cue.at / 2, index })).sort((a, b) => a.at - b.at || a.index - b.index)) double = applyBattleEvents(double, [...(cue.updates ?? []), ...cue.impacts]);
        const skip = applyBattleEvents(state, result.events);
        for (const played of [normal, double, repeated, skip]) { expect(played.allies).toEqual(result.state.allies); expect(played.enemies).toEqual(result.state.enemies); }
        expect(result).toEqual(snapshot); state = result.state;
      }
      expect(supplied).toBe(true);
    }
  });
});
