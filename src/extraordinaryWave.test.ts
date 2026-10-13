import * as historicalEngine from '../tests/reference-v02030/engine';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withoutPoisonControlMetadata } from './legacyPoisonTestControls';
import {
  advanceWithEvents, assignedFamilyCount, autoOrders, BASIC_ATTACK, canUseSkill, cost, DEFEND,
  directDamageScale, effectStatus, EXTRAORDINARY_CORE_ID, EXTRAORDINARY_RESPONSE, extraordinaryResponseEligible,
  extraordinaryResponseScore, isExtraordinaryResponse, leaderFor, monsters, skillTargetsAllies, skillUnavailableLabel,
  skillUnavailableReason, start as economyStart, type BattleEvent, type Monster, type Order, type State,
} from './engine';
import { battleEventLine } from './battleInsights';

const mixed = [36, 12, 2, 30, 26];
const poisonShell = [36, 4, 3, 10, 30];
const natureMixed = [36, 14, 10, 20, 35];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const noOrders = (state: State, side: 'allies' | 'enemies' = 'allies'): Order[] => state[side].map(unit => ({ key: unit.key, skill: 99 }));
const castOrders = (state: State, skill: number, side: 'allies' | 'enemies' = 'allies') => noOrders(state, side).map((order, i) => i ? order : { key: order.key, skill });
const resolve = (state: State, skill: number, side: 'allies' | 'enemies' = 'allies') => advanceWithEvents(state,
  side === 'allies' ? castOrders(state, skill) : noOrders(state), { enemyOrders: side === 'enemies' ? castOrders(state, skill, side) : noOrders(state, 'enemies') });
const spends = (events: BattleEvent[]) => events.filter(event => event.kind === 'response');
const ownSkill = (index: number) => monsters[36].skills[index]!;

// These hashes were captured from a copied predecessor BEFORE the extraordinary edits.
// All 600 complete states include every accepted/rejected order, event, log, RNG draw,
// HP/MP/status and winner. For explicit historical poison controls, omit only
// State.reservePoison and Unit.poisonImpactScale; no roster/combat fields are stripped.
const oldParties = [[19, 20, 21, 22, 23], [15, 5, 16, 17, 18], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [1, 5, 8, 10, 6], [4, 7, 8, 13, 22], [24, 25, 26, 27, 28], [29, 1, 8, 30, 31], [32, 4, 33, 34, 35], [32, 4, 35, 3, 10]];

describe('extraordinary roster, opening family count, and old36 contract', () => {
  it('adds only the exact independent core and universal +8% HP leader', () => {
    expect(monsters).toHaveLength(37); expect(EXTRAORDINARY_CORE_ID).toBe(36);
    expect(monsters[36]).toMatchObject({ id: 36, name: 'ヤヌス', family: 'extraordinary', cost: 5, hp: 200, mp: 58, atk: 30, speed: 57 });
    expect(monsters[36].skills.map(({ name, kind, power, mpCost, priority, all }) => [name, kind, power, mpCost, priority, !!all])).toEqual([
      ['境目の清め', 'responseCleanse', 0, 24, 0, true], ['合流の扉', 'responseGuard', 0, 24, 3, true],
      ['敷居の一打', 'hit', 62, 10, 0, false], ['門番の構え', 'guard', 0, 0, 1, false],
    ]);
    expect(EXTRAORDINARY_RESPONSE).toMatchObject({ coreId: 36, minimumFamilies: 4, maxUses: 1, mpCost: 24 });
    expect(leaderFor(36)).toMatchObject({ stat: 'hp', percent: 8 }); expect(leaderFor(36).family).toBeUndefined();
    const boosted = start(mixed, [], 42, { leaders: true });
    expect(boosted.allies.map(unit => unit.monster.hp)).toEqual(mixed.map(id => Math.round(monsters[id].hp * 1.08)));
    expect(boosted.allies.map(unit => unit.mp)).toEqual(mixed.map(id => monsters[id].mp));
    expect(hash(monsters.slice(0, 36).map(monster => ({ monster, leader: { ...leaderFor(monster.id), description: [24,35].includes(monster.id) ? historicalEngine.leaderFor(monster.id).description : leaderFor(monster.id).description } })))).toBe('b5d390eef7cf38f5d5e216c1d777d9fe776b7d66f457a148dd867c3858dd683e');
  });
  it.each([
    [[36, 12, 2, 10, 14], 3, false], [mixed, 4, true], [[36, 12, 10, 30, 35], 5, true],
    [[12, 10, 30, 35, 26], 5, false], [[36, 36, 12, 2, 10], 3, false], [[36, 12, 30, 26], 4, true],
  ] as const)('counts %j once per assigned family: %i', (ids, count, eligible) => {
    const state = start([...ids], []);
    expect(assignedFamilyCount(state.allies)).toBe(count); expect(extraordinaryResponseEligible(state.allies)).toBe(eligible);
    for (const unit of state.allies) expect(unit.responseReady).toBe(eligible && unit.monster.id === 36 ? true : undefined);
  });
  it('ignores unassigned/invalid tags, includes self, and needs no leader or later living membership', () => {
    const state = start([12, 36, 10, 30, 2], [12, 36, 10, 30, 2]);
    for (const side of ['allies', 'enemies'] as const) {
      expect(state[side][1].responseReady).toBe(true); state[side].filter(unit => unit.monster.id !== 36).forEach(unit => { unit.hp = 0; });
      expect(extraordinaryResponseEligible(state[side])).toBe(true); expect(canUseSkill(state[side][1], ownSkill(1), state[side])).toBe(true);
    }
    const friends = mixed.map(id => ({ monster: monsters[id] }));
    friends[4] = { monster: { ...friends[4].monster, family: undefined } };
    expect(assignedFamilyCount(friends)).toBe(3); expect(extraordinaryResponseEligible(friends)).toBe(false);
    friends[4] = { monster: { ...friends[4].monster, family: 'unrecognized' as Monster['family'] } };
    expect(assignedFamilyCount(friends)).toBe(3);
    friends[4] = { monster: { ...friends[4].monster, family: '__proto__' as Monster['family'] } };
    expect(assignedFamilyCount(friends)).toBe(3);
  });
  it('isolates optional allowance ablation from other opening effects and never adds a five-type bonus', () => {
    const enabled = start(mixed, mixed), disabled = start(mixed, mixed, 42, { extraordinaryResponse: false });
    const familyOff = start(mixed, mixed, 42, { familySupport: false });
    for (const side of ['allies', 'enemies'] as const) {
      expect(disabled[side][0].responseReady).toBeUndefined(); expect(familyOff[side][0].responseReady).toBeUndefined();
      expect(disabled[side][1].rally).toBe(2);
      const stripped = enabled[side].map(({ responseReady: _, ...unit }) => unit);
      expect(disabled[side]).toEqual(stripped);
    }
    expect(start([36, 12, 10, 30, 35], []).allies[0]).toEqual(start(mixed, []).allies[0]);
  });
  it('verifies both legal examples and the known mixed poison/ward adversaries', () => {
    for (const [ids, expectedCost] of [[mixed, 17], [[36, 12, 2, 10, 35], 16], [poisonShell, 15], [natureMixed, 16]] as const) {
      expect(cost([...ids])).toBe(expectedCost); expect(assignedFamilyCount(start([...ids], []).allies)).toBe(4);
      expect(start([...ids], []).allies[0].responseReady).toBe(true);
    }
    expect(start(natureMixed, []).allies[1].ward).toBe(2);
  });
  it('historical v30 reference: under explicit legacy poison controls, preserves all 600 frozen full old36 battles for normal CPU and same-AI orders', () => {
    const results = [];
    for (const team of oldParties) for (const enemy of oldParties) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = historicalEngine.start(team, enemy, seed, { leaders: true, poisonImpactScale: 1, reservePoison: false });
      while (!state.winner) state = historicalEngine.advanceWithEvents(state, historicalEngine.autoOrders(state), samePolicy ? { enemyOrders: historicalEngine.autoOrders(state, 'enemies') } : {}).state;
      results.push({ team, enemy, seed, samePolicy, state: withoutPoisonControlMetadata(state) });
    }
    expect(hash(results)).toBe('2b6a2192f9d66e90fac8c2f4d8d8d5ba61d2f2a3099007a8b8b579e85f0d463b');
    expect(hash(results.filter(result => !result.samePolicy))).toBe('6cd79fb853b2d7cbe49f739e0f27643780044082447173df9692f44991129829');
    expect(hash(results.filter(result => result.samePolicy))).toBe('1a45832742c7a40f8a7b8ee553b8323f80208bf0d43301b166f3b95a0d775bea');
  }, 20000);
});

describe('one shared response: validation, live impacts, and cancellation', () => {
  it('requires current own-side context and distinguishes every unavailable reason without mutation', () => {
    const state = start(mixed, [1]), unit = state.allies[0], original = structuredClone(state);
    expect(ownSkill(0)).toSatisfy(isExtraordinaryResponse); expect(ownSkill(1)).toSatisfy(skillTargetsAllies);
    expect(skillUnavailableReason(unit, ownSkill(0))).toBe('response-context-required');
    expect(skillUnavailableReason(unit, ownSkill(0), state.allies)).toBe('response-no-poison');
    expect(state).toEqual(original);
    unit.poison = 1; expect(canUseSkill(unit, ownSkill(0), state.allies)).toBe(true);
    unit.mp = 23; expect(skillUnavailableReason(unit, ownSkill(0), state.allies)).toBe('insufficient-mp');
    unit.responseReady = false; expect(skillUnavailableReason(unit, ownSkill(0), state.allies)).toBe('response-spent');
    unit.responseReady = undefined; expect(skillUnavailableReason(unit, ownSkill(0), state.allies)).toBe('response-ineligible');
    unit.hp = 0; expect(skillUnavailableReason(unit, ownSkill(0), state.allies)).toBe('defeated');
    const guarded = start(mixed, [1]); guarded.allies.forEach(unit => { unit.guard = true; });
    expect(skillUnavailableReason(guarded.allies[0], ownSkill(1), guarded.allies)).toBe('response-all-guarded');
    expect(skillUnavailableLabel('response-spent')).toContain('残0回');
  });
  it.each([0, 1])('casts skill%i exactly once, debits once, and excludes dead/all opposing targets on both sides', skill => {
    for (const side of ['allies', 'enemies'] as const) {
      const state = start(mixed, mixed), own = state[side], other = side === 'allies' ? 'enemies' : 'allies';
      own[0].poison = 3; own[1].poison = 2; own[2].hp = 0; own[2].poison = 3;
      state[other][0].poison = 2;
      const result = resolve(state, skill, side), actor = own[0].key;
      expect(spends(result.events)).toEqual([expect.objectContaining({ actor, target: actor, responseReady: false, phase: 'action' })]);
      expect(result.events.filter(event => event.kind === 'cast')).toEqual([expect.objectContaining({ actor, scope: 'all', targets: own.filter(unit => unit.hp > 0).map(unit => unit.key) })]);
      expect(result.events.filter(event => event.kind === 'resource')).toEqual([expect.objectContaining({ actor, amount: 24, mp: 34 })]);
      expect(result.events.filter(event => event.kind === (skill === 0 ? 'cleanse' : 'guard')).map(event => event.target)).toEqual(own.filter(unit => unit.hp > 0).map(unit => unit.key));
      expect(result.events.filter(event => event.kind === 'heal')).toHaveLength(0);
      expect(result.state[side][0].responseReady).toBe(false); expect(result.state[side][0].mp).toBe(34);
      expect(result.state[side][2].hp).toBe(0); expect(result.state[other][0].poison).toBe(1);
      expect(result.state[side][0].poison).toBe(skill === 0 ? 0 : 2);
      expect(result.state[side][0].hp).toBe(skill === 0 ? own[0].hp : own[0].hp - 12);
      for (const second of [0, 1]) expect(skillUnavailableReason(result.state[side][0], ownSkill(second), result.state[side])).toBe('response-spent');
      expect(battleEventLine(result.state, spends(result.events)[0])).toContain('共通の応答を消費');
      expect(effectStatus(result.state[side][0])).toContain('応答:残0回');
    }
  });
  it('accepts only one order for one actor even if callers send both alternatives', () => {
    const state = start(mixed, [1]); state.allies[0].poison = 3;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0 }, { key: 'a0', skill: 1 }, ...noOrders(state).slice(1)], { enemyOrders: noOrders(state, 'enemies') });
    expect(spends(result.events)).toHaveLength(1); expect(result.events.filter(event => event.kind === 'cast')).toHaveLength(1);
    expect(result.state.history![0].orders.filter(order => order.key === 'a0')).toHaveLength(1);
  });
  it('does not spend for rejection, initial MP shortage, no poison, or no living opponent', () => {
    for (const scenario of ['target', 'skill', 'mp', 'no-effect', 'ineligible', 'enemy-dead']) {
      const state = start(mixed, [1]); state.allies[0].poison = scenario === 'no-effect' ? 0 : 3;
      if (scenario === 'mp') state.allies[0].mp = 23;
      if (scenario === 'ineligible') delete state.allies[0].responseReady;
      if (scenario === 'enemy-dead') state.enemies[0].hp = 0;
      const orders = castOrders(state, scenario === 'skill' ? 99 : 0);
      if (scenario === 'target') orders[0].target = 'e0';
      const result = advanceWithEvents(state, orders, { enemyOrders: noOrders(state, 'enemies') });
      expect(spends(result.events)).toHaveLength(0); expect(result.state.allies[0].mp).toBe(state.allies[0].mp);
      expect(result.state.allies[0].responseReady).toBe(state.allies[0].responseReady);
    }
  });
  it.each([0, 1])('rechecks no effect for a previously accepted skill%i and preserves MP/allowance', skill => {
    // Deliberately duplicated core fixture: the faster core covers all recipients first.
    const state = start([36, 36, 12, 30, 26], [1]); state.allies[0].poison = 3;
    state.allies[1].monster = { ...state.allies[1].monster, speed: 90 };
    const result = advanceWithEvents(state, [{ key: 'a0', skill }, { key: 'a1', skill }, ...noOrders(state).slice(2)], { enemyOrders: noOrders(state, 'enemies') });
    expect(result.state.history![0].orders.filter(order => order.accepted)).toHaveLength(2);
    expect(spends(result.events)).toEqual([expect.objectContaining({ actor: 'a1' })]);
    expect(result.state.allies[0].mp).toBe(58); expect(result.state.allies[0].responseReady).toBe(true);
    expect(result.state.log.some(line => line.includes('不発') && line.includes('MP・応答の消費なし'))).toBe(true);
  });
  it('cancels a clear after another healer clears its only poisoned friend, or that friend is defeated', () => {
    for (const scenario of ['cleanse', 'defeat']) {
      const state = start(mixed, [0]); state.allies[2].poison = 3;
      if (scenario === 'cleanse') state.allies[2].monster = { ...state.allies[2].monster, speed: 90 };
      else state.allies[2].hp = 1;
      const orders = castOrders(state, 0); if (scenario === 'cleanse') orders[2] = { key: 'a2', skill: 3, target: 'a2' };
      const result = advanceWithEvents(state, orders, { enemyOrders: scenario === 'defeat' ? [{ key: 'e0', skill: 1, target: 'a2' }] : noOrders(state, 'enemies') });
      expect(spends(result.events)).toHaveLength(0); expect(result.state.allies[0].mp).toBe(58); expect(result.state.allies[0].responseReady).toBe(true);
    }
  });
  it('loses the allowance on direct/poison defeat without spending MP or inventing a cast', () => {
    for (const scenario of ['direct', 'poison', 'already-dead']) {
      const state = start(mixed, [0]); state.allies[0].hp = scenario === 'already-dead' ? 0 : 1;
      state.allies[0].poison = 3;
      const result = advanceWithEvents(state, castOrders(state, scenario === 'direct' ? 0 : 99), { enemyOrders: scenario === 'direct' ? [{ key: 'e0', skill: 1, target: 'a0' }] : noOrders(state, 'enemies') });
      expect(result.state.allies[0].hp).toBe(0); expect(result.state.allies[0].responseReady).toBe(false);
      expect(result.state.allies[0].mp).toBe(58); expect(spends(result.events)).toHaveLength(0);
      expect(result.events.filter(event => event.target === 'a0' && event.responseReady === false)).toHaveLength(1);
    }
  });
  it('leaves free self-defense independent and never widens old single-target supports', () => {
    for (const options of [{}, { extraordinaryResponse: false }]) {
      const state = start(mixed, [1], 42, options), result = resolve(state, 3);
      expect(result.events.filter(event => event.kind === 'guard')).toEqual([expect.objectContaining({ actor: 'a0', target: 'a0' })]);
      expect(spends(result.events)).toHaveLength(0); expect(result.state.allies[0].responseReady).toBe(state.allies[0].responseReady);
    }
    const state = start([2, 26], [1]); state.allies.forEach(unit => { unit.poison = 3; unit.hp -= 40; });
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 3, target: 'a1' }, { key: 'a1', skill: 0, target: 'a0' }], { enemyOrders: noOrders(state, 'enemies') });
    expect(result.events.filter(event => event.kind === 'cleanse').map(event => event.target)).toEqual(['a1']);
    expect(result.events.filter(event => event.kind === 'guard').map(event => event.target)).toEqual(['a0']);
    expect(result.events.filter(event => event.kind === 'heal')).toHaveLength(1);
  });
  it('does not prevent poison applied after the clear', () => {
    const state = start(mixed, [10]); state.allies[0].poison = 3;
    const result = advanceWithEvents(state, castOrders(state, 0), { enemyOrders: [{ key: 'e0', skill: 1 }] });
    expect(result.events.filter(event => event.kind === 'cleanse')).toHaveLength(5);
    expect(result.events.filter(event => event.kind === 'poison')).toHaveLength(5);
    expect(result.state.allies.every(unit => unit.poison === 2)).toBe(true);
    expect(result.state.allies[0].responseReady).toBe(false);
  });
  it('shares existing guard mitigation/expiry, never stacks with nature ward, and never reduces poison ticks', () => {
    const state = start(natureMixed, [28]); state.allies[1].poison = 3;
    const result = advanceWithEvents(state, castOrders(state, 1), { enemyOrders: [{ key: 'e0', skill: 1 }] });
    expect(directDamageScale({ ...state.allies[1], guard: true })).toBe(0.5);
    const control = structuredClone(state); control.allies.forEach(unit => { unit.ward = 0; });
    const other = advanceWithEvents(control, castOrders(control, 1), { enemyOrders: [{ key: 'e0', skill: 1 }] });
    expect(result.events.filter(event => event.kind === 'damage').map(event => event.amount)).toEqual(other.events.filter(event => event.kind === 'damage').map(event => event.amount));
    expect(result.events.find(event => event.effect === 'poison' && event.kind === 'damage')).toMatchObject({ target: 'a1', amount: 14 });
    expect(result.events.filter(event => event.kind === 'expire' && event.effect === 'guard')).toHaveLength(5);
    expect(result.state.allies.every(unit => !unit.guard)).toBe(true);
  });
  it('lets a normal dispel remove actual guard but never removes, restores, or consumes the allowance', () => {
    for (const skill of [1, DEFEND]) {
      const state = start(mixed, [30]);
      const result = advanceWithEvents(state, castOrders(state, skill), { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
      expect(result.events.find(event => event.kind === 'break')).toMatchObject({ target: 'a0', guard: false });
      expect(result.state.allies[0].responseReady).toBe(skill === 1 ? false : true);
      expect(result.events.flatMap(event => event.removed ?? [])).not.toContain('responseReady');
    }
  });
});

describe('accepted paid responses, enemy drain, and actual prior supply', () => {
  it('falls back once at the original queue position without spending the response after enemy MP loss', () => {
    const state = start(mixed, [29]); state.allies[0].mp = 24; state.allies[0].poison = 3;
    const result = advanceWithEvents(state, castOrders(state, 0), { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
    expect(result.state.history![0].orders.find(order => order.key === 'a0')).toMatchObject({ accepted: true, skill: 0 });
    expect(result.events.filter(event => event.kind === 'fallback')).toEqual([expect.objectContaining({ actor: 'a0', fromSkill: 0, toSkill: BASIC_ATTACK, requiredMP: 24, availableMP: 18, queuePriority: 0 })]);
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'a0')).toEqual([expect.objectContaining({ skill: '通常攻撃', targets: ['e0'] })]);
    expect(spends(result.events)).toHaveLength(0); expect(result.state.allies[0].responseReady).toBe(true);
    expect(result.state.allies[0].mp).toBe(18); expect(result.state.allies[0].poison).toBe(2);
  });
  it('permits real preceding supply rescue, but neither future borrowing nor retroactive acceptance', () => {
    // Production supply only targets slime, so Janus cannot naturally receive it.
    // This explicit injected family/allowance fixture tests the generic accepted-order
    // queue without adding a new supply target or recovery mechanic to the roster.
    for (const scenario of ['rescue', 'future', 'initial-shortage']) {
      const state = start(mixed, [29]), core = state.allies[0]; core.poison = 3; core.mp = scenario === 'initial-shortage' ? 20 : 24;
      core.monster = { ...core.monster, family: 'slime', speed: 40 };
      state.allies[4] = { ...state.allies[4], monster: { ...monsters[24], speed: scenario === 'future' ? 30 : 50 }, hp: monsters[24].hp, mp: monsters[24].mp, supplyReady: true };
      const commands = castOrders(state, 0); commands[4] = { key: 'a4', skill: 0 };
      const result = advanceWithEvents(state, commands, { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
      expect(result.events.find(event => event.kind === 'resource-gain' && event.target === 'a0')).toBeDefined();
      expect(spends(result.events)).toHaveLength(scenario === 'rescue' ? 1 : 0);
      expect(result.events.filter(event => event.kind === 'fallback')).toHaveLength(scenario === 'future' ? 1 : 0);
      expect(result.state.allies[0].responseReady).toBe(scenario !== 'rescue');
      expect(result.state.allies[0].mp).toBe(scenario === 'rescue' ? 2 : scenario === 'future' ? 26 : 22);
      expect(result.state.history![0].orders.find(order => order.key === 'a0')!.accepted).toBe(scenario !== 'initial-shortage');
    }
  });
});

describe('public-state response AI, offensive withholding, and stable ablation policy', () => {
  it('chooses real poison clearance, wounded-party protection, or offense for both sides', () => {
    for (const side of ['allies', 'enemies'] as const) {
      const strong = [28, 23, 8, 15, 5];
      const state = start(side === 'allies' ? mixed : strong, side === 'allies' ? strong : mixed), own = state[side], core = own[0];
      own.forEach(unit => { unit.poison = 3; });
      expect(autoOrders(state, side).find(order => order.key === core.key)).toEqual({ key: core.key, skill: 0 });
      own.forEach(unit => { unit.poison = 0; unit.hp = Math.floor(unit.hp * 0.5); });
      expect(autoOrders(state, side).find(order => order.key === core.key)).toEqual({ key: core.key, skill: 1 });
      const other = side === 'allies' ? state.enemies : state.allies;
      const funded = extraordinaryResponseScore(core, ownSkill(1), own, other, state.turn);
      other.forEach(unit => { unit.mp = 0; });
      expect(extraordinaryResponseScore(core, ownSkill(1), own, other, state.turn)).toBeLessThan(funded);
      other.slice(1).forEach(unit => { unit.hp = 0; });
      expect(autoOrders(state, side).find(order => order.key === core.key)!.skill).toBe(2);
    }
    const loneArea = start(mixed, [8]);
    expect(autoOrders(loneArea)[0].skill).toBe(2);
    loneArea.allies[0].poison = 1;
    expect(autoOrders(loneArea)[0].skill).toBe(2);
    loneArea.enemies[0].hp = 1;
    expect(autoOrders(loneArea)[0].skill).toBe(BASIC_ATTACK);
  });
  it('values the remaining ticks rather than just the presence of poison', () => {
    const state = start(mixed, [1]); state.allies.forEach(unit => { unit.poison = 1; });
    expect(autoOrders(state)[0].skill).toBe(2);
    const oneTick = extraordinaryResponseScore(state.allies[0], ownSkill(0), state.allies, state.enemies, 1);
    state.allies.forEach(unit => { unit.poison = 3; });
    expect(autoOrders(state)[0].skill).toBe(0);
    expect(extraordinaryResponseScore(state.allies[0], ownSkill(0), state.allies, state.enemies, 1)).toBeGreaterThan(oneTick);
  });
  it('does not mutate state or RNG, and fixed ID36 policy survives allowance-off on both sides', () => {
    for (const disabled of [false, true]) for (const seed of [0, 1, 42, 0xffffffff]) {
      const state = start([8], mixed, seed, { extraordinaryResponse: !disabled });
      const before = structuredClone(state), expected = autoOrders(state, 'enemies')[0];
      expect(expected).toEqual({ key: 'e0', skill: 2, target: 'a0' }); expect(state).toEqual(before);
      expect(autoOrders({ ...state, seed: 123456 }, 'enemies')).toEqual(autoOrders(state, 'enemies'));
      const result = advanceWithEvents(state, noOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
      expect(result.state.history![0].orders.find(order => order.key === 'e0')).toMatchObject(expected);
    }
    const threat = start(mixed, [28, 23, 8, 15, 5]); threat.allies.forEach(unit => { unit.hp = Math.floor(unit.hp * 0.5); });
    const chosen = autoOrders(threat)[0]; expect(chosen.skill).toBe(1);
    delete threat.allies[0].responseReady; expect(autoOrders(threat)[0].skill).toBe(2);
  });
  it('retains the predecessor demon core policy when its MP-damage mechanic is disabled', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const state = start([1, 8], [29], seed);
      state.enemies[0].monster = { ...state.enemies[0].monster, skills: [{ ...monsters[29].skills[0]!, mpDamage: 0 }, monsters[29].skills[1]!, monsters[29].skills[2]!] };
      state.allies[0].hp = 90; state.allies[1].hp = 30;
      const expected = autoOrders(state, 'enemies')[0];
      const result = advanceWithEvents(state, noOrders(state), { enemyOrders: autoOrders(state, 'enemies') });
      expect(result.state.history![0].orders.find(order => order.key === 'e0')).toMatchObject(expected);
    }
  });
  it('retains the original five-beast follow-up in a guard forecast after enemy casualties', () => {
    const state = start(mixed, [13, 0, 2, 11, 12]);
    state.enemies.slice(1).forEach(unit => { unit.hp = 0; });
    state.allies.forEach(unit => { unit.hp = Math.floor(unit.hp * 0.5); });
    const fullRoster = extraordinaryResponseScore(state.allies[0], ownSkill(1), state.allies, state.enemies, 1);
    const wronglyRecounted = extraordinaryResponseScore(state.allies[0], ownSkill(1), state.allies, state.enemies.filter(unit => unit.hp > 0), 1);
    expect(fullRoster).toBeGreaterThan(wronglyRecounted);
    expect(autoOrders(state)).toEqual(autoOrders(structuredClone(state)));
  });
  it('can honestly waste a forecast guard when the enemy chooses defense instead of public attacks', () => {
    const state = start(mixed, [28, 23, 8, 15, 5]); state.allies.forEach(unit => { unit.hp = Math.floor(unit.hp * 0.5); });
    expect(autoOrders(state)[0].skill).toBe(1);
    const result = advanceWithEvents(state, [autoOrders(state)[0], ...noOrders(state).slice(1)], { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: DEFEND })) });
    expect(spends(result.events)).toHaveLength(1); expect(result.events.filter(event => event.kind === 'damage')).toHaveLength(0);
    expect(result.state.allies[0].responseReady).toBe(false);
  });
});

// Isolate this skill/family contract from the separately tested recurring economy.
// Shipping default and all-family combinations are covered by turnMpRecovery tests and current Lab.
function start(...args: Parameters<typeof economyStart>): ReturnType<typeof economyStart> { return economyStart(args[0], args[1], args[2], { ...args[3], turnMpRecovery: 0 }); }
