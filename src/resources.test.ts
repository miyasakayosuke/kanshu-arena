import { describe, expect, it } from 'vitest';
import {
  advanceWithEvents, autoOrders, BASIC_ATTACK, battleSkill, canUseSkill, DEFEND, effectStatus,
  MAX_TURNS, monsters, skillTargetsAllies, start,
} from './engine';
import type { BattleEvent, Monster, Skill, SpecialSkills, State, Unit } from './engine';
import { applyBattleEvents, buildTimeline } from './playback';

const hit: Skill = { name: '試験攻撃', kind: 'hit', power: 30, priority: 0, mpCost: 7 };
const guard: Skill = { name: '試験防御', kind: 'guard', power: 0, priority: 1, mpCost: 0 };
const protect: Skill = { name: '試験守護', kind: 'protect', power: 0, priority: 3, mpCost: 5 };
const poison: Skill = { name: '試験毒', kind: 'poison', power: 2, priority: 0, all: true, mpCost: 9 };
const heal: Skill = { name: '試験回復', kind: 'heal', power: 35, priority: 0, mpCost: 11 };
const cleanse: Skill = { name: '試験浄化', kind: 'cleanse', power: 20, priority: 0, mpCost: 6 };

function unit(key: string, skills: SpecialSkills = [guard], options: Partial<Monster> = {}): Unit {
  const monster: Monster = { id: 0, name: key, icon: '⚔️', cost: 1, hp: 300, mp: 60, atk: 0, speed: 50, skills, ...options };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0 };
}
function battle(allies: Unit[], enemies: Unit[], options: Partial<State> = {}): State {
  return { turn: 1, seed: 42, allies, enemies, log: [], winner: null, ...options };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
const allUnits = (state: State) => [...state.allies, ...state.enemies];
const resources = (state: State) => allUnits(state).map(({ key, hp, mp, guard, poison }) => ({ key, hp, mp, guard, poison }));
const castsBy = (events: BattleEvent[], actor: string) => events.filter(event => event.kind === 'cast' && event.actor === actor);
const spendingBy = (events: BattleEvent[], actor: string) => events.filter(event => event.kind === 'resource' && (event.actor === actor || event.target === actor));

function expectReplay(before: State, after: State, events: BattleEvent[]) {
  const snapshot = structuredClone(before);
  expect(resources(applyBattleEvents(freeze(before), events))).toEqual(resources(after));
  let played = before;
  const timeline = buildTimeline(events);
  expect(timeline.cues.flatMap(cue => [...(cue.updates ?? []), ...cue.impacts]))
    .toEqual(events.filter(event => event.kind !== 'cast' && event.kind !== 'phase'));
  for (const cue of timeline.cues) played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
  expect(resources(played)).toEqual(resources(after));
  expect(before).toEqual(snapshot);
}

describe('MP definition and planning', () => {
  it('gives every roster member integer maximum MP and concrete varied skill costs', () => {
    const costs = new Set<number>();
    for (const monster of monsters) {
      expect(Number.isInteger(monster.mp)).toBe(true);
      expect(monster.mp).toBeGreaterThan(0);
      for (const skill of monster.skills) {
        expect(Number.isInteger(skill.mpCost)).toBe(true);
        expect(skill.mpCost).toBeGreaterThanOrEqual(0);
        expect(skill.mpCost).toBeLessThanOrEqual(monster.mp);
        costs.add(skill.mpCost);
      }
      expect(battleSkill(monster, BASIC_ATTACK)?.mpCost).toBe(0);
      expect(battleSkill(monster, DEFEND)?.mpCost).toBe(0);
    }
    expect(costs.size).toBeGreaterThan(3);
  });

  it.each([false, true])('starts and restarts with full MP, unaffected by leader boosts (%s)', leaders => {
    const first = start([0, 1, 2, 3, 4], [5, 6, 7, 8, 10], 92, { leaders });
    for (const actor of allUnits(first)) {
      expect(actor.mp).toBe(actor.monster.mp);
      expect(actor.monster.mp).toBe(monsters[actor.monster.id].mp);
    }
    const spent = advanceWithEvents(first, autoOrders(first)).state;
    expect(allUnits(spent).some(actor => actor.mp < actor.monster.mp)).toBe(true);
    expect(start([0, 1, 2, 3, 4], [5, 6, 7, 8, 10], 92, { leaders })).toEqual(first);
  });

  it('accepts exactly affordable skills and zero-cost commands, and rejects defeated or short-MP actors', () => {
    const actor = unit('a0', [hit]);
    actor.mp = hit.mpCost;
    expect(canUseSkill(actor, hit)).toBe(true);
    actor.mp--;
    expect(canUseSkill(actor, hit)).toBe(false);
    actor.mp = 0;
    expect(canUseSkill(actor, battleSkill(actor.monster, BASIC_ATTACK)!)).toBe(true);
    expect(canUseSkill(actor, battleSkill(actor.monster, DEFEND)!)).toBe(true);
    actor.hp = 0;
    expect(canUseSkill(actor, battleSkill(actor.monster, BASIC_ATTACK)!)).toBe(false);
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects malformed skill MP cost %s without corrupting a resource balance', mpCost => {
    const malformed = { ...hit, mpCost };
    const initial = battle([unit('a0', [malformed])], [unit('e0')]);
    expect(canUseSkill(initial.allies[0], malformed)).toBe(false);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    expect(castsBy(result.events, 'a0')).toEqual([]);
    expect(result.state.allies[0].mp).toBe(initial.allies[0].mp);
  });

  it('does not spend MP or randomness while choosing, changing, or repeating orders', () => {
    const initial = start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 2026);
    initial.allies[0].mp = 0;
    const snapshot = structuredClone(initial);
    freeze(initial);
    const orders = autoOrders(initial);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(autoOrders(initial)).toEqual(orders);
      autoOrders(initial, 'enemies');
      battleSkill(initial.allies[0].monster, DEFEND);
    }
    expect(initial).toEqual(snapshot);
  });
});

describe('MP is charged only for executed legal actions', () => {
  it('spends an exact remaining balance once even when an area attack hits multiple targets', () => {
    const initial = battle([unit('a0', [{ ...hit, all: true }])], [unit('e0'), unit('e1'), unit('e2')]);
    initial.allies[0].mp = hit.mpCost;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e1' }]);
    expect(castsBy(result.events, 'a0')).toHaveLength(1);
    expect(result.events.filter(event => event.kind === 'damage' && event.actor === 'a0')).toHaveLength(3);
    expect(spendingBy(result.events, 'a0')).toHaveLength(1);
    expect(spendingBy(result.events, 'a0')[0]).toMatchObject({ mp: 0, phase: 'action' });
    expect(result.state.allies[0].mp).toBe(0);
    expectReplay(initial, result.state, result.events);
  });

  it.each([BASIC_ATTACK, DEFEND])('keeps MP at zero for the universal command %s and never regenerates it', skill => {
    let state = battle([unit('a0')], [unit('e0')]);
    state.allies[0].mp = 0;
    state.enemies[0].mp = 0;
    for (let turn = 0; turn < 4; turn++) {
      const result = advanceWithEvents(state, [{ key: 'a0', skill }]);
      expect(castsBy(result.events, 'a0')).toHaveLength(1);
      expect(result.state.allies[0].mp).toBe(0);
      expect(result.state.enemies[0].mp).toBe(0);
      state = result.state;
    }
  });

  it('charges an explicitly cast full-health heal rather than silently changing the player command', () => {
    const initial = battle([unit('a0', [heal])], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'heal', target: 'a0', amount: 0 }));
    expect(result.state.allies[0].mp).toBe(initial.allies[0].mp - heal.mpCost);
    expect(spendingBy(result.events, 'a0')).toHaveLength(1);
  });

  it.each([99, -3, 0.5, Number.NaN])('cancels invalid explicit special index %s without spending or a fallback attack', skill => {
    const initial = battle([unit('a0', [hit])], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill }]);
    expect(castsBy(result.events, 'a0')).toEqual([]);
    expect(spendingBy(result.events, 'a0')).toEqual([]);
    expect(result.state.allies[0].mp).toBe(initial.allies[0].mp);
    expect(result.state.enemies[0].hp).toBe(initial.enemies[0].hp);
    expect(result.state.log.join('\n')).toMatch(/不正|無効|使え|選択|中止|キャンセル/);
  });

  it('cancels an unaffordable manual skill but fills a missing order with a legal free action', () => {
    const initial = battle([unit('a0', [hit], { atk: 20 })], [unit('e0')]);
    initial.allies[0].mp = hit.mpCost - 1;
    const explicit = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    expect(castsBy(explicit.events, 'a0')).toEqual([]);
    expect(spendingBy(explicit.events, 'a0')).toEqual([]);
    expect(explicit.state.allies[0].mp).toBe(initial.allies[0].mp);
    expect(explicit.state.log.join('\n')).toMatch(/MP.*不足|不足.*MP/);
    const automatic = advanceWithEvents(initial, []);
    expect(castsBy(automatic.events, 'a0')[0]?.skill).toBe('通常攻撃');
    expect(automatic.state.allies[0].mp).toBe(initial.allies[0].mp);
  });

  it.each([
    [hit, 'a0'], [hit, 'missing'], [hit, ''], [{ ...hit, all: true }, 'a0'], [poison, 'missing'],
    [heal, 'e0'], [heal, 'missing'], [protect, 'e0'], [protect, 'missing'], [cleanse, 'e0'], [cleanse, 'missing'],
  ] as const)('rejects the wrong side or unknown explicit target for %s -> %s', (skill, target) => {
    const initial = battle([unit('a0', [skill])], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target }]);
    expect(castsBy(result.events, 'a0')).toEqual([]);
    expect(spendingBy(result.events, 'a0')).toEqual([]);
    expect(result.state.allies[0].mp).toBe(initial.allies[0].mp);
    expect(result.state.log.join('\n')).toMatch(/対象|中止|キャンセル/);
  });

  it('does not charge an actor killed before its scheduled cast', () => {
    const initial = battle([unit('a0', [hit], { hp: 20, speed: 1 })], [unit('e0', [{ ...hit, power: 1000, priority: 2 }])]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }]);
    expect(result.state.allies[0].hp).toBe(0);
    expect(result.state.allies[0].mp).toBe(initial.allies[0].mp);
    expect(castsBy(result.events, 'a0')).toEqual([]);
    expect(spendingBy(result.events, 'a0')).toEqual([]);
  });

  it('does not charge a later attack when the final opponent was already defeated', () => {
    const initial = battle([
      unit('a0', [{ ...hit, power: 1000, priority: 2 }]), unit('a1', [hit]),
    ], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }, { key: 'a1', skill: 0 }]);
    expect(castsBy(result.events, 'a1')).toEqual([]);
    expect(result.state.allies[1].mp).toBe(initial.allies[1].mp);
    expect(result.state.winner).toBe('win');
  });

  it('retargets a valid enemy defeated earlier in the turn and charges the surviving cast once', () => {
    const initial = battle([
      unit('a0', [{ ...hit, power: 1000, priority: 2 }]), unit('a1', [hit]),
    ], [unit('e0'), unit('e1')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 0, target: 'e0' }]);
    expect(castsBy(result.events, 'a1')[0]?.target).toBe('e1');
    expect(spendingBy(result.events, 'a1')).toHaveLength(1);
    expect(result.state.allies[1].mp).toBe(initial.allies[1].mp - hit.mpCost);
    expect(result.state.enemies[1].hp).toBeLessThan(initial.enemies[1].hp);
  });
});

describe('affordable automatic and enemy choices', () => {
  it('finds a later affordable attack without shifting the learned special index', () => {
    const actor = unit('a0', [{ ...hit, mpCost: 20, power: 100 }, guard, { ...hit, name: '廉価攻撃', mpCost: 3 }]);
    actor.mp = 3;
    const initial = battle([actor], [unit('e0')]);
    expect(autoOrders(initial)[0]).toMatchObject({ skill: 2, target: 'e0' });
    const result = advanceWithEvents(initial, []);
    expect(castsBy(result.events, 'a0')[0]?.skill).toBe('廉価攻撃');
    expect(result.state.allies[0].mp).toBe(0);
  });

  it('does not select an unaffordable heal, cleanse, or protection even for a badly hurt poisoned ally', () => {
    const actor = unit('a0', [heal, cleanse, protect, hit], { atk: 20 });
    actor.mp = 0;
    const friend = unit('a1');
    friend.hp = 80;
    friend.poison = 2;
    const initial = battle([actor, friend], [unit('e0', [hit], { atk: 20 })]);
    expect(autoOrders(initial)[0].skill).toBe(BASIC_ATTACK);
  });

  it('uses a basic attack rather than paying for pointless full-health healing', () => {
    const initial = battle([unit('a0', [heal], { atk: 20 })], [unit('e0', [heal], { atk: 20 })]);
    expect(autoOrders(initial)[0].skill).toBe(BASIC_ATTACK);
    for (const seed of [0, 1, 42, 99, 0xffffffff]) {
      const result = advanceWithEvents({ ...initial, seed }, [{ key: 'a0', skill: DEFEND }]);
      expect(castsBy(result.events, 'e0')[0]?.skill).toBe('通常攻撃');
      expect(result.state.enemies[0].mp).toBe(initial.enemies[0].mp);
    }
  });

  it('keeps seeded enemy variety within the affordable skills and falls back when empty', () => {
    const initial = battle([unit('a0')], [unit('e0', [{ ...hit, mpCost: 20, name: '高価攻撃' }, { ...hit, mpCost: 3, name: '廉価攻撃' }])]);
    for (const mp of [0, 3]) for (const seed of [0, 1, 2, 42, 0xffffffff]) {
      initial.enemies[0].mp = mp;
      const result = advanceWithEvents({ ...initial, seed }, [{ key: 'a0', skill: DEFEND }]);
      expect(castsBy(result.events, 'e0')[0]?.skill).toBe(mp === 0 ? '通常攻撃' : '廉価攻撃');
      expect(result.state.enemies[0].mp).toBe(0);
    }
  });
});

describe('explicit effect clock and absolute replay', () => {
  it('labels defense as this turn and poison as remaining ticks, hiding both on defeat', () => {
    const actor = unit('a0');
    expect(effectStatus(actor)).toBe('');
    actor.guard = true;
    actor.poison = 3;
    expect(effectStatus(actor)).toContain('今T');
    expect(effectStatus(actor)).toContain('残3回');
    actor.poison = 1;
    expect(effectStatus(actor)).toContain('残1回');
    actor.hp = 0;
    expect(effectStatus(actor)).toBe('戦闘不能');
  });

  it('emits ordered turn and action boundaries with action-time resource events', () => {
    const initial = battle([unit('a0', [hit])], [unit('e0')]);
    const { events } = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    const boundaries = events.filter(event => event.kind === 'phase');
    expect(boundaries[0].phase).toBe('turn-start');
    expect(boundaries.at(-1)?.phase).toBe('turn-end');
    for (const cast of events.filter(event => event.kind === 'cast')) {
      const actorBoundaries = boundaries.filter(event => event.actor === cast.actor).map(event => event.phase);
      expect(actorBoundaries).toEqual(['before-action', 'action', 'action-end']);
      expect(cast.phase).toBe('action');
    }
    for (const event of events) expect(['turn-start', 'before-action', 'action', 'action-end', 'turn-end']).toContain(event.phase);
  });

  it('shows MP spending in the cast cue before damage lands', () => {
    const initial = battle([unit('a0', [{ ...hit, priority: 2 }])], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    const timeline = buildTimeline(result.events);
    const castCue = timeline.cues.find(cue => cue.cast?.actor === 'a0')!;
    expect(castCue.updates).toContainEqual(expect.objectContaining({ kind: 'resource', mp: initial.allies[0].mp - hit.mpCost }));
    expect(castCue.impacts.some(event => event.kind === 'damage')).toBe(false);
    const damageCue = timeline.cues.find(cue => cue.impacts.some(event => event.kind === 'damage' && event.actor === 'a0'))!;
    expect(damageCue.at).toBeGreaterThan(castCue.at);
    const casting = applyBattleEvents(initial, [...(castCue.updates ?? []), ...castCue.impacts]);
    expect(casting.allies[0].mp).toBe(initial.allies[0].mp - hit.mpCost);
    expect(casting.enemies[0].hp).toBe(initial.enemies[0].hp);
    expectReplay(initial, result.state, result.events);
  });

  it('applies defense from its cast, avoids stacking, and expires after unmitigated poison at the tail', () => {
    const initial = battle([unit('a0', [protect]), unit('a1', [guard])], [unit('e0', [hit])]);
    initial.allies[1].hp = 100;
    initial.allies[1].poison = 2;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a1' }, { key: 'a1', skill: DEFEND }]);
    const applied = result.events.findIndex(event => event.target === 'a1' && event.guard === true);
    const directHit = result.events.findIndex(event => event.target === 'a1' && event.kind === 'damage' && event.actor === 'e0');
    const poisonTick = result.events.findIndex(event => event.target === 'a1' && event.kind === 'damage' && event.effect === 'poison');
    const expired = result.events.findIndex((event, index) => index > applied && event.target === 'a1' && event.guard === false && event.phase === 'turn-end');
    expect(applied).toBeGreaterThanOrEqual(0);
    expect(directHit).toBeGreaterThan(applied);
    expect(result.events[directHit].amount).toBeLessThanOrEqual(16);
    expect(result.events[poisonTick].amount).toBe(18);
    expect(expired).toBeGreaterThan(poisonTick);
    expect(result.state.allies[1]).toMatchObject({ guard: false, poison: 1 });
    expect(result.state.log.join('\n')).toContain('重ねがけなし');
    const timeline = buildTimeline(result.events);
    const expireCue = timeline.cues.find(cue => cue.updates?.includes(result.events[expired]))!;
    expect(expireCue.cast).toBeNull();
    expectReplay(initial, result.state, result.events);
  });

  it('keeps poison to three end-turn ticks including application, with no hidden replay decrement', () => {
    let state = battle([unit('a0', [poison])], [unit('e0')]);
    for (const [index, remaining] of [2, 1, 0, 0].entries()) {
      const result = advanceWithEvents(state, [{ key: 'a0', skill: index === 0 ? 0 : DEFEND }]);
      const ticks = result.events.filter(event => event.kind === 'damage' && event.effect === 'poison');
      expect(ticks).toHaveLength(index < 3 ? 1 : 0);
      if (ticks.length) expect(ticks[0]).toMatchObject({ phase: 'turn-end', amount: 18 });
      expect(result.state.enemies[0].poison).toBe(remaining);
      expectReplay(state, result.state, result.events);
      state = result.state;
    }
  });

  it('refreshes poison to three before ticking rather than adding durations or extra ticks', () => {
    const initial = battle([unit('a0', [poison]), unit('a1', [poison])], [unit('e0')]);
    initial.enemies[0].poison = 2;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }, { key: 'a1', skill: 0 }]);
    const applications = result.events.filter(event => event.kind === 'poison' && event.actor);
    expect(applications).toHaveLength(2);
    expect(applications.every(event => event.poison === 3)).toBe(true);
    expect(result.events.filter(event => event.kind === 'damage' && event.effect === 'poison')).toHaveLength(1);
    expect(result.state.enemies[0].poison).toBe(2);
    expectReplay(initial, result.state, result.events);
  });

  it('cleansing before the tail cancels that poison tick and replays its removal exactly', () => {
    const initial = battle([unit('a0', [cleanse], { speed: 1 })], [unit('e0', [poison], { speed: 100 })]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events.findIndex(event => event.kind === 'poison')).toBeLessThan(result.events.findIndex(event => event.kind === 'cleanse'));
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'cleanse', poison: 0, target: 'a0' }));
    expect(result.events.some(event => event.kind === 'damage' && event.effect === 'poison')).toBe(false);
    expect(result.state.allies[0].poison).toBe(0);
    expectReplay(initial, result.state, result.events);
  });

  it.each(['hit', 'poison'] as const)('clears guard and poison when defeated by %s without a negative poison counter', cause => {
    const initial = battle([unit('a0')], [unit('e0', cause === 'hit' ? [{ ...hit, power: 1000 }] : [guard])]);
    initial.allies[0].hp = cause === 'hit' ? 50 : 5;
    initial.allies[0].poison = 2;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND }]);
    expect(result.state.allies[0]).toMatchObject({ hp: 0, guard: false, poison: 0 });
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'defeat', target: 'a0', hp: 0, guard: false, poison: 0 }));
    expectReplay(initial, result.state, result.events);
  });

  it('uses absolute payloads idempotently and ignores phase-only boundaries', () => {
    const initial = battle([unit('a0')], [unit('e0')]);
    const events: BattleEvent[] = [
      { kind: 'phase', phase: 'turn-start' },
      { kind: 'resource', actor: 'a0', target: 'a0', phase: 'action', mp: 0 },
      { kind: 'guard', target: 'a0', phase: 'action', guard: true },
      { kind: 'poison', target: 'a0', phase: 'action', poison: 3 },
      { kind: 'damage', target: 'a0', phase: 'turn-end', hp: 123, amount: 177, poison: 2 },
      { kind: 'guard', target: 'a0', phase: 'turn-end', guard: false },
      { kind: 'phase', phase: 'turn-end' },
    ];
    const once = applyBattleEvents(initial, events);
    expect(once.allies[0]).toMatchObject({ hp: 123, mp: 0, guard: false, poison: 2 });
    expect(resources(applyBattleEvents(once, events))).toEqual(resources(once));
    expect(applyBattleEvents(initial, events.filter(event => event.kind === 'phase'))).toEqual(initial);
    expect(initial.allies[0]).toMatchObject({ hp: 300, mp: 60, guard: false, poison: 0 });
  });
});

describe('seeded full-party resource and replay invariants', () => {
  it('runs healer-only combat out of finite MP instead of locking into free healing', () => {
    let state = battle([unit('a0', [heal], { hp: 100, mp: 22, atk: 25 })], [unit('e0', [heal], { hp: 100, mp: 22, atk: 25 })]);
    state.allies[0].hp = 45;
    state.enemies[0].hp = 45;
    let paidHeals = 0;
    let basicAttacks = 0;
    let turns = 0;
    while (!state.winner && turns < MAX_TURNS) {
      const result = advanceWithEvents(state, autoOrders(state));
      paidHeals += result.events.filter(event => event.kind === 'cast' && event.skill === heal.name).length;
      basicAttacks += result.events.filter(event => event.kind === 'cast' && event.skill === '通常攻撃').length;
      expectReplay(state, result.state, result.events);
      state = result.state;
      turns++;
    }
    expect(paidHeals).toBeGreaterThan(0);
    expect(paidHeals).toBeLessThanOrEqual(4);
    expect(basicAttacks).toBeGreaterThan(0);
    expect(state.winner).not.toBeNull();
    expect(turns).toBeLessThan(MAX_TURNS);
  });

  it.each([0, 1, 42, 2026, 20261008, 0xffffffff])('finishes deterministically with legal resource usage and faithful replay (seed %s)', seed => {
    const teams = [[0, 2, 3, 4, 6], [1, 5, 8, 10, 6], [1, 2, 7, 8, 10], [11, 9, 4, 7, 10]];
    for (let matchup = 0; matchup < teams.length; matchup++) {
      let state = start(teams[matchup], teams[(matchup + 1) % teams.length], seed, { leaders: true });
      let turns = 0;
      while (!state.winner && turns < MAX_TURNS) {
        for (const side of ['allies', 'enemies'] as const) {
          const friends = state[side];
          const opponents = side === 'allies' ? state.enemies : state.allies;
          const orders = autoOrders(state, side);
          expect(orders).toEqual(autoOrders(state, side));
          for (const order of orders) {
            const actor = friends.find(unit => unit.key === order.key)!;
            const skill = battleSkill(actor.monster, order.skill)!;
            expect(canUseSkill(actor, skill)).toBe(true);
            const targets = skillTargetsAllies(skill) || skill.kind === 'guard' ? friends : opponents;
            expect(targets.some(unit => unit.key === order.target && unit.hp > 0)).toBe(true);
          }
        }
        const orders = autoOrders(state);
        const result = advanceWithEvents(state, orders);
        expect(advanceWithEvents(state, orders)).toEqual(result);
        expectReplay(state, result.state, result.events);
        for (const actor of allUnits(result.state)) {
          const old = allUnits(state).find(unit => unit.key === actor.key)!;
          expect(Number.isInteger(actor.mp)).toBe(true);
          expect(actor.mp).toBeGreaterThanOrEqual(0);
          expect(actor.mp).toBeLessThanOrEqual(old.mp);
          expect(actor.mp).toBeLessThanOrEqual(actor.monster.mp);
          expect(actor.guard).toBe(false);
          expect(actor.poison).toBeGreaterThanOrEqual(0);
          expect(actor.poison).toBeLessThanOrEqual(2);
          if (actor.hp === 0) expect(actor.poison).toBe(0);
          const actorCasts = castsBy(result.events, actor.key);
          expect(actorCasts.length).toBeLessThanOrEqual(1);
          const cast = actorCasts[0];
          const skill = cast ? [battleSkill(old.monster, BASIC_ATTACK)!, battleSkill(old.monster, DEFEND)!, ...old.monster.skills].find(skill => skill.name === cast.skill)! : undefined;
          expect(actor.mp).toBe(old.mp - (skill?.mpCost ?? 0));
        }
        state = result.state;
        turns++;
      }
      expect(state.winner).not.toBeNull();
      expect(turns).toBeLessThan(MAX_TURNS);
    }
  });
});
