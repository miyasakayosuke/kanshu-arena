import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, baseDamage, BASIC_ATTACK, cost, DEFEND, dragonChargeEligible, DRAGON_CHARGE_CAP, effectStatus, leaderFor, monsters, start, type BattleEvent, type Order, type State, type Unit } from './engine';
import { isValidTeam, loadTeamSlots, saveTeamSlots } from './strategy';

const dragons = [15, 5, 16, 17, 18];
const target = (key = 'e0', hp = 5000): Unit => ({ key, monster: { id: -1, name: '標的', icon: '', cost: 1, hp, mp: 0, atk: 0, speed: 0, skills: [] }, hp, mp: 0, guard: false, poison: 0 });
const fixture = (): State => ({ ...start(dragons, [], 42), enemies: [target()] });
const orders = (state: State, selected: Record<number, number> = {}): Order[] => state.allies.map(unit => ({ key: unit.key, skill: selected[unit.monster.id] ?? DEFEND }));
const resolve = (state: State, selected: Record<number, number> = {}) => advanceWithEvents(state, orders(state, selected), { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: BASIC_ATTACK })) });
const gains = (events: BattleEvent[]) => events.filter(event => event.kind === 'charge' && event.effect === 'dragon-charge-gain');

describe('dragon roster and starting qualification', () => {
  it('appends four units and gives five dragons a cost17 legal team without retuning Fenrir or Quetzalcoatl', () => {
    expect(monsters.slice(15, 19).map(unit => unit.id)).toEqual([15, 16, 17, 18]);
    expect(dragons.map(id => monsters[id].family)).toEqual(Array(5).fill('dragon'));
    expect(cost(dragons)).toBe(17); expect(isValidTeam(dragons)).toBe(true); expect(isValidTeam(dragons, 15)).toBe(false);
    expect(monsters[12]).toMatchObject({ hp: 150, mp: 60, atk: 54, speed: 93, cost: 4 });
    expect(monsters[5]).toMatchObject({ hp: 200, mp: 54, atk: 52, speed: 47, cost: 4 });
    expect(monsters[5].skills[1]).toEqual({ name: '嵐の息吹', power: 34, priority: 0, mpCost: 18, kind: 'hit', all: true });
    expect(monsters.every(monster => monster.skills.length <= 4)).toBe(true);
  });
  it('round-trips old and new teams through unchanged save format', () => {
    let json = ''; const storage = { getItem: () => json, setItem: (_: string, value: string) => { json = value; } };
    const slots = [{ team: dragons, rule: 'standard' }, { team: [0, 2, 3, 4, 6], rule: 'light' }, null];
    expect(saveTeamSlots(storage, slots)).toBe(true); expect(loadTeamSlots(storage)).toEqual(slots);
  });
  it.each([[15, 5], [15, 0, 2], [5, 16, 17]])('does not enable charge for insufficient membership or no core: %j', (...ids) => {
    expect(start(ids, []).allies.every(unit => unit.dragonCharge === undefined)).toBe(true);
  });
  it('enables only each side’s core, including a nonleader, with three starting dragons', () => {
    const state = start([5, 15, 16, 0, 2], [0, 15, 5, 16, 2]);
    expect(state.allies.map(unit => unit.dragonCharge)).toEqual([undefined, 0, undefined, undefined, undefined]);
    expect(state.enemies.map(unit => unit.dragonCharge)).toEqual([undefined, 0, undefined, undefined, undefined]);
    expect(effectStatus(state.allies[1])).toContain('竜気:0/5');
    expect(start(dragons, dragons, 42, { familySupport: false }).allies.every(unit => unit.dragonCharge === undefined)).toBe(true);
  });
  it('explains eligible opening charge only, using the canonical family label', () => {
    const opening = start(dragons, [15, 5], 42, { leaders: true }).log.join('\n');
    expect(opening).toContain('味方「竜気」'); expect(opening).not.toContain('敵「竜気」');
    for (const text of ['竜系3体以上', '連撃も1回', '上限5', '全消費', '解除可能']) expect(opening).toContain(text);
    expect(start(dragons, dragons, 42, { familySupport: false }).log.join('\n')).not.toContain('「竜気」');
    for (const id of [15, 16, 17, 18]) expect(leaderFor(id).description).toContain('竜系');
    expect(opening).not.toContain('ドラゴン系');
  });
  it('keeps starting membership after ally deaths and gives the leader HP only to dragons', () => {
    const state = start([15, 5, 16, 0, 2], [], 42, { leaders: true });
    expect(leaderFor(15)).toMatchObject({ family: 'dragon', stat: 'hp', percent: 10 });
    expect(state.allies.map(unit => unit.hp)).toEqual([242, 220, 165, 150, 170]);
    state.allies[1].hp = 0; state.allies[2].hp = 0;
    expect(dragonChargeEligible(state.allies)).toBe(true);
    state.enemies = [target()];
    expect(resolve(state, { 15: 1 }).state.allies[0].dragonCharge).toBe(1);
  });
});

describe('action-built dragon charge', () => {
  it.each([[5, 0], [5, 1], [16, 0], [17, 0], [17, 1], [18, 0], [15, 1]])('gains once per paid hit cast for monster %s skill %s', (id, skill) => {
    const result = resolve(fixture(), { [id]: skill });
    expect(gains(result.events)).toHaveLength(1);
    expect(result.state.allies[0].dragonCharge).toBe(1);
    expect(gains(result.events)[0]).toMatchObject({ phase: 'action-end', target: 'a0', dragonCharge: 1 });
    expect(gains(result.events)[0].amount).toBeUndefined();
  });
  it.each([[15, DEFEND], [15, BASIC_ATTACK], [5, 2], [16, 1], [18, 1], [18, 2]])('excludes support/basic/free actions for monster %s skill %s', (id, skill) => {
    const result = resolve(fixture(), { [id]: skill });
    expect(gains(result.events)).toHaveLength(0); expect(result.state.allies[0].dragonCharge).toBe(0);
  });
  it('excludes paid poison, non-dragon hits, unpaid custom hits, failed MP orders and actors defeated before their action', () => {
    for (const patch of [{ kind: 'poison' as const }, { mpCost: 0 }]) {
      const state = fixture(), actor = state.allies[4];
      actor.monster = { ...actor.monster, skills: [{ ...actor.monster.skills[0]!, ...patch }] };
      expect(gains(resolve(state, { 18: 0 }).events)).toHaveLength(0);
    }
    const mixed = fixture(); mixed.allies[4].monster = monsters[0];
    expect(gains(resolve(mixed, { 0: 0 }).events)).toHaveLength(0);
    const insufficient = fixture(); insufficient.allies[4].mp = 0;
    expect(gains(resolve(insufficient, { 18: 0 }).events)).toHaveLength(0);
    const dead = fixture(); dead.allies[4].hp = 0;
    expect(gains(resolve(dead, { 18: 0 }).events)).toHaveLength(0);
  });
  it('caps at five, produces no overflow events, and does not mutate its input or shared roster', () => {
    const state = fixture(); state.allies[0].dragonCharge = 4;
    const before = structuredClone(state), rosterBefore = structuredClone(monsters);
    const result = resolve(state, { 5: 1, 16: 0, 17: 0, 18: 0 });
    expect(result.state.allies[0].dragonCharge).toBe(DRAGON_CHARGE_CAP); expect(gains(result.events)).toHaveLength(1);
    expect(state).toEqual(before); expect(monsters).toEqual(rosterBefore);
  });
  it('spends after MP debit and before every target hit, snapshots all charge, and cannot self-recharge', () => {
    const state = fixture(); state.allies[0].dragonCharge = 5; state.enemies.push(target('e1'));
    const result = resolve(state, { 15: 0 });
    const cast = result.events.find(event => event.kind === 'cast' && event.actor === 'a0')!;
    expect(cast).toMatchObject({ scope: 'all', targets: ['e0', 'e1'], dragonChargeSpent: 5 });
    const spend = result.events.findIndex(event => event.effect === 'dragon-charge-spend');
    expect(result.events[spend - 1]).toMatchObject({ kind: 'resource', actor: 'a0', mp: 34 });
    expect(result.events[spend + 1].kind).toBe('damage');
    const damage = result.events.filter(event => event.kind === 'damage' && event.actor === 'a0');
    expect(damage).toHaveLength(2);
    expect(damage.every(event => event.amount! >= 90 && event.amount! <= 110)).toBe(true);
    expect(result.state.allies[0].dragonCharge).toBe(0); expect(gains(result.events)).toHaveLength(0);
  });
  it('uses faster dragons’ newly earned charge when the anchor finally casts', () => {
    const result = resolve(fixture(), { 15: 0, 5: 0, 16: 0, 17: 0, 18: 0 });
    expect(gains(result.events)).toHaveLength(4);
    expect(result.events.find(event => event.kind === 'cast' && event.actor === 'a0')).toMatchObject({ dragonChargeSpent: 4 });
    expect(result.state.allies[0].dragonCharge).toBe(0);
  });
  it('does not spend charge on cancelled casts or grant it to a dead core', () => {
    const state = fixture(); state.allies[0].dragonCharge = 3; state.allies[0].mp = 27;
    expect(resolve(state, { 15: 0 }).state.allies[0].dragonCharge).toBe(3);
    state.allies[0].hp = 0;
    const result = resolve(state, { 17: 0 }); expect(gains(result.events)).toHaveLength(0);
  });
  it('clears a core defeated before acting and does not feed it from later surviving dragons', () => {
    const state = fixture(); state.allies[0].dragonCharge = 3;
    state.enemies[0].monster = { ...state.enemies[0].monster, speed: 200, skills: [{ name: '試験用先制', power: 10000, mpCost: 0, priority: 3, kind: 'hit' }] };
    const result = advanceWithEvents(state, orders(state, { 15: 0, 17: 0 }), { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] });
    expect(result.state.allies[0]).toMatchObject({ hp: 0, mp: 62, dragonCharge: 0 });
    expect(result.events.some(event => event.kind === 'cast' && event.actor === 'a0')).toBe(false);
    expect(gains(result.events)).toHaveLength(0);
    expect(result.events.some(event => event.kind === 'cast' && event.actor === 'a3')).toBe(true);
  });
  it('retains charge over turns, clears it on defeat, and resets it on a fresh match', () => {
    let state = fixture(); state.allies[0].dragonCharge = 3;
    state = resolve(state).state; expect(state.allies[0].dragonCharge).toBe(3);
    state.allies[0].hp = 1; state.allies[0].poison = 1;
    const result = resolve(state, { 17: 0 });
    expect(result.state.allies[0].dragonCharge).toBe(0);
    expect(result.events.find(event => event.kind === 'defeat' && event.target === 'a0')).toMatchObject({ dragonCharge: 0 });
    expect(start(dragons, []).allies[0].dragonCharge).toBe(0);
  });
});

describe('literal breath and dispel counterplay', () => {
  it('automatic scoring reads current charge and uses fixed breath without predicting future gains', () => {
    const state = fixture(); state.enemies = Array.from({ length: 5 }, (_, i) => target(`e${i}`));
    expect(autoOrders(state).find(order => order.key === 'a0')!.skill).toBe(1);
    state.allies[0].dragonCharge = 5;
    expect(autoOrders(state).find(order => order.key === 'a0')!.skill).toBe(0);
    state.allies[4].monster = { ...state.allies[4].monster, atk: 0 };
    expect(autoOrders(state).find(order => order.key === 'a4')!.skill).toBe(0);
  });
  it('ignores ATK, attack leaders and rally but supports isolated per-point values', () => {
    const core = fixture().allies[0]; core.dragonCharge = 5;
    expect(baseDamage(core, core.monster.skills[0]!)).toBe(100);
    expect(baseDamage({ ...core, rally: 2, monster: { ...core.monster, atk: 999 } }, core.monster.skills[0]!)).toBe(100);
    expect(baseDamage({ ...core, dragonChargePerPoint: 3 }, core.monster.skills[0]!)).toBe(25);
    expect(baseDamage({ ...core, dragonChargePerPoint: 0 }, core.monster.skills[0]!)).toBe(10);
    const zilant = fixture().allies[4];
    expect(baseDamage(zilant, zilant.monster.skills[0]!)).toBe(68);
    expect(baseDamage({ ...zilant, rally: 2, monster: { ...zilant.monster, atk: 999 } }, zilant.monster.skills[0]!)).toBe(68);
    const legacy = fixture().allies[1];
    expect(baseDamage(legacy, legacy.monster.skills[1]!)).toBe((34 + 52 * .38) * .5);
  });
  it('still applies guarding and ward to literal breath', () => {
    const run = (guard: boolean, ward: number) => {
      const state = fixture(); state.allies[0].dragonCharge = 5; state.enemies[0].ward = ward;
      return advanceWithEvents(state, orders(state, { 15: 0 }), { enemyOrders: [{ key: 'e0', skill: guard ? DEFEND : BASIC_ATTACK }] }).events.find(event => event.kind === 'damage' && event.actor === 'a0')!.amount!;
    };
    const normal = run(false, 0); expect(run(true, 0)).toBeLessThan(normal * .55); expect(run(false, 2)).toBeLessThan(normal);
    expect(run(true, 2)).toBe(run(true, 0));
  });
  it.each([[8, 3, false], [12, 0, true]])('strips charge with monster %s at the correct before/after hit timing', (id, skill, after) => {
    const state = start([id], [15, 5, 16], 42);
    state.enemies[0].dragonCharge = 5; state.enemies[0].hp = 5000; state.enemies[0].monster = { ...state.enemies[0].monster, hp: 5000 };
    state.enemies[1].hp = 0; state.enemies[2].hp = 0;
    const result = advanceWithEvents(state, [{ key: 'a0', skill }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
    const dispelIndex = result.events.findIndex(event => event.kind === 'break');
    const damageIndex = result.events.findIndex(event => event.kind === 'damage' && event.actor === 'a0');
    expect(result.events[dispelIndex]).toMatchObject({ dragonCharge: 0, removed: expect.arrayContaining(['dragonCharge']) });
    expect(after ? dispelIndex > damageIndex : dispelIndex < damageIndex).toBe(true);
    expect(result.state.enemies[0].dragonCharge).toBe(0);
    result.state.enemies[0].mp = 62;
    const next = advanceWithEvents(result.state, [{ key: 'a0', skill: DEFEND }], { enemyOrders: [{ key: 'e0', skill: 1 }] });
    expect(next.state.enemies[0].dragonCharge).toBe(1);
  });
  it('same-policy mirrored full-team games are deterministic, legal and terminate', () => {
    const simulate = (seed: number) => { let state = start(dragons, dragons, seed, { leaders: true }); while (!state.winner) state = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') }).state; return state; };
    for (const seed of [0, 42, 0xffffffff]) {
      const result = simulate(seed); expect(result).toEqual(simulate(seed)); expect(result.turn).toBeLessThanOrEqual(21);
      expect(result.history!.every(turn => turn.orders.every(order => order.accepted))).toBe(true);
      expect([...result.allies, ...result.enemies].every(unit => unit.hp >= 0 && unit.mp >= 0 && (unit.dragonCharge ?? 0) <= 5)).toBe(true);
    }
  });
  it('preserves ff52abef old-team events, orders, RNG and winners across36 complete battles', () => {
    // Captured before this wave from ff52abef77a2a719fd39e0b21a7a83ba7e534f28.
    const teams = [[0, 2, 3, 4, 6], [1, 5, 8, 10, 6], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [12, 14, 0, 6, 10], [11, 9, 4, 7, 10]];
    const results = [];
    for (let i = 0; i < teams.length; i++) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = start(teams[i], teams[(i + 1) % teams.length], seed, { leaders: true });
      while (!state.winner) state = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {}).state;
      results.push({ i, seed, samePolicy, events: state.history!.map(turn => turn.events), orders: state.history!.map(turn => turn.orders), seedAfter: state.seed, winner: state.winner });
    }
    expect(createHash('sha256').update(JSON.stringify(results)).digest('hex')).toBe('98c8fd7585339355c5d56ee4a6a3f1582844bff41508541dab4cba6654e8f5ee');
  });
});
