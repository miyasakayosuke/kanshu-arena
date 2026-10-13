import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, DEFEND, start as economyStart, type BattleEvent, type State } from './engine';
import { ACTION_DURATION_MS, applyBattleEvents, buildTimeline, CAST_IMPACT_MS, type BattleCue } from './playback';

const demons = [29, 1, 8, 30, 31];
const cueEvents = (cue: BattleCue) => [...(cue.updates ?? []), ...cue.impacts];
const resources = (state: State) => ({ allies: state.allies, enemies: state.enemies });
const replay = (before: State, events: BattleEvent[], speed = 1) => {
  const timeline = buildTimeline(events), cues = [...timeline.cues]; let state = before;
  for (let clock = 0; clock <= timeline.duration / speed + 17; clock += 17) {
    while (cues[0] && cues[0].at <= clock * speed) state = applyBattleEvents(state, cueEvents(cues.shift()!));
  }
  expect(cues).toHaveLength(0); return state;
};
const fixture = () => {
  const state = start([29], [1]); state.enemies[0].mp = 20;
  state.enemies[0].monster = { ...state.enemies[0].monster, hp: 5000 }; state.enemies[0].hp = 5000;
  return state;
};
const resolve = (state: State) => advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] });

describe('demon MP loss and fallback playback', () => {
  it('debits16 at cast start and applies HP then exact enemy MP loss at one800ms impact', () => {
    const state = fixture(), result = resolve(state), snapshot = structuredClone(result), timeline = buildTimeline(result.events);
    const claw = timeline.cues.filter(cue => cue.cast?.skill === '空勘の爪'); expect(claw).toHaveLength(2);
    const [cast, impact] = claw;
    expect(cast.updates).toEqual([expect.objectContaining({ kind: 'resource', actor: 'a0', target: 'a0', amount: 16, mp: 48 })]);
    expect(cast.impacts).toHaveLength(0); expect(impact.at - cast.at).toBe(CAST_IMPACT_MS);
    expect(impact.impacts.map(event => event.kind)).toEqual(['damage', 'resource-loss']);
    expect(impact.impacts[1]).toMatchObject({ actor: 'a0', target: 'e0', amount: 6, mp: 14 });
    let played = applyBattleEvents(state, cast.updates!);
    expect(played.allies[0].mp).toBe(48); expect(played.enemies[0].mp).toBe(20); expect(played.enemies[0].hp).toBe(5000);
    played = applyBattleEvents(played, impact.impacts);
    expect(played.enemies[0].mp).toBe(14); expect(played.enemies[0].hp).toBeLessThan(5000); expect(played.allies[0].mp).toBe(48);
    expect(result).toEqual(snapshot); expect(state.enemies[0].mp).toBe(20);
  });
  it('keeps the fallback as metadata at its own basic cast start, without another action or prior-cast impact', () => {
    const state = fixture(), result = resolve(state), timeline = buildTimeline(result.events);
    expect(result.events.filter(event => event.kind === 'cast')).toHaveLength(2);
    expect(timeline.duration).toBe(ACTION_DURATION_MS * 2 + 150);
    const fallbackCue = timeline.cues.find(cue => cue.updates?.some(event => event.kind === 'fallback'))!;
    expect(fallbackCue.at).toBe(ACTION_DURATION_MS); expect(fallbackCue.cast).toMatchObject({ actor: 'e0', skill: '通常攻撃' });
    expect(fallbackCue.updates).toEqual([expect.objectContaining({ kind: 'fallback', fromSkill: 1, toSkill: BASIC_ATTACK, requiredMP: 20, availableMP: 14, queuePriority: -2 })]);
    expect(fallbackCue.impacts).toHaveLength(0);
    expect(timeline.cues.filter(cue => cue.impacts.some(event => event.kind === 'fallback'))).toHaveLength(0);
    const beforeFallback = timeline.cues.filter(cue => cue.at < fallbackCue.at).reduce((value, cue) => applyBattleEvents(value, cueEvents(cue)), state);
    expect(resources(applyBattleEvents(beforeFallback, fallbackCue.updates!))).toEqual(resources(beforeFallback));
  });
  it.each([0, 1, 5, 6, 9, 10, 16])('preserves absoluteMP%s and zero loss with no fabricated recovery', mp => {
    const state = fixture(); state.enemies[0].mp = mp;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK, target: 'a0' }] });
    const impact = buildTimeline(result.events).cues.find(cue => cue.impacts.some(event => event.kind === 'resource-loss'))!;
    const event = impact.impacts.find(event => event.kind === 'resource-loss')!;
    expect(event.amount).toBe(Math.min(mp, 6)); expect(event.mp).toBe(Math.max(0, mp - 6));
    expect(result.events.some(event => event.kind === 'resource-gain')).toBe(false);
    expect(resources(replay(state, result.events))).toEqual(resources(result.state));
    const once = applyBattleEvents(state, [event]); expect(resources(applyBattleEvents(once, [event]))).toEqual(resources(once));
  });
  it('produces no loss cue for a killed target and keeps its unspent MP', () => {
    const state = fixture(); state.enemies[0].hp = 1;
    const result = resolve(state), timeline = buildTimeline(result.events);
    expect(timeline.cues.flatMap(cueEvents).filter(event => event.kind === 'resource-loss')).toHaveLength(0);
    expect(resources(replay(state, result.events))).toEqual(resources(result.state)); expect(result.state.enemies[0].mp).toBe(20);
  });
  it('keeps actual supply between enemy resource loss and the rescued paid cast', () => {
    const state = start([29], [24, 25, 26]); state.enemies[2].mp = 8;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e2' }], { enemyOrders: [{ key: 'e0', skill: 0 }, { key: 'e1', skill: DEFEND }, { key: 'e2', skill: 1, target: 'a0' }] });
    const sequence = buildTimeline(result.events).cues.flatMap(cueEvents).filter(event => event.target === 'e2' && ['resource-loss', 'resource-gain', 'resource'].includes(event.kind));
    expect(sequence.map(event => [event.kind, event.amount, event.mp])).toEqual([['resource-loss', 6, 2], ['resource-gain', 8, 10], ['resource', 8, 2]]);
    expect(result.events.some(event => event.kind === 'fallback')).toBe(false);
    for (const speed of [1, 2]) expect(resources(replay(state, result.events, speed))).toEqual(resources(result.state));
    expect(resources(applyBattleEvents(state, result.events))).toEqual(resources(result.state));
  });
  it('normal,2x,skip and every partial-skip point agree on exact resources/status and leave authoritative history untouched', () => {
    const state = fixture(), result = resolve(state), before = structuredClone(result), timeline = buildTimeline(result.events);
    for (const speed of [1, 2]) expect(resources(replay(state, result.events, speed))).toEqual(resources(result.state));
    expect(resources(applyBattleEvents(state, result.events))).toEqual(resources(result.state));
    for (let index = 0; index <= timeline.cues.length; index++) {
      const partial = timeline.cues.slice(0, index).reduce((value, cue) => applyBattleEvents(value, cueEvents(cue)), state);
      const skipped = applyBattleEvents(partial, timeline.cues.slice(index).flatMap(cueEvents));
      expect(resources(skipped)).toEqual(resources(result.state));
    }
    expect(result).toEqual(before); expect(result.state.history![0].events).toEqual(result.events);
  });
  it('replays both physical sides over complete deterministic battles with all counts and conserved MP', () => {
    const opponents = [[12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [15, 5, 16, 17, 18], [19, 20, 21, 22, 23], [24, 25, 26, 27, 28], demons, [4, 7, 8, 13, 22]];
    let totalLoss = 0, totalFallbacks = 0, totalBasic = 0, totalDrain = 0, totalDirect = 0;
    for (const enemy of opponents) for (const flip of [false, true]) for (const seed of [0, 42, 0xffffffff]) {
      let state = start(flip ? enemy : demons, flip ? demons : enemy, seed, { leaders: true });
      const initialMp = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, unit.mp]));
      while (!state.winner) {
        const result = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
        for (const speed of [1, 2]) expect(resources(replay(state, result.events, speed))).toEqual(resources(result.state));
        expect(resources(applyBattleEvents(state, result.events))).toEqual(resources(result.state));
        expect(result.state.history!.at(-1)!.events).toEqual(result.events);
        const timelineEvents = buildTimeline(result.events).cues.flatMap(cueEvents);
        for (const kind of ['resource', 'resource-loss', 'resource-gain', 'fallback', 'damage', 'heal', 'defeat'] as const) expect(timelineEvents.filter(event => event.kind === kind)).toEqual(result.events.filter(event => event.kind === kind));
        state = result.state;
      }
      expect(state.turn).toBeLessThanOrEqual(21);
      const events = state.history!.flatMap(turn => turn.events);
      for (const unit of [...state.allies, ...state.enemies]) {
        const actual = initialMp.get(unit.key)! + events.filter(event => event.target === unit.key && event.kind === 'resource-gain').reduce((sum, event) => sum + event.amount!, 0) - events.filter(event => event.target === unit.key && ['resource', 'resource-loss'].includes(event.kind)).reduce((sum, event) => sum + event.amount!, 0);
        expect(unit.mp).toBe(actual); expect(unit.mp).toBeGreaterThanOrEqual(0); expect(unit.mp).toBeLessThanOrEqual(unit.monster.mp);
        if (unit.monster.id === 29) expect(events.filter(event => event.kind === 'cast' && event.actor === unit.key && event.skill === '空勘の爪').length).toBeLessThanOrEqual(4);
      }
      totalLoss += events.filter(event => event.kind === 'resource-loss').reduce((sum, event) => sum + event.amount!, 0);
      totalFallbacks += events.filter(event => event.kind === 'fallback').length;
      totalBasic += events.filter(event => event.kind === 'cast' && event.skill === '通常攻撃').length;
      totalDrain += events.filter(event => event.kind === 'cast' && event.skill === '空勘の爪').length;
      totalDirect += events.filter(event => event.kind === 'cast' && event.skill === '封銭の打撃').length;
    }
    expect(totalLoss).toBeGreaterThan(0); expect(totalFallbacks).toBeGreaterThan(0); expect(totalBasic).toBeGreaterThan(0); expect(totalDrain).toBeGreaterThan(0); expect(totalDirect).toBeGreaterThan(0);
  });
});

// Isolate this skill/family contract from the separately tested recurring economy.
// Shipping default and all-family combinations are covered by turnMpRecovery tests and current Lab.
function start(...args: Parameters<typeof economyStart>): ReturnType<typeof economyStart> { return economyStart(args[0], args[1], args[2], { ...args[3], turnMpRecovery: 0 }); }
