import { describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, autoOrders, battleSkill, completeOrders, BASIC_ATTACK, DEFEND, start, type Order, type State } from './engine';

const fixture = () => start([14, 3, 6, 9, 10], [29, 1, 8, 30, 31], 42, { leaders: true });
const poisonOrder = (state: State, index: number): Order => ({
  key: state.allies[index].key,
  skill: state.allies[index].monster.skills.findIndex(skill => skill.kind === 'poison'),
});
const poisonCasts = (result: ReturnType<typeof advanceWithEvents>) => result.events.filter(event =>
  event.kind === 'cast' && event.effect === 'poison' && event.actor?.startsWith('a'));

describe('confirmed own orders and automatic poison completion', () => {
  it('does not duplicate a later-slot confirmed poison with an earlier automatic poison', () => {
    const state = fixture();
    const result = advanceWithEvents(state, [poisonOrder(state, 3)]);
    expect(poisonCasts(result).map(event => event.actor)).toEqual(['a3']);
  });
  it('does not reserve the discarded poison when the first automatic poisoner is set to attack', () => {
    const state = fixture();
    const result = advanceWithEvents(state, [{ key: 'a1', skill: BASIC_ATTACK, target: 'e0' }]);
    expect(poisonCasts(result).map(event => event.actor)).toEqual(['a3']);
  });
});

const poisonKeys = (state: State, orders: Order[]) => orders.filter(order => {
  const unit = state.allies.find(unit => unit.key === order.key);
  return unit && battleSkill(unit.monster, order.skill)?.kind === 'poison';
}).map(order => order.key);
const freeze = <T,>(value: T): T => {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
};

describe('completion boundaries and comparison controls', () => {
  it('keeps confirmed double poison unchanged and records its existing legality and MP spending', () => {
    const state = fixture(), fixed = [poisonOrder(state, 1), poisonOrder(state, 3)];
    const plan = completeOrders(state, fixed);
    expect(poisonKeys(state, plan)).toEqual(['a1', 'a3']);
    fixed.forEach(order => expect(plan.find(next => next.key === order.key)).toBe(order));
    const result = advanceWithEvents(state, fixed);
    expect(poisonCasts(result)).toHaveLength(2);
    for (const order of fixed) {
      expect(result.events).toContainEqual(expect.objectContaining({kind: 'resource', actor: order.key, amount: 16}));
      expect(result.state.history![0].orders).toContainEqual(expect.objectContaining({...order, source: 'explicit', accepted: true}));
    }
  });
  it.each(['dead', 'unaffordable', 'invalid-skill', 'wrong-target', 'unknown-actor'] as const)('%s fixed commands do not reserve poison', reason => {
    const state = fixture(), fixed = poisonOrder(state, 3);
    if (reason === 'dead') state.allies[3].hp = 0;
    if (reason === 'unaffordable') state.allies[3].mp = 15;
    if (reason === 'invalid-skill') fixed.skill = 99;
    if (reason === 'wrong-target') fixed.target = 'a1';
    if (reason === 'unknown-actor') fixed.key = 'outside-party';
    const plan = completeOrders(state, [fixed]);
    expect(poisonKeys(state, plan)).toContain('a1');
    if (reason !== 'dead' && reason !== 'unknown-actor') expect(plan.find(order => order.key === fixed.key)).toBe(fixed);
    else expect(plan.some(order => order.key === fixed.key)).toBe(false);
  });
  it('rebuilds reservation after removal, replacement or reset, without retaining hidden choices', () => {
    const state = fixture(), fixed = poisonOrder(state, 3);
    expect(poisonKeys(state, completeOrders(state, [fixed]))).toEqual(['a3']);
    expect(poisonKeys(state, completeOrders(state, []))).toEqual(['a1']);
    expect(poisonKeys(state, completeOrders(state, [{...fixed, skill: BASIC_ATTACK, target: 'e0'}]))).toEqual(['a1']);
    expect(poisonKeys(state, completeOrders(state, [fixed]))).toEqual(['a3']);
    expect(completeOrders(state, [])).toEqual(autoOrders(state));
  });
  it('reserves only the confirmed living target of a single-target poison, never an unfinished selection', () => {
    const state = fixture(), fixed = poisonOrder(state, 3), caster = state.allies[3];
    caster.monster = {...caster.monster, skills: caster.monster.skills.map((skill, index) =>
      index === fixed.skill ? {...skill, all: false} : skill) as unknown as typeof caster.monster.skills};
    // A single large unpoisoned target isolates the reservation's scoring effect.
    state.enemies[0].monster = {...state.enemies[0].monster, hp: 10000};
    state.enemies[0].hp = 10000;
    state.enemies.slice(1).forEach(unit => { unit.poison = 3; });
    expect(poisonKeys(state, completeOrders(state, [{...fixed, target: 'e0'}]))).toEqual(['a3']);
    for (const target of [undefined, 'e1', 'a1', 'missing']) {
      expect(poisonKeys(state, completeOrders(state, [{...fixed, target}]))).toEqual(['a1', 'a3']);
    }
    state.enemies[1].hp = 0;
    expect(poisonKeys(state, completeOrders(state, [{...fixed, target: 'e1'}]))).toEqual(['a1', 'a3']);
  });
  it('uses first confirmed order precedence and ignores opposing input keys', () => {
    const state = fixture(), poison = poisonOrder(state, 3), attack = {...poison, skill: BASIC_ATTACK, target: 'e0'};
    expect(poisonKeys(state, completeOrders(state, [attack, poison]))).toEqual(['a1']);
    expect(poisonKeys(state, completeOrders(state, [poison, attack]))).toEqual(['a3']);
    expect(completeOrders(state, [{key: 'e0', skill: 0}])).toEqual(autoOrders(state));
  });
  it.each([0, 0.5, 1])('retains exact legacy context-free completion with reservePoison:false / scale %s', poisonImpactScale => {
    const state = start([14, 3, 6, 9, 10], [29, 1, 8, 30, 31], 42, {leaders: true, reservePoison: false, poisonImpactScale});
    for (const fixed of [[], [poisonOrder(state, 3)], [{key: 'a1', skill: BASIC_ATTACK, target: 'e0'}]]) {
      const historical = autoOrders(state).map(order => fixed.find(value => value.key === order.key) ?? order);
      expect(completeOrders(state, fixed)).toEqual(historical);
    }
  });
  it('does not forecast enemy orders, future cleansing/cashout, survival, or future MP', () => {
    const state = fixture(), fixed = poisonOrder(state, 3);
    state.allies[3].hp = 1;
    expect(poisonKeys(state, completeOrders(state, [fixed]))).toEqual(['a3']);
    const result = advanceWithEvents(state, [fixed], {enemyOrders: state.enemies.map(unit => ({key: unit.key, skill: DEFEND}))});
    expect(result.state.history![0].orders.find(order => order.key === 'a1')?.skillKind).not.toBe('poison');
    state.allies[3].mp = 15;
    expect(poisonKeys(state, completeOrders(state, [fixed])).some(key => key !== 'a3')).toBe(true);
  });
  it('is byte-equivalent with no fixed commands, pure, repeatable and RNG-free on either side', () => {
    const state = freeze(fixture()), fixed = freeze([poisonOrder(state, 3)]);
    const before = JSON.stringify({state, fixed});
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Planner must not consume randomness'); });
    try {
      for (const side of ['allies', 'enemies'] as const) expect(JSON.stringify(completeOrders(state, [], side))).toBe(JSON.stringify(autoOrders(state, side)));
      expect(completeOrders(state, fixed)).toEqual(completeOrders(state, fixed));
      expect(JSON.stringify({state, fixed})).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
  it.each(['heal', 'cleanse', 'protect'] as const)('keeps existing %s coordination when an automatic support command is confirmed', kind => {
    const state = start(kind === 'protect' ? [1, 10, 0, 6, 11] : [2, 7, 0, 6, 11], [29, 1, 8, 30, 31], 42, {leaders: true});
    if (kind === 'heal') state.allies[2].hp = state.allies[3].hp = 80;
    if (kind === 'cleanse') state.allies[2].poison = state.allies[3].poison = 3;
    if (kind === 'protect') { state.allies[0].hp = 100; state.allies[1].hp = 80; }
    const automatic = autoOrders(state);
    expect(automatic.filter(order => battleSkill(state.allies.find(unit => unit.key === order.key)!.monster, order.skill)?.kind === kind)).toHaveLength(2);
    expect(completeOrders(state, [automatic[0]])).toEqual(automatic);
    // Overriding support is outside this poison-only change: preserve prior coordination.
    const fixed = {...automatic[0], skill: BASIC_ATTACK, target: 'e0'};
    expect(completeOrders(state, [fixed])).toEqual(automatic.map(order => order.key === fixed.key ? fixed : order));
  });
  it('returns no orders after the battle has ended', () => {
    const state = fixture(); state.winner = 'win';
    expect(completeOrders(state, [poisonOrder(state, 3)])).toEqual([]);
  });
});
