import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { barrageHits, cost, directDamageScale, leaderFor, monsters, NATURE_WARD_PERCENT, OPENING_WARD_TURNS, start } from './engine';
import type { State } from './engine';
// @ts-ignore Development-only JavaScript CLI, shared with Node's native TypeScript loader.
import { buildSchedule, createBattle, replayMatch, runMatch, runSuite, validateConfig, validateOverrides } from '../scripts/balance-lab/core.mjs';

const beasts = [12, 0, 2, 11, 13];
const nature = [14, 3, 6, 9, 10];
const nonleader = [3, 14, 6, 9, 10];
const bothCores = [12, 14, 0, 6, 10];
const readConfig = (name = 'family-wave') => JSON.parse(readFileSync(new URL(`../configs/balance-lab/${name}.json`, import.meta.url), 'utf8'));
const compactConfig = (overrides = {}) => ({
  schemaVersion: 1, suiteId: 'family-wave-contract', seeds: [0, 42], costLimit: 17,
  teams: [{ id: 'nature', role: 'nature core', ids: nature }, { id: 'beasts', role: 'all beasts', ids: beasts }],
  scenarios: [{ id: 'nature-vs-beasts', a: 'nature', b: 'beasts', keyUnitId: 14 }],
  candidate: { id: 'trial', label: 'Test-only override', overrides },
});

describe('family-wave lab configuration', () => {
  it('validates every bundled family-wave probe against the shipping roster', () => {
    const directory = new URL('../configs/balance-lab/', import.meta.url);
    for (const file of readdirSync(directory).filter(name => /^family-wave.*\.json$/.test(name))) {
      expect(() => validateConfig(JSON.parse(readFileSync(new URL(file, directory), 'utf8'))), file).not.toThrow();
    }
  });

  it('makes the broader 30-team sample explicit and keeps the same opponents for both nature lineups', () => {
    const config = readConfig('family-wave-broad');
    expect(config.seeds).toHaveLength(16);
    expect(config.sampling.count).toBe(0);
    const generated = config.teams.filter((team: { id: string }) => team.id.startsWith('generated-'));
    expect(generated).toHaveLength(30);
    expect(new Set(generated.map((team: { ids: number[] }) => [...team.ids].sort((a, b) => a - b).join(','))).size).toBe(30);
    for (const team of generated) {
      expect(cost(team.ids)).toBeLessThanOrEqual(17);
      for (const focal of ['nature', 'nature-troll']) {
        expect(config.scenarios).toContainEqual(expect.objectContaining({ a: focal, b: team.id }));
      }
    }
  });

  it.each(['family-wave', 'family-wave-ward15'])('keeps %s fixed at 32 seeds, both orientations and mirrors for all teams', name => {
    const config = readConfig(name);
    expect(() => validateConfig(config)).not.toThrow();
    expect(config.seeds).toHaveLength(32);
    expect(new Set(config.seeds).size).toBe(32);
    expect(config.sampling.count).toBe(0);
    expect(config.teams.find((team: { id: string }) => team.id === 'all-beast').ids).toEqual(beasts);
    expect(config.teams.find((team: { id: string }) => team.id === 'nature').ids).toEqual(nature);
    expect(cost(beasts)).toBe(17);
    expect(cost(nature)).toBe(15);
    expect(Object.keys(config.candidate.overrides)).toEqual(['openingWard']);
    const schedule = buildSchedule(config);
    expect(schedule.teams).toHaveLength(10);
    expect(schedule.scenarios.filter((scenario: { kind: string }) => scenario.kind === 'mirror')).toHaveLength(10);
    expect(schedule.cases).toHaveLength(4480);
    for (const orientation of ['a-left', 'a-right']) for (const variant of ['baseline', 'candidate']) {
      expect(schedule.cases.filter((item: { orientation: string; variant: string }) => item.orientation === orientation && item.variant === variant)).toHaveLength(1120);
    }
  });

  it('compares one ward change at a time using the exact same benchmark coverage', () => {
    const disabled = readConfig();
    const ward15 = readConfig('family-wave-ward15');
    expect(disabled.candidate.overrides).toEqual({ openingWard: { enabled: false } });
    expect(ward15.candidate.overrides).toEqual({ openingWard: { percent: 15 } });
    for (const field of ['teams', 'scenarios', 'seeds', 'sampling']) expect(ward15[field]).toEqual(disabled[field]);
  });

  it('restores the historical proposal explicitly on final code without changing families or Fenrir', () => {
    const config = readConfig('family-wave-final-vs-initial');
    const overrides = config.candidate.overrides;
    expect(Object.keys(overrides.monsters).sort()).toEqual(['13', '14']);
    expect(overrides.openingWard).toEqual({ percent: 20 });
    expect(overrides.monsters[14].atk).toBe(45);
    expect(overrides.monsters[14].skills[0].power).toBe(46);
    expect(overrides.monsters[13].skills[0].power).toBe(0);
    const restored: State = createBattle(nature, beasts, 42, overrides);
    expect(restored.allies[0].monster.atk).toBe(45);
    expect(restored.allies[0].monster.skills[0]!.power).toBe(46);
    expect(restored.allies.every(unit => unit.wardPercent === 20)).toBe(true);
    expect(restored.enemies[4].monster.skills[0]!.power).toBe(0);
    expect(restored.enemies[0]).toEqual(createBattle(nature, beasts, 42).enemies[0]);
    expect(config.teams).toHaveLength(18);
    expect(config.scenarios).toHaveLength(79);
    expect(buildSchedule(config).cases).toHaveLength(12416);
  });

  it('accepts nature family patches, nature-only leaders and supported conditional barrage skills', () => {
    expect(() => validateOverrides({
      monsters: { 13: { family: 'nature', skills: [{ ...monsters[13].skills[0], familyBonusHit: 'nature' }] } },
      leaders: { 14: { ...leaderFor(14), percent: 10 } },
      openingWard: { enabled: true, percent: 15, turns: 3 },
    })).not.toThrow();
    expect(() => validateOverrides({ monsters: { 14: { family: null } } })).not.toThrow();
  });

  it.each([
    { duration: 2 }, { enabled: 'true' }, { enabled: null }, { percent: -1 }, { percent: 101 },
    { percent: Number.NaN }, { percent: Number.POSITIVE_INFINITY }, { percent: '20' },
    { turns: -1 }, { turns: 21 }, { turns: 1.5 }, { turns: Number.NaN }, { turns: '2' },
  ])('rejects invalid openingWard fields: %#', openingWard => {
    expect(() => validateOverrides({ openingWard })).toThrow(/openingWard/);
  });

  it.each([
    { monsters: { 13: { family: 'unknown-family' } } },
    { leaders: { 14: { ...leaderFor(14), family: 'unknown-family' } } },
    { monsters: { 13: { skills: [{ ...monsters[13].skills[0], familyBonusHit: 'unknown-family' }] } } },
    { monsters: { 13: { skills: [{ ...monsters[13].skills[1], familyBonusHit: 'beast' }] } } },
    { monsters: { 13: { skills: [{ ...monsters[13].skills[0], kind: 'heal' }] } } },
    { monsters: { 13: { skills: [{ ...monsters[13].skills[0], all: true }] } } },
  ])('rejects unsupported families or non-random family bonus hits: %#', overrides => {
    expect(() => validateOverrides(overrides)).toThrow();
  });
});

describe('family-wave isolated starts', () => {
  it.each([0, 42, 0xffffffff])('matches production setup exactly on the expanded roster at seed %s', seed => {
    for (const team of [beasts, nature, nonleader, bothCores]) {
      expect(createBattle(team, nature, seed)).toEqual(start(team, nature, seed, { leaders: true }));
      expect(createBattle(nature, team, seed)).toEqual(start(nature, team, seed, { leaders: true }));
    }
  });

  it('rebuilds stock support correctly when an unrelated or empty nested override is supplied', () => {
    for (const overrides of [{ openingWard: {} }, { openingRally: {} }, { monsters: { 13: { mp: monsters[13].mp } } }]) {
      const rebuilt: State = createBattle(bothCores, nonleader, 42, overrides);
      const production = start(bothCores, nonleader, 42, { leaders: true });
      for (const side of ['allies', 'enemies'] as const) expect(rebuilt[side]).toEqual(production[side]);
      expect(rebuilt.log.join(' ')).toContain('isolated');
      expect(rebuilt.log.join(' ')).not.toContain('20%');
    }
  });

  it('keeps ward independent of leader position and opening rally on both sides', () => {
    const state: State = createBattle(bothCores, nonleader, 42, { openingRally: { enabled: false }, openingWard: { percent: 15, turns: 3 } });
    expect([...state.allies, ...state.enemies].every(unit => !unit.rally)).toBe(true);
    for (const unit of [...state.allies, ...state.enemies]) {
      if (unit.monster.family === 'nature') {
        expect(unit.ward).toBe(3);
        expect(unit.wardPercent).toBe(15);
        expect(directDamageScale(unit)).toBe(0.85);
      } else expect(unit.ward).toBeUndefined();
    }
    const noWard: State = createBattle(bothCores, nature, 42, { openingWard: { enabled: false } });
    expect([...noWard.allies, ...noWard.enemies].every(unit => !unit.ward)).toBe(true);
    expect(noWard.allies[0].rally).toBe(2);
    expect(noWard.allies[2].rally).toBe(2);
    expect(noWard.enemies[0].hp).toBe(Math.round(monsters[14].hp * 1.15));
  });

  it('uses patched recipient families for support and HP boosts without modifying the source roster', () => {
    const before = structuredClone(monsters);
    const overrides = { monsters: { 3: { family: 'beast' }, 0: { family: 'nature' } }, openingWard: { percent: 15 } };
    const inputBefore = structuredClone(overrides);
    const state: State = createBattle(nature, bothCores, 42, overrides);
    expect(state.allies[1].ward).toBeUndefined();
    expect(state.allies[1].hp).toBe(monsters[3].hp);
    expect(state.enemies[2].ward).toBe(OPENING_WARD_TURNS);
    expect(state.enemies[2].rally).toBeUndefined();
    state.allies[0].monster.skills[0]!.power = 999;
    expect(monsters).toEqual(before);
    expect(overrides).toEqual(inputBefore);
    expect(createBattle(nature, beasts, 42)).toEqual(start(nature, beasts, 42, { leaders: true }));
  });

  it('does not invent a ward without a core and supports explicit zero percentage or duration', () => {
    const noCore: State = createBattle(beasts, beasts, 42, { openingWard: { enabled: true, percent: 15, turns: 3 } });
    expect([...noCore.allies, ...noCore.enemies].every(unit => !unit.ward)).toBe(true);
    const zeroPercent: State = createBattle(nature, beasts, 42, { openingWard: { percent: 0 } });
    expect(zeroPercent.allies[0].ward).toBe(OPENING_WARD_TURNS);
    expect(directDamageScale(zeroPercent.allies[0])).toBe(1);
    const zeroTurns: State = createBattle(nature, beasts, 42, { openingWard: { turns: 0 } });
    expect(zeroTurns.allies[0].ward).toBe(0);
    expect(directDamageScale(zeroTurns.allies[0])).toBe(1);
  });

  it('recomputes conditional barrage eligibility from isolated families and all original members', () => {
    const baseline: State = createBattle(beasts, nature, 42);
    expect(barrageHits(baseline.allies[4].monster.skills[0]!, baseline.allies)).toBe(4);
    baseline.allies[1].hp = 0;
    expect(barrageHits(baseline.allies[4].monster.skills[0]!, baseline.allies)).toBe(4);
    const candidate: State = createBattle(beasts, nature, 42, { monsters: { 0: { family: 'nature' } } });
    expect(barrageHits(candidate.allies[4].monster.skills[0]!, candidate.allies)).toBe(3);
  });
});

describe('family-wave traces and paired evidence', () => {
  it('preserves ward duration and percentage in deterministic snapshots and replay', () => {
    const config = compactConfig({ openingWard: { percent: 15, turns: 3 } });
    const report = runSuite(config);
    const match = report.matches.find((item: { variant: string; scenarioId: string; orientation: string }) => item.variant === 'candidate' && item.scenarioId === 'nature-vs-beasts' && item.orientation === 'a-left');
    const replay = replayMatch(report, match.id);
    expect(replay.verified).toBe(true);
    expect(replay.result.traceHash).toBe(match.result.traceHash);
    expect(replay.result.trace.initialState.allies.every((unit: { ward: number; wardPercent: number }) => unit.ward === 3 && unit.wardPercent === 15)).toBe(true);
    expect(replay.result.trace.turns[0].unitsAfter).toContainEqual(expect.objectContaining({ key: 'a0', wardPercent: 15 }));
    for (const turn of replay.result.trace.turns) for (const unit of turn.unitsAfter) {
      expect(Number.isInteger(unit.ward)).toBe(true);
      expect(unit.ward).toBeGreaterThanOrEqual(0);
      expect(unit.wardPercent).toBe(unit.key.startsWith('a') ? 15 : NATURE_WARD_PERCENT);
    }
    expect(runMatch({ ...replay.request, trace: true })).toEqual(replay.result);
  });

  it('produces identical paired results for an identity candidate on the two new family teams', () => {
    const report = runSuite(compactConfig());
    for (const baseline of report.matches.filter((item: { variant: string }) => item.variant === 'baseline')) {
      const candidate = report.matches.find((item: { id: string }) => item.id === baseline.id.replace(/baseline$/, 'candidate'));
      expect(candidate.result).toEqual(baseline.result);
    }
    expect(report.summary.pairedDelta.scoreRateChange).toBe(0);
    expect(report.summary.pairedDelta.changedOutcomes).toBe(0);
  });
});
