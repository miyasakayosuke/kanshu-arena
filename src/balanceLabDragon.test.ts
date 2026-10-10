import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { advanceWithEvents, baseDamage, leaderFor, monsters, start } from './engine';
import type { State } from './engine';
import { FAMILY_IDS } from './families';
// @ts-ignore Development-only JavaScript shared with the native Node loader.
import { buildSchedule, createBattle, replayMatch, runMatch, runSuite, sampleLegalMemberSets, validateConfig, validateOverrides } from '../scripts/balance-lab/core.mjs';
const dragon = [15, 5, 16, 17, 18];
const nature = [14, 3, 6, 9, 10];
const beast = [12, 0, 2, 11, 13];
const three = [15, 16, 18, 2, 10];
const two = [15, 16, 3, 2, 10];
const noCore = [5, 16, 17, 18, 2];
const config = (overrides = {}) => ({ schemaVersion: 1, suiteId: 'dragon-contract', seeds: [0, 42], costLimit: 17,
  teams: [{ id: 'dragon', role: 'pure dragon', ids: dragon }, { id: 'nature', role: 'original triple poison', ids: nature }],
  scenarios: [{ id: 'dragon-nature', a: 'dragon', b: 'nature', keyUnitId: 15 }], candidate: { id: 'trial', label: 'test only', overrides } });

describe('dragon lab strict config and isolated state', () => {
  it('validates every bundled dragon configuration and preserves original old-family membership', () => {
    const directory = new URL('../configs/balance-lab/', import.meta.url);
    for (const file of readdirSync(directory).filter(name => /^dragon-.*\.json$/.test(name))) {
      const suite = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
      expect(() => validateConfig(suite), file).not.toThrow();
      expect(suite.teams.find((team: { id: string }) => team.id === 'fullnature').ids).toEqual(nature);
      expect(suite.teams.find((team: { id: string }) => team.id === 'fullbeast').ids).toEqual(beast);
      const generated = suite.teams.filter((team: { id: string }) => team.id.startsWith('generated-'));
      if (generated.length) {
        expect(generated).toHaveLength(24);
        for (const team of generated) {
          expect(team.ids).not.toContain(15);
          for (const focal of ['puredragon', 'threedragon', 'twodragon', 'core-replaced', 'core-nonleader']) expect(suite.scenarios).toContainEqual(expect.objectContaining({ a: focal, b: team.id }));
        }
      }
    }
  });
  it('uses every shared family ID for monsters, leaders and conditional random hits', () => {
    for (const family of FAMILY_IDS) expect(() => validateOverrides({ monsters: { 17: { family, skills: [{ ...monsters[17].skills[0], familyBonusHit: family }] } }, leaders: { 15: { ...leaderFor(15), family } } })).not.toThrow();
  });
  it.each([{ enabled: 'true' }, { enabled: null }, { perPoint: -1 }, { perPoint: 101 }, { perPoint: 1.5 }, { perPoint: Number.NaN }, { perPoint: Infinity }, { perPoint: '7' }, { cap: 6 }])('rejects malformed charge override %#', dragonCharge => {
    expect(() => validateOverrides({ dragonCharge })).toThrow(/dragonCharge/);
  });
  it.each([
    { fixedDamage: 'true' }, { fixedDamage: null }, { dragonChargeFinisher: 'true' }, { dragonChargeFinisher: 0 },
    { kind: 'heal' }, { fixedDamage: false }, { all: false }, { randomHits: 2 }, { mpCost: 0 }, { priority: 0 },
  ])('rejects invalid fixed-damage finisher shape %#', patch => {
    expect(() => validateOverrides({ monsters: { 15: { skills: [{ ...monsters[15].skills[0], ...patch }] } } })).toThrow();
  });
  it('allows fixed single hits and explicit false flags, without inventing charge', () => {
    expect(() => validateOverrides({ monsters: { 18: { skills: [{ ...monsters[18].skills[0], dragonChargeFinisher: false }] } } })).not.toThrow();
    expect(() => validateOverrides({ monsters: { 18: { skills: [{ ...monsters[18].skills[1], fixedDamage: true }] } } })).toThrow(/fixedDamage/);
  });
  it.each([0, 42, 0xffffffff])('matches engine starts and preserves absent optional resource keys at seed %s', seed => {
    for (const a of [dragon, three, two, noCore]) for (const b of [dragon, nature]) {
      expect(createBattle(a, b, seed)).toEqual(start(a, b, seed, { leaders: true }));
      for (const overrides of [{ dragonCharge: {} }, { openingWard: {} }, { monsters: { 0: { mp: monsters[0].mp } } }]) {
        const rebuilt: State = createBattle(a, b, seed, overrides);
        const stock = start(a, b, seed, { leaders: true });
        expect(rebuilt.allies).toEqual(stock.allies); expect(rebuilt.enemies).toEqual(stock.enemies);
      }
    }
  });
  it('requires the core and three starting dragons on each side, regardless of leader slot', () => {
    for (const team of [dragon, three, [16, 15, 18, 2, 10]]) {
      const state: State = createBattle(team, team, 42, { dragonCharge: { perPoint: 11 } });
      for (const unit of [...state.allies, ...state.enemies]) {
        if (unit.monster.id === 15) expect(unit).toMatchObject({ dragonCharge: 0, dragonChargePerPoint: 11 });
        else { expect(Object.hasOwn(unit, 'dragonCharge')).toBe(false); expect(Object.hasOwn(unit, 'dragonChargePerPoint')).toBe(false); }
      }
    }
    for (const team of [two, noCore]) expect([...createBattle(team, team, 42, { dragonCharge: { enabled: true, perPoint: 11 } }).allies].every(unit => !Object.hasOwn(unit, 'dragonCharge'))).toBe(true);
    const disabled: State = createBattle(dragon, three, 42, { dragonCharge: { enabled: false, perPoint: 11 } });
    expect([...disabled.allies, ...disabled.enemies].every(unit => !Object.hasOwn(unit, 'dragonCharge') && !Object.hasOwn(unit, 'dragonChargePerPoint'))).toBe(true);
  });
  it('preserves explicit zero per-point tuning while retaining enabled charge bookkeeping', () => {
    const state: State = createBattle(dragon, nature, 42, { dragonCharge: { perPoint: 0 } });
    const core = state.allies[0]; core.dragonCharge = 5;
    expect(core.dragonChargePerPoint).toBe(0);
    expect(baseDamage(core, core.monster.skills[0]!)).toBe(core.monster.skills[0]!.power);
    const result = runMatch({ teamA: dragon, teamB: nature, seed: 42, overrides: { dragonCharge: { perPoint: 0 } } });
    expect(result.sides.allies.dragonChargeGenerated).toBeGreaterThan(0);
    expect(result.sides.allies.mpSpent).toBeGreaterThan(0);
  });
  it('recomputes eligibility using patched families on both sides and leaves shared roster untouched', () => {
    const before = structuredClone(monsters);
    const enabled: State = createBattle(two, two, 42, { monsters: { 3: { family: 'dragon' } } });
    expect(enabled.allies[0].dragonCharge).toBe(0); expect(enabled.enemies[0].dragonCharge).toBe(0);
    const disabled: State = createBattle(three, three, 42, { monsters: { 18: { family: null } } });
    expect(disabled.allies[0].dragonCharge).toBeUndefined(); expect(disabled.enemies[0].dragonCharge).toBeUndefined();
    expect(monsters).toEqual(before);
  });
  it('keeps eligibility after a member KO but never gains after core KO; dispel resets value on both orientations', () => {
    for (const side of ['allies', 'enemies'] as const) {
      let state: State = createBattle(three, three, 42, { dragonCharge: { perPoint: 9 } });
      const foe = side === 'allies' ? 'enemies' : 'allies';
      state[side][2].hp = 0;
      state[side][0].dragonCharge = 3;
      state[foe][0].monster.skills = [{ name: 'test breaker', kind: 'hit', power: 1, priority: 10, mpCost: 1, breaksGuard: true }];
      const orders = [{ key: state[side][1].key, skill: 0, target: state[foe][1].key }];
      const opposing = [{ key: state[foe][0].key, skill: 0, target: state[side][0].key }];
      const resolved = advanceWithEvents(state, side === 'allies' ? orders : opposing, { enemyOrders: side === 'allies' ? opposing : orders });
      expect(resolved.events).toContainEqual(expect.objectContaining({ kind: 'break', target: state[side][0].key, dragonCharge: 0 }));
      expect(resolved.events).toContainEqual(expect.objectContaining({ kind: 'charge', target: state[side][0].key, dragonCharge: 1 }));
      state = resolved.state; state[side][0].hp = 1; state[side][0].dragonCharge = 3;
      state[foe][0].monster.skills = [{ name: 'test KO', kind: 'hit', power: 999, priority: 10, mpCost: 1 }];
      const ko = advanceWithEvents(state, side === 'allies' ? orders : opposing, { enemyOrders: side === 'allies' ? opposing : orders });
      expect(ko.state[side][0].dragonCharge).toBe(0);
      expect(ko.events.some(event => event.kind === 'charge' && event.target === state[side][0].key && event.effect === 'dragon-charge-gain')).toBe(false);
    }
  });
});

describe('dragon same-policy evidence', () => {
  it('preserves charge and explicit perPoint in traces/replays on both physical sides', () => {
    const report = runSuite(config({ dragonCharge: { perPoint: 10 } }));
    for (const orientation of ['a-left', 'a-right']) {
      const match = report.matches.find((row: { variant: string; scenarioId: string; orientation: string }) => row.variant === 'candidate' && row.scenarioId === 'dragon-nature' && row.orientation === orientation);
      const replay = replayMatch(report, match.id);
      const coreKey = orientation === 'a-left' ? 'a0' : 'e0';
      expect(replay.result.traceHash).toBe(match.result.traceHash);
      for (const turn of replay.result.trace.turns) for (const unit of turn.unitsAfter) {
        if (unit.key === coreKey) { expect(unit.dragonChargePerPoint).toBe(10); expect(Number.isInteger(unit.dragonCharge)).toBe(true); expect(unit.dragonCharge).toBeGreaterThanOrEqual(0); expect(unit.dragonCharge).toBeLessThanOrEqual(5); }
        else expect(Object.hasOwn(unit, 'dragonCharge')).toBe(false);
      }
      expect(runMatch({ ...replay.request, trace: true })).toEqual(replay.result);
    }
    report.matches[0].result.traceHash = 'broken';
    expect(() => replayMatch(report, report.matches[0].id)).toThrow(/trace hash/);
  });
  it('separates charge generation/spending/finisher damage from MP and reproduces the identity candidate', () => {
    const report = runSuite(config());
    for (const baseline of report.matches.filter((row: { variant: string }) => row.variant === 'baseline')) expect(report.matches.find((row: { id: string }) => row.id === baseline.id.replace(/baseline$/, 'candidate')).result).toEqual(baseline.result);
    expect(report.summary.baseline.meanDragonChargeGenerated).toBeGreaterThan(0);
    expect(report.summary.baseline.meanDragonChargeSpent).toBeGreaterThan(0);
    expect(report.summary.baseline.meanDragonFinisherDamage).toBeGreaterThan(0);
    const disabled = runMatch({ teamA: dragon, teamB: nature, seed: 42, overrides: { dragonCharge: { enabled: false } }, trace: true });
    expect(disabled.sides.allies.dragonChargeGenerated).toBe(0); expect(disabled.sides.allies.dragonChargeSpent).toBe(0);
    expect(disabled.sides.allies.mpSpent).toBeGreaterThan(0);
    for (const turn of disabled.trace.turns) expect(turn.unitsAfter.every((unit: object) => !Object.hasOwn(unit, 'dragonCharge'))).toBe(true);
    expect(report.methodology.limitations.join(' ')).toContain('current charge only');
  });
  it('is deterministic, unique and legal at the 37-monster milestone without enumerating five-subsets', () => {
    const roster = Array.from({ length: 37 }, (_, id) => ({ id, cost: 2 + id % 4 }));
    const candidateRoster = roster.map(unit => ({ ...unit, cost: unit.id % 3 === 0 ? 5 : unit.cost }));
    const args = { roster, candidateRoster, excluded: [[0, 1, 2, 3, 4]], count: 100, costLimit: 17, seed: 42 };
    const result = sampleLegalMemberSets(args);
    expect(result.algorithm).toBe('legal-suffix-dp-coprime-rank-walk-v1');
    expect(sampleLegalMemberSets(args)).toEqual(result);
    expect(new Set(result.members.map((ids: number[]) => [...ids].sort((a, b) => a - b).join(','))).size).toBe(100);
    for (const ids of result.members) { expect(new Set(ids).size).toBe(5); for (const r of [roster, candidateRoster]) expect(ids.reduce((sum: number, id: number) => sum + r[id].cost, 0)).toBeLessThanOrEqual(17); }
  });
  it('reports exact scarcity and validates duplicates/costs in both sampler branches', () => {
    for (const n of [5, 37]) {
      const roster = Array.from({ length: n }, (_, id) => ({ id, cost: id < 5 ? 1 : 17 }));
      const args = { roster, count: 1, costLimit: 5, seed: 42 };
      expect(sampleLegalMemberSets(args).unusedLegalMemberSets).toBe(1);
      expect(() => sampleLegalMemberSets({ ...args, count: 2 })).toThrow(/only 1/);
      expect(() => sampleLegalMemberSets({ ...args, excluded: [[0, 1, 2, 3, 4]] })).toThrow(/only 0/);
      expect(() => sampleLegalMemberSets({ ...args, excluded: [[0, 0, 2, 3, 4]] })).toThrow(/duplicate/);
      expect(() => sampleLegalMemberSets({ ...args, roster: [...roster, roster[0]] })).toThrow(/duplicate/);
      expect(() => sampleLegalMemberSets({ ...args, candidateRoster: roster.map(unit => ({ ...unit, cost: 0 })) })).toThrow(/cost/);
    }
  });
  it('preserves historical small-roster shuffle output and same-seed schedule construction', () => {
    const roster = Array.from({ length: 7 }, (_, id) => ({ id, cost: 2 }));
    expect(sampleLegalMemberSets({ roster, count: 3, costLimit: 17, seed: 42 })).toEqual({ algorithm: 'historical-enumerate-shuffle-v1', unusedLegalMemberSets: 21, members: [[6, 4, 1, 0, 3], [4, 2, 0, 5, 6], [6, 1, 3, 0, 2]] });
    expect(buildSchedule({ ...config(), sampling: { count: 3, seed: 42 } })).toEqual(buildSchedule({ ...config(), sampling: { count: 3, seed: 42 } }));
  });
});
