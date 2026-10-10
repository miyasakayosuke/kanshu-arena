import { describe, expect, it } from 'vitest';
import {
  advanceWithEvents, attackFor, autoOrders, BASIC_ATTACK, battleSkill, canUseSkill, cost,
  DEFEND, leaderFor, MAX_TURNS, monsters, speedFor, start,
  type BattleEvent, type Monster, type Skill, type State, type Unit,
} from './engine';
import { applyBattleEvents, barrageDuration, buildTimeline, CAST_IMPACT_MS, MULTIHIT_INTERVAL_MS } from './playback';
import { isValidTeam, loadTeamSlots, opponentTeams, rules, saveTeamSlots } from './strategy';

const guarding: Skill = { name: '試験防御', power: 0, priority: 1, mpCost: 0, kind: 'guard' };
const fenrir = monsters[12];
const beastIds = [0, 2, 7, 11, 12, 13];
const dummy = (key: string, overrides: Partial<Monster> = {}): Unit => {
  const monster: Monster = { id: -1, name: '試験標的', icon: '🎯', cost: 0, hp: 1000, mp: 0, atk: 0, speed: 1, skills: [], ...overrides };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0 };
};
const training = (count = 1, seed = 42, familySupport = true): State => ({
  ...start([12], [], seed, { familySupport }),
  enemies: Array.from({ length: count }, (_, i) => dummy(`e${i}`)),
});
const damageBy = (events: BattleEvent[], actor = 'a0') => events.filter(e => e.kind === 'damage' && e.actor === actor);
const castsBy = (events: BattleEvent[], actor = 'a0') => events.filter(e => e.kind === 'cast' && e.actor === actor);
const resolveBarrage = (state: State, target?: string) => advanceWithEvents(state, [{ key: 'a0', skill: 0, ...(target ? { target } : {}) }]);
const random = (seed: number) => (Math.imul(seed, 1664525) + 1013904223) >>> 0;

// Altered dummies isolate a mechanic. The final section uses unmodified legal 5v5 teams.
describe('Fenrir roster and old-save compatibility', () => {
  it('preserves all original IDs and appends the exact two-special COST4 profile', () => {
    expect(monsters.slice(0, 12).map(m => [m.id, m.name])).toEqual([
      [0, '妖狐'], [1, 'トロル'], [2, 'バステト'], [3, 'ドリュアス'], [4, 'バンシー'], [5, 'ケツァルコアトル'],
      [6, 'ガルーダ'], [7, 'セルキー'], [8, 'イフリート'], [9, '烏天狗'], [10, 'ナーガ'], [11, 'アヌビス'],
    ]);
    expect(fenrir).toMatchObject({ id: 12, hp: 150, mp: 60, atk: 54, speed: 93, cost: 4, family: 'beast' });
    expect(fenrir.skills).toHaveLength(2);
    expect(fenrir.skills[0]).toMatchObject({ kind: 'hit', power: 0, mpCost: 13, priority: 0, randomHits: 5, breaksGuardAfterHit: true });
    expect(fenrir.skills[1]).toMatchObject({ kind: 'hit', power: 55, mpCost: 10, priority: 0 });
    expect(fenrir.skills.some(s => s.all || s.breaksGuard || s.priority > 0)).toBe(false);
    expect(monsters.filter(m => m.family === 'beast').map(m => m.id)).toEqual(beastIds);
    expect(battleSkill(fenrir, BASIC_ATTACK)?.mpCost).toBe(0);
    expect(battleSkill(fenrir, DEFEND)?.mpCost).toBe(0);
  });

  it('round-trips both original IDs and a legal Fenrir team in the existing save key', () => {
    const slots = [{ team: [0, 2, 3, 4, 6], rule: 'light' }, { team: [12, 0, 2, 6, 10], rule: 'light' }, null];
    let saved = '';
    const storage = { getItem: (key: string) => key === 'kanshu-team-slots-v1' ? saved : null, setItem: (key: string, value: string) => { expect(key).toBe('kanshu-team-slots-v1'); saved = value; } };
    expect(saveTeamSlots(storage, slots)).toBe(true);
    expect(loadTeamSlots(storage)).toEqual(slots);
    expect(cost([12, 0, 2, 6, 10])).toBe(15);
    expect(isValidTeam([12, 0, 2, 6, 10], rules.light.budget)).toBe(true);
    expect(isValidTeam([0, 2, 7, 11, 12])).toBe(false); // The original five-beast combination still costs 19.
  });
});

describe('persistent family leadership and the separate opening rally', () => {
  it('applies the leader only to each same-side beast on both sides, without changing HP/MP or the roster', () => {
    const snapshot = structuredClone(monsters);
    const ids = [12, ...monsters.filter(m => m.id !== 12).map(m => m.id)];
    const state = start(ids, ids, 42, { leaders: true });
    expect(leaderFor(12)).toMatchObject({ stat: 'speed', percent: 12, family: 'beast', secondary: { stat: 'atk', percent: 8 } });
    for (const unit of [...state.allies, ...state.enemies]) {
      const original = monsters[unit.monster.id];
      const isBeast = beastIds.includes(original.id);
      expect(unit.monster.speed).toBe(Math.round(original.speed * (isBeast ? 1.12 : 1)));
      expect(unit.monster.atk).toBe(Math.round(original.atk * (isBeast ? 1.08 : 1)));
      expect([unit.hp, unit.mp, unit.monster.hp, unit.monster.mp]).toEqual([original.hp, original.mp, original.hp, original.mp]);
      expect(unit.rally).toBe(isBeast ? 2 : undefined);
    }
    expect(monsters).toEqual(snapshot);
  });

  it('starts rally when Fenrir is a nonleader and does not leak it to the opposing side', () => {
    const state = start([6, 12, 0, 2, 10], [0, 2, 7, 11, 6], 42, { leaders: true });
    expect(state.allies.map(u => u.rally)).toEqual([undefined, 2, 2, 2, undefined]);
    expect(state.enemies.every(u => u.rally === undefined)).toBe(true);
    // Garuda leadership still owns this team's persistent speed bonus.
    expect(state.allies[1].monster.speed).toBe(Math.round(93 * 1.08));
    expect(state.allies[1].monster.atk).toBe(54);
    expect(attackFor(state.allies[1])).toBe(57);
  });

  it('does not stack duplicate providers or boosts over retries, and can disable only the passive', () => {
    const ids = [12, 12, 0, 2, 6];
    const first = start(ids, [1], 9, { leaders: true });
    const retry = start(ids, [1], 9, { leaders: true });
    expect(first).toEqual(retry);
    expect(first.allies[0].rally).toBe(2);
    expect(attackFor(first.allies[0])).toBe(Math.round(Math.round(54 * 1.08) * 1.05));
    expect(speedFor(first.allies[0], 2)).toBe(Math.round(Math.round(93 * 1.12) * 1.05));
    const noRally = start([12, 0, 6], [1], 9, { leaders: true, familySupport: false });
    expect(noRally.allies.every(u => u.rally === undefined)).toBe(true);
    expect(noRally.allies[0].monster.atk).toBe(58);
    expect(noRally.allies[0].monster.speed).toBe(104);
  });

  it('ticks exactly 2 → 1 → 0, survives provider death, and never refreshes midbattle', () => {
    let state = start([12, 0], [], 42, { leaders: true });
    state.enemies = [dummy('e0')];
    state.allies[0].hp = 0;
    const persistentStats = { ...state.allies[1].monster };
    for (const rally of [1, 0, 0]) {
      const result = advanceWithEvents(state, [{ key: 'a1', skill: DEFEND }]);
      state = result.state;
      expect(state.allies[1].rally).toBe(rally);
      expect(state.allies[1].monster).toEqual(persistentStats);
      expect(result.events.filter(e => e.kind === 'expire' && e.target === 'a1' && e.effect === 'rally')).toHaveLength(state.turn <= 3 ? 1 : 0);
    }
    expect(attackFor(state.allies[1])).toBe(persistentStats.atk);
  });

  it('uses rally attack on turns one and two, speed only on turn two, then neither', () => {
    const unit = start([12], [1]).allies[0];
    expect(attackFor(unit)).toBe(57);
    expect(speedFor(unit, 1)).toBe(93);
    expect(speedFor(unit, 2)).toBe(98);
    expect(attackFor({ ...unit, rally: 1 })).toBe(57);
    expect(attackFor({ ...unit, rally: 0 })).toBe(54);
    expect(speedFor({ ...unit, rally: 0 }, 3)).toBe(93);
  });

  it('changes actual turn-two order but never reshuffles queued actions when rally is dispelled', () => {
    const duel = (turn: number) => {
      const state = training();
      state.turn = turn;
      state.enemies[0] = dummy('e0', { speed: 96 });
      return advanceWithEvents(state, [{ key: 'a0', skill: 1, target: 'e0' }]);
    };
    expect(duel(1).events.filter(e => e.kind === 'cast').map(e => e.actor)).toEqual(['e0', 'a0']);
    expect(duel(2).events.filter(e => e.kind === 'cast').map(e => e.actor)).toEqual(['a0', 'e0']);

    const state = training();
    state.turn = 2;
    state.allies[0].monster = { ...state.allies[0].monster, speed: 120 };
    state.allies.push(dummy('a1', { speed: 96 }));
    state.enemies[0] = { ...dummy('e0', { speed: 93 }), rally: 1 };
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 0 }, { key: 'a1', skill: BASIC_ATTACK, target: 'e0' }]);
    expect(result.events.filter(e => e.kind === 'cast').map(e => e.actor)).toEqual(['a0', 'e0', 'a1']);
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'break', target: 'e0', rally: 0 }));
  });
});

describe('seeded, per-hit living-target barrage', () => {
  it('draws each of five targets independently from the seeded living list and permits repeated targets', () => {
    const initial = training(5, 42, false);
    const result = resolveBarrage(initial);
    let seed = initial.seed;
    for (let i = 0; i < 6; i++) seed = random(seed); // One accepted action tie per unit.
    const expected: string[] = [];
    for (let i = 0; i < 5; i++) { seed = random(seed); expected.push(`e${Math.floor(seed / 0x100000000 * 5)}`); seed = random(seed); }
    const cast = castsBy(result.events)[0];
    expect(cast).toMatchObject({ scope: 'random', hits: 5, hitTargets: expected });
    expect(cast).not.toHaveProperty('target');
    expect(cast.targets).toEqual([...new Set(expected)]);
    expect(damageBy(result.events).map(e => [e.hitIndex, e.target])).toEqual(expected.map((target, i) => [i, target]));
    expect(new Set(expected).size).toBeLessThan(5);
    for (let i = 0; i < 5; i++) seed = random(seed); // The five later enemy basic hits.
    expect(result.state.seed).toBe(seed);
    expect(resolveBarrage(initial)).toEqual(result);
    expect(resolveBarrage({ ...initial, seed: 2026 }).events).not.toEqual(result.events);
  });

  it('cannot be aimed by choosing one of the living enemies', () => {
    const initial = training(5);
    expect(resolveBarrage(initial, 'e0').events).toEqual(resolveBarrage(initial, 'e4').events);
    expect(resolveBarrage(initial).events).toEqual(resolveBarrage(initial, 'e4').events);
  });

  it('rejects malformed target fields consistently without spending MP', () => {
    for (const target of ['a0', 'unknown-target']) {
      const result = resolveBarrage(training(5), target);
      expect(castsBy(result.events)).toHaveLength(0);
      expect(result.state.allies[0].mp).toBe(60);
      expect(result.state.history?.at(-1)?.orders[0]).toMatchObject({ accepted: false, rejection: 'invalid-target' });
    }
  });

  it('skips previously dead units and redraws after every newly defeated target', () => {
    const initial = training(6);
    initial.enemies.forEach((u, i) => { u.hp = i === 0 ? 0 : 1; });
    const result = resolveBarrage(initial);
    const hits = damageBy(result.events);
    expect(hits).toHaveLength(5);
    expect(hits.map(e => e.target).sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(hits.every(e => e.amount === 1 && e.hp === 0)).toBe(true);
    expect(result.events.filter(e => e.kind === 'defeat').map(e => e.hitIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(castsBy(result.events)[0].hitTargets).toEqual(hits.map(e => e.target));
    expect(result.state.winner).toBe('win');
  });

  it('ends the sequence when enemies run out and keeps random scope with a single survivor', () => {
    const initial = training(1);
    initial.enemies[0].hp = 1;
    const result = resolveBarrage(initial);
    expect(damageBy(result.events)).toHaveLength(1);
    expect(castsBy(result.events)[0]).toMatchObject({ scope: 'random', hits: 5, hitTargets: ['e0'], targets: ['e0'] });
    expect(result.events.filter(e => e.kind === 'resource' && e.actor === 'a0')).toHaveLength(1);
    expect(result.state.allies[0].mp).toBe(47);
  });

  it('deals guarded first-hit damage before stripping guard and rally, preserving poison and leadership', () => {
    const initial = training();
    initial.enemies[0] = { ...dummy('e0', { skills: [guarding], atk: 58, speed: 104 }), rally: 2, poison: 3 };
    const result = resolveBarrage(initial);
    const firstDamage = result.events.findIndex(e => e.kind === 'damage' && e.actor === 'a0');
    const firstBreak = result.events.findIndex(e => e.kind === 'break' && e.actor === 'a0');
    expect(firstBreak).toBe(firstDamage + 1);
    expect(result.events[firstBreak]).toMatchObject({ target: 'e0', hitIndex: 0, guard: false, rally: 0 });
    const amounts = damageBy(result.events).map(e => e.amount!);
    expect(amounts[0]).toBeLessThan(Math.min(...amounts.slice(1)));
    expect(amounts[0]).toBeGreaterThanOrEqual(9);
    expect(amounts[0]).toBeLessThanOrEqual(11);
    expect(amounts.slice(1).every(n => n >= 19 && n <= 23)).toBe(true);
    expect(result.events.filter(e => e.kind === 'break' && e.actor === 'a0')).toHaveLength(1);
    expect(result.state.enemies[0].poison).toBe(2); // Only the normal end-turn poison tick changed it.
    expect(result.state.enemies[0].monster).toBe(initial.enemies[0].monster);
    expect(result.state.enemies[0].monster.atk).toBe(58);
    expect(result.state.enemies[0].monster.speed).toBe(104);
  });

  it.each([1, 2])('removes offensive rally before the target’s later attack on turn %s', turn => {
    const state = training();
    state.turn = turn;
    state.enemies[0] = { ...dummy('e0', { atk: 100 }), rally: turn === 1 ? 2 : 1 };
    const withoutDispel = structuredClone(state);
    withoutDispel.allies[0].monster.skills = [{ ...fenrir.skills[0]!, breaksGuardAfterHit: false }, fenrir.skills[1]!];
    const broken = resolveBarrage(state);
    const retained = resolveBarrage(withoutDispel);
    expect(damageBy(broken.events, 'e0')[0].amount).toBeLessThan(damageBy(retained.events, 'e0')[0].amount!);
    expect(broken.events.findIndex(e => e.kind === 'break')).toBeLessThan(broken.events.findIndex(e => e.kind === 'damage' && e.actor === 'e0'));
    expect(broken.state.enemies[0].monster.atk).toBe(100);
    expect(state.enemies[0].rally).toBe(turn === 1 ? 2 : 1);
  });

  it.each([8, 11])('keeps existing breaker %s before-hit semantics and leaves rally intact', id => {
    const state = { ...start([id], [], 42), enemies: [{ ...dummy('e0', { skills: [guarding] }), rally: 2 }] };
    const result = advanceWithEvents(state, [{ key: 'a0', skill: 3, target: 'e0' }]);
    expect(result.events.findIndex(e => e.kind === 'break')).toBeLessThan(result.events.findIndex(e => e.kind === 'damage'));
    expect(damageBy(result.events)[0].amount).toBeGreaterThan(65);
    expect(result.state.enemies[0].rally).toBe(1);
  });

  it('permits exactly four barrages from 60 MP, leaves 8 MP, rejects a fifth, and keeps free attacks legal', () => {
    let state = training(5);
    for (let cast = 1; cast <= 4; cast++) {
      const result = resolveBarrage(state);
      expect(castsBy(result.events)).toHaveLength(1);
      expect(damageBy(result.events)).toHaveLength(5);
      expect(result.events.filter(e => e.kind === 'resource' && e.actor === 'a0')).toHaveLength(1);
      state = result.state;
      expect(state.allies[0].mp).toBe(60 - cast * 13);
    }
    expect(canUseSkill(state.allies[0], fenrir.skills[0]!)).toBe(false);
    const fifth = resolveBarrage(state);
    expect(castsBy(fifth.events)).toHaveLength(0);
    expect(fifth.state.allies[0].mp).toBe(8);
    expect(fifth.state.history?.at(-1)?.orders[0]).toMatchObject({ accepted: false, rejection: 'insufficient-mp' });
    expect(autoOrders(state)[0].skill).toBe(BASIC_ATTACK);
    const basic = advanceWithEvents(state, [{ key: 'a0', skill: BASIC_ATTACK, target: 'e3' }]);
    expect(castsBy(basic.events)[0]).toMatchObject({ target: 'e3', scope: 'single' });
    expect(basic.state.allies[0].mp).toBe(8);
    expect(damageBy(basic.events)).toHaveLength(1);
  });
});

describe('sequential playback and authoritative evidence', () => {
  it('lands five hits 180ms apart after 800ms, spends once, and synchronizes HP/MP/rally', () => {
    const initial = training(2);
    initial.enemies.forEach(u => { u.monster = { ...u.monster, skills: [guarding] }; u.rally = 2; });
    const result = resolveBarrage(initial);
    const snapshot = structuredClone(result.events);
    const timeline = buildTimeline(result.events);
    const startCue = timeline.cues.find(c => c.cast?.actor === 'a0' && c.impacts.length === 0)!;
    const impacts = timeline.cues.filter(c => c.cast?.actor === 'a0' && c.impacts.length > 0);
    expect(CAST_IMPACT_MS).toBe(800);
    expect(MULTIHIT_INTERVAL_MS).toBe(180);
    expect(impacts.map(c => c.at - startCue.at)).toEqual([800, 980, 1160, 1340, 1520]);
    expect(impacts.map(c => c.impacts.find(e => e.kind === 'damage')?.hitIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(startCue.updates).toEqual([expect.objectContaining({ kind: 'resource', mp: 47, amount: 13 })]);
    expect(impacts.every(c => !c.updates?.length)).toBe(true);
    expect(barrageDuration(5)).toBe(2220);
    let played = initial;
    for (const cue of timeline.cues) {
      const before = played;
      played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
      if (cue === startCue) {
        expect(played.enemies.map(u => u.hp)).toEqual(before.enemies.map(u => u.hp));
        expect(played.allies[0].mp).toBe(47);
      }
    }
    expect(played.allies).toEqual(result.state.allies);
    expect(played.enemies).toEqual(result.state.enemies);
    expect(result.events).toEqual(snapshot);
    // Replaying is presentation-only and does not append turn history or pay MP again.
    expect(applyBattleEvents(played, result.events).allies).toEqual(played.allies);
    expect(result.state.history).toHaveLength(1);
    expect(result.state.history![0].events).toEqual(result.events);
    expect(result.state.history![0].events.find(e => e.kind === 'cast' && e.actor === 'a0')?.hitTargets).not.toBe(castsBy(result.events)[0].hitTargets);
  });

  it('copies each random target array into history and leaves the initial state untouched', () => {
    const initial = training(5);
    const snapshot = structuredClone(initial);
    const result = resolveBarrage(initial);
    const cast = castsBy(result.events)[0];
    const record = result.state.history![0].events.find(e => e.kind === 'cast' && e.actor === 'a0')!;
    const recorded = structuredClone(record);
    cast.hitTargets![0] = 'corrupted-presentation-target';
    cast.targets![0] = 'corrupted-presentation-target';
    expect(record).toEqual(recorded);
    expect(initial).toEqual(snapshot);
    expect(resolveBarrage(initial).state.history![0].events.find(e => e.kind === 'cast' && e.actor === 'a0')).toEqual(recorded);
  });

  it('animates rally expiry after the final action on each of the two supported turns', () => {
    let state = training();
    for (const expected of [1, 0]) {
      const result = advanceWithEvents(state, [{ key: 'a0', skill: DEFEND }]);
      const timeline = buildTimeline(result.events);
      const expiry = timeline.cues.find(c => c.updates?.some(e => e.target === 'a0' && e.effect === 'rally'))!;
      expect(expiry.cast).toBeNull();
      expect(expiry.updates).toContainEqual(expect.objectContaining({ kind: 'expire', effect: 'rally', rally: expected, phase: 'turn-end' }));
      expect(expiry.at).toBeGreaterThan(Math.max(...timeline.cues.filter(c => c.impacts.length).map(c => c.at)));
      const replayed = timeline.cues.reduce((s, c) => applyBattleEvents(s, [...(c.updates ?? []), ...c.impacts]), state);
      expect(replayed.allies).toEqual(result.state.allies);
      state = result.state;
    }
  });
});

describe('damage profile, durability, and actual counterplay', () => {
  it('trades weak individual random hits for total damage, while the bite can focus a target', () => {
    const state = training(5);
    const barrage = resolveBarrage(state);
    const bite = advanceWithEvents(state, [{ key: 'a0', skill: 1, target: 'e4' }]);
    const basic = advanceWithEvents(state, [{ key: 'a0', skill: BASIC_ATTACK, target: 'e4' }]);
    const total = (r: { events: BattleEvent[] }) => damageBy(r.events).reduce((sum, e) => sum + e.amount!, 0);
    expect(damageBy(barrage.events).every(e => e.amount! < damageBy(basic.events)[0].amount!)).toBe(true);
    expect(total(barrage)).toBeGreaterThan(total(bite));
    expect(total(bite)).toBeGreaterThan(total(basic));
    expect(damageBy(bite.events).map(e => e.target)).toEqual(['e4']);
    expect(bite.state.allies[0].mp).toBe(50);
    expect(fenrir.hp).toBeLessThan(monsters[11].hp);
    expect(fenrir.hp).toBeLessThan(monsters[5].hp);
    expect(fenrir.speed).toBeLessThan(monsters[6].speed);
  });

  it('allows preemptive focus fire to kill Fenrir before spending, while a real protector can save its action', () => {
    const scenario = (protect: boolean) => {
      const state = start(protect ? [12, 1] : [12], [0, 0, 0], 42);
      state.enemies = state.enemies.map(u => ({ ...u, monster: { ...u.monster, skills: [u.monster.skills[1]!] } }));
      const orders = [{ key: 'a0', skill: 0 }, ...(protect ? [{ key: 'a1', skill: 3, target: 'a0' }] : [])];
      return advanceWithEvents(state, orders);
    };
    const exposed = scenario(false);
    expect(exposed.state.allies[0].hp).toBe(0);
    expect(exposed.state.allies[0].mp).toBe(60);
    expect(castsBy(exposed.events)).toHaveLength(0);
    const protectedResult = scenario(true);
    expect(protectedResult.state.allies[0].hp).toBeGreaterThan(0);
    expect(castsBy(protectedResult.events)).toHaveLength(1);
    expect(protectedResult.state.allies[1].mp).toBe(monsters[1].mp - 10);
  });
});

describe('legal full-roster 5v5 invariants, not arbitrary win-rate thresholds', () => {
  it('finishes both orientations across seeds with legal orders, nonnegative resources, and matching playback', () => {
    const team = [12, 0, 2, 6, 10];
    expect(isValidTeam(team, rules.light.budget)).toBe(true);
    let barrages = 0;
    for (const enemy of opponentTeams('standard')) for (const seed of [0, 1, 2, 7, 42, 2026, 20261009, 0xffffffff]) for (const reverse of [false, true]) {
      expect(isValidTeam(enemy)).toBe(true);
      let state = start(reverse ? enemy : team, reverse ? team : enemy, seed, { leaders: true });
      while (!state.winner && state.turn <= MAX_TURNS) {
        const result = advanceWithEvents(state, autoOrders(state));
        const played = buildTimeline(result.events).cues.reduce((s, c) => applyBattleEvents(s, [...(c.updates ?? []), ...c.impacts]), state);
        expect(played.allies).toEqual(result.state.allies);
        expect(played.enemies).toEqual(result.state.enemies);
        expect(result.state.history!.at(-1)!.orders.every(o => o.accepted)).toBe(true);
        for (const unit of [...result.state.allies, ...result.state.enemies]) {
          expect(unit.hp).toBeGreaterThanOrEqual(0);
          expect(unit.hp).toBeLessThanOrEqual(unit.monster.hp);
          expect(unit.mp).toBeGreaterThanOrEqual(0);
          expect(unit.mp).toBeLessThanOrEqual(unit.monster.mp);
          if (result.state.turn > 2) expect(unit.rally ?? 0).toBe(0);
        }
        barrages += result.events.filter(e => e.kind === 'cast' && e.scope === 'random').length;
        state = result.state;
      }
      expect(state.winner).not.toBeNull();
      expect(state.turn - 1).toBeLessThanOrEqual(MAX_TURNS);
    }
    expect(barrages).toBeGreaterThan(0);
  });
});
