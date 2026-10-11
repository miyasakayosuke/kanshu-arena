import { describe, expect, it } from 'vitest';
import { attackFor, leaderAppliesTo, leaderFor, monsters, speedFor, start, type Monster } from './engine';
import { compareLeaders, leaderSnapshot, leaderStatKeys } from './leaderComparison';

type Stats = Pick<Monster, 'hp' | 'mp' | 'atk' | 'speed'>;
const zero: Stats = { hp: 0, mp: 0, atk: 0, speed: 0 };
const statsOf = ({ hp, mp, atk, speed }: Stats): Stats => ({ hp, mp, atk, speed });
const totalStats = (values: readonly Stats[]): Stats => values.reduce((sum, value) => ({
  hp: sum.hp + value.hp,
  mp: sum.mp + value.mp,
  atk: sum.atk + value.atk,
  speed: sum.speed + value.speed,
}), { ...zero });
const difference = (before: Stats, after: Stats): Stats => ({
  hp: after.hp - before.hp,
  mp: after.mp - before.mp,
  atk: after.atk - before.atk,
  speed: after.speed - before.speed,
});

// The shipping battle initializer is the oracle. Do not duplicate its rounding or boosts.
function battleSnapshot(team: readonly number[], seed = 42) {
  const trait = team.length ? leaderFor(team[0]) : null;
  const allies = start([...team], [], seed, { leaders: true }).allies;
  const members = allies.map(({ monster }, slot) => ({
    id: monster.id,
    slot,
    receivesLeader: trait ? leaderAppliesTo(trait, monsters[monster.id]) : false,
    stats: statsOf(monster),
  }));
  return {
    leaderId: team[0] ?? null,
    members,
    totals: totalStats(members.map(member => member.stats)),
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const byIdentity = (snapshot: ReturnType<typeof leaderSnapshot>) => snapshot.members
  .map(({ id, receivesLeader, stats }) => ({ id, receivesLeader, stats }))
  .sort((left, right) => left.id - right.id);

const comparisonMember = (comparison: ReturnType<typeof compareLeaders>, id: number) => {
  const member = comparison.members.find(candidate => candidate.id === id);
  expect(member, `comparison member ${id}`).toBeDefined();
  return member!;
};

describe('leaderSnapshot', () => {
  it('exposes all four persistent leader-stat keys in display order', () => {
    expect(leaderStatKeys).toEqual(['hp', 'mp', 'atk', 'speed']);
  });

  it('keeps the selected leader and zero-based slots in team order', () => {
    const team = [29, 8, 30, 7, 2];
    const snapshot = leaderSnapshot(team);
    expect(snapshot.leaderId).toBe(29);
    expect(snapshot.members.map(({ id, slot }) => [id, slot])).toEqual([
      [29, 0], [8, 1], [30, 2], [7, 3], [2, 4],
    ]);
    expect(snapshot).toEqual(battleSnapshot(team));
  });

  it('applies an unrestricted leader across unrelated families, including extraordinary', () => {
    const team = [1, 24, 19, 32, 36];
    const snapshot = leaderSnapshot(team);
    expect(new Set(team.map(id => monsters[id].family)).size).toBe(5);
    expect(snapshot.members.every(member => member.receivesLeader)).toBe(true);
    for (const member of snapshot.members) {
      expect(member.stats.hp).toBeGreaterThan(monsters[member.id].hp);
      expect(member.stats.mp).toBe(monsters[member.id].mp);
      expect(member.stats.atk).toBe(monsters[member.id].atk);
      expect(member.stats.speed).toBe(monsters[member.id].speed);
    }
    expect(snapshot).toEqual(battleSnapshot(team));
  });

  it.each([
    { stat: 'hp', team: [14, 3, 6, 7, 2], recipients: [14, 3, 6] },
    { stat: 'mp', team: [24, 25, 26, 29, 36], recipients: [24, 25, 26] },
    { stat: 'atk', team: [31, 29, 30, 7, 2], recipients: [31, 29, 30] },
    { stat: 'speed', team: [30, 29, 8, 7, 2], recipients: [30, 29, 8] },
  ] as const)('covers family-only $stat without changing nonrecipients', ({ stat, team, recipients }) => {
    const snapshot = leaderSnapshot(team);
    expect(snapshot.members.filter(member => member.receivesLeader).map(member => member.id)).toEqual(recipients);
    for (const member of snapshot.members) {
      const source = statsOf(monsters[member.id]);
      if (member.receivesLeader) {
        expect(member.stats[stat]).toBeGreaterThan(source[stat]);
        for (const key of leaderStatKeys.filter(key => key !== stat)) {
          expect(member.stats[key]).toBe(source[key]);
        }
      } else {
        expect(member.stats).toEqual(source);
      }
    }
    expect(snapshot).toEqual(battleSnapshot(team));
  });

  it('includes both Fenrir leader stats but excludes the separate opening rally', () => {
    const team = [12, 2, 0, 3, 8];
    const snapshot = leaderSnapshot(team);
    const state = start(team, [], 42, { leaders: true });
    expect(snapshot.members.filter(member => member.receivesLeader).map(member => member.id)).toEqual([12, 2, 0]);
    expect(snapshot.members[0].stats).toEqual({ hp: 150, mp: 60, atk: 58, speed: 104 });
    expect(snapshot.members[1].stats).toEqual({ hp: 170, mp: 72, atk: 32, speed: 64 });
    expect(state.allies[0].rally).toBe(2);
    expect(attackFor(state.allies[0])).toBeGreaterThan(snapshot.members[0].stats.atk);
    expect(speedFor(state.allies[0], 2)).toBeGreaterThan(snapshot.members[0].stats.speed);
    expect(snapshot).toEqual(battleSnapshot(team));
    expect(snapshot.members.map(member => member.stats)).toEqual(
      start(team, [], 42, { leaders: true, familySupport: false }).allies.map(unit => statsOf(unit.monster)),
    );
  });

  it('includes both Mammon leader stats and no numeric bonus from opening resource pressure', () => {
    const team = [29, 8, 30, 7, 2];
    const snapshot = leaderSnapshot(team);
    expect(snapshot.members[0].stats).toEqual({ hp: 231, mp: 64, atk: 35, speed: 61 });
    expect(snapshot.members[1].stats).toEqual({ hp: 206, mp: 52, atk: 52, speed: 44 });
    expect(snapshot.members[2].stats).toEqual({ hp: 152, mp: 44, atk: 31, speed: 86 });
    expect(snapshot.members[3].stats).toEqual(statsOf(monsters[7]));
    expect(snapshot.members[4].stats).toEqual(statsOf(monsters[2]));
    expect(start(team, [], 42, { leaders: true }).allies[0].mpDamageBonus).toBe(4);
    expect(snapshot.members.map(member => member.stats)).toEqual(
      start(team, [], 42, { leaders: true, familySupport: false }).allies.map(unit => statsOf(unit.monster)),
    );
    expect(snapshot.totals).toEqual({ hp: 949, mp: 304, atk: 182, speed: 309 });
  });

  it.each(monsters.map(({ id, name }) => ({ id, name })))('matches the actual start for leader $id ($name), every teammate, and multiple seeds', ({ id }) => {
    const others = monsters.filter(monster => monster.id !== id).map(monster => monster.id);
    // Valid five-slot or incomplete parties cover every possible recipient and nonrecipient.
    const teams = [
      [id],
      ...Array.from({ length: Math.ceil(others.length / 4) }, (_, index) => [id, ...others.slice(index * 4, index * 4 + 4)]),
    ];
    for (const team of teams) {
      const snapshot = leaderSnapshot(team);
      for (const seed of [0, 42, 731, 0xffffffff]) {
        expect(snapshot, `leader ${id}, team ${team.join(',')}, seed ${seed}`).toEqual(battleSnapshot(team, seed));
      }
    }
  });

  it.each([[], [29], [29, 8], [29, 8, 30], [29, 8, 30, 7]])('handles empty and incomplete team %j', (...team) => {
    expect(leaderSnapshot(team)).toEqual(battleSnapshot(team));
  });

  it('uses null and zero totals for an empty team', () => {
    expect(leaderSnapshot([])).toEqual({ leaderId: null, members: [], totals: zero });
  });
});

describe('compareLeaders', () => {
  it('reports the exact Mammon to Kobold move-to-front change by monster identity', () => {
    const before = [29, 8, 30, 7, 2];
    const after = [30, 29, 8, 7, 2];
    const comparison = compareLeaders(before, after);
    expect(comparison.before).toEqual(battleSnapshot(before));
    expect(comparison.after).toEqual(battleSnapshot(after));
    expect(comparison.after.members.map(member => member.id)).toEqual(after);
    expect(comparison.totalDelta).toEqual({ hp: -54, mp: 0, atk: 0, speed: 6 });
    expect(comparison.after.totals.hp).toBe(895);
    expect(comparison.changedCount).toBe(3);
    expect(comparison.gainedRecipientIds).toEqual([]);
    expect(comparison.lostRecipientIds).toEqual([]);
    expect(comparison.members.every(member => member.kind === 'retained')).toBe(true);
    expect(comparisonMember(comparison, 29)).toMatchObject({
      id: 29, kind: 'retained',
      before: { id: 29, slot: 0, stats: { hp: 231, speed: 61 } },
      after: { id: 29, slot: 1, stats: { hp: 210, speed: 63 } },
      delta: { hp: -21, mp: 0, atk: 0, speed: 2 },
    });
    expect(comparisonMember(comparison, 8).delta).toEqual({ hp: -19, mp: 0, atk: 0, speed: 1 });
    expect(comparisonMember(comparison, 30).delta).toEqual({ hp: -14, mp: 0, atk: 0, speed: 3 });
    for (const [id, speed] of [[7, 61], [2, 57]]) {
      expect(comparisonMember(comparison, id)).toMatchObject({
        before: { id, receivesLeader: false, stats: { speed } },
        after: { id, receivesLeader: false, stats: { speed } },
        delta: zero,
      });
    }
  });

  it('distinguishes move-to-front order from the old swap while preserving identical per-monster stats', () => {
    const moveToFront = [30, 29, 8, 7, 2];
    const oldSwap = [30, 8, 29, 7, 2];
    const moveSnapshot = leaderSnapshot(moveToFront);
    const swapSnapshot = leaderSnapshot(oldSwap);
    expect(moveSnapshot.members.map(member => member.id)).toEqual(moveToFront);
    expect(swapSnapshot.members.map(member => member.id)).toEqual(oldSwap);
    expect(moveSnapshot.members).not.toEqual(swapSnapshot.members);
    expect(byIdentity(moveSnapshot)).toEqual(byIdentity(swapSnapshot));
    expect(moveSnapshot.totals).toEqual(swapSnapshot.totals);
    const comparison = compareLeaders(moveToFront, oldSwap);
    expect(comparison.changedCount).toBe(0);
    expect(comparison.totalDelta).toEqual(zero);
    expect(comparison.members.every(member => JSON.stringify(member.delta) === JSON.stringify(zero))).toBe(true);
  });

  it('does not count unchanged retained members or identical leaders as changes', () => {
    const team = [29, 8, 30, 7, 2];
    const comparison = compareLeaders(team, team);
    expect(comparison.before).toEqual(comparison.after);
    expect(comparison.changedCount).toBe(0);
    expect(comparison.totalDelta).toEqual(zero);
    expect(comparison.gainedRecipientIds).toEqual([]);
    expect(comparison.lostRecipientIds).toEqual([]);
    for (const member of comparison.members) {
      expect(member.kind).toBe('retained');
      expect(member.before?.id).toBe(member.id);
      expect(member.after?.id).toBe(member.id);
      expect(member.delta).toEqual(zero);
    }
  });

  it('reports recipient loss and gain independently of whether existing recipients change stats', () => {
    const unrestricted = [1, 29, 30, 7, 2];
    const demonOnly = [29, 1, 30, 7, 2];
    const narrow = compareLeaders(unrestricted, demonOnly);
    expect(new Set(narrow.lostRecipientIds)).toEqual(new Set([7, 2]));
    expect(narrow.gainedRecipientIds).toEqual([]);
    expect(narrow.changedCount).toBe(5);
    const widen = compareLeaders(demonOnly, unrestricted);
    expect(new Set(widen.gainedRecipientIds)).toEqual(new Set([7, 2]));
    expect(widen.lostRecipientIds).toEqual([]);
    expect(widen.totalDelta).toEqual(difference(widen.before.totals, widen.after.totals));
  });

  it('tracks both gain and loss when the selected family changes', () => {
    const comparison = compareLeaders([29, 30, 7, 2, 12], [12, 29, 30, 7, 2]);
    expect(new Set(comparison.gainedRecipientIds)).toEqual(new Set([12, 7, 2]));
    expect(new Set(comparison.lostRecipientIds)).toEqual(new Set([29, 30]));
    expect(comparison.changedCount).toBe(5);
  });

  it('never subtracts a removed monster from an unrelated addition in the same slot', () => {
    const before = [29, 8, 30, 7, 2];
    const after = [29, 1, 30, 7, 2];
    const comparison = compareLeaders(before, after);
    expect(comparison.members).toHaveLength(6);
    expect(new Set(comparison.members.map(member => member.id))).toEqual(new Set([29, 8, 1, 30, 7, 2]));
    expect(comparisonMember(comparison, 8)).toEqual({
      id: 8, kind: 'removed', before: battleSnapshot(before).members[1], after: null, delta: null,
    });
    expect(comparisonMember(comparison, 1)).toEqual({
      id: 1, kind: 'added', before: null, after: battleSnapshot(after).members[1], delta: null,
    });
    expect(comparison.changedCount).toBe(0);
    expect(comparison.gainedRecipientIds).toEqual([]);
    expect(comparison.lostRecipientIds).toEqual([]);
    expect(comparison.totalDelta).toEqual({ hp: 69, mp: -8, atk: 1, speed: -20 });
    for (const member of comparison.members.filter(member => member.kind === 'retained')) {
      expect(member.before?.id).toBe(member.id);
      expect(member.after?.id).toBe(member.id);
      expect(member.delta).toEqual(zero);
    }
  });

  it('handles leader removal while comparing shifted retained members with their own prior stats', () => {
    const before = [29, 8, 30, 7, 2];
    const after = [8, 30, 7, 2];
    const comparison = compareLeaders(before, after);
    expect(comparisonMember(comparison, 29).kind).toBe('removed');
    expect(comparisonMember(comparison, 29).delta).toBeNull();
    expect(comparison.changedCount).toBe(4);
    expect(new Set(comparison.gainedRecipientIds)).toEqual(new Set([7, 2]));
    expect(comparison.lostRecipientIds).toEqual([]);
    for (const member of comparison.members.filter(member => member.kind === 'retained')) {
      expect(member.before?.id).toBe(member.after?.id);
      expect(member.delta).toEqual(difference(member.before!.stats, member.after!.stats));
    }
    expect(comparison.totalDelta).toEqual(difference(battleSnapshot(before).totals, battleSnapshot(after).totals));
  });

  it('handles wholly added or removed teams without inventing retained stat or recipient changes', () => {
    for (const [before, after, kind] of [
      [[], [24, 25], 'added'],
      [[24, 25], [], 'removed'],
    ] as const) {
      const comparison = compareLeaders(before, after);
      expect(comparison.before).toEqual(battleSnapshot(before));
      expect(comparison.after).toEqual(battleSnapshot(after));
      expect(comparison.members).toHaveLength(2);
      expect(comparison.changedCount).toBe(0);
      expect(comparison.gainedRecipientIds).toEqual([]);
      expect(comparison.lostRecipientIds).toEqual([]);
      for (const member of comparison.members) {
        expect(member.kind).toBe(kind);
        expect(member.delta).toBeNull();
        expect(kind === 'added' ? member.before : member.after).toBeNull();
      }
      expect(comparison.totalDelta).toEqual(difference(comparison.before.totals, comparison.after.totals));
    }
  });

  it('handles two empty teams', () => {
    expect(compareLeaders([], [])).toEqual({
      before: { leaderId: null, members: [], totals: zero },
      after: { leaderId: null, members: [], totals: zero },
      members: [], totalDelta: zero, changedCount: 0, gainedRecipientIds: [], lostRecipientIds: [],
    });
  });

  it.each(monsters.map(({ id, name }) => ({ id, name })))('keeps every delta identity-correct when leader $id ($name) is moved to the front', ({ id }) => {
    const before = [...new Set([29, 8, 30, 7, id])];
    const after = [id, ...before.filter(member => member !== id)];
    const comparison = compareLeaders(before, after);
    expect(comparison.before).toEqual(battleSnapshot(before));
    expect(comparison.after).toEqual(battleSnapshot(after));
    expect(comparison.members).toHaveLength(before.length);
    expect(comparison.totalDelta).toEqual(difference(comparison.before.totals, comparison.after.totals));
    let changedCount = 0;
    for (const member of comparison.members) {
      expect(member.kind).toBe('retained');
      expect(member.before?.id).toBe(member.id);
      expect(member.after?.id).toBe(member.id);
      const delta = difference(member.before!.stats, member.after!.stats);
      expect(member.delta).toEqual(delta);
      if (leaderStatKeys.some(key => delta[key] !== 0)) changedCount += 1;
    }
    expect(comparison.changedCount).toBe(changedCount);
    expect(new Set(comparison.gainedRecipientIds)).toEqual(new Set(comparison.members
      .filter(member => !member.before!.receivesLeader && member.after!.receivesLeader).map(member => member.id)));
    expect(new Set(comparison.lostRecipientIds)).toEqual(new Set(comparison.members
      .filter(member => member.before!.receivesLeader && !member.after!.receivesLeader).map(member => member.id)));
  });
});

describe('leader preview isolation', () => {
  it('accepts frozen inputs and roster data without reordering or accumulating boosts', () => {
    const rosterBefore = structuredClone(monsters);
    const before = deepFreeze([29, 8, 30, 7, 2] as const);
    const after = deepFreeze([30, 29, 8, 7, 2] as const);
    deepFreeze(monsters);
    const first = compareLeaders(before, after);
    for (let repeat = 0; repeat < 3; repeat += 1) {
      expect(compareLeaders(before, after)).toEqual(first);
      expect(leaderSnapshot(before)).toEqual(first.before);
      expect(leaderSnapshot(after)).toEqual(first.after);
    }
    expect(before).toEqual([29, 8, 30, 7, 2]);
    expect(after).toEqual([30, 29, 8, 7, 2]);
    expect(monsters).toEqual(rosterBefore);
  });

  it('returns independent numeric snapshots that cannot change the roster or later previews', () => {
    const team = [29, 8, 30, 7, 2];
    const rosterBefore = structuredClone(monsters);
    const expected = battleSnapshot(team);
    const snapshot = leaderSnapshot(team);
    (snapshot.members[0].stats as Stats).hp = -999;
    (snapshot.members[3].stats as Stats).speed = -999;
    (snapshot.totals as Stats).mp = -999;
    expect(monsters).toEqual(rosterBefore);
    expect(leaderSnapshot(team)).toEqual(expected);
    expect(compareLeaders(team, team).totalDelta).toEqual(zero);
  });
});
