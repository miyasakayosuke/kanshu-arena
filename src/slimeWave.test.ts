import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withoutPoisonControlMetadata } from './legacyPoisonTestControls';
import { advanceWithEvents, autoOrders, baseDamage, BASIC_ATTACK, battleSkill, canUseSkill, cost, DEFEND, effectStatus, leaderFor, monsters, skillTargetsAllies, skillUnavailableLabel, skillUnavailableReason, SLIME_CORE_ID, SLIME_SUPPLY, slimeSupplyEligible, start, supplyAmountFor, type BattleEvent, type Order, type State } from './engine';
import { battleEventLine, battleFactEvidenceLines, battleOrderLine, resultFacts } from './battleInsights';
import { isValidTeam, loadTeamSlots, saveTeamSlots } from './strategy';

const slimes = [24, 25, 26, 27, 28];
const supplySkill = monsters[24].skills[0]!;
const defend = (state: State, side: 'allies' | 'enemies' = 'allies'): Order[] => state[side].map(unit => ({ key: unit.key, skill: DEFEND }));
const supply = (state: State, side: 'allies' | 'enemies' = 'allies'): Order[] => defend(state, side).map(order => state[side].find(unit => unit.key === order.key)!.monster.id === SLIME_CORE_ID ? { key: order.key, skill: 0 } : order);
const resolve = (state: State, orders = supply(state), enemyOrders = defend(state, 'enemies')) => advanceWithEvents(state, orders, { enemyOrders });
const gains = (events: BattleEvent[]) => events.filter(event => event.kind === 'resource-gain');
const supplies = (events: BattleEvent[]) => events.filter(event => event.kind === 'supply');
const fixture = () => start(slimes, [1]);

describe('slime roster, saved teams, and fixed opening qualification', () => {
  it('appends five stable original slime IDs and cost17 with no more than four skills', () => {
    expect(monsters.slice(24,29).map(monster => monster.id)).toEqual(slimes);
    expect(slimes.map(id => monsters[id].family)).toEqual(Array(5).fill('slime'));
    expect(cost(slimes)).toBe(17); expect(isValidTeam(slimes)).toBe(true); expect(isValidTeam(slimes, 15)).toBe(false);
    expect(slimes.map(id => { const { hp, mp, atk, speed, cost } = monsters[id]; return [hp, mp, atk, speed, cost]; })).toEqual([
      [235, 64, 28, 54, 4], [160, 40, 35, 88, 2], [250, 46, 27, 36, 3], [195, 60, 24, 66, 3], [220, 52, 51, 61, 5],
    ]);
    expect(monsters.every(monster => monster.skills.length <= 4)).toBe(true);
    expect(slimes.map(id => monsters[id].skills.map(skill => [skill.name, skill.kind, skill.power, skill.priority, skill.mpCost]))).toEqual([
      [['蓄え分け', 'restoreMp', 8, 0, 0], ['押し流し', 'hit', 128, 0, 24], ['水面のかばい', 'protect', 0, 3, 10]],
      [['糸しぶき', 'hit', 44, 0, 7], ['はじけ糸', 'hit', 30, 2, 10]],
      [['膜のかばい', 'protect', 0, 3, 10], ['ひだ押し', 'hit', 54, 0, 8], ['折りほどき', 'hit', 46, 0, 12]],
      [['泡の手当て', 'heal', 60, 0, 18], ['泡さらい', 'cleanse', 28, 0, 10], ['泡つぶて', 'hit', 42, 0, 8]],
      [['ねり打ち', 'hit', 76, 0, 12], ['散る重泡', 'hit', 60, 0, 20]],
    ]);
    expect(supplySkill).toMatchObject({ all: true }); expect(skillTargetsAllies(supplySkill)).toBe(true);
    expect(monsters[24].skills[1]?.fixedDamage).toBe(true); expect(monsters[26].skills[2]?.breaksGuard).toBe(true); expect(monsters[28].skills[1]?.all).toBe(true);
    const state = fixture(); expect(baseDamage(state.allies[0], monsters[24].skills[1]!)).toBe(128);
    expect(baseDamage(state.allies[4], monsters[28].skills[1]!)).toBe((60 + 51 * .38) * .5);
  });
  it('round-trips old/new saved teams under the unchanged schema', () => {
    let json = ''; const storage = { getItem: () => json, setItem: (_: string, value: string) => { json = value; } };
    const slots = [{ team: slimes, rule: 'standard' }, { team: [0, 25, 3, 4, 6], rule: 'light' }, null];
    expect(saveTeamSlots(storage, slots)).toBe(true); expect(loadTeamSlots(storage)).toEqual(slots);
  });
  it.each([[24], [24, 25], [24, 0, 2], [25, 26, 27, 28]])('does not grant an allowance for ineligible roster %j', (...ids) => {
    const state = start(ids, []); expect(slimeSupplyEligible(state.allies)).toBe(false);
    expect(state.allies.every(unit => !Object.hasOwn(unit, 'supplyReady'))).toBe(true);
    expect(state.log.join('\n')).not.toContain('「蓄え分け」');
  });
  it('qualifies exactly three total slimes on both sides with a nonleader core', () => {
    const state = start([25, 24, 26, 0, 2], [0, 27, 24, 28, 2]);
    expect(SLIME_SUPPLY).toEqual({ coreId: 24, family: 'slime', minimumMembers: 3, amount: 8, name: '蓄え分け', maxUses: 1 });
    expect(state.allies.map(unit => unit.supplyReady)).toEqual([undefined, true, undefined, undefined, undefined]);
    expect(state.enemies.map(unit => unit.supplyReady)).toEqual([undefined, undefined, true, undefined, undefined]);
    expect(effectStatus(state.allies[1])).toContain('補給:残1回');
  });
  it('familySupport:false disables allowance and later states never acquire qualification', () => {
    const state = start(slimes, slimes, 42, { familySupport: false });
    expect([...state.allies, ...state.enemies].every(unit => unit.supplyReady === undefined)).toBe(true);
    state.allies[0].mp = 0; expect(skillUnavailableReason(state.allies[0], supplySkill, state.allies)).toBe('supply-ineligible');
    expect(supplies(resolve(state).events)).toHaveLength(0);
  });
  it('applies maximum and initial MP once only to slime recipients and preserves saved battle maxima', () => {
    const roster = structuredClone(monsters);
    const state = start(slimes, [24, 25, 26, 0, 2], 42, { leaders: true });
    expect(leaderFor(24)).toMatchObject({ stat: 'mp', percent: 10, family: 'slime' });
    expect(state.allies.map(unit => unit.mp)).toEqual([70, 44, 51, 66, 57]);
    expect(state.allies.map(unit => unit.monster.mp)).toEqual([70, 44, 51, 66, 57]);
    expect(state.allies.map(unit => unit.hp)).toEqual([235, 160, 250, 195, 220]);
    expect(state.enemies.slice(3).map(unit => unit.mp)).toEqual([54, 72]);
    for (const id of slimes.slice(1)) expect(leaderFor(id)).toMatchObject({ percent: 8, family: 'slime', stat: expect.stringMatching(/^(hp|atk|speed)$/) });
    const restored: State = JSON.parse(JSON.stringify(state)); restored.allies.forEach(unit => { unit.mp--; });
    const result = resolve(restored);
    expect(result.state.allies.map(unit => unit.mp)).toEqual([70, 44, 51, 66, 57]); expect(monsters).toEqual(roster);
    expect(start([25, 24, 26], [], 42, { leaders: true }).allies.map(unit => unit.mp)).toEqual([40, 64, 46]);
  });
});

describe('authoritative finite MP supply validation and casting', () => {
  it('exposes truthful unavailable reasons while leaving ordinary two-argument skill checks unchanged', () => {
    const state = fixture(), core = state.allies[0];
    expect(canUseSkill(core, battleSkill(core.monster, BASIC_ATTACK)!)).toBe(true);
    expect(skillUnavailableReason(core, supplySkill)).toBe('supply-context-required');
    expect(skillUnavailableReason(core, supplySkill, state.allies)).toBe('supply-full');
    core.mp = 0; expect(canUseSkill(core, supplySkill, state.allies)).toBe(true);
    core.supplyReady = false; expect(skillUnavailableReason(core, supplySkill, state.allies)).toBe('supply-spent');
    delete core.supplyReady; expect(skillUnavailableReason(core, supplySkill, state.allies)).toBe('supply-ineligible');
    core.hp = 0; expect(skillUnavailableReason(core, supplySkill, state.allies)).toBe('defeated');
    for (const reason of ['defeated', 'supply-full', 'supply-spent', 'supply-ineligible', 'supply-context-required'] as const) expect(skillUnavailableLabel(reason)).not.toBe('MP不足');
  });
  it('all-full rejects without RNG draws, fallback attacks, MP debits, or spending the allowance', () => {
    const state = fixture(), before = structuredClone(state), result = resolve(state);
    expect(state).toEqual(before); expect(result.state.allies[0].supplyReady).toBe(true);
    expect(result.state.history![0].orders[0]).toMatchObject({ accepted: false, rejection: 'supply-full' });
    expect(battleOrderLine(result.state, result.state.history![0].orders[0])).toContain('全員満タン');
    expect(result.events.some(event => event.actor === 'a0' && ['cast', 'damage', 'resource', 'supply', 'resource-gain'].includes(event.kind))).toBe(false);
    result.state.allies[0].mp--; expect(supplies(resolve(result.state).events)).toHaveLength(1);
  });
  it('a two-slime party cannot supply, and non-slime or enemy deficits cannot enable it', () => {
    const insufficient = start([24, 25], [1]); insufficient.allies[0].mp = 0;
    expect(resolve(insufficient).state.history![0].orders[0].rejection).toBe('supply-ineligible');
    const mixed = start([24, 25, 26, 0, 2], slimes); mixed.allies[3].mp = 0; mixed.enemies[0].mp = 0;
    expect(resolve(mixed).state.history![0].orders[0].rejection).toBe('supply-full');
  });
  it('selection and automatic suggestions do not spend the allowance; changing back preserves it', () => {
    const state = fixture(); state.allies[0].mp = 16; const before = structuredClone(state);
    expect(canUseSkill(state.allies[0], supplySkill, state.allies)).toBe(true); autoOrders(state); autoOrders(state);
    expect(state).toEqual(before); const result = resolve(state, defend(state));
    expect(result.state.allies[0]).toMatchObject({ mp: 16, supplyReady: true }); expect(gains(result.events)).toHaveLength(0);
  });
  it('uses one normal-order action, spends readiness before capped absolute gains, and does not heal or spend MP', () => {
    const state = fixture(); [0, 39, 41, 60, 0].forEach((mp, index) => { state.allies[index].mp = mp; state.allies[index].hp--; });
    const before = structuredClone(state), result = resolve(state);
    expect(state).toEqual(before); expect(gains(result.events).map(event => event.amount)).toEqual([8, 1, 5, 0, 8]);
    expect(gains(result.events).map(event => event.mp)).toEqual([8, 40, 46, 60, 8]);
    expect(result.state.allies.map(unit => unit.hp)).toEqual(state.allies.map(unit => unit.hp));
    expect(result.events.some(event => event.kind === 'heal' || event.kind === 'resource' || event.kind === 'charge' || event.kind === 'passive')).toBe(false);
    const casts = result.events.filter(event => event.kind === 'cast' && event.actor === 'a0');
    expect(casts).toEqual([expect.objectContaining({ effect: 'restoreMp', scope: 'all', targets: ['a0', 'a1', 'a2', 'a3', 'a4'] })]);
    expect(casts[0].target).toBeUndefined();
    const spent = result.events.findIndex(event => event.kind === 'supply'), firstGain = result.events.findIndex(event => event.kind === 'resource-gain');
    expect(spent).toBeLessThan(firstGain); expect(result.events[spent]).toMatchObject({ target: 'a0', supplyReady: false, phase: 'action' });
    expect(gains(result.events).every(event => event.hp === undefined && event.poison === undefined)).toBe(true);
    expect(result.state.allies[0].supplyReady).toBe(false); expect(effectStatus(result.state.allies[0])).toContain('補給:残0回');
  });
  it('replenishes both sides independently with a40MP maximum and no infinite refill', () => {
    const state = start(slimes, slimes); [...state.allies, ...state.enemies].forEach(unit => { unit.mp = 0; });
    const result = resolve(state, supply(state), supply(state, 'enemies'));
    expect(supplies(result.events)).toHaveLength(2);
    for (const side of ['allies', 'enemies'] as const) expect(result.state[side].map(unit => unit.mp)).toEqual([8, 8, 8, 8, 8]);
    const next = resolve(result.state, supply(result.state), supply(result.state, 'enemies'));
    expect(gains(next.events)).toHaveLength(0); expect(next.state.history![1].orders.filter(order => order.skill === 0).every(order => order.rejection === 'supply-spent')).toBe(true);
    expect(start(slimes, []).allies[0].supplyReady).toBe(true);
  });
  it('retains initial qualification after ally KO, skips the dead and mixed recipients, and does not redistribute their share', () => {
    const state = start([24, 25, 26, 0, 2], [1]); state.allies.forEach(unit => { unit.mp = 0; }); state.allies[1].hp = 0; state.allies[2].hp = 0;
    expect(slimeSupplyEligible(state.allies)).toBe(true); const result = resolve(state);
    expect(gains(result.events)).toEqual([expect.objectContaining({ target: 'a0', amount: 8, mp: 8 })]);
    expect(result.state.allies.map(unit => unit.mp)).toEqual([8, 0, 0, 0, 0]); expect(result.state.allies.slice(1, 3).every(unit => unit.hp === 0)).toBe(true);
  });
  it('never clears poison or guard and does not cause dragon charge or passive repair recursion', () => {
    const state = start([24, 25, 26, 15, 19], [1]); state.allies[0].mp = 0; state.allies[0].poison = 3;
    state.allies[3].dragonCharge = 0; state.allies[4].repairReady = false;
    const orders = supply(state); orders[2] = { key: 'a2', skill: 0, target: 'a0' };
    const result = resolve(state, orders);
    expect(result.state.allies[0]).toMatchObject({ mp: 8, poison: 2, hp: state.allies[0].monster.hp - Math.floor(state.allies[0].monster.hp * .06) });
    expect(result.state.allies[3].dragonCharge).toBe(0); expect(result.state.allies[4].repairReady).toBe(false);
    expect(result.events.some(event => event.kind === 'charge' || event.kind === 'heal' || event.kind === 'cleanse' || event.kind === 'passive')).toBe(false);
    const spendIndex = result.events.findIndex(event => event.kind === 'supply');
    expect(result.events.slice(spendIndex + 1).some(event => event.kind === 'break')).toBe(false);
  });
  it('rejects an all-full reservation even if a faster ally would spend MP later in that turn', () => {
    const state = fixture(), orders = supply(state); orders[1] = { key: 'a1', skill: 0, target: 'e0' };
    const result = resolve(state, orders);
    expect(result.state.history![0].orders[0].rejection).toBe('supply-full'); expect(result.state.allies[0].supplyReady).toBe(true);
    expect(result.state.allies[1].mp).toBe(33); expect(gains(result.events)).toHaveLength(0);
  });
  it('includes faster allies’ actual prior spending when a supply order was legal at turn start', () => {
    const state = fixture(); state.allies[0].mp--; const orders = supply(state); orders[1] = { key: 'a1', skill: 0, target: 'e0' };
    const result = resolve(state, orders);
    expect(gains(result.events).find(event => event.target === 'a1')).toMatchObject({ amount: 7, mp: 40 });
    expect(result.events.findIndex(event => event.kind === 'resource')).toBeLessThan(result.events.findIndex(event => event.kind === 'supply'));
  });
  it('cannot borrow future supply for an unaffordable slower order, but a legal slower cast keeps its debited post-supply MP', () => {
    for (const mp of [0, 8]) {
      const state = fixture(); state.allies[2].mp = mp; const orders = supply(state); orders[2] = { key: 'a2', skill: 1, target: 'e0' };
      const result = resolve(state, orders), order = result.state.history![0].orders.find(order => order.key === 'a2')!;
      expect(order.accepted).toBe(mp === 8); expect(result.state.allies[2].mp).toBe(8);
      if (!mp) expect(order.rejection).toBe('insufficient-mp');
      else expect(result.events.findIndex(event => event.kind === 'supply')).toBeLessThan(result.events.findIndex(event => event.kind === 'resource' && event.actor === 'a2'));
    }
  });
  it('rechecks before cast: losing the sole deficient recipient cancels supply and preserves allowance', () => {
    const state = start([24, 25, 26], [0]); state.allies[1].mp = 0; state.allies[1].hp = 1;
    const result = resolve(state, supply(state), [{ key: 'e0', skill: 1, target: 'a1' }]);
    expect(result.state.history![0].orders[0].accepted).toBe(true); expect(result.state.allies[1].hp).toBe(0);
    expect(supplies(result.events)).toHaveLength(0); expect(result.state.allies[0].supplyReady).toBe(true);
    expect(result.events.some(event => event.kind === 'cast' && event.actor === 'a0')).toBe(false);
    expect(result.state.log.join('\n')).toContain('不発（生存する味方粘体系のMPが全員満タン');
  });
  it('isolates bounded simulation amounts from the roster and the opposite side, with one shared AI/gain value', () => {
    const roster = structuredClone(monsters);
    const state = start(slimes, slimes); state.allies[0].supplyAmount = 3; state.allies[0].mp = 16; state.enemies[0].mp = 16;
    expect(supplyAmountFor(state.allies[0])).toBe(3); expect(supplyAmountFor(state.enemies[0])).toBe(8);
    expect(autoOrders(state)[0].skill).not.toBe(0); expect(autoOrders(state, 'enemies')[0].skill).toBe(0);
    state.allies[0].supplyAmount = 8; expect(autoOrders(state)[0].skill).toBe(0);
    state.allies[0].supplyAmount = 3;
    const result = resolve(state, supply(state), supply(state, 'enemies'));
    expect(gains(result.events).find(event => event.target === 'a0')?.amount).toBe(3);
    expect(gains(result.events).find(event => event.target === 'e0')?.amount).toBe(8);
    expect(monsters).toEqual(roster); expect(start(slimes, []).allies[0].supplyAmount).toBeUndefined();
    for (const [amount, expected] of [[-1, 0], [3.8, 3], [31, 30], [Infinity, 8], [NaN, 8]]) {
      state.allies[0].supplyAmount = amount; expect(supplyAmountFor(state.allies[0])).toBe(expected);
    }
  });
  it('zero-amount explicit ablation consumes the finite action but emits zero gains and never receives AI refill utility', () => {
    const state = fixture(); state.allies[0].supplyAmount = 0; state.allies.forEach(unit => { unit.mp = 0; });
    expect(autoOrders(state)[0].skill).not.toBe(0);
    const result = resolve(state); expect(supplies(result.events)).toHaveLength(1);
    expect(gains(result.events).map(event => event.amount)).toEqual([0, 0, 0, 0, 0]);
    expect(result.state.allies[0]).toMatchObject({ mp: 0, supplyReady: false });
    expect(result.state.allies.map(unit => unit.hp)).toEqual(state.allies.map(unit => unit.hp));
    expect(resultFacts(result.state).find(fact => fact.kind === 'supply')?.text).toContain('味方 0／敵 0 MP増加');
  });
  it('rejects enemy targets explicitly without spending allowance', () => {
    const state = fixture(); state.allies[0].mp = 0; const orders = supply(state); orders[0].target = 'e0';
    const result = resolve(state, orders); expect(result.state.history![0].orders[0].rejection).toBe('invalid-target');
    expect(gains(result.events)).toHaveLength(0); expect(result.state.allies[0].supplyReady).toBe(true);
  });
});

describe('supply KO and nondispellable allowance', () => {
  it('core KO before its scheduled action clears allowance and prevents all gains', () => {
    const state = start(slimes, [0]); state.allies[0].hp = 1; state.allies[0].mp = 0;
    const result = resolve(state, supply(state), [{ key: 'e0', skill: 1, target: 'a0' }]);
    expect(result.state.allies[0]).toMatchObject({ hp: 0, mp: 0, supplyReady: false }); expect(gains(result.events)).toHaveLength(0);
    expect(result.events.find(event => event.kind === 'defeat')).toMatchObject({ target: 'a0', supplyReady: false });
  });
  it('poison KO and old/injected dead-core cleanup clear the same absolute allowance', () => {
    for (const hp of [0, 1]) {
      const state = fixture(); state.allies[0].hp = hp; state.allies[0].poison = 1;
      const result = resolve(state, defend(state)); expect(result.state.allies[0]).toMatchObject({ hp: 0, poison: 0, supplyReady: false });
      expect(gains(result.events)).toHaveLength(0); expect(result.events.some(event => event.supplyReady === false)).toBe(true);
    }
  });
  it.each([[8, 3], [11, 3], [17, 1], [22, 1], [12, 0], [26, 2]])('monster%s skill%s dispels guard but never supply allowance', (id, skill) => {
    const state = start([id], [24, 25, 26]); state.enemies[0].hp = 2000; state.enemies[0].monster = { ...state.enemies[0].monster, hp: 2000 };
    state.enemies.slice(1).forEach(unit => { unit.hp = 0; });
    const result = resolve(state, [{ key: 'a0', skill, target: 'e0' }], [{ key: 'e0', skill: DEFEND }]);
    expect(result.events.some(event => event.kind === 'break')).toBe(true); expect(result.state.enemies[0].supplyReady).toBe(true);
    const breaks = result.events.filter(event => event.kind === 'break');
    expect(breaks.every(event => event.supplyReady === undefined)).toBe(true);
    expect(breaks.map(event => battleEventLine(result.state, event)).join('')).not.toContain('補給');
  });
});

describe('slime evidence, deterministic AI, and frozen historical parity', () => {
  it('separates actual MP gain evidence from HP healing and MP debit', () => {
    const state = fixture(); state.allies[0].mp = 0; state.allies[1].mp--;
    const result = resolve(state), fact = resultFacts(result.state).find(fact => fact.kind === 'supply')!;
    expect(fact.text).toContain('味方 9／敵 0 MP増加');
    expect(resultFacts(result.state).some(fact => fact.kind === 'healing' || fact.kind === 'repair')).toBe(false);
    const lines = battleFactEvidenceLines(result.state, fact).join('\n');
    expect(lines).toContain('残0回'); expect(lines).toContain('MP ＋8'); expect(lines).not.toContain('HP');
    expect(fact.evidence.every(evidence => result.state.history![0].events[evidence.eventIndex])).toBe(true);
    expect(result.state.history![0].events).toEqual(result.events);
  });
  it('chooses a useful legal supply identically on either side without mutating state or seed', () => {
    const state = start(slimes, slimes); state.allies[0].mp = 16; state.enemies[0].mp = 16; const before = structuredClone(state);
    expect(autoOrders(state)[0]).toEqual({ key: 'a0', skill: 0 });
    expect(autoOrders(state, 'enemies')[0]).toEqual({ key: 'e0', skill: 0 }); expect(state).toEqual(before);
    const result = advanceWithEvents(state, autoOrders(state));
    expect(supplies(result.events).map(event => event.actor).sort()).toEqual(['a0', 'e0']);
    state.allies[0].mp = 63; expect(autoOrders(state)[0].skill).toBe(1);
  });
  it('same-policy full battles are deterministic, finite and conserve per-side supply budgets', () => {
    const simulate = (seed: number) => { let state = start(slimes, slimes, seed, { leaders: true }); while (!state.winner) state = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') }).state; return state; };
    for (const seed of [0, 42, 0xffffffff]) {
      const result = simulate(seed); expect(result).toEqual(simulate(seed)); expect(result.turn).toBeLessThanOrEqual(21);
      expect(result.history!.every(turn => turn.orders.every(order => order.accepted))).toBe(true);
      const events = result.history!.flatMap(turn => turn.events);
      for (const actor of ['a0', 'e0']) {
        expect(supplies(events).filter(event => event.actor === actor).length).toBeLessThanOrEqual(1);
        expect(gains(events).filter(event => event.actor === actor).reduce((sum, event) => sum + event.amount!, 0)).toBeLessThanOrEqual(40);
      }
      expect([...result.allies, ...result.enemies].every(unit => unit.hp >= 0 && unit.hp <= unit.monster.hp && unit.mp >= 0 && unit.mp <= unit.monster.mp)).toBe(true);
    }
  });
  it('keeps the complete frozen0–23 roster and leaders byte-identical', () => {
    const baseline = monsters.slice(0, 24).map(monster => ({ monster, leader: leaderFor(monster.id) }));
    expect(createHash('sha256').update(JSON.stringify(baseline, oldFamilyMetadata)).digest('hex')).toBe('302a9abe1780a801e97acbf26344649174c176ca1ed6d907c37f230eec40b302');
  });
  it('under explicit legacy poison controls, keeps216 complete frozen material-era battles byte-identical including all states, logs, events, orders, RNG and winners', () => {
    // Captured before slime edits from the tested b591275 material tree staged over d37e588.
    const parties = [[19, 20, 21, 22, 23], [15, 5, 16, 17, 18], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [1, 5, 8, 10, 6], [4, 7, 8, 13, 22]], results = [];
    for (const team of parties) for (const enemy of parties) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = start(team, enemy, seed, { leaders: true, poisonImpactScale: 1, reservePoison: false });
      while (!state.winner) state = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {}).state;
      results.push({ team, enemy, seed, samePolicy, state: withoutPoisonControlMetadata(state) });
    }
    expect(createHash('sha256').update(JSON.stringify(results, oldFamilyMetadata)).digest('hex')).toBe('058a9ab2fe4f21950de9c58ae24439540030c66d1563e1fbbc7e3f60beb708c6');
  });
});

// v0.15 deliberately classifies these existing units; their combat and all other fields stay exact.
const oldFamilyMetadata = (_key: string, item: unknown) => {
 if (_key === 'monster' && item && typeof item === 'object' && 'id' in item && (item.id === 1 || item.id === 4 || item.id === 8)) {const copy={...item} as Record<string, unknown>;delete copy.family;return copy;}return item;
};
