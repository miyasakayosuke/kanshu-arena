import { leaderAppliesTo, leaderFor, start } from './engine';

export const leaderStatKeys = ['hp', 'mp', 'atk', 'speed'] as const;
export type LeaderStats = Record<typeof leaderStatKeys[number], number>;
export type LeaderMemberSnapshot = {
  id: number;
  slot: number;
  receivesLeader: boolean;
  stats: LeaderStats;
};

const emptyStats = (): LeaderStats => ({ hp: 0, mp: 0, atk: 0, speed: 0 });
const subtract = (after: LeaderStats, before: LeaderStats): LeaderStats => ({
  hp: after.hp - before.hp, mp: after.mp - before.mp,
  atk: after.atk - before.atk, speed: after.speed - before.speed,
});

/** Use the shipping start state, including its rounding, without advancing a battle.
 * Unit.monster holds persistent leader-adjusted stats. Opening auras are separate
 * Unit fields and intentionally do not enter this leader-only comparison.
 */
export function leaderSnapshot(team: readonly number[]) {
  const leaderId = team[0] ?? null;
  const trait = leaderId === null ? null : leaderFor(leaderId);
  const members: LeaderMemberSnapshot[] = start([...team], [], 42, { leaders: true, familySupport: false }).allies.map((unit, slot) => ({
    id: unit.monster.id, slot,
    receivesLeader: trait !== null && leaderAppliesTo(trait, unit.monster),
    stats: { hp: unit.monster.hp, mp: unit.monster.mp, atk: unit.monster.atk, speed: unit.monster.speed },
  }));
  const totals = members.reduce((sum, member) => {
    for (const stat of leaderStatKeys) sum[stat] += member.stats[stat];
    return sum;
  }, emptyStats());
  return { leaderId, members, totals };
}

export type LeaderMemberComparison = {
  id: number;
  before: LeaderMemberSnapshot | null;
  after: LeaderMemberSnapshot | null;
  kind: 'retained' | 'added' | 'removed';
  delta: LeaderStats | null;
};

export function compareLeaders(beforeTeam: readonly number[], afterTeam: readonly number[]) {
  const before = leaderSnapshot(beforeTeam);
  const after = leaderSnapshot(afterTeam);
  const beforeById = new Map(before.members.map(member => [member.id, member]));
  const afterById = new Map(after.members.map(member => [member.id, member]));
  // Compare identities, never old/new occupants of the same slot. Show the new
  // formation order first and list departed members separately at the end.
  const ids = [...afterTeam, ...beforeTeam.filter(id => !afterById.has(id))];
  const members: LeaderMemberComparison[] = ids.map(id => {
    const previous = beforeById.get(id) ?? null;
    const next = afterById.get(id) ?? null;
    return {
      id, before: previous, after: next,
      kind: previous && next ? 'retained' : next ? 'added' : 'removed',
      delta: previous && next ? subtract(next.stats, previous.stats) : null,
    };
  });
  const retained = members.filter(member => member.kind === 'retained');
  return {
    before, after, members,
    totalDelta: subtract(after.totals, before.totals),
    changedCount: retained.filter(member => leaderStatKeys.some(stat => member.delta![stat] !== 0)).length,
    gainedRecipientIds: retained.filter(member => !member.before!.receivesLeader && member.after!.receivesLeader).map(member => member.id),
    lostRecipientIds: retained.filter(member => member.before!.receivesLeader && !member.after!.receivesLeader).map(member => member.id),
  };
}
