import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, cost, DEFEND, effectStatus, leaderFor, MATERIAL_CORE_ID, MATERIAL_REPAIR, MATERIAL_REPAIR_PERCENT, materialRepairEligible, monsters, start, type BattleEvent, type Order, type State } from './engine';
import { battleEventLine, battleFactEvidenceLines, resultFacts } from './battleInsights';
import { isValidTeam, loadTeamSlots, saveTeamSlots } from './strategy';

const materials = [19, 20, 21, 22, 23];
const defendOrders = (state: State, side: 'allies' | 'enemies' = 'allies'): Order[] => state[side].map(unit => ({ key: unit.key, skill: DEFEND }));
const resolve = (state: State) => advanceWithEvents(state, defendOrders(state), { enemyOrders: defendOrders(state, 'enemies') });
const repairs = (events: BattleEvent[]) => events.filter(event => event.kind === 'passive' && event.effect === 'material-repair');
const repairHeals = (events: BattleEvent[]) => events.filter(event => event.kind === 'heal' && event.effect === 'material-repair');
const fixture = () => start(materials, [1], 42);

describe('material roster and opening qualification', () => {
  it('adds five stable material IDs with a legal cost17 pure team and at most four learned skills', () => {
    expect(monsters.slice(19).map(monster => monster.id)).toEqual(materials);
    expect(materials.map(id => monsters[id].family)).toEqual(Array(5).fill('material'));
    expect(cost(materials)).toBe(17); expect(isValidTeam(materials)).toBe(true); expect(isValidTeam(materials, 15)).toBe(false);
    expect(monsters.every(monster => monster.skills.length <= 4)).toBe(true);
    expect(materials.map(id => { const { hp, mp, atk, speed, cost } = monsters[id]; return [hp, mp, atk, speed, cost]; })).toEqual([
      [235, 64, 42, 36, 5], [145, 54, 29, 86, 2], [250, 44, 36, 17, 3], [190, 66, 28, 48, 3], [215, 50, 58, 42, 4],
    ]);
    expect(monsters[19].skills.map(skill => [skill.kind, skill.power, skill.priority, skill.mpCost])).toEqual([['hit', 70, 0, 12], ['hit', 36, -2, 22], ['guard', 0, 1, 0]]);
    expect(monsters[19].skills[1]?.all).toBe(true);
    expect(monsters[20].skills.map(skill => [skill.kind, skill.power, skill.mpCost])).toEqual([['hit', 50, 8], ['cleanse', 30, 10]]);
    expect(monsters[21].skills.map(skill => [skill.kind, skill.power, skill.priority, skill.mpCost])).toEqual([['hit', 70, -1, 16], ['protect', 0, 3, 10], ['guard', 0, 1, 0]]);
    expect(monsters[22].skills.map(skill => [skill.kind, skill.power, skill.mpCost])).toEqual([['heal', 62, 18], ['hit', 45, 12], ['hit', 44, 8]]);
    expect(monsters[22].skills[1]?.breaksGuard).toBe(true);
    expect(monsters[23].skills.map(skill => [skill.power, skill.priority, skill.mpCost])).toEqual([[75, 0, 12], [115, -2, 22]]);
  });
  it('round-trips mixed old/new teams without changing the save schema', () => {
    let json = ''; const storage = { getItem: () => json, setItem: (_: string, value: string) => { json = value; } };
    const slots = [{ team: materials, rule: 'standard' }, { team: [0, 2, 3, 4, 6], rule: 'light' }, null];
    expect(saveTeamSlots(storage, slots)).toBe(true); expect(loadTeamSlots(storage)).toEqual(slots);
  });
  it.each([[19], [19, 20], [19, 0, 2], [20, 21, 22, 23]])('leaves readiness absent for ineligible starting roster %j', (...ids) => {
    const state = start(ids, []);
    expect(materialRepairEligible(state.allies)).toBe(false);
    expect(state.allies.every(unit => !Object.hasOwn(unit, 'repairReady'))).toBe(true);
    expect(state.log.join('\n')).not.toContain('「炉心の修復」');
  });
  it('qualifies at exactly three including a nonleader Talos on both sides; only the core receives readiness', () => {
    const state = start([20, 19, 21, 0, 2], [0, 22, 19, 23, 2]);
    expect(MATERIAL_CORE_ID).toBe(19); expect(MATERIAL_REPAIR_PERCENT).toBe(14);
    expect(state.allies.map(unit => unit.repairReady)).toEqual([undefined, true, undefined, undefined, undefined]);
    expect(state.enemies.map(unit => unit.repairReady)).toEqual([undefined, undefined, true, undefined, undefined]);
    expect(materialRepairEligible(state.allies)).toBe(true);
    expect(state.log.join('\n')).toContain('タロスを含む物質系3体以上');
    expect(effectStatus(state.allies[1])).toContain('修復:待機');
  });
  it('disabling family support leaves readiness absent even on eligible parties', () => {
    const state = start(materials, materials, 42, { familySupport: false });
    expect([...state.allies, ...state.enemies].every(unit => !Object.hasOwn(unit, 'repairReady'))).toBe(true);
    expect(state.log.join('\n')).not.toContain('「炉心の修復」');
    expect(repairs(resolve(state).events)).toHaveLength(0);
  });
  it('limits leaders to material recipients and leaves old units and shared roster untouched', () => {
    const before = structuredClone(monsters);
    const state = start([19, 20, 21, 0, 2], [], 42, { leaders: true });
    expect(leaderFor(19)).toMatchObject({ stat: 'hp', percent: 10, family: 'material' });
    expect(state.allies.map(unit => unit.hp)).toEqual([259, 160, 275, 150, 170]);
    for (const id of [20, 21, 22, 23]) expect(leaderFor(id)).toMatchObject({ percent: 8, family: 'material' });
    expect(monsters).toEqual(before);
  });
});

describe('one finite turn-end repair', () => {
  it('heals floor14% of each recipient’s leader-adjusted maximum, capped by missing HP, only after all actions and poison', () => {
    const state = start(materials, materials, 42, { leaders: true });
    for (const unit of [...state.allies, ...state.enemies]) { unit.hp -= 80; unit.poison = 2; }
    const snapshot = structuredClone(state), rosterBefore = structuredClone(monsters), result = resolve(state);
    expect(repairs(result.events)).toHaveLength(2);
    expect(repairHeals(result.events)).toHaveLength(10);
    const lastPoison = result.events.reduce((last, event, index) => event.effect === 'poison' ? index : last, -1);
    expect(result.events.findIndex(event => event.kind === 'passive')).toBeGreaterThan(lastPoison);
    for (const event of repairHeals(result.events)) {
      const old = [...state.allies, ...state.enemies].find(unit => unit.key === event.target)!;
      expect(event).toMatchObject({ phase: 'turn-end', amount: Math.floor(old.monster.hp * .14), hp: old.hp - Math.floor(old.monster.hp * .06) + Math.floor(old.monster.hp * .14) });
      expect(event.mp).toBeUndefined();
    }
    for (const side of ['allies', 'enemies'] as const) {
      expect(result.state[side][0].repairReady).toBe(false);
      expect(result.state[side].map(unit => unit.mp)).toEqual(state[side].map(unit => unit.mp));
      expect(result.state[side].map(unit => unit.poison)).toEqual(Array(5).fill(1));
    }
    expect(state).toEqual(snapshot); expect(monsters).toEqual(rosterBefore);
  });
  it('uses fixed starting qualification after two material allies die and never revives them', () => {
    const state = start([19, 20, 21, 0, 2], [1]);
    state.allies[0].hp -= 70; state.allies[1].hp = 0; state.allies[2].hp = 0; state.allies[3].hp -= 30;
    expect(materialRepairEligible(state.allies)).toBe(true);
    const result = resolve(state);
    expect(repairs(result.events)[0].targets).toEqual(['a0']);
    expect(repairHeals(result.events)).toHaveLength(1);
    expect(result.state.allies.map(unit => unit.hp)).toEqual([197, 0, 0, 120, 170]);
  });
  it('core HP1 can trigger when alive, and each living recipient is independently clamped', () => {
    const state = fixture(); state.allies[0].hp = 1; state.allies[1].hp -= 1; state.allies[2].hp -= 200;
    const result = resolve(state);
    expect(repairHeals(result.events).map(event => event.amount)).toEqual([32, 1, 35, 0, 0]);
    expect(result.state.allies.map(unit => unit.hp)).toEqual([33, 145, 85, 190, 215]);
    expect(result.state.allies.every(unit => unit.hp <= unit.monster.hp)).toBe(true);
  });
  it('full-HP allies still consume the sole opportunity, with zero effective healing', () => {
    const result = resolve(fixture());
    expect(repairs(result.events)).toHaveLength(1);
    expect(repairHeals(result.events).map(event => event.amount)).toEqual([0, 0, 0, 0, 0]);
    expect(result.state.allies[0].repairReady).toBe(false);
    expect(effectStatus(result.state.allies[0])).toContain('修復:終了');
    result.state.allies[1].hp -= 80;
    const next = resolve(result.state);
    expect(repairs(next.events)).toHaveLength(0); expect(next.state.allies[1].hp).toBe(65);
  });
  it('never repeats on turns2–20, even if an injected readiness remains true', () => {
    for (const turn of [2, 3, 20]) {
      const state = fixture(); state.turn = turn; state.allies[0].hp -= 80;
      expect(repairs(resolve(state).events)).toHaveLength(0);
    }
  });
  it('fresh battle resets readiness and HP/MP without carrying consumption', () => {
    const after = resolve(fixture()).state;
    expect(after.allies[0].repairReady).toBe(false);
    const fresh = fixture(); expect(fresh.allies[0].repairReady).toBe(true);
    expect(fresh.allies.map(unit => [unit.hp, unit.mp])).toEqual(materials.map(id => [monsters[id].hp, monsters[id].mp]));
  });
  it.each([0, 5, 100, 1000])('accepts isolated percent%s with clipping and leaves default unchanged', percent => {
    const state = fixture(); state.allies.forEach(unit => { unit.hp = 1; }); state.allies[0].repairPercent = percent;
    const result = resolve(state);
    expect(repairHeals(result.events).map(event => event.amount)).toEqual(state.allies.map(unit => Math.min(unit.monster.hp - 1, Math.floor(unit.monster.hp * percent / 100))));
    expect(result.state.allies[0].repairReady).toBe(false); expect(MATERIAL_REPAIR.percent).toBe(14);
    expect(start(materials, []).allies[0].repairPercent).toBeUndefined();
  });
  it('never creates a learned cast, command, MP event, RNG draw, or dragon-charge recursion', () => {
    const state = start([19, 20, 21, 15, 5], [1]);
    state.allies[3].dragonCharge = 0;
    const result = resolve(state);
    const control = resolve({ ...state, allies: state.allies.map(unit => unit.monster.id === 19 ? { ...unit, repairReady: false } : unit) });
    expect(result.state.seed).toBe(control.state.seed);
    expect(result.state.history![0].orders).toEqual(control.state.history![0].orders);
    expect(result.events.filter(event => event.kind === 'cast')).toEqual(control.events.filter(event => event.kind === 'cast'));
    expect(result.events.some(event => event.kind === 'resource' || event.kind === 'charge')).toBe(false);
    expect(result.state.allies[3].dragonCharge).toBe(0);
    expect(result.state.history![0].events.filter(event => event.kind === 'passive')).toEqual(repairs(result.events));
  });
  it('resolves before victory adjudication even when actions have already defeated the final enemy', () => {
    const state = fixture(); state.enemies[0].hp = 1; state.allies[0].hp = 100;
    const result = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: unit.key === 'a1' ? 0 : DEFEND })), { enemyOrders: defendOrders(state, 'enemies') });
    expect(result.state.winner).toBe('win'); expect(result.state.allies[0].hp).toBe(132);
    expect(repairs(result.events)).toHaveLength(1);
  });
});

describe('repair survival and dispel counterplay', () => {
  it('all poison ticks precede either repair; a core killed by poison cannot trigger', () => {
    const state = start(materials, materials, 42);
    state.allies[0].hp = 100; state.allies[1].poison = 1;
    state.enemies[0].hp = 1; state.enemies[0].poison = 1;
    const result = resolve(state);
    expect(repairs(result.events).map(event => event.actor)).toEqual(['a0']);
    expect(result.state.enemies[0]).toMatchObject({ hp: 0, repairReady: false, poison: 0 });
    const deathIndex = result.events.findIndex(event => event.kind === 'defeat' && event.target === 'e0');
    expect(result.events.findIndex(event => event.kind === 'passive')).toBeGreaterThan(deathIndex);
    expect(result.events[deathIndex]).toMatchObject({ repairReady: false, effect: 'poison' });
  });
  it('poison-killed recipients remain dead, while survivors retain poison after repair', () => {
    const state = fixture(); state.allies[1].hp = 1; state.allies[1].poison = 3; state.allies[2].hp = 100; state.allies[2].poison = 3;
    const result = resolve(state);
    expect(result.state.allies[1]).toMatchObject({ hp: 0, poison: 0 });
    expect(result.state.allies[2]).toMatchObject({ hp: 120, poison: 2 });
    expect(repairs(result.events)[0].targets).toEqual(['a0', 'a2', 'a3', 'a4']);
    expect(repairHeals(result.events).some(event => event.target === 'a1')).toBe(false);
  });
  it('direct KO clears readiness and does not trigger from later surviving material allies', () => {
    const state = fixture(); state.allies[0].hp = 1;
    const result = advanceWithEvents(state, defendOrders(state), { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK, target: 'a0' }] });
    expect(result.state.allies[0]).toMatchObject({ hp: 0, repairReady: false });
    expect(result.events.find(event => event.kind === 'defeat')).toMatchObject({ target: 'a0', repairReady: false });
    expect(repairs(result.events)).toHaveLength(0);
  });
  it('clears injected already-dead readiness and never revives an all-defeated party', () => {
    const state = fixture(); state.allies.forEach(unit => { unit.hp = 0; });
    const result = resolve(state);
    expect(result.state.winner).toBe('lose'); expect(result.state.allies[0].repairReady).toBe(false);
    expect(repairs(result.events)).toHaveLength(0);
    expect(result.state.allies.every(unit => unit.hp === 0)).toBe(true);
  });
  it.each([[8, 3, false], [11, 3, false], [17, 1, false], [22, 1, false], [12, 0, true]])('monster%s skill%s strips repair at the correct before/after timing', (id, skill, after) => {
    for (const guarding of [false, true]) {
      const state = start([id], [19, 20, 21], 42);
      const core = state.enemies[0]; core.hp = 2000; core.monster = { ...core.monster, hp: 2000 };
      state.enemies[1].hp = 0; state.enemies[2].hp = 0;
      const result = advanceWithEvents(state, [{ key: 'a0', skill, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: guarding ? DEFEND : BASIC_ATTACK, target: 'a0' }] });
      const index = result.events.findIndex(event => event.kind === 'break');
      const damage = result.events.findIndex(event => event.kind === 'damage' && event.actor === 'a0');
      expect(index).toBeGreaterThanOrEqual(0);
      expect(after ? index > damage : index < damage).toBe(true);
      expect(result.events[index]).toMatchObject({ repairReady: false, removed: expect.arrayContaining(['repairReady']) });
      expect(result.state.enemies[0].repairReady).toBe(false);
      expect(repairs(result.events)).toHaveLength(0);
      expect(battleEventLine(result.state, result.events[index])).toContain('修復待機');
    }
  });
  it('a lethal Fenrir hit clears readiness through defeat rather than an after-hit dispel', () => {
    const state = start([12], [19, 20, 21], 42);
    state.enemies[0].hp = 1; state.enemies[1].hp = 0; state.enemies[2].hp = 0;
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
    expect(result.state.enemies[0].repairReady).toBe(false);
    expect(result.events.find(event => event.kind === 'defeat')).toMatchObject({ repairReady: false });
    expect(result.events.some(event => event.kind === 'break')).toBe(false);
    expect(repairs(result.events)).toHaveLength(0);
  });
  it('before-hit dispel removes guard before damage; Fenrir’s first hit still faces the guard', () => {
    for (const [id, skill, after] of [[8, 3, false], [12, 0, true]] as const) {
      const run = (guarding: boolean) => {
        const state = start([id], [19, 20, 21], 42); state.enemies[1].hp = 0; state.enemies[2].hp = 0;
        return advanceWithEvents(state, [{ key: 'a0', skill }], { enemyOrders: [{ key: 'e0', skill: guarding ? DEFEND : BASIC_ATTACK }] }).events.find(event => event.kind === 'damage' && event.actor === 'a0')!.amount!;
      };
      if (after) expect(run(true)).toBeLessThan(run(false));
      else expect(run(true)).toBe(run(false));
    }
  });
});

describe('repair evidence and deterministic regressions', () => {
  it('labels passive evidence and effective repair without claiming a learned spell or revival', () => {
    const state = fixture(); state.allies[1].hp = 100;
    const result = resolve(state), fact = resultFacts(result.state).find(item => item.kind === 'repair')!;
    expect(fact.text).toContain('味方 20／敵 0 HP回復');
    expect(fact.evidence.every(item => item.orderIndex === undefined)).toBe(true);
    const lines = battleFactEvidenceLines(result.state, fact).join('\n');
    expect(lines).toContain('ターン末に発動'); expect(lines).toContain('MP消費なし'); expect(lines).toContain('一度きりの修復');
    expect(lines).not.toContain('指示');
  });
  it('same-policy mirrors are deterministic, legal, finite, and preserve readiness markers', () => {
    const simulate = (seed: number) => { let state = start(materials, materials, seed, { leaders: true }); while (!state.winner) state = advanceWithEvents(state, autoOrders(state), { enemyOrders: autoOrders(state, 'enemies') }).state; return state; };
    for (const seed of [0, 42, 0xffffffff]) {
      const result = simulate(seed); expect(result).toEqual(simulate(seed)); expect(result.turn).toBeLessThanOrEqual(21);
      expect(result.history!.every(turn => turn.orders.every(order => order.accepted))).toBe(true);
      expect(result.history!.flatMap(turn => repairs(turn.events)).length).toBeLessThanOrEqual(2);
      expect([...result.allies, ...result.enemies].every(unit => unit.hp >= 0 && unit.hp <= unit.monster.hp && unit.mp >= 0)).toBe(true);
    }
  });
  it('preserves frozen v0.12 dragon events, orders, RNG, winners and units across24 complete battles', () => {
    // Captured before material edits from the frozen d8e717a399b84b749c21aba86380cbdd57cb53a6 tree.
    const dragon = [15, 5, 16, 17, 18], opponents = [dragon, [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [1, 5, 8, 10, 6]], results = [];
    for (const enemy of opponents) for (const seed of [0, 42, 4294967295]) for (const samePolicy of [false, true]) {
      let state = start(dragon, enemy, seed, { leaders: true });
      while (!state.winner) state = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {}).state;
      results.push({ enemy, seed, samePolicy, events: state.history!.map(turn => turn.events), orders: state.history!.map(turn => turn.orders), seedAfter: state.seed, winner: state.winner, allies: state.allies, enemies: state.enemies });
    }
    expect(createHash('sha256').update(JSON.stringify(results)).digest('hex')).toBe('9eccb3a1a77101c1108a48d4fc8c3c81940c04ec3c5c83bef93b44cebbee5fba');
  });
});
