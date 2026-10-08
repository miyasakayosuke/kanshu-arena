import { describe, expect, it } from 'vitest';
import { advance, advanceWithEvents, autoOrders, cost, MAX_TURNS, monsters, start } from './engine';
import type { BattleEvent, Monster, Skill, State, Unit } from './engine';

const attack: Skill = { name: '攻撃', power: 40, priority: 0, kind: 'hit' };
const guard: Skill = { name: '防御', power: 0, priority: 1, kind: 'guard' };
const heal: Skill = { name: '回復', power: 65, priority: 0, kind: 'heal' };
const poison: Skill = { name: '毒', power: 12, priority: 0, kind: 'poison', all: true };
const team = [0, 2, 3, 4, 6];
const enemy = [1, 5, 8, 10, 6];

function unit(key: string, skills: Skill[] = [guard], options: Partial<Monster> = {}): Unit {
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
