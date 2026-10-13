import * as historicalEngine from '../tests/reference-v02030/engine';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withoutPoisonControlMetadata } from './legacyPoisonTestControls';
import { advanceWithEvents, autoOrders, baseDamage, BASIC_ATTACK, cost, DEFEND, leaderFor, monsters, poisonCashoutDamageFor, poisonCashoutPerTickFor, poisonTicksFor, start, UNDEAD_CASHOUT, UNDEAD_CORE_ID, undeadCashoutEligible, type BattleEvent, type Order, type Skill, type State, type Unit } from './engine';
import { battleEventLine, battleFactEvidenceLines, resultFacts } from './battleInsights';

const undead = [32, 4, 33, 34, 35];
const cashoutSkill = monsters[32].skills[0]!;
const cashouts = (events: BattleEvent[]) => events.filter(event => event.kind === 'poison-cashout');
const orders = (state: State, side: 'allies' | 'enemies', skill = DEFEND): Order[] => state[side].map(unit => ({ key: unit.key, skill }));
const fixture = (qualified = false, ticks = 3) => {
  const state = start(qualified ? [32, 4, 35] : [32], [1]); state.enemies[0].poison = ticks;
  return state;
};
const resolve = (state: State, enemyOrders = orders(state, 'enemies', 99)) => advanceWithEvents(state,
  orders(state, 'allies').map(order => order.key === 'a0' ? { key: 'a0', skill: 0, target: 'e0' } : order), { enemyOrders });
const tank = (unit: Unit) => { unit.monster = { ...unit.monster, hp: 5000 }; unit.hp = 5000; };
const normalizeLegacy = <T>(value: T): T => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === 'monster' && item?.id === 4) { const copy = { ...item }; delete copy.family; return copy; }
  return item;
}));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('undead roster and fixed opening qualification', () => {
  it('preserves all old32 fields except Banshee family and adds the exact C17 roster', () => {
    expect(monsters.slice(0, 36)).toHaveLength(36); expect(monsters.slice(32, 36).map(monster => monster.id)).toEqual([32, 33, 34, 35]);
    expect(monsters.filter(monster => monster.family === 'undead').map(monster => monster.id)).toEqual([4, 32, 33, 34, 35]);
    expect(hash(normalizeLegacy(monsters.slice(0, 32).map(monster => ({ monster, leader: leaderFor(monster.id) }))))).toBe('df26738816328e65cf893236556e4601a012458049eb9273e760cb043c1131b6');
    expect(cost(undead)).toBe(17); expect(cost([32, 4, 35, 3, 10])).toBe(15);
    expect(monsters.every(monster => monster.skills.length <= 4)).toBe(true);
    expect(monsters.slice(32, 36).map(({ hp, mp, atk, speed, cost }) => [hp, mp, atk, speed, cost])).toEqual([[205, 62, 42, 49, 5], [175, 48, 50, 84, 4], [220, 42, 34, 32, 3], [125, 50, 25, 63, 2]]);
    expect(monsters.slice(32, 36).map(monster => monster.skills.map(({ name, kind, power, mpCost, priority }) => [name, kind, power, mpCost, priority]))).toEqual([
      [['塚底の取り立て', 'hit', 48, 18, 0], ['土蓋の拳', 'hit', 62, 10, 0]],
      [['手綱ほどき', 'hit', 48, 14, 0], ['轍の一打', 'hit', 70, 12, 0]],
      [['袖の囲い', 'protect', 0, 10, 3], ['踏みしめ', 'hit', 56, 8, 0]],
      [['影の縫い直し', 'heal', 52, 18, 0], ['結び払い', 'cleanse', 20, 10, 0], ['逆さの小突き', 'hit', 35, 7, 0]],
    ]);
  });
  it.each([[32], [32, 4], [32, 3, 10], [4, 33, 34, 35]])('does not qualify %j', (...ids) => {
    const state = start(ids, []); expect(undeadCashoutEligible(state.allies)).toBe(false);
    expect(state.allies.every(unit => unit.poisonCashoutBonus === undefined)).toBe(true);
  });
  it('qualifies only the nonleader core on both sides from starting membership, including later KOs', () => {
    const state = start([4, 32, 35, 3, 10], [34, 33, 32]);
    expect(UNDEAD_CORE_ID).toBe(32); expect(UNDEAD_CASHOUT).toEqual({ coreId: 32, family: 'undead', minimumMembers: 3, base: 14, bonus: 8, name: '塚底の取り立て' });
    expect(state.allies.map(unit => unit.poisonCashoutBonus)).toEqual([undefined, 8, undefined, undefined, undefined]);
    expect(state.enemies.map(unit => unit.poisonCashoutBonus)).toEqual([undefined, undefined, 8]);
    state.allies[0].hp = 0; state.allies[2].hp = 0;
    expect(undeadCashoutEligible(state.allies)).toBe(true); expect(poisonCashoutPerTickFor(state.allies[1], cashoutSkill)).toBe(22);
    const disabled = start(undead, [], 42, { familySupport: false });
    expect(disabled.allies.every(unit => unit.poisonCashoutBonus === undefined)).toBe(true);
    expect(poisonCashoutPerTickFor(disabled.allies[0], cashoutSkill)).toBe(14);
  });
  it('keeps Banshee’s old leader and applies all new leaders only to undead', () => {
    expect(leaderFor(4)).toEqual({ name: '月影の号令', stat: 'atk', percent: 8, description: '味方全員の攻撃力 +8%' });
    const state = start([32, 4, 35, 3, 10], [], 42, { leaders: true });
    expect(state.allies.map(unit => unit.monster.hp)).toEqual([226, 171, 138, 180, 185]);
    expect(leaderFor(33)).toMatchObject({ family: 'undead', stat: 'speed', percent: 8 });
    expect(leaderFor(34)).toMatchObject({ family: 'undead', stat: 'hp', percent: 8 });
    expect(leaderFor(35)).toMatchObject({ family: 'undead', stat: 'mp', percent: 8 });
    expect(start([35, 4, 3], [], 42, { leaders: true }).allies.map(unit => unit.mp)).toEqual([54, 60, 64]);
  });
  it('bounds Lab coefficients/ticks and independently disables base or family bonus', () => {
    const unit = fixture(true).allies[0], target = fixture().enemies[0];
    for (const poisonCashout of [0, -1, NaN, Infinity, undefined]) expect(poisonCashoutPerTickFor(unit, { ...cashoutSkill, poisonCashout })).toBe(0);
    expect(poisonCashoutPerTickFor({ ...unit, poisonCashoutBonus: 0 }, cashoutSkill)).toBe(14);
    for (const poisonCashoutBonus of [-8, NaN, Infinity]) expect(poisonCashoutPerTickFor({ ...unit, poisonCashoutBonus }, cashoutSkill)).toBe(14);
    expect(poisonCashoutPerTickFor({ ...unit, poisonCashoutBonus: 500 }, { ...cashoutSkill, poisonCashout: 500 })).toBe(30);
    expect(poisonCashoutPerTickFor({ ...unit, poisonCashoutBonus: 2.9 }, { ...cashoutSkill, poisonCashout: 13.9 })).toBe(15);
    for (const [poison, expected] of [[-1, 0], [NaN, 0], [Infinity, 0], [2.9, 2], [5, 3]]) expect(poisonTicksFor({ ...target, poison })).toBe(expected);
    expect(poisonCashoutDamageFor(unit, cashoutSkill, { ...target, hp: 0 })).toBe(0);
    for (const invalid of [{ kind: 'poison' }, { all: true }, { randomHits: 1 }, { breaksGuard: true }, { breaksGuardAfterHit: true }, { mpDamage: 0 }, { fixedDamage: true }, { dragonChargeFinisher: true }, { mpCost: 0 }]) {
      expect(poisonCashoutPerTickFor(unit, { ...cashoutSkill, ...invalid } as Skill)).toBe(0);
    }
  });
  it('never exposes the fixed family bonus as a dispellable buff', () => {
    const state = start([32, 4, 34], [33]); state.enemies[0].poison = 3;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: DEFEND }, { key: 'a2', skill: 0, target: 'a0' }], { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
    expect(result.events.some(event => event.kind === 'break' && event.target === 'a0')).toBe(true);
    expect(result.state.allies[0].poisonCashoutBonus).toBe(8); expect(cashouts(result.events)[0].poisonCashoutPerTick).toBe(22);
    expect(result.events.flatMap(event => event.removed ?? [])).not.toContain('poisonCashoutBonus');
  });
});

describe('cashout impact, opportunity cost, and cancellation', () => {
  it.each([0, 1, 2, 3])('consumes exactly %s ticks once with/without the family bonus and emits an explicit zero reset', ticks => {
    for (const qualified of [false, true]) for (const protection of ['none', 'guard', 'ward', 'both']) {
      const state = fixture(qualified, ticks); if (protection === 'ward' || protection === 'both') state.enemies[0].ward = 2;
      const result = resolve(state, orders(state, 'enemies', protection === 'guard' || protection === 'both' ? DEFEND : 99));
      const perTick = qualified ? 22 : 14, events = cashouts(result.events);
      expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ actor: 'a0', target: 'e0', poison: 0, poisonTicksConsumed: ticks, poisonCashoutPerTick: perTick, poisonCashoutAdded: ticks * perTick, phase: 'action' });
      const scale = protection === 'guard' || protection === 'both' ? 0.5 : protection === 'ward' ? 0.9 : 1;
      const expected = Math.floor((baseDamage(state.allies[0], cashoutSkill) + ticks * perTick) * (0.9 + (result.state.seed % 21) / 100) * scale);
      expect(result.events.find(event => event.kind === 'damage' && event.actor === 'a0')!.amount).toBe(expected);
      expect(result.events.filter(event => event.kind === 'resource' && event.actor === 'a0')).toHaveLength(1); expect(result.state.allies[0].mp).toBe(44);
      expect(result.state.enemies[0].poison).toBe(0); expect(result.events.some(event => event.effect === 'poison')).toBe(false);
      expect(result.events.some(event => event.kind === 'cleanse' || event.kind === 'heal')).toBe(false);
      expect(state.enemies[0].poison).toBe(ticks);
    }
  });
  it('captures lethal consumption before damage and defeat can erase the evidence', () => {
    const state = fixture(true); state.enemies[0].hp = 1; const result = resolve(state);
    const impacts = result.events.filter(event => event.target === 'e0' && ['poison-cashout', 'damage', 'defeat'].includes(event.kind));
    expect(impacts.map(event => event.kind)).toEqual(['poison-cashout', 'damage', 'defeat']);
    expect(impacts[0]).toMatchObject({ poisonTicksConsumed: 3, poisonCashoutAdded: 66 });
    expect(impacts[1]).toMatchObject({ amount: 1, hp: 0 }); expect(result.state.enemies[0].poison).toBe(0);
  });
  it('resolves current poison after earlier poison/cleanse rather than reserving command-time ticks', () => {
    for (const healerSpeed of [60, 86]) {
      const state = start([32, 4, 35], [2]); tank(state.enemies[0]); state.enemies[0].poison = 2;
      state.enemies[0].monster = { ...state.enemies[0].monster, speed: healerSpeed };
      const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1 }, { key: 'a2', skill: DEFEND }], { enemyOrders: [{ key: 'e0', skill: 3, target: 'e0' }] });
      expect(cashouts(result.events)[0].poisonTicksConsumed).toBe(healerSpeed === 60 ? 0 : 3);
      expect(result.state.enemies[0].poison).toBe(0);
    }
  });
  it('documents the C15 mixed threat: slower Naga legally reapplies poison after cashout', () => {
    const state = start([32, 4, 35, 3, 10], [1]); tank(state.enemies[0]);
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1 }, { key: 'a2', skill: DEFEND }, { key: 'a3', skill: DEFEND }, { key: 'a4', skill: 1 }], { enemyOrders: orders(state, 'enemies', DEFEND) });
    expect(cashouts(result.events)[0]).toMatchObject({ poisonTicksConsumed: 3, poisonCashoutPerTick: 22 });
    expect(result.events.filter(event => event.kind === 'poison').map(event => event.actor)).toEqual(['a1', 'a4']);
    expect(result.events.filter(event => event.kind === 'damage' && event.effect === 'poison')).toHaveLength(1);
    expect(result.state.enemies[0].poison).toBe(2); expect(result.state.allies[4].mp).toBe(monsters[10].mp - 16);
  });
  it('takes only the actual surviving retarget’s poison when the selected enemy dies first', () => {
    const state = start([32, 33], [1, 8]); state.enemies[0].hp = 1; state.enemies[0].poison = 3; state.enemies[1].poison = 1;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1, target: 'e0' }], { enemyOrders: orders(state, 'enemies', 99) });
    expect(cashouts(result.events)).toEqual([expect.objectContaining({ target: 'e1', poisonTicksConsumed: 1, poisonCashoutAdded: 14 })]);
    expect(result.state.enemies[0].hp).toBe(0); expect(result.state.enemies[1].poison).toBe(0);
  });
  it('cannot consume the same ticks twice across separate hits', () => {
    const state = start([32, 32], [1]); tank(state.enemies[0]); state.enemies[0].poison = 3;
    const result = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: 0, target: 'e0' })), { enemyOrders: orders(state, 'enemies', 99) });
    expect(cashouts(result.events).map(event => event.poisonTicksConsumed)).toEqual([3, 0]);
    expect(result.events.filter(event => event.kind === 'cast')).toHaveLength(2);
  });
  it('full mechanic ablation leaves poison ticking while family-bonus ablation still consumes it', () => {
    for (const disabled of [false, true]) {
      const state = fixture(true); state.allies[0].poisonCashoutBonus = 0;
      if (disabled) state.allies[0].monster = { ...state.allies[0].monster, skills: [{ ...cashoutSkill, poisonCashout: 0 }] };
      const result = resolve(state); expect(cashouts(result.events)).toHaveLength(disabled ? 0 : 1);
      expect(result.state.enemies[0].poison).toBe(disabled ? 2 : 0);
      if (!disabled) expect(cashouts(result.events)[0].poisonCashoutAdded).toBe(42);
    }
  });
  it('does not consume on an invalid target/skill, initial MP failure, or dead actor', () => {
    for (const scenario of ['target', 'skill', 'mp', 'dead']) {
      const state = fixture(); if (scenario === 'mp') state.allies[0].mp = 17; if (scenario === 'dead') state.allies[0].hp = 0;
      const mp = state.allies[0].mp;
      const result = advanceWithEvents(state, [{ key: 'a0', skill: scenario === 'skill' ? 99 : 0, target: scenario === 'target' ? 'a0' : 'e0' }], { enemyOrders: orders(state, 'enemies', 99) });
      expect(cashouts(result.events)).toHaveLength(0); expect(result.state.allies[0].mp).toBe(mp); expect(result.state.enemies[0].poison).toBe(2);
    }
  });
  it('does not consume when killed before acting or when no living enemy remains', () => {
    const state = start([32, 34], [0]); state.allies[0].hp = 1; state.enemies[0].poison = 3;
    const killed = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: DEFEND }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] });
    expect(killed.state.allies[0].hp).toBe(0); expect(cashouts(killed.events)).toHaveLength(0); expect(killed.state.allies[0].mp).toBe(62);
    const done = start([32, 33], [1]); done.enemies[0].hp = 1; done.enemies[0].poison = 3;
    const canceled = advanceWithEvents(done, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1, target: 'e0' }], { enemyOrders: orders(done, 'enemies', 99) });
    expect(cashouts(canceled.events)).toHaveLength(0); expect(canceled.state.allies[0].mp).toBe(62);
  });
  it('discards consumption/addition when enemy MP loss switches the paid order to basic', () => {
    const state = start([32], [29]); state.allies[0].mp = 18; state.enemies[0].poison = 3;
    const result = resolve(state, [{ key: 'e0', skill: 0, target: 'a0' }]);
    expect(cashouts(result.events)).toHaveLength(0); expect(result.events.find(event => event.kind === 'fallback')).toMatchObject({ actor: 'a0', fromSkill: 0, toSkill: BASIC_ATTACK, queuePriority: 0 });
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'a0')).toEqual([expect.objectContaining({ skill: '通常攻撃' })]);
    expect(result.state.enemies[0].poison).toBe(2); expect(result.state.allies[0].mp).toBe(12);
  });
  it('finite healing affects survivors only and never revives', () => {
    const state = start([35, 32], [1]); state.allies[1].hp = 0; state.allies[0].hp = 25;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'a1' }], { enemyOrders: orders(state, 'enemies', 99) });
    expect(result.state.allies[1].hp).toBe(0); expect(result.state.allies[0].hp).toBe(77); expect(result.state.allies[0].mp).toBe(32);
  });
});

describe('public-state cashout AI and authoritative evidence', () => {
  it('values a decisive cashout, retained poison on highHP targets, ordinary hits, and free finishes on either side', () => {
    for (const side of ['allies', 'enemies'] as const) {
      const state = start(undead, undead), unit = state[side][0], opponents = side === 'allies' ? state.enemies : state.allies;
      opponents.slice(1).forEach(target => { target.hp = 0; });
      const target = opponents[0]; target.poison = 3; target.hp = 105;
      expect(autoOrders(state, side).find(order => order.key === unit.key)).toEqual({ key: unit.key, skill: 0, target: target.key });
      tank(target); expect(autoOrders(state, side).find(order => order.key === unit.key)!.skill).toBe(1);
      target.poison = 0; expect(autoOrders(state, side).find(order => order.key === unit.key)!.skill).toBe(1);
      target.hp = 20; expect(autoOrders(state, side).find(order => order.key === unit.key)!.skill).toBe(BASIC_ATTACK);
      target.hp = 105; target.poison = 3; unit.mp = 17; expect(autoOrders(state, side).find(order => order.key === unit.key)!.skill).toBe(1);
    }
  });
  it('never mutates state, reads hidden orders, or uses seeds to choose a core’s automatic command', () => {
    const state = start([32, 4, 35], [32, 4, 35]); state.allies[0].poison = 3; state.enemies[0].poison = 3;
    state.allies[0].hp = 105; state.enemies[0].hp = 105; const before = structuredClone(state);
    const expected = autoOrders(state); expect(state).toEqual(before);
    for (const seed of [0, 1, 42, 0xffffffff]) expect(autoOrders({ ...state, seed })).toEqual(expected);
    const result = advanceWithEvents(state, expected, { enemyOrders: autoOrders(state, 'enemies') });
    expect(result.state.history![0].orders.find(order => order.key === 'e0')!.skill).toBe(autoOrders(state, 'enemies')[0].skill);
  });
  it('selects a meaningful poisoned target beyond the lowestHP enemy', () => {
    const state = start([32, 4, 35], [1, 8]); state.enemies[0].hp = 90; state.enemies[1].hp = 105; state.enemies[1].poison = 3;
    expect(autoOrders(state)[0]).toEqual({ key: 'a0', skill: 0, target: 'e1' });
  });
  it('retains the same public-state core policy after full-mechanic ablation', () => {
    for (const poisonCashout of [0, undefined]) for (const seed of [0, 1, 42, 0xffffffff]) {
      const state = start([1, 8], [32], seed);
      state.allies[0].hp = 90; state.allies[1].hp = 30;
      state.enemies[0].monster = { ...state.enemies[0].monster, skills: [{ ...cashoutSkill, poisonCashout }, monsters[32].skills[1]!] };
      const expected = autoOrders(state, 'enemies')[0];
      expect(expected).toEqual({ key: 'e0', skill: 1, target: 'a0' });
      const result = advanceWithEvents(state, orders(state, 'allies', DEFEND), { enemyOrders: autoOrders(state, 'enemies') });
      expect(result.state.history![0].orders.find(order => order.key === 'e0')).toMatchObject({ skill: expected.skill, target: expected.target });
      expect(cashouts(result.events)).toHaveLength(0);
    }
  });
  it('distinguishes actual cashout evidence from healing/cleanse and preserves lethal ticks', () => {
    const state = fixture(true); state.enemies[0].hp = 1; const result = resolve(state), facts = resultFacts(result.state);
    expect(facts[0]).toMatchObject({ kind: 'poison-cashout' }); expect(facts[0].text).toContain('味方 3回分／敵 0回分');
    expect(battleFactEvidenceLines(result.state, facts[0]).join('\n')).toContain('毒3回分を消費');
    expect(battleEventLine(result.state, cashouts(result.events)[0])).toContain('残り0回・一撃を強化');
    expect(result.state.history![0].events).toEqual(result.events); expect(facts.some(fact => fact.kind === 'healing')).toBe(false);
  });
  it('historical v30 reference: under explicit legacy poison controls, matches all384 independently frozen complete old32 battles, including normal CPU and explicit same-AI', () => {
    // Frozen BEFORE modifying the predecessor engine, with full final state,
    // history, orders, events, logs, RNG, HP/MP and statuses. Keep the existing
    // ID4 family-tag normalization and omit only the two poison control metadata fields.
    const parties = [[19, 20, 21, 22, 23], [15, 5, 16, 17, 18], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [1, 5, 8, 10, 6], [4, 7, 8, 13, 22], [24, 25, 26, 27, 28], [29, 1, 8, 30, 31]], results = [];
    for (const team of parties) for (const enemy of parties) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = historicalEngine.start(team, enemy, seed, { leaders: true, poisonImpactScale: 1, reservePoison: false });
      while (!state.winner) state = historicalEngine.advanceWithEvents(state, historicalEngine.autoOrders(state), samePolicy ? { enemyOrders: historicalEngine.autoOrders(state, 'enemies') } : {}).state;
      results.push({ team, enemy, seed, samePolicy, state: withoutPoisonControlMetadata(state) });
    }
    expect(hash(normalizeLegacy(results))).toBe('a76f4180f168512679d49c97adf80baa6051d02267dbc98b98238fdeab3c9e99');
    expect(hash(normalizeLegacy(results.filter(result => !result.samePolicy)))).toBe('051a3f7b1e8802341c7fb1485a13b85953ae5568eddfa3fa06dafd45c2cfbea8');
    expect(hash(normalizeLegacy(results.filter(result => result.samePolicy)))).toBe('c6fab8bd5d06b3b01c66efcf7871fffab2efd88450765e7734c99c6fd36d0aff');
  });
});
