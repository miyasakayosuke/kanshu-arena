import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, DEFEND, start, type BattleEvent, type Order, type State } from './engine';
import { battleFactEvidenceLines, resultFacts } from './battleInsights';
import { applyBattleEvents, buildTimeline, CAST_IMPACT_MS, effectType, type BattleCue } from './playback';

const mixed = [36, 12, 2, 30, 26];
const shell = [36, 4, 3, 10, 30];
const ward = [36, 14, 10, 20, 35];
const cueEvents = (cue: BattleCue) => [...(cue.updates ?? []), ...cue.impacts];
const resources = (state: State) => ({ allies: state.allies, enemies: state.enemies });
const noOrders = (state: State, side: 'allies' | 'enemies' = 'allies'): Order[] => state[side].map(unit => ({ key: unit.key, skill: 99 }));
const replay = (state: State, events: BattleEvent[], speed: number) => {
  const timeline = buildTimeline(events), cues = [...timeline.cues];
  for (let clock = 0; clock <= timeline.duration / speed + 17; clock += 17) {
    while (cues[0] && cues[0].at <= clock * speed) state = applyBattleEvents(state, cueEvents(cues.shift()!));
  }
  expect(cues).toHaveLength(0); return state;
};
const allPlaybackPaths = (state: State, result: ReturnType<typeof advanceWithEvents>) => {
  const initial = structuredClone(state), before = structuredClone(result), timeline = buildTimeline(result.events);
  for (const speed of [1, 2]) expect(resources(replay(state, result.events, speed))).toEqual(resources(result.state));
  expect(resources(applyBattleEvents(state, result.events))).toEqual(resources(result.state));
  for (let index = 0; index <= timeline.cues.length; index++) {
    const partial = timeline.cues.slice(0, index).reduce((value, cue) => applyBattleEvents(value, cueEvents(cue)), state);
    const skipped = applyBattleEvents(partial, timeline.cues.slice(index).flatMap(cueEvents));
    expect(resources(skipped)).toEqual(resources(result.state));
    expect(resources(applyBattleEvents(partial, result.events))).toEqual(resources(result.state));
  }
  expect(state).toEqual(initial); expect(result).toEqual(before);
  expect(result.state.history!.at(-1)!.events).toEqual(result.events);
};
const resolve = (state: State, skill: number, side: 'allies' | 'enemies' = 'allies') => {
  const orders = (which: 'allies' | 'enemies') => noOrders(state, which).map((order, index) => side === which && !index ? { key: order.key, skill } : order);
  return advanceWithEvents(state, orders('allies'), { enemyOrders: orders('enemies') });
};

describe('extraordinary shared allowance and absolute recipient playback', () => {
  it.each([0, 1])('spends skill%i once at cast, never changes recipients until its actual impact, on either side', skill => {
    for (const side of ['allies', 'enemies'] as const) {
      const state = start(mixed, mixed), actor = state[side][0].key;
      state[side][0].poison = 3; state[side][1].poison = 2;
      state[side][3].hp = 0;
      const result = resolve(state, skill, side), timeline = buildTimeline(result.events);
      const cues = timeline.cues.filter(cue => cue.cast?.actor === actor), [cast, impact] = cues;
      expect(cues).toHaveLength(2); expect(cast.impacts).toHaveLength(0);
      expect(cast.cast).toMatchObject({ scope: 'all', targets: state[side].filter(unit => unit.hp > 0).map(unit => unit.key), effect: skill ? 'responseGuard' : 'responseCleanse' });
      expect(cast.cast!.target).toBeUndefined();
      expect(cast.updates!.map(event => event.kind)).toEqual(['resource', 'response']);
      expect(cast.updates![0]).toMatchObject({ target: actor, amount: 24, mp: 34 });
      expect(cast.updates![1]).toMatchObject({ target: actor, responseReady: false, responseChoice: skill ? 'guard' : 'cleanse' });
      expect(impact.at - cast.at).toBe(CAST_IMPACT_MS);
      expect(impact.updates).toBeUndefined();
      expect(impact.impacts.map(event => event.kind)).toEqual(Array(4).fill(skill ? 'guard' : 'cleanse'));
      let played = applyBattleEvents(state, cast.updates!);
      expect(played[side][0].responseReady).toBe(false); expect(played[side][0].mp).toBe(34);
      expect(played[side].map(unit => unit.hp)).toEqual(state[side].map(unit => unit.hp));
      expect(played[side].map(unit => unit.poison)).toEqual(state[side].map(unit => unit.poison));
      expect(played[side].every(unit => !unit.guard)).toBe(true);
      const once = applyBattleEvents(played, impact.impacts);
      expect(resources(applyBattleEvents(once, impact.impacts))).toEqual(resources(once));
      expect(once[side].filter(unit => unit.hp > 0).every(unit => skill ? unit.guard : unit.poison === 0)).toBe(true);
      expect(result.events.some(event => event.kind === 'heal')).toBe(false);
      expect(effectType(cast.cast!.skill!, cast.cast!.effect)).toBe(skill ? 'guard' : 'water');
      const fact = resultFacts(result.state).find(fact => fact.kind === 'response')!;
      expect(fact.text).toContain(skill ? '今ターンの守り 1回' : '毒除去 1回');
      expect(battleFactEvidenceLines(result.state, fact).join('\n')).toContain('共通の応答を消費');
      allPlaybackPaths(state, result);
    }
  });
  it('keeps all-target intent for the lone surviving eligible core without new healing or revival', () => {
    const state = start(mixed, [1]); state.allies.slice(1).forEach(unit => { unit.hp = 0; }); state.allies[0].poison = 3;
    for (const skill of [0, 1]) {
      const result = resolve(state, skill);
      const cast = buildTimeline(result.events).cues.find(cue => cue.cast)?.cast;
      expect(cast).toMatchObject({ scope: 'all', targets: ['a0'] }); expect(cast!.target).toBeUndefined();
      expect(result.state.allies.slice(1).every(unit => unit.hp === 0)).toBe(true);
      allPlaybackPaths(state, result);
    }
  });
  it.each([undefined, 1])('keeps clear, poison reapplication and tick boundaries separate at scale override %s', scale => {
    const state = start(mixed, [10], 42, scale === undefined ? undefined : { poisonImpactScale: scale }); state.allies[0].poison = 3;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0 }, ...noOrders(state).slice(1)], { enemyOrders: [{ key: 'e0', skill: 1 }] });
    const ordered = buildTimeline(result.events).cues.flatMap(cueEvents).filter(event => event.target === 'a0' && ['cleanse', 'poison', 'damage'].includes(event.kind));
    expect(ordered.map(event => event.kind)).toEqual(scale === 1 ? ['cleanse', 'damage', 'poison', 'damage'] : ['cleanse', 'poison', 'damage']);
    expect(ordered[0].poison).toBe(0); expect(ordered.find(event => event.kind === 'poison')!.poison).toBe(3); expect(ordered.at(-1)!.poison).toBe(2);
    expect(ordered.filter(event => event.kind === 'damage' && event.effect !== 'poison')).toHaveLength(scale === 1 ? 1 : 0);
    allPlaybackPaths(state, result);
  });
  it('preserves guard impact, dispel, damage, and quiet turn-end expiry without reviving the allowance', () => {
    const state = start(ward, [30, 28]); state.allies[1].poison = 3;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 1 }, ...noOrders(state).slice(1)], { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }, { key: 'e1', skill: 1 }] });
    const stream = buildTimeline(result.events).cues.flatMap(cueEvents);
    expect(stream.filter(event => event.target === 'a0' && ['guard', 'break', 'damage', 'expire'].includes(event.kind)).map(event => event.kind)).toEqual(['guard', 'break', 'damage', 'damage']);
    expect(stream.filter(event => event.kind === 'expire' && event.effect === 'guard')).toHaveLength(4);
    expect(result.state.allies[0].responseReady).toBe(false); allPlaybackPaths(state, result);
  });
  it('replays a guard recipient’s lethal impact and the unspent core’s own direct/poison defeat', () => {
    const guarded = start(mixed, [28]); guarded.allies[1].hp = 1;
    const result = advanceWithEvents(guarded, [{ key: 'a0', skill: 1 }, ...noOrders(guarded).slice(1)], { enemyOrders: [{ key: 'e0', skill: 1 }] });
    expect(result.events.find(event => event.kind === 'defeat' && event.target === 'a1')).toMatchObject({ hp: 0, guard: false });
    allPlaybackPaths(guarded, result);
    for (const scenario of ['direct', 'poison', 'injected']) {
      const state = start(mixed, [0]); state.allies[0].hp = scenario === 'injected' ? 0 : 1; state.allies[0].poison = 3;
      const commands = noOrders(state); if (scenario === 'direct') commands[0] = { key: 'a0', skill: 0 };
      const result = advanceWithEvents(state, commands, { enemyOrders: scenario === 'direct' ? [{ key: 'e0', skill: 1, target: 'a0' }] : noOrders(state, 'enemies') });
      expect(result.events.filter(event => event.kind === 'response')).toHaveLength(0);
      expect(result.state.allies[0].responseReady).toBe(false); allPlaybackPaths(state, result);
    }
  });
  it('has no spend cue for rejected/zero-effect/cancelled actions or a drained basic fallback', () => {
    for (const scenario of ['no-poison', 'zero-effect', 'rejected', 'fallback']) {
      const state = start([36, 36, 12, 30, 26], [29]);
      if (scenario !== 'no-poison') state.allies[0].poison = 3;
      if (scenario === 'fallback') state.allies[0].mp = 24;
      if (scenario === 'zero-effect') state.allies[1].monster = { ...state.allies[1].monster, speed: 90 };
      const commands = [{ key: 'a0', skill: 0, ...(scenario === 'rejected' ? { target: 'e0' } : {}) }, ...noOrders(state).slice(1)];
      if (scenario === 'zero-effect') commands[1] = { key: 'a1', skill: 0 };
      const result = advanceWithEvents(state, commands, { enemyOrders: scenario === 'fallback' ? [{ key: 'e0', skill: 0, target: 'a0' }] : noOrders(state, 'enemies') });
      const stream = buildTimeline(result.events).cues.flatMap(cueEvents);
      expect(stream.filter(event => event.kind === 'response' && event.actor === 'a0')).toHaveLength(0);
      if (scenario === 'fallback') expect(stream.find(event => event.kind === 'fallback')).toMatchObject({ actor: 'a0', toSkill: BASIC_ATTACK });
      expect(result.state.allies[0].responseReady).toBe(true); allPlaybackPaths(state, result);
    }
  });
  it('conserves complete mixed battles on both sides, normal/2x/every skip, with exact response evidence', () => {
    const matchups = [[14, 3, 6, 9, 10], [29, 1, 8, 30, 31], [32, 4, 33, 34, 35], mixed, shell, ward];
    let clears = 0, guards = 0, completed = 0;
    for (const enemy of matchups) for (const flip of [false, true]) for (const seed of [0, 42]) for (const samePolicy of [false, true]) {
      let state = start(flip ? enemy : mixed, flip ? mixed : enemy, seed, { leaders: true });
      const spent = new Set<string>();
      while (!state.winner) {
        const result = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {});
        allPlaybackPaths(state, result);
        const stream = buildTimeline(result.events).cues.flatMap(cueEvents);
        for (const kind of ['response', 'cleanse', 'guard', 'resource', 'resource-loss', 'resource-gain', 'fallback', 'damage', 'heal', 'defeat'] as const) {
          expect(stream.filter(event => event.kind === kind)).toEqual(result.events.filter(event => event.kind === kind));
        }
        for (const event of result.events.filter(event => event.kind === 'response')) {
          expect(spent.has(event.actor!)).toBe(false); spent.add(event.actor!);
          expect(result.events.filter(cast => cast.kind === 'cast' && cast.actor === event.actor && cast.skill === event.skill)).toHaveLength(1);
          expect(result.events.filter(cost => cost.kind === 'resource' && cost.actor === event.actor)).toEqual([expect.objectContaining({ amount: 24 })]);
          const order = result.state.history!.at(-1)!.orders.find(order => order.key === event.actor)!;
          expect(order.accepted).toBe(true);
          if (event.responseChoice === 'cleanse') clears++; else guards++;
        }
        state = result.state;
      }
      completed++;
    }
    expect(completed).toBe(48); expect(clears).toBeGreaterThan(0); expect(guards).toBeGreaterThan(0);
  }, 30000);
});
