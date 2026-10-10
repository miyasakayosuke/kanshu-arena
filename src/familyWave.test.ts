import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, barrageHits, BASIC_ATTACK, cost, DEFEND, directDamageScale, effectStatus, leaderFor, monsters, start, type BattleEvent, type Monster, type State, type Unit } from './engine';
import { applyBattleEvents, buildTimeline, MULTIHIT_INTERVAL_MS } from './playback';
import { isValidTeam, loadTeamSlots, saveTeamSlots } from './strategy';

const beasts = [12, 0, 2, 11, 13];
const nature = [14, 3, 6, 9, 10];
const dummy = (key: string, overrides: Partial<Monster> = {}): Unit => {
  const monster: Monster = { id: -1, name: '標的', icon: '', cost: 1, hp: 5000, mp: 0, atk: 100, speed: 1, skills: [], ...overrides };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0 };
};
const attacks = (state: State, side: 'allies' | 'enemies') => state[side].map(unit => ({ key: unit.key, skill: BASIC_ATTACK }));
const damageBy = (events: BattleEvent[], actor: string) => events.filter(event => event.kind === 'damage' && event.actor === actor);

describe('two legal, contrasting family teams', () => {
  it('appends stable IDs and keeps original stats and skills, including Fenrir', () => {
    expect(monsters.map(m => m.id)).toEqual(Array.from({ length: 15 }, (_, i) => i));
    expect(monsters[12]).toMatchObject({ hp: 150, mp: 60, atk: 54, speed: 93, cost: 4 });
    expect(monsters[12].skills[0]).toMatchObject({ randomHits: 5, mpCost: 13 });
    expect(monsters[13]).toMatchObject({ family: 'beast', cost: 2, hp: 130, mp: 44, speed: 87 });
    expect(monsters[14]).toMatchObject({ family: 'nature', cost: 5, hp: 240, mp: 64, speed: 24 });
    expect(monsters.every(m => m.skills.length <= 4)).toBe(true);
    expect(monsters.filter(m => m.family === 'nature').map(m => m.id)).toEqual([3, 6, 9, 10, 14]);
    expect(cost(beasts)).toBe(17); expect(isValidTeam(beasts)).toBe(true); expect(isValidTeam(beasts, 15)).toBe(false);
    expect(cost(nature)).toBe(15); expect(isValidTeam(nature, 15)).toBe(true);
  });
  it('preserves original save keys and round-trips old and new teams', () => {
    let json = '';
    const storage = { getItem: () => json, setItem: (_: string, value: string) => { json = value; } };
    const slots = [{ team: [0, 2, 3, 4, 6], rule: 'light' }, { team: beasts, rule: 'standard' }, { team: nature, rule: 'light' }];
    expect(saveTeamSlots(storage, slots)).toBe(true); expect(loadTeamSlots(storage)).toEqual(slots);
  });
});

describe('nature HP leader and removable opening ward', () => {
  it('applies only to same-side nature, independently of leader selection', () => {
    const mixed = [14, 3, 12, 13, 2];
    const snapshot = structuredClone(monsters);
    const state = start(mixed, [3, 14, 0, 6, 10], 7, { leaders: true });
    expect(leaderFor(14)).toMatchObject({ family: 'nature', stat: 'hp', percent: 15 });
    state.allies.forEach(unit => {
      const source = monsters[unit.monster.id];
      expect(unit.monster.hp).toBe(source.family === 'nature' ? Math.round(source.hp * 1.15) : source.hp);
      expect(unit.ward).toBe(source.family === 'nature' ? 2 : undefined);
      expect(unit.rally).toBe(source.family === 'beast' ? 2 : undefined);
      expect(unit.mp).toBe(source.mp);
    });
    expect(state.enemies.map(u => u.ward)).toEqual([2, 2, undefined, 2, 2]);
    expect(state.enemies[0].hp).toBe(Math.round(monsters[3].hp * 1.12));
    expect(monsters).toEqual(snapshot);
    expect(start(mixed, [], 7, { familySupport: false }).allies.every(u => !u.ward && !u.rally)).toBe(true);
    expect(start([14, 14, 3], []).allies.map(u => u.ward)).toEqual([2, 2, 2]);
  });
  it('ticks once per turn, survives provider loss, never refreshes, and retry starts full', () => {
    let state = start(nature, [], 42);
    state.enemies = [dummy('e0', { atk: 0 })];
    state.allies[0].hp = 0;
    for (const remaining of [1, 0, 0]) {
      const result = advanceWithEvents(state, state.allies.map(u => ({ key: u.key, skill: DEFEND })), { enemyOrders: [{ key: 'e0', skill: DEFEND }] });
      state = result.state;
      expect(state.allies[1].ward).toBe(remaining);
      expect(effectStatus(state.allies[1])).toContain(remaining ? '自然障壁:残1T' : '');
    }
    expect(start(nature, [], 42).allies.every(u => u.ward === 2 && u.hp === u.monster.hp && u.mp === u.monster.mp)).toBe(true);
  });
  it('reduces direct hits by 10%, takes the strongest protection, and does not affect poison', () => {
    const unit = { ...dummy('e0'), ward: 2 };
    expect(directDamageScale(unit)).toBe(.9);
    expect(directDamageScale({ ...unit, guard: true })).toBe(.5);
    const run = (ward: number) => {
      const state = start([], [], 42);
      state.allies = [dummy('a0', { speed: 100 })]; state.enemies = [{ ...dummy('e0'), ward, poison: 1 }];
      return advanceWithEvents(state, attacks(state, 'allies'), { enemyOrders: attacks(state, 'enemies') });
    };
    const shield = run(2), plain = run(0);
    expect(damageBy(shield.events, 'a0')[0].amount).toBe(Math.floor(damageBy(plain.events, 'a0')[0].amount! * .9));
    expect(shield.events.find(e => e.effect === 'poison' && e.kind === 'damage')?.amount).toBe(plain.events.find(e => e.effect === 'poison' && e.kind === 'damage')?.amount);
  });
  it('existing breakers remove ward before damage, Fenrir removes it after first impact', () => {
    const run = (id: number, skill: number) => {
      const state = start([id], [], 4, { familySupport: false });
      state.enemies = [{ ...dummy('e0', { atk: 0 }), guard: false, ward: 2, rally: 2 }];
      return advanceWithEvents(state, [{ key: 'a0', skill }], { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK }] });
    };
    const breaker = run(8, 3);
    const breakIndex = breaker.events.findIndex(e => e.kind === 'break');
    expect(breaker.events[breakIndex]).toMatchObject({ ward: 0, removed: ['ward'] });
    expect(breakIndex).toBeLessThan(breaker.events.findIndex(e => e.kind === 'damage'));
    expect(breaker.state.enemies[0].rally).toBe(1); // Existing breakers do not remove rally.
    const fenrir = run(12, 0);
    const damage = damageBy(fenrir.events, 'a0');
    expect(damage).toHaveLength(5);
    expect(fenrir.events.find(e => e.kind === 'break')).toMatchObject({ ward: 0, rally: 0, hitIndex: 0, removed: ['rally', 'ward'] });
    expect(fenrir.events.findIndex(e => e.kind === 'break')).toBeGreaterThan(fenrir.events.findIndex(e => e.kind === 'damage'));
    expect(damage[0].amount!).toBeLessThan(Math.min(...damage.slice(1).map(e => e.amount!)));
  });
  it('clears the ward on defeat, updates it during playback, and matches skipped state', () => {
    const state = start([8], [], 3);
    state.enemies = [{ ...dummy('e0', { atk: 0 }), hp: 1, ward: 2 }];
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK }] });
    expect(resolved.events.find(e => e.kind === 'defeat')).toMatchObject({ ward: 0 });
    const timeline = buildTimeline(resolved.events);
    const playback = timeline.cues.reduce((value, cue) => applyBattleEvents(value, [...(cue.updates ?? []), ...cue.impacts]), state);
    expect(playback.enemies).toEqual(resolved.state.enemies);
    expect(playback.allies).toEqual(resolved.state.allies);
  });
});

describe('Ratatoskr full-beast signature follow-up', () => {
  it('qualifies from all five initial members, including knocked-out friends; never mixed or incomplete', () => {
    const signature = monsters[13].skills[0]!;
    const full = start(beasts, []).allies;
    expect(barrageHits(signature, full)).toBe(4);
    expect(barrageHits(signature, full.map((u, i) => i === 0 ? { ...u, hp: 0 } : u))).toBe(4);
    expect(barrageHits(signature, start([13, 0, 2, 11, 6], []).allies)).toBe(3);
    expect(barrageHits(signature, full.slice(1))).toBe(3);
    expect(barrageHits(monsters[13].skills[1]!, full)).toBe(1);
    expect(barrageHits(monsters[12].skills[0]!, full)).toBe(5);
  });
  it('emits one cast/MP debit and 4 sequential impacts, stops on all defeated, no recursion', () => {
    const state = start(beasts, [], 91);
    state.enemies = [dummy('e0', { atk: 0 })];
    const orders = state.allies.map(u => ({ key: u.key, skill: u.monster.id === 13 ? 0 : DEFEND }));
    const result = advanceWithEvents(state, orders, { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK }] });
    const cast = result.events.filter(e => e.kind === 'cast' && e.actor === 'a4');
    expect(cast).toHaveLength(1); expect(cast[0]).toMatchObject({ hits: 4, scope: 'random' });
    expect(damageBy(result.events, 'a4')).toHaveLength(4);
    expect(result.events.filter(e => e.kind === 'resource' && e.actor === 'a4')).toHaveLength(1);
    expect(result.state.allies[4].mp).toBe(34);
    const cues = buildTimeline(result.events).cues.filter(c => c.impacts.some(e => e.actor === 'a4' && e.kind === 'damage'));
    expect(cues.slice(1).map((c, i) => c.at - cues[i].at)).toEqual([MULTIHIT_INTERVAL_MS, MULTIHIT_INTERVAL_MS, MULTIHIT_INTERVAL_MS]);
    state.enemies[0].hp = 1;
    expect(damageBy(advanceWithEvents(state, orders, { enemyOrders: [{ key: 'e0', skill: BASIC_ATTACK }] }).events, 'a4')).toHaveLength(1);
  });
  it('does not spend with insufficient MP and deterministic full-team battles terminate legally', () => {
    const state = start(beasts, nature, 99, { leaders: true });
    state.allies[4].mp = 9;
    const failed = advanceWithEvents(state, state.allies.map(u => ({ key: u.key, skill: u.monster.id === 13 ? 0 : DEFEND })), { enemyOrders: state.enemies.map(u => ({ key: u.key, skill: DEFEND })) });
    expect(failed.state.allies[4].mp).toBe(9);
    const simulate = () => { let current = start(beasts, nature, 993, { leaders: true }); while (!current.winner) current = advanceWithEvents(current, autoOrders(current), { enemyOrders: autoOrders(current, 'enemies') }).state; return current; };
    const result = simulate(); expect(result).toEqual(simulate()); expect(result.turn).toBeLessThanOrEqual(21);
    expect([...result.allies, ...result.enemies].every(u => u.mp >= 0 && u.hp >= 0 && (u.ward ?? 0) >= 0)).toBe(true);
  });
});
