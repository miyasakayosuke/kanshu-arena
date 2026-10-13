import * as historicalEngine from '../tests/reference-v02030/engine';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withoutPoisonControlMetadata } from './legacyPoisonTestControls';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, cost, DEFEND, DEMON_CORE_ID, DEMON_PRESSURE, demonPressureEligible, leaderFor, monsters, mpDamageFor, mpLossFor, start as economyStart, type BattleEvent, type Order, type State, type Unit } from './engine';
import { battleEventLine, battleFactEvidenceLines, resultFacts } from './battleInsights';

const demons = [29, 1, 8, 30, 31];
const drainSkill = monsters[29].skills[0]!;
const orders = (state: State, side: 'allies' | 'enemies', skill = DEFEND): Order[] => state[side].map(unit => ({ key: unit.key, skill }));
const losses = (events: BattleEvent[]) => events.filter(event => event.kind === 'resource-loss');
const fallbacks = (events: BattleEvent[]) => events.filter(event => event.kind === 'fallback');
const tank = (unit: Unit) => { unit.monster = { ...unit.monster, hp: 5000 }; unit.hp = 5000; };
const fixture = (qualified = false) => { const state = start(qualified ? [29, 1, 8] : [29], [1]); tank(state.enemies[0]); return state; };
const drain = (state: State, enemyOrders = orders(state, 'enemies', BASIC_ATTACK)) => advanceWithEvents(state, orders(state, 'allies').map(order => order.key === 'a0' ? { key: 'a0', skill: 0, target: 'e0' } : order), { enemyOrders });
const normalizeLegacyMetadata = <T>(value: T): T => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === 'monster' && (item?.id === 1 || item?.id === 4 || item?.id === 8)) { const copy = { ...item }; delete copy.family; return copy; }
  return item;
}));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('demon roster and immutable opening qualification', () => {
  it('adds exactly three IDs, assigns five demons and preserves all older fields', () => {
    expect(monsters.slice(0, 32)).toHaveLength(32); expect(monsters.slice(29, 32).map(monster => monster.id)).toEqual([29, 30, 31]);
    expect(monsters.filter(monster => monster.family === 'demon').map(monster => monster.id)).toEqual([1, 8, 29, 30, 31]);
    expect(cost(demons)).toBe(17); expect(monsters.every(monster => monster.skills.length <= 4)).toBe(true);
    expect(monsters.slice(29, 32).map(({ hp, mp, atk, speed, cost }) => [hp, mp, atk, speed, cost])).toEqual([[210, 64, 35, 58, 5], [138, 44, 31, 82, 2], [178, 54, 48, 66, 4]]);
    expect(monsters.slice(29, 32).map(monster => monster.skills.map(({ name, kind, power, mpCost, priority }) => [name, kind, power, mpCost, priority]))).toEqual([
      [['空勘の爪', 'hit', 50, 16, 0], ['封銭の打撃', 'hit', 72, 12, 0], ['帳を閉じる', 'guard', 0, 0, 1]],
      [['留め具ほどき', 'hit', 43, 12, 0], ['木片はじき', 'hit', 42, 7, 0]],
      [['片脚の踏み込み', 'hit', 76, 14, 0], ['薄影の払い', 'cleanse', 30, 12, 0], ['影の投げ針', 'hit', 52, 8, 0]],
    ]);
    expect(hash(normalizeLegacyMetadata(monsters.slice(0, 29).map(monster => ({ monster, leader: { ...leaderFor(monster.id), description: [24,35].includes(monster.id) ? historicalEngine.leaderFor(monster.id).description : leaderFor(monster.id).description } }))))).toBe('374118233d3a614eed083a96d0ef953573d0f17408ecffd37e0f82d432cf48a1');
  });
  it.each([[29], [29, 1], [29, 0, 2], [1, 8, 30, 31]])('does not qualify %j', (...ids) => {
    const state = start(ids, []); expect(demonPressureEligible(state.allies)).toBe(false); expect(state.allies.every(unit => unit.mpDamageBonus === undefined)).toBe(true);
  });
  it('qualifies three TOTAL demons on either side with a nonleader core and counts dead members', () => {
    const state = start([1, 29, 8, 0, 2], [31, 30, 29]);
    expect(DEMON_CORE_ID).toBe(29); expect(DEMON_PRESSURE).toEqual({ coreId: 29, family: 'demon', minimumMembers: 3, base: 6, bonus: 4, name: '空勘の爪' });
    expect(state.allies.map(unit => unit.mpDamageBonus)).toEqual([undefined, 4, undefined, undefined, undefined]);
    expect(state.enemies.map(unit => unit.mpDamageBonus)).toEqual([undefined, undefined, 4]);
    state.allies[0].hp = 0; state.allies[2].hp = 0;
    expect(demonPressureEligible(state.allies)).toBe(true); expect(mpDamageFor(state.allies[1], drainSkill)).toBe(10);
    expect(start([29, 1], []).allies[0].mpDamageBonus).toBeUndefined();
    expect(start(demons, [], 42, { familySupport: false }).allies[0].mpDamageBonus).toBeUndefined();
  });
  it('applies leader HP10/SPD5 only to demons and keeps existing Troll/Ifrit leaders', () => {
    const state = start([29, 1, 8, 0, 2], [], 42, { leaders: true });
    expect(state.allies.map(unit => unit.monster.hp)).toEqual([231, 275, 206, 150, 170]);
    expect(state.allies.map(unit => unit.monster.speed)).toEqual([61, 24, 44, 85, 57]);
    expect(leaderFor(1)).toMatchObject({ stat: 'hp', percent: 12 }); expect(leaderFor(1)).not.toHaveProperty('family');
    expect(leaderFor(8)).toMatchObject({ stat: 'atk', percent: 8 }); expect(leaderFor(8)).not.toHaveProperty('family');
    expect(leaderFor(30)).toMatchObject({ family: 'demon', stat: 'speed', percent: 8 });
    expect(leaderFor(31)).toMatchObject({ family: 'demon', stat: 'atk', percent: 8 });
  });
  it('has bounded independent base/bonus ablations and never lets a bonus revive disabled drain', () => {
    const actor = fixture(true).allies[0]; expect(mpDamageFor(actor, drainSkill)).toBe(10);
    actor.mpDamageBonus = 0; expect(mpDamageFor(actor, drainSkill)).toBe(6);
    actor.mpDamageBonus = 6; expect(mpDamageFor(actor, drainSkill)).toBe(12);
    for (const mpDamage of [undefined, 0, -1, NaN, Infinity]) expect(mpDamageFor(actor, { ...drainSkill, mpDamage })).toBe(0);
    actor.mpDamageBonus = Infinity; expect(mpDamageFor(actor, drainSkill)).toBe(6);
    actor.mpDamageBonus = -99; expect(mpDamageFor(actor, drainSkill)).toBe(6);
    actor.mpDamageBonus = 999; expect(mpDamageFor(actor, { ...drainSkill, mpDamage: 999 })).toBe(30);
    actor.mpDamageBonus = 4.9; expect(mpDamageFor(actor, { ...drainSkill, mpDamage: 6.9 })).toBe(10);
    expect(mpDamageFor(actor, { ...drainSkill, kind: 'heal' })).toBe(0);
  });
});

describe('HP-first deterministic MP loss and protective counterplay', () => {
  it.each([0, 1, 5, 6, 9, 10, 16])('clamps actual loss at MP%s for both qualification states', mp => {
    for (const qualified of [false, true]) {
      const state = fixture(qualified); state.enemies[0].mp = mp; const before = structuredClone(state);
      const result = drain(state); const loss = Math.min(mp, qualified ? 10 : 6);
      expect(state).toEqual(before); expect(losses(result.events)).toEqual([expect.objectContaining({ actor: 'a0', target: 'e0', amount: loss, mp: mp - loss, effect: 'mp-damage', phase: 'action' })]);
      expect(result.state.enemies[0].mp).toBe(mp - loss); expect(result.state.allies[0].mp).toBe(48);
      expect(result.events.findIndex(event => event.kind === 'damage' && event.target === 'e0')).toBeLessThan(result.events.findIndex(event => event.kind === 'resource-loss'));
      expect(losses(result.events)[0]).not.toHaveProperty('hp'); expect(result.events.some(event => event.kind === 'resource-gain')).toBe(false);
    }
  });
  it('never scales MP loss with ATK, rally, or RNG', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const state = fixture(true); state.seed = seed; state.allies[0].monster = { ...state.allies[0].monster, atk: 100 }; state.allies[0].rally = 2;
      expect(losses(drain(state).events)[0].amount).toBe(10);
    }
  });
  it.each([false, true])('guard halves base/qualified drain, strongest ward/guard wins (%s)', qualified => {
    const state = fixture(qualified); state.enemies[0].ward = 2;
    const result = drain(state, [{ key: 'e0', skill: DEFEND }]);
    expect(losses(result.events)[0].amount).toBe(qualified ? 5 : 3);
    expect(result.state.enemies[0].mp).toBe(44 - (qualified ? 5 : 3));
  });
  it.each([false, true])('nature ward floors MP mitigation without guard (%s)', qualified => {
    const state = fixture(qualified); state.enemies[0].ward = 2;
    const result = drain(state); expect(losses(result.events)[0].amount).toBe(qualified ? 9 : 5);
    expect(mpLossFor(state.allies[0], drainSkill, state.enemies[0])).toBe(qualified ? 9 : 5);
  });
  it('before-hit Kobold dispels guard/ward before the claw without touching supply or family qualification', () => {
    const state = start([29, 30, 1], [24, 25, 26]); tank(state.enemies[0]); state.enemies[0].ward = 2;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 0, target: 'e0' }, { key: 'a2', skill: DEFEND }], { enemyOrders: orders(state, 'enemies') });
    expect(losses(result.events)[0].amount).toBe(10); expect(result.state.enemies[0].supplyReady).toBe(true);
    const breakEvent = result.events.find(event => event.kind === 'break')!; expect(breakEvent.removed).toEqual(['guard', 'ward']);
    expect(breakEvent).not.toHaveProperty('supplyReady'); expect(breakEvent).not.toHaveProperty('mpDamageBonus');
    expect(result.state.allies[0].mpDamageBonus).toBe(4);
    expect(result.events.findIndex(event => event.kind === 'break')).toBeLessThan(result.events.findIndex(event => event.kind === 'resource-loss'));
  });
  it('guard can be restored next turn after a faster breaker, and expired guard never leaks forward', () => {
    let state = start([29, 30, 1], [1]); tank(state.enemies[0]); tank(state.allies[0]);
    const first = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 0, target: 'e0' }, { key: 'a2', skill: DEFEND }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
    expect(losses(first.events)[0].amount).toBe(10); state = first.state;
    const second = drain(state, [{ key: 'e0', skill: DEFEND }]); expect(losses(second.events)[0].amount).toBe(5);
    const third = drain(second.state, [{ key: 'e0', skill: BASIC_ATTACK, target: 'a0' }]); expect(losses(third.events)[0].amount).toBe(10);
  });
  it('dispel on the qualified core does not remove the fixed bonus; dead original companions still qualify', () => {
    const state = start([8], [29, 1, 30]); tank(state.enemies[0]); state.enemies[1].hp = 0; state.enemies[2].hp = 0;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 3, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
    expect(result.events.some(event => event.kind === 'break')).toBe(true); expect(result.state.enemies[0].mpDamageBonus).toBe(4);
    expect(mpDamageFor(result.state.enemies[0], drainSkill)).toBe(10);
  });
  it('does not drain a target killed by the HP hit or any dead target', () => {
    const state = fixture(); state.enemies[0].hp = 1;
    const result = drain(state); expect(losses(result.events)).toHaveLength(0); expect(result.state.enemies[0].mp).toBe(44);
    expect(mpLossFor(state.allies[0], drainSkill, { ...state.enemies[0], hp: 0 })).toBe(0);
  });
  it('retargets a previously defeated enemy and drains only the living replacement', () => {
    const state = start([29, 30], [1, 8]); state.enemies[0].hp = 1; tank(state.enemies[1]);
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1, target: 'e0' }], { enemyOrders: orders(state, 'enemies', BASIC_ATTACK) });
    expect(losses(result.events)).toEqual([expect.objectContaining({ actor: 'a0', target: 'e1', amount: 6 })]);
    expect(result.state.enemies[0].mp).toBe(44);
  });
  it('uses at most four paid casts from MP64 without replenishment and rejects the fifth', () => {
    let state = fixture(true); tank(state.allies[0]); state.enemies[0].monster = { ...state.enemies[0].monster, mp: 100 }; state.enemies[0].mp = 100;
    for (let i = 0; i < 4; i++) state = drain(state).state;
    expect(state.allies[0].mp).toBe(0); expect(losses(state.history!.flatMap(turn => turn.events))).toHaveLength(4);
    expect(losses(state.history!.flatMap(turn => turn.events)).reduce((sum, event) => sum + event.amount!, 0)).toBe(40);
    const fifth = drain(state); expect(fifth.state.history!.at(-1)!.orders.find(order => order.key === 'a0')).toMatchObject({ accepted: false, rejection: 'insufficient-mp' });
    expect(fallbacks(fifth.events)).toHaveLength(0); expect(losses(fifth.events)).toHaveLength(0);
  });
});

describe('valid paid orders fall back once in their original queue slot', () => {
  it('changes an unaffordable anchor to one basic at the original late position without cost/skill effects', () => {
    const state = start([29, 1], [8]); tank(state.enemies[0]); state.enemies[0].mp = 20;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: BASIC_ATTACK, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 2, target: 'a0' }] });
    expect(result.events.filter(event => event.kind === 'cast').map(event => event.actor)).toEqual(['a0', 'a1', 'e0']);
    expect(fallbacks(result.events)).toEqual([expect.objectContaining({ actor: 'e0', target: 'a0', skill: '終焉の一撃', fromSkill: 2, toSkill: BASIC_ATTACK, reason: 'enemy-mp-loss', queuePriority: -2, requiredMP: 20, availableMP: 14 })]);
    expect(result.state.history![0].orders.find(order => order.key === 'e0')).toMatchObject({ accepted: true, skill: 2 });
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'e0')).toEqual([expect.objectContaining({ skill: '通常攻撃' })]);
    expect(result.events.filter(event => event.kind === 'resource' && event.actor === 'e0')).toHaveLength(0); expect(result.state.enemies[0].mp).toBe(14);
    expect(result.state.log.join('\n')).toContain('元の行動順で通常攻撃へ変更');
  });
  it('retargets paid ally support fallback to a living enemy', () => {
    const state = start([29], [2, 1]); tank(state.enemies[0]); state.enemies[0].mp = 18; state.enemies[1].hp = 100;
    const result = drain(state, [{ key: 'e0', skill: 1, target: 'e1' }, { key: 'e1', skill: DEFEND }]);
    expect(fallbacks(result.events)[0]).toMatchObject({ actor: 'e0', fromSkill: 1, target: 'a0', queuePriority: 0 });
    expect(result.events.some(event => event.kind === 'heal')).toBe(false);
    expect(result.events.find(event => event.kind === 'damage' && event.actor === 'e0')).toMatchObject({ target: 'a0' });
  });
  it('retargets a fallback whose originally selected enemy has since died', () => {
    const state = start([29, 30], [8, 31]); state.allies[1].hp = 1; tank(state.enemies[0]); state.enemies[0].mp = 20;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: DEFEND }], { enemyOrders: [{ key: 'e0', skill: 2, target: 'a1' }, { key: 'e1', skill: 0, target: 'a1' }] });
    expect(result.state.allies[1].hp).toBe(0); expect(fallbacks(result.events)[0]).toMatchObject({ actor: 'e0', target: 'a0', queuePriority: -2 });
    expect(result.events.filter(event => event.kind === 'damage' && event.actor === 'e0')).toEqual([expect.objectContaining({ target: 'a0' })]);
  });
  it('does not carry an earlier turn’s drain as permission to revive a rejected order', () => {
    const state = fixture(); state.enemies[0].mp = 20;
    const first = drain(state, [{ key: 'e0', skill: 1, target: 'a0' }]);
    expect(fallbacks(first.events)).toHaveLength(1);
    const second = drain(first.state, [{ key: 'e0', skill: 1, target: 'a0' }]);
    expect(second.state.history!.at(-1)!.orders.find(order => order.key === 'e0')).toMatchObject({ accepted: false, rejection: 'insufficient-mp' });
    expect(fallbacks(second.events)).toHaveLength(0); expect(second.events.filter(event => event.kind === 'cast' && event.actor === 'e0')).toHaveLength(0);
  });
  it('does not grant fallback or charge when the actor died before its action', () => {
    const state = start([29, 30], [15, 5, 16]); state.enemies[0].hp = 80; state.enemies[0].mp = 28;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 1, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 0 }, { key: 'e1', skill: DEFEND }, { key: 'e2', skill: DEFEND }] });
    expect(result.state.enemies[0].hp).toBe(0); expect(fallbacks(result.events)).toHaveLength(0);
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'e0')).toHaveLength(0);
  });
  it('fallback discards finisher and paid-dragon charge behavior', () => {
    const state = start([29], [15, 5, 16]); tank(state.enemies[0]); state.enemies[0].mp = 10;
    const result = drain(state, [{ key: 'e0', skill: 1, target: 'a0' }, { key: 'e1', skill: DEFEND }, { key: 'e2', skill: DEFEND }]);
    expect(fallbacks(result.events)[0]).toMatchObject({ actor: 'e0' }); expect(result.state.enemies[0].dragonCharge).toBe(0);
    expect(result.events.some(event => event.kind === 'charge')).toBe(false);
  });
  it('allows a valid order rescued by an actual earlier supply; rejected orders never borrow future MP', () => {
    for (const initialMp of [7, 8]) {
      const state = start([29], [24, 25, 26]); state.enemies[2].mp = initialMp; tank(state.enemies[2]);
      const result = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e2' }], { enemyOrders: [{ key: 'e0', skill: 0 }, { key: 'e1', skill: DEFEND }, { key: 'e2', skill: 1, target: 'a0' }] });
      expect(result.events.some(event => event.kind === 'resource-gain' && event.target === 'e2')).toBe(true);
      expect(fallbacks(result.events)).toHaveLength(0);
      const cast = result.events.find(event => event.kind === 'cast' && event.actor === 'e2');
      if (initialMp === 8) { expect(cast).toMatchObject({ skill: 'ひだ押し' }); expect(result.state.enemies[2].mp).toBe(2); }
      else { expect(cast).toBeUndefined(); expect(result.state.enemies[2].mp).toBe(9); expect(result.state.history![0].orders.find(order => order.key === 'e2')).toMatchObject({ accepted: false, rejection: 'insufficient-mp' }); }
    }
  });
  it('keeps invalid commands invalid after drain and leaves no-drain outcomes unchanged', () => {
    for (const order of [{ key: 'e0', skill: 99 }, { key: 'e0', skill: 0, target: 'a99' }, { key: 'e0', skill: 1, target: 'a0' }]) {
      const state = fixture(); state.enemies[0].mp = 10;
      const result = drain(state, [order]); expect(result.state.history![0].orders.find(item => item.key === 'e0')!.accepted).toBe(false);
      expect(result.events.some(event => event.actor === 'e0' && ['cast', 'fallback'].includes(event.kind))).toBe(false);
    }
  });
  it('free basics and guard remain legal after MP loss, including MP0', () => {
    for (const skill of [BASIC_ATTACK, DEFEND]) for (const mp of [0, 1, 16]) {
      const state = fixture(); state.enemies[0].mp = mp;
      const result = drain(state, [{ key: 'e0', skill, target: skill === DEFEND ? 'e0' : 'a0' }]);
      expect(fallbacks(result.events)).toHaveLength(0); expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'e0')).toHaveLength(1);
    }
  });
  it('an earlier fast paid action spends before the drain and never acts a second time', () => {
    const state = start([29], [30]); tank(state.enemies[0]); state.enemies[0].mp = 12;
    const result = drain(state, [{ key: 'e0', skill: 0, target: 'a0' }]);
    expect(losses(result.events)[0]).toMatchObject({ amount: 0, mp: 0 }); expect(fallbacks(result.events)).toHaveLength(0);
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'e0')).toHaveLength(1);
  });
});

describe('bounded public-information AI and distinct battle evidence', () => {
  it('selects meaningful MP pressure on either physical side without changing state or RNG', () => {
    const state = start([29], [29]); state.allies[0].mp = 16; state.enemies[0].mp = 16; const before = structuredClone(state);
    expect(autoOrders(state)[0]).toEqual({ key: 'a0', skill: 0, target: 'e0' });
    expect(autoOrders(state, 'enemies')[0]).toEqual({ key: 'e0', skill: 0, target: 'a0' }); expect(state).toEqual(before);
    const result = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
    expect(result.state.history![0].orders.map(order => order.skill)).toEqual([0, 0]);
  });
  it('chooses HP damage against empty MP or free-only targets, and does not repeatedly drain exhausted targets', () => {
    const state = fixture(true); state.enemies[0].mp = 0;
    expect(autoOrders(state)[0].skill).toBe(1);
    state.enemies[0].mp = 16; state.enemies[0].monster = { ...state.enemies[0].monster, skills: [] };
    expect(autoOrders(state)[0].skill).toBe(1);
    const pressure = fixture(); pressure.enemies[0].mp = 12;
    expect(autoOrders(pressure)[0].skill).toBe(0);
    const next = advanceWithEvents(pressure, autoOrders(pressure), { enemyOrders: orders(pressure, 'enemies', BASIC_ATTACK) }).state;
    expect(next.enemies[0].mp).toBe(6); expect(autoOrders(next)[0].skill).toBe(1);
  });
  it('selects a paid-option target instead of the empty-MP weakest enemy', () => {
    const state = start([29], [1, 8]); state.enemies[0].mp = 0; state.enemies[0].hp = 180; state.enemies[1].mp = 14;
    expect(autoOrders(state)[0]).toEqual({ key: 'a0', skill: 0, target: 'e1' });
    state.enemies[0].hp = 20; state.enemies[1].hp = 20; expect(autoOrders(state)[0].skill).toBe(BASIC_ATTACK);
  });
  it('reports actual MP loss/fallback separately from HP, paid costs, and supply, with indexed evidence', () => {
    const state = fixture(); state.enemies[0].mp = 20;
    const result = drain(state, [{ key: 'e0', skill: 1, target: 'a0' }]); const facts = resultFacts(result.state);
    expect(facts[0]).toMatchObject({ kind: 'resource-loss' }); expect(facts[0].text).toContain('味方 0／敵 6');
    expect(facts[1]).toMatchObject({ kind: 'fallback' }); expect(facts[1].text).toContain('味方 0回／敵 1回');
    expect(battleFactEvidenceLines(result.state, facts[1]).join('\n')).toContain('指示');
    expect(battleEventLine(result.state, losses(result.events)[0])).toContain('MP −6（残り 14）');
    expect(battleEventLine(result.state, fallbacks(result.events)[0])).toContain('通常攻撃へ変更');
    expect(result.state.history![0].events).toEqual(result.events);
  });
  it('historical v30 reference: under explicit legacy poison controls, keeps all294 captured historical battles identical except later intentional family tags', () => {
    // Captured from the untouched slime engine before demon implementation.
    // Keep the existing IDs1/4/8 family-tag normalization; additionally omit only
    // the two explicit poison control metadata fields. All combat state stays exact.
    const parties = [[19, 20, 21, 22, 23], [15, 5, 16, 17, 18], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [1, 5, 8, 10, 6], [4, 7, 8, 13, 22], [24, 25, 26, 27, 28]], results = [];
    for (const team of parties) for (const enemy of parties) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = historicalEngine.start(team, enemy, seed, { leaders: true, poisonImpactScale: 1, reservePoison: false });
      while (!state.winner) state = historicalEngine.advanceWithEvents(state, historicalEngine.autoOrders(state), samePolicy ? { enemyOrders: historicalEngine.autoOrders(state, 'enemies') } : {}).state;
      results.push({ team, enemy, seed, samePolicy, state: withoutPoisonControlMetadata(state) });
    }
    expect(hash(normalizeLegacyMetadata(results))).toBe('bde4793870911dfc90c44a137659bb77d55950c32b1d1581590718abddbea292');
  });
});

// Isolate this skill/family contract from the separately tested recurring economy.
// Shipping default and all-family combinations are covered by turnMpRecovery tests and current Lab.
function start(...args: Parameters<typeof economyStart>): ReturnType<typeof economyStart> { return economyStart(args[0], args[1], args[2], { ...args[3], turnMpRecovery: 0 }); }
