import { describe, expect, it } from 'vitest';
import {
  advanceWithEvents, autoOrders, BASIC_ATTACK, battleSkill, cost, DEFEND, leaderFor,
  MAX_TURNS, monsters, start,
} from './engine';
import type { BattleEvent, Order, Skill, State, Unit } from './engine';
import { isValidTeam, monsterRole, opponentTeams, rules, type RuleId } from './strategy';

// Role checks use real roster stats, learned skill indexes, and resource budgets.
// A harmless, explicitly labelled training target isolates damage/resource costs;
// the final section additionally exercises unmodified, legal 5v5 battles.
const idle: Skill = { name: '試験待機', kind: 'heal', power: 0, priority: 0, mpCost: 0 };
const dummy = (key: string, hp = 1000): Unit => ({
  key, monster: { id: -1, name: '試験標的', icon: '🎯', cost: 0, hp, mp: 0, atk: 0, speed: 1, skills: [idle] },
  hp, mp: 0, guard: false, poison: 0,
});
const training = (ids: number[], count = 1, hp = 1000): State => ({
  ...start(ids, [], 42), enemies: Array.from({ length: count }, (_, index) => dummy(`e${index}`, hp)),
});
const damageBy = (events: BattleEvent[], actor: string) =>
  events.filter(event => event.kind === 'damage' && event.actor === actor).reduce((sum, event) => sum + event.amount!, 0);
const casts = (events: BattleEvent[]) => events.filter(event => event.kind === 'cast');
const skillIndex = (id: number, kind: Skill['kind']) => monsters[id].skills.findIndex(skill => skill.kind === kind);
const cast = (id: number, skill: number, count = 1) =>
  advanceWithEvents(training([id], count), [{ key: 'a0', skill, target: 'e0' }]);

/** Force one real enemy skill to isolate a response, without changing its stats. */
function forceEnemySkill(state: State, index: number): State {
  return {
    ...state,
    enemies: state.enemies.map(unit => ({ ...unit, monster: { ...unit.monster, skills: [unit.monster.skills[index]!] } })),
  };
}

function legalTeamIncluding(id: number, budget: number): number[] {
  const otherIds = monsters.filter(monster => monster.id !== id)
    .sort((a, b) => a.cost - b.cost || a.id - b.id).slice(0, 4).map(monster => monster.id);
  const team = [id, ...otherIds];
  expect(isValidTeam(team, budget)).toBe(true);
  return team;
}

describe('all fifteen roles remain selectable under the two real 5v5 rules', () => {
  it.each<RuleId>(['standard', 'light'])('gives each distinct role a legal five-member %s team', rule => {
    expect(monsters).toHaveLength(15);
    const names = new Set<string>();
    for (const monster of monsters) {
      const team = legalTeamIncluding(monster.id, rules[rule].budget);
      expect(team).toHaveLength(5);
      expect(new Set(team).size).toBe(5);
      expect(cost(team)).toBeLessThanOrEqual(rules[rule].budget);
      names.add(monsterRole(monster.id).name);
    }
    expect(names.size).toBe(15);
  });

  it('makes COST17 vs COST15 a real tradeoff while keeping the same roster', () => {
    const heavy = [0, 5, 7, 1, 6];
    expect(cost(heavy)).toBe(17);
    expect(isValidTeam(heavy, rules.standard.budget)).toBe(true);
    expect(isValidTeam(heavy, rules.light.budget)).toBe(false);
    const cheaperHealer = [0, 5, 2, 1, 6];
    expect(cost(cheaperHealer)).toBe(16);
    expect(isValidTeam(cheaperHealer, rules.light.budget)).toBe(false);
    const lighterPair = [0, 8, 2, 1, 6];
    expect(cost(lighterPair)).toBe(15);
    expect(isValidTeam(lighterPair, rules.light.budget)).toBe(true);
  });
});

describe('initiative, bulk, and front-loaded damage have distinct jobs', () => {
  it('gives 妖狐 a heavier preemptive hit than ガルーダ at a higher cost and lower speed', () => {
    const fox = cast(0, 1);
    const garuda = cast(6, 1);
    expect(damageBy(fox.events, 'a0')).toBeGreaterThan(damageBy(garuda.events, 'a0'));
    expect(fox.state.allies[0].mp).toBe(monsters[0].mp - 12);
    expect(monsters[0].cost).toBeGreaterThan(monsters[6].cost);
    expect(monsters[0].speed).toBeLessThan(monsters[6].speed);
    expect(damageBy(cast(0, 0).events, 'a0')).toBeGreaterThan(damageBy(fox.events, 'a0'));
  });

  it('lets the fragile ガルーダ secure a fast knockout that a slower heavy command loses', () => {
    const initial = forceEnemySkill(start([6], [0], 42), 1);
    initial.allies[0].hp = 40;
    initial.enemies[0].hp = 40;
    const quick = advanceWithEvents(initial, [{ key: 'a0', skill: 1, target: 'e0' }]);
    const heavy = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }]);
    expect(quick.state.winner).toBe('win');
    expect(heavy.state.winner).toBe('lose');
    expect(casts(quick.events)[0]).toMatchObject({ actor: 'a0', skill: '先制の翼' });
    expect(heavy.state.allies[0].mp).toBe(monsters[6].mp); // defeated before paying
    expect(monsters[6].hp).toBe(Math.min(...monsters.slice(0, 13).map(monster => monster.hp)));
  });

  it.each([1, 10])('lets guardian %s save a slower attacker before enemy preemption, at an action and MP cost', guardian => {
    const initial = forceEnemySkill(start([guardian, 4], [0], 42), 1);
    initial.allies[1].hp = 35;
    initial.enemies[0].hp = 40;
    const attackingOrder: Order = { key: 'a1', skill: 2, target: 'e0' };
    const saved = advanceWithEvents(initial, [
      { key: 'a0', skill: skillIndex(guardian, 'protect'), target: 'a1' }, attackingOrder,
    ]);
    const unsupported = advanceWithEvents(initial, [{ key: 'a0', skill: BASIC_ATTACK, target: 'e0' }, attackingOrder]);
    const selfDefended = advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND }, { key: 'a1', skill: DEFEND }]);
    expect(saved.state.allies[1].hp).toBeGreaterThan(0);
    expect(saved.state.winner).toBe('win');
    expect(unsupported.state.allies[1].hp).toBe(0);
    expect(selfDefended.state.allies[1].hp).toBe(0); // ordinary defense is later than preemption
    expect(casts(saved.events).map(event => event.actor)).toEqual(['a0', 'e0', 'a1']);
    expect(damageBy(saved.events, 'a0')).toBe(0);
    expect(saved.state.allies[0].mp).toBe(monsters[guardian].mp - 10);
  });

  it('distinguishes トロル bulk and heavy anchor from the cheaper ナーガ support/poison choice', () => {
    expect(monsters[1].hp).toBe(Math.max(...monsters.map(monster => monster.hp)));
    expect(monsters[1].hp).toBeGreaterThan(monsters[10].hp);
    expect(monsters[1].cost).toBeGreaterThan(monsters[10].cost);
    expect(monsters[1].speed).toBeLessThan(monsters[10].speed);
    const heavy = cast(1, 1);
    const normal = cast(1, 0);
    expect(damageBy(heavy.events, 'a0')).toBeGreaterThan(damageBy(normal.events, 'a0'));
    expect(heavy.state.allies[0].mp).toBe(monsters[1].mp - 20);
    expect(monsters[1].skills[1]?.priority).toBeLessThan(monsters[1].skills[0]!.priority);
    expect(monsters[10].skills.some(skill => skill.kind === 'poison')).toBe(true);
    expect(monsters[1].skills.some(skill => skill.kind === 'poison')).toBe(false);
  });

  it('gives ケツァルコアトル stronger area damage and more bulk than 妖狐, but no preemptive strike', () => {
    const dragon = cast(5, 1, 5);
    const fox = cast(0, 2, 5);
    expect(damageBy(dragon.events, 'a0')).toBeGreaterThan(damageBy(fox.events, 'a0'));
    expect(monsters[5].hp).toBeGreaterThan(monsters[0].hp);
    expect(monsters[5].speed).toBeLessThan(monsters[0].speed);
    expect(monsters[5].skills.some(skill => skill.kind === 'hit' && skill.priority > 0)).toBe(false);
    expect(dragon.state.allies[0].mp).toBe(monsters[5].mp - 18);
    const oneTarget = cast(5, 1);
    const concentrated = cast(5, 0);
    expect(damageBy(oneTarget.events, 'a0')).toBeLessThan(damageBy(concentrated.events, 'a0'));
    expect(oneTarget.state.allies[0].mp).toBeLessThan(concentrated.state.allies[0].mp);
  });
});

describe('poison leaders and healing specialists retain different opportunities', () => {
  it('makes 烏天狗 speed leadership change a real kill-before-being-hit decision', () => {
    const duel = (leaders: boolean) => {
      const initial = forceEnemySkill(start([9, 4], [11], 42, { leaders }), 0);
      initial.allies[1].hp = 40;
      initial.enemies[0].hp = 50;
      return advanceWithEvents(initial, [{ key: 'a0', skill: DEFEND }, { key: 'a1', skill: 0, target: 'e0' }]);
    };
    expect(duel(true).state.allies[1].hp).toBeGreaterThan(0);
    expect(duel(false).state.allies[1].hp).toBe(0);
    expect(leaderFor(9).stat).toBe('speed');
    expect(leaderFor(4).stat).toBe('atk');
    const attackLed = start([4, 9], [1], 42, { leaders: true });
    expect(attackLed.allies[1].monster.atk).toBeGreaterThan(monsters[9].atk);
    expect(attackLed.allies[1].monster.speed).toBe(monsters[9].speed);
  });

  it('makes バンシー poison cover five enemies but concede immediate single-target damage', () => {
    const poisoned = advanceWithEvents(training([4], 5, 170), [{ key: 'a0', skill: 1 }]);
    const concentrated = advanceWithEvents(training([4], 5, 170), [{ key: 'a0', skill: 0, target: 'e0' }]);
    expect(poisoned.events.filter(event => event.kind === 'poison')).toHaveLength(5);
    expect(damageBy(poisoned.events, 'a0')).toBeGreaterThan(damageBy(concentrated.events, 'a0'));
    const directOnFirst = poisoned.events.find(event => event.kind === 'damage' && event.actor === 'a0' && event.target === 'e0')!.amount!;
    expect(directOnFirst).toBeLessThan(damageBy(concentrated.events, 'a0'));
    expect(poisoned.state.allies[0].mp).toBeLessThan(concentrated.state.allies[0].mp);
  });

  it('does not multiply poison ticks when バンシー and 烏天狗 both apply it in one turn', () => {
    const result = advanceWithEvents(training([4, 9], 5, 170), [
      { key: 'a0', skill: skillIndex(4, 'poison') }, { key: 'a1', skill: skillIndex(9, 'poison') },
    ]);
    expect(result.events.filter(event => event.kind === 'poison')).toHaveLength(10);
    const ticks = result.events.filter(event => event.kind === 'damage' && event.effect === 'poison');
    expect(ticks).toHaveLength(5);
    expect(ticks.every(event => event.amount === Math.floor(170 * 0.06))).toBe(true);
    expect(result.state.enemies.every(unit => unit.poison === 2)).toBe(true);
  });

  it.each([2, 7])('gives healer %s exactly four full heals, with no infinite recovery or revival', healer => {
    let state = training([healer, 1]);
    const healing = skillIndex(healer, 'heal');
    let restored = 0;
    for (let turn = 0; turn < 4; turn++) {
      state.allies[1].hp = 20;
      const result = advanceWithEvents(state, [
        { key: 'a0', skill: healing, target: 'a1' }, { key: 'a1', skill: DEFEND },
      ]);
      restored += result.events.filter(event => event.kind === 'heal' && event.actor === 'a0').reduce((sum, event) => sum + event.amount!, 0);
      state = result.state;
    }
    expect(restored).toBe(260);
    expect(state.allies[0].mp).toBe(0);
    const exhausted = advanceWithEvents(state, [{ key: 'a0', skill: healing, target: 'a1' }, { key: 'a1', skill: DEFEND }]);
    expect(casts(exhausted.events).some(event => event.actor === 'a0')).toBe(false);
    expect(autoOrders(state).find(order => order.key === 'a0')?.skill).toBe(BASIC_ATTACK);
    expect(battleSkill(state.allies[0].monster, BASIC_ATTACK)?.mpCost).toBe(0);
  });

  it('charges セルキー an extra team cost for bulk and speed, not stronger healing or cleansing', () => {
    expect(monsters[7].cost - monsters[2].cost).toBe(1);
    expect(monsters[7].hp).toBeGreaterThan(monsters[2].hp);
    expect(monsters[7].speed).toBeGreaterThan(monsters[2].speed);
    expect(monsters[7].mp).toBe(monsters[2].mp);
    for (const kind of ['heal', 'cleanse'] as const) {
      const a = monsters[2].skills.find(skill => skill.kind === kind)!;
      const b = monsters[7].skills.find(skill => skill.kind === kind)!;
      expect([b.power, b.priority, b.mpCost]).toEqual([a.power, a.priority, a.mpCost]);
    }
  });

  it('lets ドリュアス switch from wide poison to healing, consuming its shared finite pool', () => {
    let state = training([3, 1], 5);
    const poisoned = advanceWithEvents(state, [{ key: 'a0', skill: 2 }, { key: 'a1', skill: DEFEND }]);
    expect(poisoned.events.filter(event => event.kind === 'poison' && event.actor === 'a0')).toHaveLength(5);
    state = poisoned.state;
    state.allies[1].hp = 20;
    const healed = advanceWithEvents(state, [{ key: 'a0', skill: 1, target: 'a1' }, { key: 'a1', skill: DEFEND }]);
    expect(healed.events).toContainEqual(expect.objectContaining({ kind: 'heal', actor: 'a0', target: 'a1', amount: 65 }));
    expect(healed.state.allies[0].mp).toBe(monsters[3].mp - 16 - 18);
    expect(monsters[3].skills.some(skill => skill.kind === 'cleanse' || skill.kind === 'protect')).toBe(false);
    expect(monsters[3].mp).toBeLessThan(monsters[2].mp);
  });

  it.each([2, 7])('lets cleanser %s remove fast poison before its first tick, but not grant future immunity', healer => {
    const response = (poisoner: number) => {
      const state = forceEnemySkill(start([healer, 6], [poisoner], 42), skillIndex(poisoner, 'poison'));
      state.allies[0].hp -= 40;
      return advanceWithEvents(state, [{ key: 'a0', skill: skillIndex(healer, 'cleanse'), target: 'a0' }, { key: 'a1', skill: DEFEND }]);
    };
    const afterFastPoison = response(4); // 75 speed, before either cleanser
    expect(afterFastPoison.state.allies[0].poison).toBe(0);
    expect(afterFastPoison.events.filter(event => event.kind === 'damage' && event.effect === 'poison').map(event => event.target)).toEqual(['a1']);
    expect(afterFastPoison.events).toContainEqual(expect.objectContaining({ kind: 'heal', actor: 'a0', amount: 35 }));
    const beforeSlowPoison = response(10); // 39 speed, reapplies after cleansing
    expect(beforeSlowPoison.state.allies[0].poison).toBe(2);
    expect(beforeSlowPoison.events.filter(event => event.kind === 'damage' && event.effect === 'poison')).toHaveLength(2);
    // Both scenarios leave the defended second ally poisoned: defense cannot cancel ticks.
    expect(afterFastPoison.state.allies[1].poison).toBe(2);
    expect(beforeSlowPoison.state.allies[1].poison).toBe(2);
  });
});

describe('guard breakers unlock later hits rather than replacing initiative', () => {
  it.each([8, 11])('lets breaker %s expose a guarded enemy for トロル’s later anchor', breaker => {
    const initial = forceEnemySkill(start([breaker, 1], [1], 42), 2);
    const breakerSkill = monsters[breaker].skills.findIndex(skill => skill.breaksGuard);
    const anchor: Order = { key: 'a1', skill: 1, target: 'e0' };
    const broken = advanceWithEvents(initial, [{ key: 'a0', skill: breakerSkill, target: 'e0' }, anchor]);
    const guarded = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }, anchor]);
    expect(broken.events).toContainEqual(expect.objectContaining({ kind: 'break', actor: 'a0', target: 'e0' }));
    expect(damageBy(broken.events, 'a1')).toBeGreaterThanOrEqual(damageBy(guarded.events, 'a1') * 2);
    expect(broken.events.findIndex(event => event.kind === 'break')).toBeLessThan(broken.events.findIndex(event => event.kind === 'damage' && event.actor === 'a1'));
    expect(monsters[breaker].skills[breakerSkill]?.priority).toBe(0);
    expect(broken.state.allies[0].mp).toBe(monsters[breaker].mp - 14);
    expect(guarded.state.allies[0].mp).toBe(monsters[breaker].mp - 10);
  });

  it('distinguishes COST3 イフリート coverage from COST4 アヌビス initiative and heavier attacks', () => {
    expect(monsters[8].cost).toBe(3);
    expect(monsters[11].cost).toBe(4);
    expect(monsters[11].atk).toBe(Math.max(...monsters.map(monster => monster.atk)));
    expect(monsters[11].speed).toBeGreaterThan(monsters[8].speed);
    expect(monsters[8].hp).toBeGreaterThan(monsters[11].hp);
    expect(monsters[8].skills.some(skill => skill.all)).toBe(true);
    expect(monsters[11].skills.some(skill => skill.all)).toBe(false);
    expect(monsters[11].skills.some(skill => skill.priority === 2)).toBe(true);
    expect(monsters[8].skills.some(skill => skill.priority === 2)).toBe(false);
    expect(damageBy(cast(11, 3).events, 'a0')).toBeGreaterThan(damageBy(cast(8, 3).events, 'a0'));
    expect(damageBy(cast(11, 2).events, 'a0')).toBeGreaterThan(damageBy(cast(8, 2).events, 'a0'));
  });
});

describe('real-roster 5v5 completion is an invariant, not a win-rate balance claim', () => {
  it.each<RuleId>(['standard', 'light'])('finishes legal %s battles with every roster role and finite resources', rule => {
    const actorsThatCast = new Set<number>();
    for (const monster of monsters) {
      const team = legalTeamIncluding(monster.id, rules[rule].budget);
      for (const seed of [0, 42, 20261009]) {
        for (const enemy of opponentTeams(rule)) {
          let state = start(team, enemy, seed, { leaders: true });
          while (!state.winner && state.turn <= MAX_TURNS) {
            const result = advanceWithEvents(state, autoOrders(state));
            for (const event of casts(result.events)) {
              const actor = state.allies.find(unit => unit.key === event.actor);
              if (actor) actorsThatCast.add(actor.monster.id);
            }
            for (const unit of [...result.state.allies, ...result.state.enemies]) {
              expect(unit.mp).toBeGreaterThanOrEqual(0);
              expect(unit.mp).toBeLessThanOrEqual(unit.monster.mp);
              expect(unit.hp).toBeGreaterThanOrEqual(0);
              expect(unit.hp).toBeLessThanOrEqual(unit.monster.hp);
              expect(unit.guard).toBe(false);
            }
            state = result.state;
          }
          expect(state.winner).not.toBeNull();
          expect(state.turn - 1).toBeLessThanOrEqual(MAX_TURNS);
        }
      }
    }
    expect([...actorsThatCast].sort((a, b) => a - b)).toEqual(monsters.map(monster => monster.id));
  });
});
