import { describe, expect, it } from 'vitest';
import { advanceWithEvents, attackFor, autoOrders, DEFEND, leaderFor, MAX_TURNS, monsters, speedFor, start } from './engine';
import type { BattleEvent, Skill, State } from './engine';
// The command-line lab is intentionally JavaScript, loaded directly by Node and Vitest.
// @ts-ignore No declaration file is needed for this test-only CLI module.
import { buildSchedule, createBattle, makeDefaultConfig, replayMatch, runMatch, runSuite, validateConfig } from '../scripts/balance-lab/core.mjs';

const teamA = [12, 0, 2, 6, 10];
const teamB = [1, 2, 7, 10, 6];

function config() {
  return {
    schemaVersion: 1,
    suiteId: 'contract-test',
    seeds: [0, 42],
    costLimit: 17,
    teams: [
      { id: 'beasts', role: 'beast synergy', ids: [...teamA] },
      { id: 'guards', role: 'guard and healing', ids: [...teamB] },
    ],
    scenarios: [{ id: 'beasts-vs-guards', a: 'beasts', b: 'guards', complaintIds: [], keyUnitId: 12 }],
    candidate: { id: 'identity', label: 'Unchanged rules', overrides: {} },
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

const skill: Skill = { name: 'Contract hit', power: 30, priority: 0, mpCost: 10, kind: 'hit' };

function withOverrides(overrides: object) {
  return { ...config(), candidate: { ...config().candidate, overrides } };
}

function expectResources(state: State) {
  for (const unit of [...state.allies, ...state.enemies]) {
    expect(Number.isFinite(unit.hp)).toBe(true);
    expect(Number.isFinite(unit.mp)).toBe(true);
    expect(unit.hp).toBeGreaterThanOrEqual(0);
    expect(unit.hp).toBeLessThanOrEqual(unit.monster.hp);
    expect(unit.mp).toBeGreaterThanOrEqual(0);
    expect(unit.mp).toBeLessThanOrEqual(unit.monster.mp);
  }
}

describe('balance lab configuration boundary', () => {
  it('accepts the documented default and a small explicit five-member suite', () => {
    expect(() => validateConfig(makeDefaultConfig())).not.toThrow();
    expect(() => validateConfig(config())).not.toThrow();
    expect(() => validateConfig({ ...config(), costLimit: 15 })).not.toThrow();
    expect(() => validateConfig({ ...config(), seeds: [0, 0xffffffff] })).not.toThrow();
  });

  it.each([undefined, null])('rejects missing or null candidate overrides with a useful field error: %#', overrides => {
    expect(() => validateConfig({ ...config(), candidate: { ...config().candidate, overrides } })).toThrow(/overrides/);
  });

  it('validates without changing or annotating the caller configuration', () => {
    const input = config();
    const before = structuredClone(input);
    expect(() => validateConfig(freeze(input))).not.toThrow();
    expect(input).toEqual(before);
  });

  it.each([
    null,
    [],
    { ...config(), schemaVersion: 99 },
    { ...config(), suiteId: '' },
    { ...config(), costLimit: 16 },
    { ...config(), typo: true },
    { ...config(), candidate: { ...config().candidate, overides: {} } },
    withOverrides({ monster: {} }),
    withOverrides({ monsters: { 12: { hitPoints: 123 } } }),
    withOverrides({ leaders: { 12: { ...leaderFor(12), percentage: 10 } } }),
    withOverrides({ openingRally: { enabled: true, duration: 2 } }),
  ])('rejects malformed roots and unknown keys: %#', input => {
    expect(() => validateConfig(input)).toThrow();
  });

  it.each([[], [-1], [0x100000000], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY], ['42']].map(seeds => ({ seeds })))(
    'rejects an empty or invalid uint32 seed list: %#', ({ seeds }) => {
      expect(() => validateConfig({ ...config(), seeds })).toThrow();
    },
  );

  it.each([
    [12, 0, 2, 6],
    [12, 0, 2, 6, 6],
    [12, 0, 2, 6, 99],
    [12, 0, 2, 6, 0.5],
    [12, 0, 5, 7, 11],
  ].map(ids => ({ ids })))('rejects invalid length, duplicates, IDs, or over-budget rosters: %#', ({ ids }) => {
    const input = config();
    input.teams[0].ids = ids;
    expect(() => validateConfig(input)).toThrow();
  });

  it('enforces the selected lower budget and unique team/scenario identifiers', () => {
    const expensive = config();
    expensive.costLimit = 15;
    expensive.teams[0].ids = [12, 0, 11, 2, 6]; // cost 17
    expect(() => validateConfig(expensive)).toThrow();
    const duplicateTeam = config();
    duplicateTeam.teams[1].id = duplicateTeam.teams[0].id;
    expect(() => validateConfig(duplicateTeam)).toThrow();
    const duplicateScenario = config();
    duplicateScenario.scenarios.push({ ...duplicateScenario.scenarios[0] });
    expect(() => validateConfig(duplicateScenario)).toThrow();
    const unknownTeam = config();
    unknownTeam.scenarios[0].b = 'missing';
    expect(() => validateConfig(unknownTeam)).toThrow();
  });

  it.each([
    { monsters: { 99: { hp: 150 } } },
    { monsters: { 12: { cost: 10 } } },
    { monsters: { 12: { family: 'unimplemented-family' } } },
    { monsters: { 12: { hp: -1 } } },
    { monsters: { 12: { mp: -1 } } },
    { monsters: { 12: { atk: Number.NaN } } },
    { monsters: { 12: { speed: Number.POSITIVE_INFINITY } } },
    { monsters: { 12: { skills: [skill, skill, skill, skill, skill] } } },
    { monsters: { 12: { skills: [{ ...skill, kind: 'unknown' }] } } },
    { monsters: { 12: { skills: [{ ...skill, name: '通常攻撃' }] } } },
    { monsters: { 12: { skills: [{ ...skill, name: 'ぼうぎょ' }] } } },
    { monsters: { 12: { skills: [{ ...skill, mpCost: -1 }] } } },
    { monsters: { 12: { skills: [{ ...skill, randomHits: 0 }] } } },
    { monsters: { 12: { skills: [{ ...skill, typo: true }] } } },
    { leaders: { 99: leaderFor(12) } },
    { leaders: { 12: { ...leaderFor(12), stat: 'mp' } } },
    { leaders: { 12: { ...leaderFor(12), percent: Number.NaN } } },
    { openingRally: { enabled: 'yes' } },
    { openingRally: { enabled: true, percent: -1 } },
    { openingRally: { enabled: true, turns: 1.5 } },
  ])('rejects invalid candidate stats, skills, leaders, and rally settings: %#', overrides => {
    expect(() => validateConfig(withOverrides(overrides))).toThrow();
  });

  it.each([
    { count: -1, seed: 42 },
    { count: 1.5, seed: 42 },
    { count: 101, seed: 42 },
    { count: 2, seed: -1 },
    { count: 2, seed: '42' },
    { count: 2, seed: 42, typo: true },
  ])('rejects invalid or unknown sampling settings: %#', sampling => {
    expect(() => validateConfig({ ...config(), sampling })).toThrow();
  });

  it('rejects a complaint reference that has no recorded source or hypothesis', () => {
    expect(() => validateConfig({ ...config(), scenarios: [{ ...config().scenarios[0], complaintIds: ['missing'] }] })).toThrow();
  });

  it('accepts an explicitly unverified hypothesis and real support metrics', () => {
    const complaint = {
      id: 'support-hypothesis', status: 'hypothesis', source: null,
      complaint: 'Fixture: support may not have enough opportunities', hypothesis: 'Record actual guard and cleanse effects',
      scenarioIds: [config().scenarios[0].id],
      metrics: ['meanGuardApplications', 'meanEffectiveCleanses', 'meanDispelApplications'].map(name => ({ name, direction: 'observe', rationale: 'Count the actual support events' })),
      limitations: ['Synthetic test hypothesis, not player evidence'],
    };
    expect(() => validateConfig({ ...config(), complaints: [complaint] })).not.toThrow();
    expect(() => validateConfig({ ...config(), complaints: [{ ...complaint, status: 'sourced' }] })).toThrow(/source/);
  });

  it('rejects impossible source dates rather than normalizing them to a different day', () => {
    const complaint = {
      id: 'source-date-test', status: 'sourced',
      source: { url: 'https://example.com/fixture', title: 'Fixture', observedAt: '2026-02-30', scope: 'Synthetic test fixture' },
      complaint: 'Fixture', hypothesis: 'Fixture', scenarioIds: [config().scenarios[0].id],
      metrics: [{ name: 'meanMpSpent', direction: 'observe', rationale: 'Fixture' }],
      limitations: ['Synthetic fixture, not player evidence'],
    };
    expect(() => validateConfig({ ...config(), complaints: [complaint] })).toThrow(/observedAt/);
  });

  it('rejects a candidate whose leader boost rounds a living unit maximum HP to zero', () => {
    const input = withOverrides({
      monsters: { 12: { hp: 1 } },
      leaders: { 12: { name: 'HP floor fixture', description: 'Test-only HP floor', stat: 'hp', percent: -90 } },
    });
    expect(() => validateConfig(input)).toThrow(/HP|hp/);
    expect(() => buildSchedule(input)).toThrow(/HP|hp/);
  });

  it('rejects excessive total work before scheduling, including samples, mirrors, swaps, and both variants', () => {
    const input = { ...config(), seeds: Array.from({ length: 1000 }, (_, i) => i), sampling: { count: 2, seed: 42 } };
    expect(() => validateConfig(input)).toThrow(/20000/);
    expect(() => buildSchedule(input)).toThrow(/20000/);
  });

  it('accepts a complete skill replacement, leader replacement, and rally ablation', () => {
    expect(() => validateConfig(withOverrides({
      monsters: { 12: { hp: 160, mp: 65, atk: 55, speed: 90, skills: [skill] } },
      leaders: { 12: { ...leaderFor(12), percent: 10 } },
      openingRally: { enabled: false },
    }))).not.toThrow();
  });
});

describe('balance lab battle isolation', () => {
  it.each([0, 42, 0xffffffff])('matches production battle setup for unchanged rules at seed %s', seed => {
    expect(createBattle(teamA, teamB, seed)).toEqual(start(teamA, teamB, seed, { leaders: true }));
  });

  it('applies candidate values before leader boosts and gives every unit full resources', () => {
    const state: State = createBattle(teamA, teamB, 42, {
      monsters: { 12: { hp: 180, mp: 75, atk: 100, speed: 100, skills: [skill] } },
      leaders: { 12: { ...leaderFor(12), stat: 'hp', percent: 10, secondary: { stat: 'atk', percent: 20 } } },
      openingRally: { enabled: false },
    });
    expect(state.allies[0].monster).toMatchObject({ hp: 198, mp: 75, atk: 120, speed: 100, skills: [skill] });
    expect(state.allies[0].hp).toBe(198);
    expect(state.allies[0].mp).toBe(75);
    expect(state.allies[1].monster.hp).toBe(Math.round(monsters[0].hp * 1.1));
    expect(state.allies[3].monster.hp).toBe(monsters[6].hp); // family restriction still applies
    expect([...state.allies, ...state.enemies].every(unit => !unit.rally)).toBe(true);
    expectResources(state);
  });

  it('also enforces candidate roster legality for a standalone match', () => {
    const overrides = { monsters: { 12: { cost: 7 } } }; // baseline cost 15, candidate cost 18
    expect(() => createBattle(teamA, teamB, 42, overrides)).toThrow(/cost/);
    expect(() => runMatch({ teamA, teamB, seed: 42, overrides })).toThrow(/cost/);
  });

  it('does not leak candidate changes into the source roster, input, or subsequent baseline', () => {
    const rosterBefore = structuredClone(monsters);
    const leaderBefore = leaderFor(12);
    const overrides = freeze({ monsters: { 12: { hp: 190, skills: [{ ...skill }] } }, openingRally: { enabled: false } });
    const before = structuredClone(overrides);
    const state: State = createBattle(freeze([...teamA]), freeze([...teamB]), 42, overrides);
    state.allies[0].monster.skills[0]!.power = 999;
    expect(overrides).toEqual(before);
    expect(monsters).toEqual(rosterBefore);
    expect(leaderFor(12)).toEqual(leaderBefore);
    expect(createBattle(teamA, teamB, 42)).toEqual(start(teamA, teamB, 42, { leaders: true }));
  });
});


type MatchResult = {
  winner: 'win' | 'lose' | 'draw';
  turns: number;
  firstCastSide: 'allies' | 'enemies' | null;
  traceHash: string;
  units: { key: string; monsterId: number; casts: number; directDamage: number; healing: number; mpSpent: number; finalHp: number; finalMp: number; diedBeforeAnyCast: boolean }[];
  trace?: { initialState: State; turns: { turn: number; seedBefore: number; seedAfter: number; events: BattleEvent[] }[]; finalState: State };
};
type SuiteMatch = {
  id: string;
  scenarioId: string;
  variant: 'baseline' | 'candidate';
  orientation: 'a-left' | 'a-right';
  seed: number;
  teamAId: string;
  teamBId: string;
  result: MatchResult;
};
type PairedDelta = { pairs: number; seedClusters?: number; [key: string]: unknown };
type SuiteResult = {
  matches: SuiteMatch[];
  summary: { baseline: unknown; candidate: unknown; pairedDelta: PairedDelta };
  scenarios: { id: string; kind: string; baseline: unknown; candidate: unknown; pairedDelta: PairedDelta }[];
};

function numericLeaves(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(numericLeaves);
  return [];
}

describe('seeded equal-policy matches and trace evidence', () => {
  it('runs identical commands for both sides when explicitly supplied, preserving normal gameplay defaults', () => {
    const initial = freeze(start(teamA, teamB, 42, { leaders: true }));
    const orders = freeze(autoOrders(initial));
    const enemyOrders = freeze(autoOrders(initial, 'enemies'));
    const result = advanceWithEvents(initial, orders, { enemyOrders });
    expect(result.state.history?.[0].orders.filter(order => order.side === 'enemies')).toEqual(
      enemyOrders.map(order => expect.objectContaining({ ...order, side: 'enemies', source: 'explicit', accepted: true })),
    );
    expect(advanceWithEvents(initial, orders, {})).toEqual(advanceWithEvents(initial, orders));
    expectResources(result.state);
  });

  it('validates explicit enemy targets against the correct side and records their source', () => {
    const initial = start(teamA, teamA, 42, { leaders: true });
    initial.enemies[1].hp -= 30;
    const guards = (state: State, side: 'allies' | 'enemies') => state[side].map(unit => ({ key: unit.key, skill: DEFEND }));
    const enemyOrders = guards(initial, 'enemies');
    enemyOrders[2] = { key: 'e2', skill: 1 }; // Bastet healing; explicit target supplied below
    const valid = advanceWithEvents(initial, guards(initial, 'allies'), {
      enemyOrders: enemyOrders.map(order => order.key === 'e2' ? { ...order, target: 'e1' } : order),
    });
    expect(valid.state.history?.[0].orders).toContainEqual(expect.objectContaining({ key: 'e2', skill: 1, target: 'e1', source: 'explicit', side: 'enemies', accepted: true }));
    expect(valid.events).toContainEqual(expect.objectContaining({ kind: 'heal', actor: 'e2', target: 'e1', amount: 30 }));
    const invalid = advanceWithEvents(initial, guards(initial, 'allies'), {
      enemyOrders: enemyOrders.map(order => order.key === 'e2' ? { ...order, target: 'a1' } : order),
    });
    expect(invalid.state.history?.[0].orders).toContainEqual(expect.objectContaining({ key: 'e2', source: 'explicit', accepted: false, rejection: 'invalid-target' }));
    expect(invalid.events.some(event => event.kind === 'cast' && event.actor === 'e2')).toBe(false);
    expect(invalid.state.enemies[2].mp).toBe(initial.enemies[2].mp);
  });

  it('replays ordered random hits identically with explicit Fenrir barrages on both sides', () => {
    const initial = freeze(start(teamA, teamA, 0xffffffff, { leaders: true }));
    const orders = freeze([{ key: 'a0', skill: 0, target: 'e0' }]);
    const enemyOrders = freeze([{ key: 'e0', skill: 0, target: 'a0' }]);
    const result = advanceWithEvents(initial, orders, { enemyOrders });
    expect(advanceWithEvents(initial, orders, { enemyOrders })).toEqual(result);
    for (const [actor, targetPrefix] of [['a0', 'e'], ['e0', 'a']]) {
      const cast = result.events.find(event => event.kind === 'cast' && event.actor === actor)!;
      const hits = result.events.filter(event => event.kind === 'damage' && event.actor === actor);
      expect(cast.scope).toBe('random');
      expect(cast.hitTargets).toEqual(hits.map(hit => hit.target));
      expect(hits).toHaveLength(5);
      expect(hits.map(hit => hit.hitIndex)).toEqual([0, 1, 2, 3, 4]);
      expect(hits.every(hit => hit.target?.startsWith(targetPrefix))).toBe(true);
    }
    expectResources(result.state);
  });

  it('allows the isolated rally percentage and duration without changing the roster or default buff', () => {
    const candidate: State = createBattle(teamA, teamB, 42, { openingRally: { enabled: true, percent: 25, turns: 3 } });
    const fenrir = candidate.allies[0];
    expect(fenrir.rally).toBe(3);
    expect(attackFor(fenrir)).toBe(Math.round(fenrir.monster.atk * 1.25));
    expect(speedFor(fenrir, 1)).toBe(fenrir.monster.speed);
    expect(speedFor(fenrir, 2)).toBe(Math.round(fenrir.monster.speed * 1.25));
    const baseline: State = createBattle(teamA, teamB, 42);
    expect(baseline.allies[0].rally).toBe(2);
    expect(attackFor(baseline.allies[0])).toBe(Math.round(baseline.allies[0].monster.atk * 1.05));
  });

  it.each([0, 42, 0xffffffff])('is deterministic with finite resources and a bounded terminal result at seed %s', seed => {
    const input = freeze({ teamA: [...teamA], teamB: [...teamB], seed, trace: true });
    const before = structuredClone(input);
    const first: MatchResult = runMatch(input);
    expect(runMatch(input)).toEqual(first);
    expect(input).toEqual(before);
    expect(['win', 'lose', 'draw']).toContain(first.winner);
    expect(first.turns).toBeGreaterThan(0);
    expect(first.turns).toBeLessThanOrEqual(MAX_TURNS);
    expect(first.traceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.trace?.turns).toHaveLength(first.turns);
    expectResources(first.trace!.initialState);
    expectResources(first.trace!.finalState);
    expect(runMatch({ ...input, trace: false }).traceHash).toBe(first.traceHash);
  });

  it('replays every recorded turn with the production resolver and equal automatic policies', () => {
    const result: MatchResult = runMatch({ teamA, teamB, seed: 42, trace: true });
    let expected = createBattle(teamA, teamB, 42) as State;
    expect(result.trace!.initialState).toEqual(expected);
    for (const turn of result.trace!.turns) {
      expect(turn.turn).toBe(expected.turn);
      expect(turn.seedBefore).toBe(expected.seed);
      const next = advanceWithEvents(expected, autoOrders(expected), { enemyOrders: autoOrders(expected, 'enemies') });
      expect(turn.events).toEqual(next.events);
      expect(turn.seedAfter).toBe(next.state.seed);
      expectResources(next.state);
      expected = next.state;
    }
    expect(result.trace!.finalState).toEqual(expected);
    expect(result.winner).toBe(expected.winner);
  });

  it('derives unit damage, healing, casts, MP spending, and pre-action deaths from authoritative events', () => {
    const result: MatchResult = runMatch({ teamA, teamB, seed: 42, trace: true });
    const events = result.trace!.turns.flatMap(turn => turn.events);
    const finalUnits = [...result.trace!.finalState.allies, ...result.trace!.finalState.enemies];
    expect(result.units).toHaveLength(10);
    expect(new Set(result.units.map(unit => unit.key)).size).toBe(10);
    for (const unit of result.units) {
      const final = finalUnits.find(value => value.key === unit.key)!;
      const sum = (kind: BattleEvent['kind']) => events.filter(event => event.actor === unit.key && event.kind === kind)
        .reduce((total, event) => total + (event.amount ?? 0), 0);
      const casts = events.filter(event => event.kind === 'cast' && event.actor === unit.key).length;
      expect(unit.monsterId).toBe(final.monster.id);
      expect(unit.casts).toBe(casts);
      expect(unit.directDamage).toBe(sum('damage'));
      expect(unit.healing).toBe(sum('heal'));
      expect(unit.mpSpent).toBe(sum('resource'));
      expect(unit.finalHp).toBe(final.hp);
      expect(unit.finalMp).toBe(final.mp);
      expect(unit.diedBeforeAnyCast).toBe(final.hp === 0 && casts === 0);
    }
    const firstCast = events.find(event => event.kind === 'cast');
    expect(result.firstCastSide).toBe(firstCast?.actor?.startsWith('a') ? 'allies' : firstCast ? 'enemies' : null);
  });
});

describe('paired baseline/candidate suite controls', () => {
  it('is byte-for-byte deterministic and does not mutate a frozen configuration or production roster', () => {
    const input = freeze(config());
    const before = structuredClone(input);
    const rosterBefore = structuredClone(monsters);
    const first = runSuite(input);
    expect(JSON.stringify(runSuite(input))).toBe(JSON.stringify(first));
    expect(input).toEqual(before);
    expect(monsters).toEqual(rosterBefore);
  });

  it('runs each curated scenario and seed in both orientations for both variants', () => {
    const input = config();
    const suite: SuiteResult = runSuite(input);
    expect(new Set(suite.matches.map(match => match.id)).size).toBe(suite.matches.length);
    for (const scenario of input.scenarios) {
      const matches = suite.matches.filter(match => match.scenarioId === scenario.id);
      expect(matches).toHaveLength(input.seeds.length * 4);
      for (const seed of input.seeds) for (const variant of ['baseline', 'candidate']) {
        const paired = matches.filter(match => match.seed === seed && match.variant === variant);
        expect(paired.map(match => match.orientation).sort()).toEqual(['a-left', 'a-right']);
        expect(paired.every(match => match.teamAId === scenario.a && match.teamBId === scenario.b)).toBe(true);
      }
    }
  });

  it('adds same-team mirror diagnostics with equal side counts, without asserting per-seed symmetry', () => {
    const input = config();
    const suite: SuiteResult = runSuite(input);
    const mirrors = suite.matches.filter(match => match.teamAId === match.teamBId);
    expect(mirrors).toHaveLength(input.teams.length * input.seeds.length * 4);
    for (const team of input.teams) {
      const matches = mirrors.filter(match => match.teamAId === team.id);
      expect(new Set(matches.map(match => match.scenarioId)).size).toBe(1);
      const scenario = suite.scenarios.find(row => row.id === matches[0].scenarioId);
      expect(scenario).toBeDefined();
      expect(scenario!.kind).toMatch(/mirror/);
      for (const seed of input.seeds) for (const variant of ['baseline', 'candidate']) {
        expect(matches.filter(match => match.seed === seed && match.variant === variant).map(match => match.orientation).sort())
          .toEqual(['a-left', 'a-right']);
      }
    }
  });

  it('keeps sampled teams legal in both variants and reproduces their membership and slot order', () => {
    const input = { ...withOverrides({ monsters: { 12: { cost: 5 } } }), sampling: { count: 3, seed: 51 } };
    const schedule = buildSchedule(input) as { teams: { id: string; ids: number[] }[]; cases: unknown[] };
    expect(buildSchedule(input)).toEqual(schedule);
    const sampled = schedule.teams.filter(team => team.id.startsWith('sample-'));
    expect(sampled).toHaveLength(3);
    const existingSets = input.teams.map(team => [...team.ids].sort((a, b) => a - b).join(','));
    const sampleSets: string[] = [];
    for (const team of sampled) {
      expect(team.ids).toHaveLength(5);
      expect(new Set(team.ids).size).toBe(5);
      expect(team.ids.every(id => monsters[id])).toBe(true);
      const baselineCost = team.ids.reduce((sum, id) => sum + monsters[id].cost, 0);
      const candidateCost = team.ids.reduce((sum, id) => sum + (id === 12 ? 5 : monsters[id].cost), 0);
      expect(baselineCost).toBeLessThanOrEqual(input.costLimit);
      expect(candidateCost).toBeLessThanOrEqual(input.costLimit);
      const members = [...team.ids].sort((a, b) => a - b).join(',');
      expect(existingSets).not.toContain(members);
      sampleSets.push(members);
    }
    expect(new Set(sampleSets).size).toBe(3);
    expect(schedule.cases).toHaveLength((input.scenarios.length + 3 + input.teams.length + 3) * input.seeds.length * 4);
  });

  it('aggregates team A after side swaps and excludes mirrors from the main comparison', () => {
    const suite: SuiteResult = runSuite(withOverrides({ monsters: { 12: { hp: 450, atk: 70 } } }));
    const score = (match: SuiteMatch) => {
      const physical = match.result.winner === 'win' ? 1 : match.result.winner === 'draw' ? 0.5 : 0;
      return match.orientation === 'a-left' ? physical : 1 - physical;
    };
    const rounded = (value: number) => Math.round(value * 1e6) / 1e6;
    const values: Record<string, SuiteMatch[]> = {};
    for (const variant of ['baseline', 'candidate'] as const) {
      const matches = suite.matches.filter(match => match.scenarioId === config().scenarios[0].id && match.variant === variant);
      values[variant] = matches;
      const summary = suite.summary[variant] as Record<string, number>;
      expect(summary.games).toBe(matches.length);
      expect(summary.wins).toBe(matches.filter(match => score(match) === 1).length);
      expect(summary.losses).toBe(matches.filter(match => score(match) === 0).length);
      expect(summary.draws).toBe(matches.filter(match => score(match) === 0.5).length);
      expect(summary.scoreRate).toBe(rounded(matches.reduce((sum, match) => sum + score(match), 0) / matches.length));
      const units = matches.flatMap(match => match.result.units.filter(unit => unit.key.startsWith(match.orientation === 'a-left' ? 'a' : 'e')));
      expect(summary.meanDirectDamage).toBe(rounded(units.reduce((sum, unit) => sum + unit.directDamage, 0) / matches.length));
      expect(summary.zeroCastDeathRate).toBe(rounded(units.filter(unit => unit.diedBeforeAnyCast).length / (5 * matches.length)));
    }
    const candidates = values.candidate;
    const deltas = values.baseline.map(baseline => {
      const candidate = candidates.find(row => row.seed === baseline.seed && row.orientation === baseline.orientation)!;
      return { seed: baseline.seed, score: score(candidate) - score(baseline), turns: candidate.result.turns - baseline.result.turns };
    });
    expect(suite.summary.pairedDelta.pairs).toBe(deltas.length);
    expect(suite.summary.pairedDelta.scoreRateChange).toBe(rounded(deltas.reduce((sum, delta) => sum + delta.score, 0) / deltas.length));
    expect(suite.summary.pairedDelta.meanTurnsChange).toBe(rounded(deltas.reduce((sum, delta) => sum + delta.turns, 0) / deltas.length));
    expect(suite.summary.pairedDelta.changedOutcomes).toBe(deltas.filter(delta => delta.score !== 0).length);
  });

  it('replays an exact saved match and rejects missing IDs or changed trace evidence', () => {
    const report: SuiteResult = runSuite(config());
    const expected = report.matches[0];
    const replay = replayMatch(report, expected.id);
    expect(replay.verified).toBe(true);
    expect(replay.result.traceHash).toBe(expected.result.traceHash);
    expect(replay.result.trace).toBeDefined();
    expect(() => replayMatch(report, 'missing')).toThrow(/match/i);
    const changed = structuredClone(report);
    changed.matches[0].result.traceHash = '0'.repeat(64);
    expect(() => replayMatch(changed, expected.id)).toThrow(/hash/i);
  });

  it('produces identical paired match evidence and zero numeric deltas for an identity candidate', () => {
    const suite: SuiteResult = runSuite(config());
    for (const baseline of suite.matches.filter(match => match.variant === 'baseline')) {
      const candidate = suite.matches.find(match => match.variant === 'candidate' && match.scenarioId === baseline.scenarioId
        && match.seed === baseline.seed && match.orientation === baseline.orientation);
      expect(candidate).toBeDefined();
      expect(candidate!.result).toEqual(baseline.result);
    }
    for (const row of [suite.summary, ...suite.scenarios]) {
      expect(row.candidate).toEqual(row.baseline);
      const { pairs, seedClusters, ...changes } = row.pairedDelta;
      expect(pairs).toBeGreaterThan(0);
      expect(seedClusters).toBe(config().seeds.length);
      const deltas = numericLeaves(changes);
      expect(deltas.length).toBeGreaterThan(0);
      expect(deltas.every(delta => delta === 0)).toBe(true);
    }
  });
});
