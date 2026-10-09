import { describe, expect, it } from 'vitest';
import { advance, advanceWithEvents, autoOrders, BASIC_ATTACK, battleSkill, cost, DEFEND, MAX_SPECIAL_SKILLS, MAX_TURNS, monsters, start, leaderFor, skillOrderLabel, skillTargetsAllies } from './engine';
import type { BattleEvent, Monster, Skill, SpecialSkills, State, Unit } from './engine';

const attack: Skill = { name: '攻撃', power: 40, priority: 0, kind: 'hit' };
const guard: Skill = { name: '防御', power: 0, priority: 1, kind: 'guard' };
const heal: Skill = { name: '回復', power: 65, priority: 0, kind: 'heal' };
const poison: Skill = { name: '毒', power: 12, priority: 0, kind: 'poison', all: true };
const team = [0, 2, 3, 4, 6];
const enemy = [1, 5, 8, 10, 6];

function unit(key: string, skills: SpecialSkills = [guard], options: Partial<Monster> = {}): Unit {
  const monster: Monster = { id: 0, name: key, icon: '⚔️', cost: 1, hp: 100, atk: 0, speed: 50, skills, ...options };
  return { key, monster, hp: monster.hp, guard: false, poison: 0 };
}

function battle(allies: Unit[], enemies: Unit[], options: Partial<State> = {}): State {
  return { turn: 1, seed: 42, allies, enemies, log: [], winner: null, ...options };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

function expectHpReplay(before: State, after: State, events: BattleEvent[]) {
  const hp = new Map([...before.allies, ...before.enemies].map(value => [value.key, value.hp]));
  for (const event of events) {
    if (event.kind === 'damage' || event.kind === 'heal') {
      expect(event.target).toBeDefined();
      expect(event.amount).toBeGreaterThanOrEqual(0);
      const next = hp.get(event.target!)! + (event.kind === 'heal' ? event.amount! : -event.amount!);
      expect(next).toBe(event.hp);
      expect(next).toBeGreaterThanOrEqual(0);
      hp.set(event.target!, next);
    }
    if (event.kind === 'defeat') expect(hp.get(event.target!)).toBe(0);
  }
  for (const value of [...after.allies, ...after.enemies]) {
    expect(hp.get(value.key)).toBe(value.hp);
    expect(value.hp).toBeGreaterThanOrEqual(0);
    expect(value.hp).toBeLessThanOrEqual(value.monster.hp);
  }
}

describe('battle setup and determinism', () => {
  it('preserves the original twelve-monster roster and team costs', () => {
    expect(monsters).toHaveLength(12);
    expect(cost(team)).toBe(15);
    expect(cost(team)).toBeLessThanOrEqual(17);
    expect(cost([])).toBe(0);
  });

  it('starts a 5v5 battle with unique keys and full HP', () => {
    const state = start(team, enemy);
    expect(state.allies).toHaveLength(5);
    expect(state.enemies).toHaveLength(5);
    expect(new Set([...state.allies, ...state.enemies].map(value => value.key)).size).toBe(10);
    expect([...state.allies, ...state.enemies].every(value => value.hp === value.monster.hp)).toBe(true);
    expect(state.turn).toBe(1);
    expect(state.winner).toBeNull();
  });

  it('reports an invalid roster ID clearly', () => {
    expect(() => start([99], [0])).toThrow('Unknown monster id: 99');
  });

  it('produces identical states and events from the same seed and orders', () => {
    const initial = start(team, enemy, 2026);
    const orders = autoOrders(initial);
    expect(advanceWithEvents(initial, orders)).toEqual(advanceWithEvents(initial, orders));
    expect(advance(initial, orders)).toEqual(advanceWithEvents(initial, orders).state);
  });

  it('does not mutate any input state, unit, log, skill, or order', () => {
    const initial = start(team, enemy);
    initial.allies[0].guard = true;
    initial.allies[1].poison = 2;
    initial.allies[2].hp = 50;
    const snapshot = structuredClone(initial);
    const orders = freeze(autoOrders(initial));
    freeze(initial);
    const result = advanceWithEvents(initial, orders);
    expect(initial).toEqual(snapshot);
    expect(result.state).not.toBe(initial);
    expect(result.state.allies).not.toBe(initial.allies);
    expect(result.state.log).not.toBe(initial.log);
    expect(result.state.allies[0]).not.toBe(initial.allies[0]);
    expect(result.state.turn).toBe(initial.turn + 1);
  });

  it('leaves a completed battle unchanged', () => {
    const initial = battle([unit('a0')], [unit('e0')], { winner: 'win' });
    expect(advanceWithEvents(initial, [])).toEqual({ state: initial, events: [] });
    expect(autoOrders(initial)).toEqual([]);
  });
});

describe('universal commands and learned-special slots', () => {
  const fourSpecials: SpecialSkills = [
    { ...attack, name: '特技1', power: 10 },
    { ...attack, name: '特技2', power: 20 },
    { ...attack, name: '特技3', power: 30 },
    { ...attack, name: '特技4', power: 40 },
  ];

  it('reserves separate universal command IDs and keeps all four special indexes', () => {
    const monster = unit('a0', fourSpecials, { atk: 50 }).monster;
    expect(BASIC_ATTACK).toBe(-1);
    expect(DEFEND).toBe(-2);
    expect(MAX_SPECIAL_SKILLS).toBe(4);
    expect(battleSkill(monster, BASIC_ATTACK)).toMatchObject({ name: '通常攻撃', power: 31, priority: 0, kind: 'hit' });
    expect(battleSkill(monster, DEFEND)).toEqual({ name: 'ぼうぎょ', power: 0, priority: 1, kind: 'guard' });
    fourSpecials.forEach((skill, index) => expect(battleSkill(monster, index)).toBe(skill));
    for (const invalid of [-3, 4, 99, 0.5, Number.NaN]) expect(battleSkill(monster, invalid)).toBeUndefined();
    expect(monster.skills).toHaveLength(4);
  });

  it('keeps existing named guards unchanged', () => {
    const troll = monsters[1];
    expect(battleSkill(troll, 2)).toBe(troll.skills[2]);
    expect(battleSkill(troll, 2)?.name).toBe('鉄壁の構え');
    expect(battleSkill(troll, DEFEND)?.name).toBe('ぼうぎょ');
  });

  it('uses attack-stat baseline damage and honors an explicit enemy for a basic attack', () => {
    const idle = { ...heal, power: 0 };
    const initial = battle([unit('a0', [], { atk: 50 })], [unit('e0', [idle]), unit('e1', [idle])]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: BASIC_ATTACK, target: 'e1' }]);
    expect(result.events).toContainEqual({ kind: 'cast', actor: 'a0', target: 'e1', skill: '通常攻撃', effect: 'hit' });
    const damage = result.events.find(event => event.kind === 'damage' && event.actor === 'a0')!;
    expect(damage.target).toBe('e1');
    expect(damage.amount).toBeGreaterThanOrEqual(45);
    expect(damage.amount).toBeLessThanOrEqual(55);
    expect(result.state.enemies[0].hp).toBe(100);
    expectHpReplay(initial, result.state, result.events);
  });

  it('retargets a basic attack away from a defeated or friendly target', () => {
    for (const target of ['e0', 'a0', 'missing']) {
      const initial = battle([unit('a0', [], { atk: 50 })], [unit('e0'), unit('e1')]);
      initial.enemies[0].hp = 0;
      const result = advanceWithEvents(initial, [{ key: 'a0', skill: BASIC_ATTACK, target }]);
      expect(result.events.find(event => event.kind === 'cast' && event.actor === 'a0')?.target).toBe('e1');
      expect(result.state.enemies[0].hp).toBe(0);
      expect(result.state.enemies[1].hp).toBeLessThan(100);
      expect(result.state.allies[0].hp).toBe(100);
    }
  });

  it.each(monsters.map(monster => [monster.name, monster] as const))('lets %s defend without using a learned-special slot', (_name, monster) => {
    const initial = battle([unit('a0', monster.skills, { ...monster, hp: 1000, speed: 5 })], [unit('e0', [attack], { speed: 100 })]);
    const guarded = advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND, target: 'e0' }]);
    const unguarded = advanceWithEvents(initial, [{ key: 'a0', skill: BASIC_ATTACK }]);
    const damageToAlly = (events: BattleEvent[]) => events.find(event => event.kind === 'damage' && event.target === 'a0')!.amount!;
    expect(guarded.events[0]).toEqual({ kind: 'cast', actor: 'a0', target: 'a0', skill: 'ぼうぎょ', effect: 'guard' });
    expect(guarded.events).toContainEqual({ kind: 'guard', actor: 'a0', target: 'a0' });
    expect(damageToAlly(guarded.events)).toBe(Math.floor(damageToAlly(unguarded.events) / 2));
    expect(guarded.state.allies[0].guard).toBe(true);
    expect(guarded.state.allies[0].monster.skills).toBe(monster.skills);
  });

  it('lets a monster with no specials defend, then clears guard next turn', () => {
    const initial = battle([unit('a0', [], { atk: 20 })], [unit('e0', [], { atk: 20 })]);
    const guarded = advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND }]);
    expect(guarded.state.allies[0].guard).toBe(true);
    expect(guarded.events).toContainEqual({ kind: 'guard', actor: 'a0', target: 'a0' });
    expect(advance(guarded.state, [{ key: 'a0', skill: BASIC_ATTACK }]).allies[0].guard).toBe(false);
  });

  it('falls back to basic attack for automatic and missing orders with no specials on either side', () => {
    const initial = freeze(battle([unit('a0', [], { atk: 30 })], [unit('e0', [], { atk: 30 })]));
    expect(autoOrders(initial)).toEqual([{ key: 'a0', skill: BASIC_ATTACK, target: 'e0' }]);
    expect(autoOrders(initial, 'enemies')).toEqual([{ key: 'e0', skill: BASIC_ATTACK, target: 'a0' }]);
    const result = advanceWithEvents(initial, []);
    expect(result.events.filter(event => event.kind === 'cast').map(event => event.skill)).toEqual(['通常攻撃', '通常攻撃']);
    expect(result.state.allies[0].hp).toBeLessThan(100);
    expect(result.state.enemies[0].hp).toBeLessThan(100);
    expect(advanceWithEvents(initial, [{ key: 'a0', skill: 99 }])).toEqual(result);
    expectHpReplay(initial, result.state, result.events);
  });

  it.each([0, 1, 2, 3])('executes learned special slot %s without shifting its index', index => {
    const initial = battle([unit('a0', fourSpecials)], [unit('e0')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: index, target: 'e0' }]);
    expect(result.events.find(event => event.kind === 'cast' && event.actor === 'a0')?.skill).toBe(fourSpecials[index]!.name);
    expect(autoOrders(initial)[0].skill).toBe(3);
  });

  it('can automatically use healing in the fourth special slot', () => {
    const initial = battle([unit('a0', [attack, guard, poison, heal]), unit('a1')], [unit('e0')]);
    initial.allies[1].hp = 10;
    expect(autoOrders(initial)[0]).toEqual({ key: 'a0', skill: 3, target: 'a1' });
  });

  it('caps malformed external skill lists at four in lookup, manual orders, and both AIs', () => {
    // Simulate untyped imported data; a fifth entry is rejected by the Monster type.
    // @ts-expect-error SpecialSkills permits at most four entries.
    const excess: SpecialSkills = [attack, attack, attack, attack, attack];
    expect(excess).toHaveLength(5);
    const malformed = [...fourSpecials, { ...attack, power: 10000 }, heal] as unknown as SpecialSkills;
    const initial = battle([unit('a0', malformed)], [unit('e0', malformed)]);
    initial.allies[0].hp = 50;
    initial.enemies[0].hp = 50;
    expect(battleSkill(initial.allies[0].monster, 4)).toBeUndefined();
    expect(autoOrders(initial)[0].skill).toBe(3);
    expect(autoOrders(initial, 'enemies')[0].skill).toBe(3);
    expect(advanceWithEvents(initial, [{ key: 'a0', skill: 4 }])).toEqual(advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]));
    const capped = battle([unit('a0', fourSpecials)], [unit('e0', fourSpecials)]);
    capped.allies[0].hp = 50;
    capped.enemies[0].hp = 50;
    for (const seed of [0, 1, 2, 3, 4, 5, 42]) {
      const result = advanceWithEvents({ ...initial, seed }, autoOrders(initial));
      const reference = advanceWithEvents({ ...capped, seed }, autoOrders(capped));
      expect(result.events).toEqual(reference.events);
      expect(result.state.seed).toBe(reference.state.seed);
    }
  });
});

describe('targeting and healing', () => {
  const healingBattle = () => {
    const initial = battle([unit('a0', [heal]), unit('a1'), unit('a2')], [unit('e0')]);
    initial.allies[1].hp = 10;
    initial.allies[2].hp = 50;
    return initial;
  };

  it('honors a valid explicit friendly heal target even when another ally is weaker', () => {
    const initial = healingBattle();
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a2' }]);
    expect(result.state.allies[1].hp).toBe(10);
    expect(result.state.allies[2].hp).toBe(100);
    expect(result.events).toContainEqual({ kind: 'heal', actor: 'a0', target: 'a2', amount: 50, hp: 100 });
    expectHpReplay(initial, result.state, result.events);
  });

  it.each([undefined, 'missing', 'e0'])('falls back to the weakest living ally for target %s', target => {
    const result = advanceWithEvents(healingBattle(), [{ key: 'a0', skill: 0, target }]);
    expect(result.state.allies[1].hp).toBe(75);
    expect(result.state.allies[2].hp).toBe(50);
    expect(result.events.find(event => event.kind === 'cast' && event.actor === 'a0')!.target).toBe('a1');
  });

  it('does not revive a defeated target and falls back to a living ally', () => {
    const initial = healingBattle();
    initial.allies[1].hp = 0;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a1' }]);
    expect(result.state.allies[1].hp).toBe(0);
    expect(result.state.allies[2].hp).toBe(100);
  });

  it('uses HP percentage to determine the weakest ally', () => {
    const initial = battle([unit('a0', [heal]), unit('a1'), unit('a2', [guard], { hp: 200 })], [unit('e0')]);
    initial.allies[1].hp = 40;
    initial.allies[2].hp = 50;
    const result = advanceWithEvents(initial, []);
    expect(result.state.allies[1].hp).toBe(40);
    expect(result.state.allies[2].hp).toBe(115);
  });

  it('allows a full-health explicit friendly target without overhealing', () => {
    const result = advanceWithEvents(healingBattle(), [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events).toContainEqual({ kind: 'heal', actor: 'a0', target: 'a0', amount: 0, hp: 100 });
    expect(result.state.allies[1].hp).toBe(10);
  });

  it('honors an explicit enemy target for single-target damage', () => {
    const initial = battle([unit('a0', [attack])], [unit('e0'), unit('e1')]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e1' }]);
    expect(result.state.enemies[0].hp).toBe(100);
    expect(result.state.enemies[1].hp).toBeLessThan(100);
  });

  it('retargets a defeated or friendly damage target to a living enemy', () => {
    for (const target of ['e0', 'a0', 'missing']) {
      const initial = battle([unit('a0', [attack])], [unit('e0'), unit('e1')]);
      initial.enemies[0].hp = 0;
      const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target }]);
      expect(result.state.enemies[0].hp).toBe(0);
      expect(result.state.enemies[1].hp).toBeLessThan(100);
      expect(result.state.allies[0].hp).toBe(100);
      expect(result.events.find(event => event.kind === 'cast' && event.actor === 'a0')!.target).toBe('e1');
    }
  });

  it('hits every living opponent once with an area attack', () => {
    const initial = battle([unit('a0', [{ ...attack, all: true }]), unit('a1')], [unit('e0'), unit('e1'), unit('e2')]);
    initial.enemies[1].hp = 0;
    const result = advanceWithEvents(initial, []);
    expect(result.events.filter(event => event.kind === 'damage').map(event => event.target)).toEqual(['e0', 'e2']);
    expect(result.state.allies.every(value => value.hp === 100)).toBe(true);
  });

  it('falls back to the first skill for an invalid skill index', () => {
    const initial = battle([unit('a0', [attack])], [unit('e0')]);
    expect(advance(initial, [{ key: 'a0', skill: 99 }])).toEqual(advance(initial, [{ key: 'a0', skill: 0 }]));
  });
});

describe('action order, guard, and defeat', () => {
  it('orders priority before speed, and places an anchor after normal actions', () => {
    const initial = battle([
      unit('a0', [{ ...attack, priority: 2 }], { speed: 1 }),
      unit('a1', [attack], { speed: 100 }),
      unit('a2', [{ ...attack, priority: -2 }], { speed: 1000 }),
    ], [unit('e0', [guard], { hp: 1000 })]);
    const result = advanceWithEvents(initial, []);
    expect(result.events.filter(event => event.kind === 'cast').map(event => event.actor)).toEqual(['a0', 'e0', 'a1', 'a2']);
  });

  it('uses speed to resolve equal-priority actions', () => {
    const initial = battle([unit('a0', [attack], { speed: 10 })], [unit('e0', [attack], { speed: 90 })]);
    expect(advanceWithEvents(initial, []).events.filter(event => event.kind === 'cast').map(event => event.actor)).toEqual(['e0', 'a0']);
  });

  it('halves incoming attack damage while guarding', () => {
    const initial = battle([unit('a0', [guard, attack], { speed: 5 })], [unit('e0', [attack], { speed: 100 })]);
    const guarded = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    const unguarded = advanceWithEvents(initial, [{ key: 'a0', skill: 1 }]);
    const damageToAlly = (events: BattleEvent[]) => events.find(event => event.kind === 'damage' && event.target === 'a0')!.amount!;
    expect(damageToAlly(guarded.events)).toBe(Math.floor(damageToAlly(unguarded.events) / 2));
    expect(guarded.state.allies[0].guard).toBe(true);
    expect(guarded.events.find(event => event.kind === 'cast' && event.actor === 'a0')!.target).toBe('a0');
  });

  it('clears the previous turn’s guard before new actions', () => {
    const initial = battle([unit('a0', [attack], { speed: 5 })], [unit('e0', [attack], { speed: 100 })]);
    const reference = advance(initial, []);
    initial.allies[0].guard = true;
    expect(advance(initial, [])).toEqual(reference);
    expect(reference.allies[0].guard).toBe(false);
  });

  it('lets priority-two attacks land before priority-one guard', () => {
    const initial = battle([unit('a0', [{ ...attack, power: 80, priority: 2 }], { speed: 1 })], [unit('e0', [guard], { speed: 100 })]);
    const result = advanceWithEvents(initial, []);
    expect(result.events.find(event => event.kind === 'damage')!.amount).toBeGreaterThanOrEqual(72);
    expect(result.events.findIndex(event => event.kind === 'damage')).toBeLessThan(result.events.findIndex(event => event.kind === 'guard'));
  });

  it('caps lethal damage at remaining HP and skips a defeated unit’s queued action', () => {
    const initial = battle([unit('a0', [{ ...attack, power: 500, priority: 2 }])], [unit('e0', [attack])]);
    const result = advanceWithEvents(initial, []);
    expect(result.events.find(event => event.kind === 'damage')!.amount).toBe(100);
    expect(result.events.filter(event => event.kind === 'defeat')).toHaveLength(1);
    expect(result.events.some(event => event.kind === 'cast' && event.actor === 'e0')).toBe(false);
    expect(result.state.winner).toBe('win');
    expectHpReplay(initial, result.state, result.events);
  });
});

describe('poison', () => {
  it('ticks on application and for two more turns, then expires', () => {
    const initial = battle([unit('a0', [poison, guard])], [unit('e0')]);
    let result = advanceWithEvents(initial, []);
    expect(result.events.some(event => event.kind === 'poison' && event.target === 'e0')).toBe(true);
    expect(result.events.filter(event => event.kind === 'damage' && event.effect === 'poison').map(event => event.amount)).toEqual([6]);
    expect(result.state.enemies[0].poison).toBe(2);
    expectHpReplay(initial, result.state, result.events);
    for (const remaining of [1, 0]) {
      const previous = result.state;
      result = advanceWithEvents(previous, [{ key: 'a0', skill: 1 }]);
      expect(result.state.enemies[0].poison).toBe(remaining);
      expect(result.events.filter(event => event.effect === 'poison' && event.kind === 'damage')).toHaveLength(1);
      expectHpReplay(previous, result.state, result.events);
    }
    result = advanceWithEvents(result.state, [{ key: 'a0', skill: 1 }]);
    expect(result.events.some(event => event.effect === 'poison')).toBe(false);
  });

  it('refreshes poison duration without stacking multiple ticks', () => {
    const first = advance(battle([unit('a0', [poison])], [unit('e0')]), []);
    const result = advanceWithEvents(first, []);
    expect(result.state.enemies[0].poison).toBe(2);
    expect(result.events.filter(event => event.kind === 'damage' && event.effect === 'poison')).toHaveLength(1);
  });

  it('does not apply poison to a unit killed by the initial hit', () => {
    const initial = battle([unit('a0', [{ ...poison, power: 500 }])], [unit('e0')]);
    const result = advanceWithEvents(initial, []);
    expect(result.events.some(event => event.kind === 'poison')).toBe(false);
    expect(result.state.enemies[0].poison).toBe(0);
  });

  it('ignores guard for poison ticks and can resolve simultaneous poison deaths as a draw', () => {
    const initial = battle([unit('a0')], [unit('e0')]);
    for (const value of [...initial.allies, ...initial.enemies]) {
      value.hp = 5;
      value.poison = 1;
    }
    const result = advanceWithEvents(initial, []);
    expect(result.events.filter(event => event.kind === 'damage').map(event => event.amount)).toEqual([5, 5]);
    expect(result.events.filter(event => event.kind === 'defeat')).toHaveLength(2);
    expect(result.state.winner).toBe('draw');
    expectHpReplay(initial, result.state, result.events);
  });
});

describe('automatic orders and complete battles', () => {
  it('chooses deterministic orders without mutating state or consuming randomness', () => {
    const initial = freeze(start(team, enemy, 91));
    const snapshot = structuredClone(initial);
    expect(autoOrders(initial)).toEqual(autoOrders(initial));
    expect(initial).toEqual(snapshot);
  });

  it('heals a badly hurt living friend and excludes defeated actors', () => {
    const initial = battle([unit('a0', [attack, heal]), unit('a1'), unit('a2')], [unit('e0')]);
    initial.allies[1].hp = 15;
    initial.allies[2].hp = 0;
    const orders = autoOrders(initial);
    expect(orders).toHaveLength(2);
    expect(orders[0]).toEqual({ key: 'a0', skill: 1, target: 'a1' });
  });

  it('prefers area damage against a group and targets living opponents', () => {
    const initial = battle([unit('a0', [attack, { ...attack, power: 25, all: true }])], [unit('e0'), unit('e1'), unit('e2'), unit('e3'), unit('e4')]);
    initial.enemies[0].hp = 0;
    expect(autoOrders(initial)[0]).toEqual({ key: 'a0', skill: 1, target: 'e1' });
    expect(autoOrders(initial, 'enemies').map(order => order.key)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });


  it('applies the same area-hit reduction to damage and automatic skill estimates', () => {
    const initial = battle([unit('a0', [attack, { ...attack, all: true }])], [unit('e0')]);
    const single = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    const area = advanceWithEvents(initial, [{ key: 'a0', skill: 1 }]);
    const damageAmount = (events: BattleEvent[]) => events.find(event => event.kind === 'damage')!.amount!;
    expect(damageAmount(area.events)).toBe(Math.floor(damageAmount(single.events) / 2));
    expect(autoOrders(initial)[0].skill).toBe(0);
    initial.enemies.push(unit('e1'), unit('e2'));
    expect(autoOrders(initial)[0].skill).toBe(1);
  });

  it.each(['auto', 'manual-fox', 'manual-basic'])('keeps the starter’s first battle playable (%s opening)', opening => {
    let state = start(team, enemy, 20261008);
    let orders = autoOrders(state);
    if (opening === 'manual-fox') orders = orders.map(order => order.key === 'a0' ? { key: 'a0', skill: 0, target: 'e0' } : order);
    if (opening === 'manual-basic') orders = state.allies.map(value => ({ key: value.key, skill: 0, target: 'e0' }));
    state = advance(state, orders);
    expect(state.winner).toBeNull();
    expect(state.allies.filter(value => value.hp > 0)).toHaveLength(5);
    let rounds = 1;
    while (!state.winner && rounds < MAX_TURNS) {
      state = advance(state, autoOrders(state));
      rounds++;
    }
    expect(state.winner).toBe('win');
    expect(rounds).toBeGreaterThanOrEqual(3);
    expect(rounds).toBeLessThanOrEqual(6);
  });

  it('keeps representative battles mostly within three to six turns without healing stalemates', () => {
    const rosters = [team, enemy, [11, 9, 4, 7, 10], [0, 3, 1, 6, 2], [1, 2, 7, 8, 10], [0, 4, 6, 9, 11]];
    let total = 0;
    let withinWindow = 0;
    for (const allies of rosters) for (const enemies of rosters) {
      if (allies === enemies) continue;
      for (const seed of [0, 1, 42, 2026, 20261008, 0xffffffff]) {
        let state = start(allies, enemies, seed);
        let rounds = 0;
        while (!state.winner && rounds < MAX_TURNS) {
          state = advance(state, autoOrders(state));
          rounds++;
          if (rounds === 1) expect(state.allies.some(value => value.hp > 0)).toBe(true);
        }
        expect(state.winner).not.toBeNull();
        expect(rounds).toBeLessThan(MAX_TURNS);
        total++;
        if (rounds >= 3 && rounds <= 6) withinWindow++;
      }
    }
    expect(total).toBe(180);
    expect(withinWindow / total).toBeGreaterThanOrEqual(0.85);
  });

  it('stops a no-damage battle at the turn limit', () => {
    let state = battle([unit('a0')], [unit('e0')]);
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      expect(state.winner).toBeNull();
      state = advance(state, []);
    }
    expect(state.winner).toBe('draw');
    expect(state.turn).toBe(MAX_TURNS + 1);
  });

  it.each([
    [80, 100, 'win'],
    [40, 100, 'lose'],
    [50, 100, 'draw'],
  ] as const)('uses remaining HP fractions at the limit (%s vs %s)', (allyHp, enemyHp, winner) => {
    const initial = battle([unit('a0')], [unit('e0', [guard], { hp: 200 })], { turn: MAX_TURNS });
    initial.allies[0].hp = allyHp;
    initial.enemies[0].hp = enemyHp;
    expect(advance(initial, []).winner).toBe(winner);
  });

  it('treats equal remaining health as a draw regardless of roster summation order', () => {
    const initial = battle([unit('a0'), unit('a1'), unit('a2')], [unit('e0'), unit('e1'), unit('e2')], { turn: MAX_TURNS });
    initial.allies.forEach((value, index) => { value.hp = [10, 20, 30][index]; });
    initial.enemies.forEach((value, index) => { value.hp = [30, 20, 10][index]; });
    expect(advance(initial, []).winner).toBe('draw');
  });

  it.each([0, 1, 42, 2026, 0xffffffff])('finishes full 5v5 battles with synchronized events for seed %s', seed => {
    for (const roster of [team, [1, 2, 7, 8, 10], [0, 4, 6, 9, 11]]) {
      let state = start(roster, enemy, seed);
      let rounds = 0;
      while (!state.winner && rounds < MAX_TURNS) {
        const result = advanceWithEvents(state, autoOrders(state));
        expectHpReplay(state, result.state, result.events);
        state = result.state;
        rounds++;
      }
      expect(['win', 'lose', 'draw']).toContain(state.winner);
      expect(rounds).toBeLessThanOrEqual(MAX_TURNS);
      expect(state.log.at(-1)).toMatch(/勝利|敗北|引き分け/);
    }
  });
});

describe('leader traits', () => {
  it('provides twelve distinct original traits with bounded, explained boosts', () => {
    const traits = monsters.map(monster => leaderFor(monster.id));
    expect(new Set(traits.map(trait => trait.name)).size).toBe(12);
    expect(new Set(traits.map(trait => trait.stat))).toEqual(new Set(['hp', 'atk', 'speed']));
    for (const trait of traits) {
      expect(trait.percent).toBe(trait.stat === 'hp' ? 12 : 8);
      expect(trait.description).toContain('味方全員');
      expect(trait.description).toContain(`+${trait.percent}%`);
    }
    expect(() => leaderFor(99)).toThrow('Unknown monster id: 99');
    const trait = leaderFor(0);
    trait.percent = 1000;
    expect(leaderFor(0).percent).toBe(8);
  });

  it.each([0, 1, 4])('applies leader %s to every same-side member with rounded battle-only stats', id => {
    const members = [id, 2, 3, 6, 11];
    const trait = leaderFor(id);
    const state = start(members, members, 42, { leaders: true });
    for (const side of [state.allies, state.enemies]) {
      side.forEach((value, index) => {
        const source = monsters[members[index]];
        expect(value.monster).not.toBe(source);
        for (const stat of ['hp', 'atk', 'speed'] as const) {
          expect(value.monster[stat]).toBe(stat === trait.stat ? Math.round(source[stat] * (1 + trait.percent / 100)) : source[stat]);
        }
        expect(value.hp).toBe(value.monster.hp);
        expect(value.monster.skills).toBe(source.skills);
      });
    }
    expect(state.log).toContain(`味方リーダー ${monsters[id].name}「${trait.name}」：${trait.description}`);
    expect(state.log).toContain(`敵リーダー ${monsters[id].name}「${trait.name}」：${trait.description}`);
  });

  it('uses each side’s own first member and never applies bench or enemy leader traits', () => {
    const state = start([0, 1, 4], [1, 0, 4], 42, { leaders: true });
    expect(state.allies[1].monster.speed).toBe(Math.round(monsters[1].speed * 1.08));
    expect(state.allies[1].monster.hp).toBe(monsters[1].hp);
    expect(state.allies[2].monster.atk).toBe(monsters[4].atk);
    expect(state.enemies[1].monster.hp).toBe(Math.round(monsters[0].hp * 1.12));
    expect(state.enemies[1].monster.speed).toBe(monsters[0].speed);
  });

  it('leaves default setup unchanged, cannot accumulate boosts, and does not mutate inputs', () => {
    const rosterBefore = structuredClone(monsters);
    const allies = freeze([0, 1, 4]);
    const opponents = freeze([4, 1, 0]);
    const options = freeze({ leaders: true });
    const first = start(allies, opponents, 99, options);
    const second = start(allies, opponents, 99, options);
    expect(first).toEqual(second);
    expect(monsters).toEqual(rosterBefore);
    expect(start(allies, opponents, 99)).toEqual(start(allies, opponents, 99, { leaders: false }));
    expect(start(allies, opponents).allies[0].monster).toBe(monsters[0]);
    expect(allies).toEqual([0, 1, 4]);
    expect(opponents).toEqual([4, 1, 0]);
  });

  it('handles empty sides without trying to derive a nonexistent leader', () => {
    expect(start([], [], 42, { leaders: true }).log).toEqual(['戦闘開始！']);
    expect(() => start([99], [], 42, { leaders: true })).toThrow('Unknown monster id: 99');
  });

  it('keeps boosts after the leader is defeated', () => {
    const initial = start([0, 6], [1], 42, { leaders: true });
    initial.allies[0].hp = 0;
    const result = advance(initial, [{ key: 'a1', skill: DEFEND }]);
    expect(result.allies[1].monster.speed).toBe(Math.round(monsters[6].speed * 1.08));
  });
});

describe('bounded counter-skill contracts', () => {
  const protect: Skill = { name: '守護', power: 0, priority: 3, kind: 'protect' };
  const cleanse: Skill = { name: '浄化', power: 35, priority: 0, kind: 'cleanse' };
  const breaker: Skill = { ...attack, name: '防御解除', breaksGuard: true };
  const idle: Skill = { ...heal, power: 0 };

  it('adds only the six fourth-slot counters and preserves all original indexes', () => {
    const firstThree = [
      ['狐火', '疾風斬り', '炎嵐'], ['巨人の鉄槌', '終焉の一撃', '鉄壁の構え'],
      ['爪撃', '生命の雫', '鉄壁の構え'], ['樹海の槍', '生命の雫', '毒霧'],
      ['悲鳴', '毒霧', '影縫い'], ['竜の牙', '嵐の息吹', '鉄壁の構え'],
      ['急降下', '先制の翼', '旋風'], ['水刃', '生命の雫', '鉄壁の構え'],
      ['灼熱拳', '火炎旋風', '終焉の一撃'], ['風切り', '疾風斬り', '毒霧'],
      ['蛇牙', '毒霧', '鉄壁の構え'], ['冥府の刃', '影斬り', '終焉の一撃'],
    ];
    monsters.forEach((monster, index) => {
      expect(monster.skills.slice(0, 3).map(skill => skill.name)).toEqual(firstThree[index]);
      expect(monster.skills.length).toBeLessThanOrEqual(MAX_SPECIAL_SKILLS);
    });
    for (const id of [1, 10]) expect(battleSkill(monsters[id], 3)).toMatchObject({ kind: 'protect', priority: 3 });
    for (const id of [2, 7]) expect(battleSkill(monsters[id], 3)).toMatchObject({ kind: 'cleanse', power: 35, priority: 0 });
    for (const id of [8, 11]) expect(battleSkill(monsters[id], 3)).toMatchObject({ kind: 'hit', power: 58, priority: 0, breaksGuard: true });
    expect(monsters.filter(monster => monster.skills.length === 4)).toHaveLength(6);
  });

  it('classifies ally targets and labels the actual five action priorities', () => {
    for (const skill of [heal, protect, cleanse]) expect(skillTargetsAllies(skill)).toBe(true);
    for (const skill of [attack, poison, guard, breaker]) expect(skillTargetsAllies(skill)).toBe(false);
    expect([protect, { ...attack, priority: 2 }, guard, attack, { ...attack, priority: -2 }].map(skillOrderLabel))
      .toEqual(['最速', '先制', '防御順', '通常順', 'アンカー']);
  });

  it('protects the chosen ally before even a faster priority-two attack', () => {
    const initial = battle([unit('a0', [protect], { speed: 1 }), unit('a1', [idle])], [unit('e0', [{ ...attack, priority: 2 }], { speed: 1000 })]);
    initial.allies[1].hp = 90;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a1' }]);
    expect(result.events[0]).toEqual({ kind: 'cast', actor: 'a0', target: 'a1', skill: '守護', effect: 'protect' });
    expect(result.events[1]).toEqual({ kind: 'guard', actor: 'a0', target: 'a1' });
    expect(result.state.allies[0].guard).toBe(false);
    expect(result.state.allies[1].guard).toBe(true);
    expect(result.events.find(event => event.kind === 'damage')?.amount).toBeLessThanOrEqual(22);
    expect(result.state.log.join('\n')).toContain('防御で半減');
    expectHpReplay(initial, result.state, result.events);
  });

  it('allows self-protection before a fast hit', () => {
    const initial = battle([unit('a0', [protect])], [unit('e0', [{ ...attack, priority: 2 }])]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events).toContainEqual({ kind: 'guard', actor: 'a0', target: 'a0' });
    expect(result.events.find(event => event.kind === 'damage')!.amount).toBeLessThanOrEqual(22);
  });

  it.each([undefined, 'missing', 'e0', 'a2'])('retargets invalid protection target %s to a living friend', target => {
    const initial = battle([unit('a0', [protect]), unit('a1', [idle]), unit('a2', [idle])], [unit('e0', [idle])]);
    initial.allies[1].hp = 50;
    initial.allies[2].hp = 0;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target }]);
    expect(result.events.find(event => event.kind === 'cast')!.target).toBe('a1');
    expect(result.state.enemies[0].guard).toBe(false);
    expect(result.state.allies[2].hp).toBe(0);
  });

  it('never stacks protection with a second protector or the target’s own defense', () => {
    const initial = battle([unit('a0', [protect]), unit('a1', [protect]), unit('a2', [guard, idle])], [unit('e0', [attack])]);
    initial.allies[2].hp = 90;
    const doubled = advanceWithEvents(initial, [
      { key: 'a0', skill: 0, target: 'a2' }, { key: 'a1', skill: 0, target: 'a2' }, { key: 'a2', skill: DEFEND },
    ]);
    const single = advanceWithEvents(initial, [
      { key: 'a0', skill: 0, target: 'a2' }, { key: 'a1', skill: DEFEND }, { key: 'a2', skill: 1 },
    ]);
    const damageToTarget = (events: BattleEvent[]) => events.find(event => event.kind === 'damage' && event.target === 'a2')!.amount;
    expect(damageToTarget(doubled.events)).toBe(damageToTarget(single.events));
    expect(doubled.state.log.join('\n')).toContain('重ねがけなし');
  });

  it('expires protection before the next turn and never reduces poison ticks', () => {
    const initial = battle([unit('a0', [protect, idle])], [unit('e0', [idle])]);
    initial.allies[0].poison = 2;
    const first = advanceWithEvents(initial, [{ key: 'a0', skill: 0 }]);
    expect(first.state.allies[0].guard).toBe(true);
    expect(first.events.find(event => event.kind === 'damage')!.amount).toBe(6);
    const next = advanceWithEvents(first.state, [{ key: 'a0', skill: 1 }]);
    expect(next.state.allies[0].guard).toBe(false);
    expect(next.events.find(event => event.kind === 'damage')!.amount).toBe(6);
  });

  it('breaks guard before this hit and leaves subsequent hits unmitigated', () => {
    const initial = battle([unit('a0', [breaker], { speed: 100 }), unit('a1', [attack], { speed: 1 })], [unit('e0', [guard], { hp: 1000 })]);
    const result = advanceWithEvents(initial, []);
    const brokenAt = result.events.findIndex(event => event.kind === 'break');
    const firstDamageAt = result.events.findIndex(event => event.kind === 'damage');
    expect(result.events[brokenAt]).toEqual({ kind: 'break', actor: 'a0', target: 'e0' });
    expect(brokenAt).toBeLessThan(firstDamageAt);
    expect(result.events.filter(event => event.kind === 'damage').every(event => event.amount! >= 36)).toBe(true);
    expect(result.state.enemies[0].guard).toBe(false);
    expect(result.state.log.join('\n')).toContain('防御を解除');
    expectHpReplay(initial, result.state, result.events);
  });

  it('breaks ally-granted protection as well as self-defense', () => {
    const initial = battle([unit('a0', [breaker])], [unit('e0', [protect]), unit('e1', [idle])]);
    initial.enemies[1].hp = 35;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e1' }]);
    expect(result.events).toContainEqual({ kind: 'guard', actor: 'e0', target: 'e1' });
    expect(result.events).toContainEqual({ kind: 'break', actor: 'a0', target: 'e1' });
    expect(result.state.enemies[1].guard).toBe(false);
  });

  it('does not invent break events against an unguarded enemy', () => {
    const initial = battle([unit('a0', [breaker])], [unit('e0', [idle])]);
    expect(advanceWithEvents(initial, []).events.some(event => event.kind === 'break')).toBe(false);
  });

  it('can establish guard again later in the turn after an earlier break', () => {
    const initial = battle([unit('a0', [{ ...breaker, power: 10, priority: 2 }])], [unit('e0', [guard]), unit('e1', [protect])]);
    initial.enemies[0].hp = 35;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }]);
    expect(result.events.some(event => event.kind === 'break')).toBe(true);
    expect(result.state.enemies[0].guard).toBe(true);
    expectHpReplay(initial, result.state, result.events);
    expectStatusReplay(initial, result.state, result.events);
  });

  it('cleanses poison, heals exactly 35, and prevents the pending poison tick', () => {
    const initial = battle([unit('a0', [cleanse]), unit('a1', [idle])], [unit('e0', [idle])]);
    initial.allies[1].hp = 40;
    initial.allies[1].poison = 2;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a1' }]);
    expect(result.events).toContainEqual({ kind: 'cleanse', actor: 'a0', target: 'a1' });
    expect(result.events).toContainEqual({ kind: 'heal', actor: 'a0', target: 'a1', amount: 35, hp: 75 });
    expect(result.state.allies[1]).toMatchObject({ hp: 75, poison: 0 });
    expect(result.events.some(event => event.effect === 'poison')).toBe(false);
    expect(result.state.log.join('\n')).toContain('毒が消えた');
    expectHpReplay(initial, result.state, result.events);
  });

  it('cleanses a full-health ally with no overhealing and supports self-targeting', () => {
    const initial = battle([unit('a0', [cleanse])], [unit('e0', [idle])]);
    initial.allies[0].poison = 3;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.state.allies[0]).toMatchObject({ hp: 100, poison: 0 });
    expect(result.events).toContainEqual({ kind: 'heal', actor: 'a0', target: 'a0', amount: 0, hp: 100 });
  });

  it.each([undefined, 'missing', 'e0', 'a2'])('retargets invalid cleanse target %s to a poisoned living ally', target => {
    const initial = battle([unit('a0', [cleanse]), unit('a1', [idle]), unit('a2', [idle])], [unit('e0', [idle])]);
    initial.allies[0].hp = 10;
    initial.allies[1].poison = 2;
    initial.allies[2].hp = 0;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target }]);
    expect(result.events.find(event => event.kind === 'cleanse')?.target).toBe('a1');
    expect(result.state.allies[1].poison).toBe(0);
    expect(result.state.allies[2].hp).toBe(0);
  });

  it('honors an explicitly chosen non-poisoned ally and caps the heal', () => {
    const initial = battle([unit('a0', [cleanse]), unit('a1', [idle])], [unit('e0', [idle])]);
    initial.allies[0].poison = 2;
    initial.allies[1].hp = 90;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a1' }]);
    expect(result.state.allies[0].poison).toBe(1);
    expect(result.state.allies[1].hp).toBe(100);
    expect(result.events).toContainEqual({ kind: 'heal', actor: 'a0', target: 'a1', amount: 10, hp: 100 });
    expect(result.state.log.join('\n')).toContain('毒なし');
  });

  it('respects same-priority speed: cleansing before a later poison does not grant immunity', () => {
    const initial = battle([unit('a0', [cleanse], { speed: 100 })], [unit('e0', [poison], { speed: 1 })]);
    initial.allies[0].poison = 2;
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events.findIndex(event => event.kind === 'cleanse')).toBeLessThan(result.events.findIndex(event => event.kind === 'poison'));
    expect(result.state.allies[0].poison).toBe(2);
    expect(result.events.some(event => event.kind === 'damage' && event.effect === 'poison')).toBe(true);
  });

  it('can remove poison applied earlier in the same turn before it ticks', () => {
    const initial = battle([unit('a0', [cleanse], { speed: 1 })], [unit('e0', [poison], { speed: 100 })]);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]);
    expect(result.events.findIndex(event => event.kind === 'poison')).toBeLessThan(result.events.findIndex(event => event.kind === 'cleanse'));
    expect(result.state.allies[0].poison).toBe(0);
    expect(result.events.some(event => event.kind === 'damage' && event.effect === 'poison')).toBe(false);
  });

  it('automatically cleanses poison and spreads different healers across poisoned allies', () => {
    const initial = battle([unit('a0', [attack, heal, guard, cleanse]), unit('a1', [attack, heal, guard, cleanse]), unit('a2', [idle])], [unit('e0', [attack])]);
    initial.allies[0].poison = 2;
    initial.allies[2].poison = 2;
    initial.allies[2].hp = 50;
    const before = structuredClone(initial);
    expect(autoOrders(freeze(initial)).slice(0, 2)).toEqual([
      { key: 'a0', skill: 3, target: 'a2' }, { key: 'a1', skill: 3, target: 'a0' },
    ]);
    expect(initial).toEqual(before);
  });

  it('protects a savable vulnerable ally, avoids redundant shields, and keeps attacking alone', () => {
    const initial = battle([unit('a0', [attack, protect]), unit('a1', [attack, protect]), unit('a2', [attack])], [unit('e0', [attack])]);
    initial.allies[2].hp = 35;
    const orders = autoOrders(initial);
    expect(orders[0]).toEqual({ key: 'a0', skill: 1, target: 'a2' });
    expect(orders[1].skill).toBe(0);
    const solo = battle([unit('a0', [attack, protect])], [unit('e0', [attack])]);
    solo.allies[0].hp = 35;
    expect(autoOrders(solo)[0].skill).toBe(0);
    initial.allies[2].hp = 5;
    expect(autoOrders(initial)[0].skill).toBe(0);
  });

  it('selects guard-breaking over a stronger normal hit against a guarded target', () => {
    const initial = battle([unit('a0', [{ ...attack, power: 60 }, breaker])], [unit('e0', [guard])]);
    expect(autoOrders(initial)[0].skill).toBe(0);
    initial.enemies[0].guard = true;
    expect(autoOrders(initial)[0].skill).toBe(1);
  });

  it.each(['protect', 'cleanse'] as const)('makes the enemy’s %s counter effective despite seeded skill variety', kind => {
    for (const seed of [0, 1, 42, 99]) {
      const support = kind === 'protect' ? protect : cleanse;
      const initial = battle([unit('a0', [attack])], [unit('e0', [attack, guard, attack, support]), unit('e1', [idle])], { seed });
      initial.enemies[1].hp = 35;
      if (kind === 'cleanse') initial.enemies[1].poison = 2;
      expect(autoOrders(initial, 'enemies')[0]).toEqual({ key: 'e0', skill: 3, target: 'e1' });
      const result = advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND }]);
      expect(result.events).toContainEqual({ kind: kind === 'protect' ? 'guard' : 'cleanse', actor: 'e0', target: 'e1' });
      expect(result.events.some(event => event.actor === 'e0' && event.target === 'a0' && (event.kind === 'guard' || event.kind === 'cleanse'))).toBe(false);
    }
  });
});

function expectStatusReplay(before: State, after: State, events: BattleEvent[]) {
  const statuses = new Map([...before.allies, ...before.enemies].map(value => [value.key, { guard: false, poison: value.poison }]));
  for (const event of events) {
    const status = event.target ? statuses.get(event.target) : undefined;
    if (!status) continue;
    if (event.kind === 'guard') status.guard = true;
    if (event.kind === 'break') status.guard = false;
    if (event.kind === 'poison') status.poison = 3;
    if (event.kind === 'cleanse') status.poison = 0;
    if (event.kind === 'damage' && event.effect === 'poison') status.poison--;
  }
  for (const value of [...after.allies, ...after.enemies]) {
    expect(statuses.get(value.key)).toEqual({ guard: value.guard, poison: value.poison });
  }
}

describe('leader-enabled counter battles', () => {
  it.each([0, 1, 42, 2026, 20261008, 0xffffffff])('produces legal deterministic choices, faithful HP/status replay, and a result by 20 turns (seed %s)', seed => {
    const compositions = [team, enemy, [1, 2, 7, 8, 10], [0, 4, 6, 9, 11], [11, 9, 4, 7, 10]];
    for (const roster of compositions) {
      let state = start(roster, compositions[(compositions.indexOf(roster) + 1) % compositions.length], seed, { leaders: true });
      let turns = 0;
      while (!state.winner && turns < MAX_TURNS) {
        for (const side of ['allies', 'enemies'] as const) {
          const friends = state[side];
          const opponents = side === 'allies' ? state.enemies : state.allies;
          const orders = autoOrders(state, side);
          expect(orders).toEqual(autoOrders(state, side));
          expect(orders).toHaveLength(friends.filter(value => value.hp > 0).length);
          for (const order of orders) {
            const actor = friends.find(value => value.key === order.key)!;
            const skill = battleSkill(actor.monster, order.skill)!;
            expect(actor.hp).toBeGreaterThan(0);
            expect(skill).toBeDefined();
            const legalTargets = skillTargetsAllies(skill) || skill.kind === 'guard' ? friends : opponents;
            expect(legalTargets.some(value => value.key === order.target && value.hp > 0)).toBe(true);
          }
        }
        const orders = freeze(autoOrders(state));
        const before = structuredClone(state);
        const result = advanceWithEvents(freeze(state), orders);
        expect(result).toEqual(advanceWithEvents(state, orders));
        expect(state).toEqual(before);
        expectHpReplay(state, result.state, result.events);
        expectStatusReplay(state, result.state, result.events);
        state = result.state;
        turns++;
      }
      expect(['win', 'lose', 'draw']).toContain(state.winner);
      expect(turns).toBeLessThanOrEqual(MAX_TURNS);
    }
  });
});
