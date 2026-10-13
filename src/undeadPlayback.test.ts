import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, DEFEND, start as economyStart, type BattleEvent, type State } from './engine';
import { ACTION_DURATION_MS, applyBattleEvents, buildTimeline, CAST_IMPACT_MS, type BattleCue } from './playback';

const undead = [32, 4, 33, 34, 35];
const mixed = [32, 4, 35, 3, 10];
const cueEvents = (cue: BattleCue) => [...(cue.updates ?? []), ...cue.impacts];
const resources = (state: State) => ({ allies: state.allies, enemies: state.enemies });
const replay = (before: State, events: BattleEvent[], speed = 1) => {
  const timeline = buildTimeline(events), cues = [...timeline.cues]; let state = before;
  for (let clock = 0; clock <= timeline.duration / speed + 17; clock += 17) {
    while (cues[0] && cues[0].at <= clock * speed) state = applyBattleEvents(state, cueEvents(cues.shift()!));
  }
  expect(cues).toHaveLength(0); return state;
};
const fixture = (ticks = 3, lethal = false, side: 'allies' | 'enemies' = 'allies') => {
  const state = start(undead, undead);
  const opponents = side === 'allies' ? state.enemies : state.allies;
  opponents[0].poison = ticks; if (lethal) opponents[0].hp = 1;
  return state;
};
const resolve = (state: State, side: 'allies' | 'enemies' = 'allies') => {
  const commands = (which: 'allies' | 'enemies') => state[which].map((unit, index) => which === side && index === 0
    ? { key: unit.key, skill: 0, target: side === 'allies' ? 'e0' : 'a0' }
    : { key: unit.key, skill: DEFEND });
  return advanceWithEvents(state, commands('allies'), { enemyOrders: commands('enemies') });
};
const allPlaybackPaths = (state: State, result: ReturnType<typeof advanceWithEvents>) => {
  const before = structuredClone(result), initial = structuredClone(state), timeline = buildTimeline(result.events);
  for (const speed of [1, 2]) expect(resources(replay(state, result.events, speed))).toEqual(resources(result.state));
  expect(resources(applyBattleEvents(state, result.events))).toEqual(resources(result.state));
  for (let index = 0; index <= timeline.cues.length; index++) {
    const partial = timeline.cues.slice(0, index).reduce((value, cue) => applyBattleEvents(value, cueEvents(cue)), state);
    const skipped = applyBattleEvents(partial, timeline.cues.slice(index).flatMap(cueEvents));
    expect(resources(skipped)).toEqual(resources(result.state));
    // Jumping to the authoritative complete stream is also idempotent even
    // after a partial replay has reset poison, hit, killed, or reapplied poison.
    expect(resources(applyBattleEvents(partial, result.events))).toEqual(resources(result.state));
  }
  expect(result).toEqual(before); expect(state).toEqual(initial);
  expect(result.state.history!.at(-1)!.events).toEqual(result.events);
};

describe('undead poison-cashout playback and evidence conservation', () => {
  it.each([0, 1, 2, 3])('keeps%s ticks through windup, debits18 at cast, then resets poison immediately before the direct hit', ticks => {
    for (const side of ['allies', 'enemies'] as const) for (const lethal of [false, true]) {
      const state = fixture(ticks, lethal, side), result = resolve(state, side), timeline = buildTimeline(result.events);
      const actor = side === 'allies' ? 'a0' : 'e0', target = side === 'allies' ? 'e0' : 'a0';
      const targetSide = side === 'allies' ? 'enemies' : 'allies';
      const cues = timeline.cues.filter(cue => cue.cast?.actor === actor && cue.cast?.skill === '塚底の取り立て');
      expect(cues).toHaveLength(2); const [cast, impact] = cues;
      expect(cast.cast!.effect).toBe('hit'); expect(cast.cast!.poisonTicksConsumed).toBeUndefined();
      expect(cast.updates).toEqual([expect.objectContaining({ kind: 'resource', actor, target: actor, amount: 18, mp: 44 })]);
      expect(cast.impacts).toHaveLength(0); expect(impact.at - cast.at).toBe(CAST_IMPACT_MS);
      expect(impact.impacts.map(event => event.kind)).toEqual(lethal ? ['poison-cashout', 'damage', 'defeat'] : ['poison-cashout', 'damage']);
      expect(impact.impacts[0]).toMatchObject({ target, poison: 0, poisonTicksConsumed: ticks, poisonCashoutPerTick: 22, poisonCashoutAdded: ticks * 22 });
      let played = applyBattleEvents(state, cast.updates!);
      expect(played[side][0].mp).toBe(44); expect(played[targetSide][0].poison).toBe(ticks); expect(played[targetSide][0].hp).toBe(state[targetSide][0].hp);
      played = applyBattleEvents(played, [impact.impacts[0]]);
      expect(played[targetSide][0].poison).toBe(0); expect(played[targetSide][0].hp).toBe(state[targetSide][0].hp);
      const once = applyBattleEvents(played, impact.impacts);
      expect(resources(applyBattleEvents(once, impact.impacts))).toEqual(resources(once));
      expect(once[targetSide][0].hp).toBe(impact.impacts.find(event => event.kind === 'damage')!.hp);
      expect(once[side][0].mp).toBe(44);
      expect(timeline.cues.some(cue => cue.passive)).toBe(false);
      expect(result.events.some(event => event.kind === 'cleanse' || event.kind === 'heal')).toBe(false);
      allPlaybackPaths(state, result);
    }
  });
  it('retains cleanse→cashout0 and cashout→later poison reapplication as separate ordered impacts', () => {
    const state = start(mixed, [2]); state.enemies[0].monster = { ...state.enemies[0].monster, hp: 5000, speed: 60 }; state.enemies[0].hp = 5000;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1 }, { key: 'a2', skill: DEFEND }, { key: 'a3', skill: DEFEND }, { key: 'a4', skill: 1 }], { enemyOrders: [{ key: 'e0', skill: 3, target: 'e0' }] });
    const timelineEvents = buildTimeline(result.events).cues.flatMap(cueEvents);
    const poisonChanges = timelineEvents.filter(event => event.target === 'e0' && ['poison', 'cleanse', 'poison-cashout'].includes(event.kind));
    expect(poisonChanges.map(event => [event.kind, event.poison, event.poisonTicksConsumed])).toEqual([['poison', 3, undefined], ['cleanse', 0, undefined], ['poison-cashout', 0, 0], ['poison', 3, undefined]]);
    expect(result.state.enemies[0].poison).toBe(2); allPlaybackPaths(state, result);
  });
  it('replays retarget consumption without clearing another surviving enemy’s poison', () => {
    const state = start([32, 33], [1, 8, 10]); state.enemies[0].hp = 1; state.enemies[0].poison = 3; state.enemies[1].poison = 2; state.enemies[2].poison = 1;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1, target: 'e0' }], { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: DEFEND })) });
    const consume = result.events.find(event => event.kind === 'poison-cashout')!;
    expect(['e1', 'e2']).toContain(consume.target);
    const other = consume.target === 'e1' ? 'e2' : 'e1';
    const poisonTick = result.events.find(event => event.kind === 'damage' && event.effect === 'poison' && event.target === other);
    expect(poisonTick).toBeDefined(); expect(result.events.some(event => event.kind === 'damage' && event.effect === 'poison' && event.target === consume.target)).toBe(false);
    allPlaybackPaths(state, result);
  });
  it('never adds a consumption cue or extra action when MP drain causes a basic fallback', () => {
    for (const side of ['allies', 'enemies'] as const) {
      const state = start(side === 'allies' ? [32] : [29], side === 'allies' ? [29] : [32]);
      state[side][0].mp = 18; const opponentSide = side === 'allies' ? 'enemies' : 'allies'; state[opponentSide][0].poison = 3;
      const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
      const timeline = buildTimeline(result.events);
      expect(timeline.cues.flatMap(cueEvents).some(event => event.kind === 'poison-cashout')).toBe(false);
      expect(result.events.filter(event => event.kind === 'cast')).toHaveLength(2);
      const fallbackCue = timeline.cues.find(cue => cue.updates?.some(event => event.kind === 'fallback'))!;
      expect(fallbackCue.at).toBe(ACTION_DURATION_MS); expect(fallbackCue.cast!.skill).toBe('通常攻撃');
      expect(fallbackCue.updates![0]).toMatchObject({ toSkill: BASIC_ATTACK });
      expect(state[side][0].mp - result.state[side][0].mp).toBe(6);
      allPlaybackPaths(state, result);
    }
  });
  it('preserves both sides over complete normalCPU/same-AI battles, every speed and every partial-skip point', () => {
    const opponents = [[12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [15, 5, 16, 17, 18], [19, 20, 21, 22, 23], [24, 25, 26, 27, 28], [29, 1, 8, 30, 31], undead, mixed];
    let totalCashout = 0, totalTicks = 0, totalPoison = 0, totalHealing = 0;
    for (const enemy of opponents) for (const flip of [false, true]) for (const seed of [0, 42, 0xffffffff]) for (const samePolicy of [false, true]) {
      let state = start(flip ? enemy : undead, flip ? undead : enemy, seed, { leaders: true });
      const initial = structuredClone(state);
      while (!state.winner) {
        const result = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {});
        allPlaybackPaths(state, result);
        const timelineEvents = buildTimeline(result.events).cues.flatMap(cueEvents);
        for (const kind of ['poison-cashout', 'poison', 'cleanse', 'resource', 'resource-loss', 'resource-gain', 'fallback', 'damage', 'heal', 'defeat'] as const) expect(timelineEvents.filter(event => event.kind === kind)).toEqual(result.events.filter(event => event.kind === kind));
        const casts = result.events.filter(event => event.kind === 'cast');
        const cashouts = result.events.filter(event => event.kind === 'poison-cashout');
        for (const event of cashouts) {
          expect(casts.filter(cast => cast.actor === event.actor && cast.skill === event.skill)).toHaveLength(1);
          expect(result.events.filter(other => other.kind === 'damage' && other.actor === event.actor && other.target === event.target)).toHaveLength(1);
          expect(event.poisonTicksConsumed).toBeGreaterThanOrEqual(0); expect(event.poisonTicksConsumed).toBeLessThanOrEqual(3); expect(event.poison).toBe(0);
        }
        for (const unit of [...state.allies, ...state.enemies]) expect(casts.filter(event => event.actor === unit.key).length).toBeLessThanOrEqual(1);
        expect(result.state.history!.at(-1)!.orders).toHaveLength([...state.allies, ...state.enemies].filter(unit => unit.hp > 0).length);
        state = result.state;
      }
      expect(state.turn).toBeLessThanOrEqual(21);
      const events = state.history!.flatMap(turn => turn.events);
      for (const unit of [...state.allies, ...state.enemies]) {
        const before = [...initial.allies, ...initial.enemies].find(value => value.key === unit.key)!;
        const gains = events.filter(event => event.target === unit.key && event.kind === 'resource-gain').reduce((sum, event) => sum + event.amount!, 0);
        const costs = events.filter(event => event.target === unit.key && ['resource', 'resource-loss'].includes(event.kind)).reduce((sum, event) => sum + event.amount!, 0);
        const healing = events.filter(event => event.target === unit.key && event.kind === 'heal').reduce((sum, event) => sum + event.amount!, 0);
        const damage = events.filter(event => event.target === unit.key && event.kind === 'damage').reduce((sum, event) => sum + event.amount!, 0);
        expect(unit.mp).toBe(before.mp + gains - costs); expect(unit.mp).toBeGreaterThanOrEqual(0); expect(unit.mp).toBeLessThanOrEqual(unit.monster.mp);
        expect(unit.hp).toBe(before.hp + healing - damage); expect(unit.hp).toBeGreaterThanOrEqual(0); expect(unit.hp).toBeLessThanOrEqual(unit.monster.hp);
        if (unit.monster.id === 32) expect(events.filter(event => event.kind === 'cast' && event.actor === unit.key && event.skill === '塚底の取り立て').length).toBeLessThanOrEqual(3);
      }
      totalCashout += events.filter(event => event.kind === 'poison-cashout').length;
      totalTicks += events.filter(event => event.kind === 'poison-cashout').reduce((sum, event) => sum + event.poisonTicksConsumed!, 0);
      totalPoison += events.filter(event => event.kind === 'damage' && event.effect === 'poison').length;
      totalHealing += events.filter(event => event.kind === 'heal').length;
    }
    expect(totalCashout).toBeGreaterThan(0); expect(totalTicks).toBeGreaterThan(0); expect(totalPoison).toBeGreaterThan(0); expect(totalHealing).toBeGreaterThan(0);
  }, 30000);
});

// Isolate this skill/family contract from the separately tested recurring economy.
// Shipping default and all-family combinations are covered by turnMpRecovery tests and current Lab.
function start(...args: Parameters<typeof economyStart>): ReturnType<typeof economyStart> { return economyStart(args[0], args[1], args[2], { ...args[3], turnMpRecovery: 0 }); }
