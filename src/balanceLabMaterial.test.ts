import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MATERIAL_REPAIR, MATERIAL_REPAIR_PERCENT, monsters, start } from './engine';
import type { BattleEvent, State } from './engine';
// @ts-ignore Development-only JavaScript shared with Node's native TypeScript loader.
import { createBattle, replayMatch, runMatch, runSuite, validateConfig, validateOverrides } from '../scripts/balance-lab/core.mjs';

const material = [19, 20, 21, 22, 23];
const nature = [14, 3, 6, 9, 10];
const beast = [12, 0, 2, 11, 13];
const dragon = [15, 5, 16, 17, 18];
const three = [19, 20, 21, 2, 10];
const two = [19, 20, 3, 2, 10];
const noCore = [20, 21, 22, 23, 2];
const nonleader = [20, 19, 21, 2, 10];
const config = (overrides = {}) => ({ schemaVersion: 1, suiteId: 'material-contract', seeds: [0, 42], costLimit: 17,
  teams: [{ id: 'material', role: 'pure material', ids: material }, { id: 'nature', role: 'original triple poison', ids: nature }],
  scenarios: [{ id: 'material-nature', a: 'material', b: 'nature', keyUnitId: 19 }], candidate: { id: 'trial', label: 'Contract fixture', overrides } });
type Snapshot = { key: string; repairReady?: boolean; repairPercent?: number; dragonCharge?: number; dragonChargePerPoint?: number };
type Trace = { initialState: State; turns: { turn: number; events: BattleEvent[]; unitsAfter: Snapshot[] }[]; finalState: State };
const allUnits = (state: State) => [...state.allies, ...state.enemies];
const expectAbsentRepair = (unit: object) => {
  expect(Object.hasOwn(unit, 'repairReady')).toBe(false);
  expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
};

describe('material lab strict overrides and isolated starting eligibility', () => {
  it('validates every bundled material configuration and preserves original old-family membership', () => {
    const directory = new URL('../configs/balance-lab/', import.meta.url);
    const files = readdirSync(directory).filter(name => /^material-.*\.json$/.test(name));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const suite = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
      expect(() => validateConfig(suite), file).not.toThrow();
      for (const [id, ids] of [['fullnature', nature], ['fullbeast', beast], ['puredragon', dragon]] as const) {
        const team = suite.teams.find((row: { id: string }) => row.id === id);
        expect(team?.ids, `${file}: ${id}`).toEqual(ids);
      }
    }
  });

  it.each([{}, { enabled: true }, { enabled: false }, { percent: 0 }, { percent: 100 }, { enabled: false, percent: 0 }])('accepts the bounded material override %#', materialRepair => {
    expect(() => validateOverrides({ materialRepair })).not.toThrow();
  });

  it.each([
    null, false, [], 18, '18', { enabled: 'true' }, { enabled: null }, { enabled: 1 }, { enabled: undefined },
    { percent: -1 }, { percent: 101 }, { percent: 1.5 }, { percent: Number.NaN }, { percent: Infinity },
    { percent: '18' }, { percent: null }, { percent: undefined }, { turns: 2 }, { minimumMembers: 2 }, { percent: 18, typo: true },
  ])('rejects malformed or unknown material repair override %#', materialRepair => {
    expect(() => validateOverrides({ materialRepair })).toThrow(/materialRepair/);
  });

  it.each([0, 42, 0xffffffff])('matches shipping starts and preserves both optional family resources at seed %s', seed => {
    for (const teamA of [material, three, two, noCore, nonleader, dragon]) for (const teamB of [material, dragon, nature]) {
      const stock = start(teamA, teamB, seed, { leaders: true });
      expect(createBattle(teamA, teamB, seed)).toEqual(stock);
      for (const overrides of [{ materialRepair: {} }, { dragonCharge: {} }, { openingWard: {} }, { monsters: { 0: { mp: monsters[0].mp } } }]) {
        const rebuilt: State = createBattle(teamA, teamB, seed, overrides);
        expect(rebuilt.allies).toEqual(stock.allies);
        expect(rebuilt.enemies).toEqual(stock.enemies);
      }
    }
  });

  it('requires the core and three starting materials independently on both sides, in any leader slot', () => {
    for (const team of [material, three, nonleader]) {
      const state: State = createBattle(team, team, 42, { materialRepair: { enabled: true, percent: 11 } });
      for (const unit of allUnits(state)) {
        if (unit.monster.id === 19) expect(unit).toMatchObject({ repairReady: true, repairPercent: 11 });
        else expectAbsentRepair(unit);
      }
    }
    for (const team of [two, noCore]) for (const unit of allUnits(createBattle(team, team, 42, { materialRepair: { enabled: true, percent: 11 } }))) expectAbsentRepair(unit);
    for (const unit of allUnits(createBattle(material, three, 42, { materialRepair: { enabled: false, percent: 11 } }))) expectAbsentRepair(unit);
  });

  it('recomputes eligibility from patched families on both sides without mutating the shared roster', () => {
    const before = structuredClone(monsters);
    const enabled: State = createBattle(two, two, 42, { monsters: { 3: { family: 'material' } } });
    expect(enabled.allies[0].repairReady).toBe(true);
    expect(enabled.enemies[0].repairReady).toBe(true);
    const disabled: State = createBattle(three, three, 42, { monsters: { 21: { family: null } } });
    for (const unit of allUnits(disabled)) expectAbsentRepair(unit);
    // Eligibility needs the identified core plus three material members; a patched core need not itself retain the family.
    const patchedCore: State = createBattle(material, material, 42, { monsters: { 19: { family: null } } });
    expect(patchedCore.allies[0].repairReady).toBe(true);
    expect(patchedCore.enemies[0].repairReady).toBe(true);
    expect(monsters).toEqual(before);
  });

  it('retains explicit zero tuning, consumes the finite trigger, and never spends MP on repair', () => {
    const result = runMatch({ teamA: material, teamB: nature, seed: 42, overrides: { materialRepair: { percent: 0 } }, trace: true });
    expect(result.trace.initialState.allies[0]).toMatchObject({ repairReady: true, repairPercent: 0 });
    const core = result.units.find((unit: { key: string }) => unit.key === 'a0');
    expect(core).toMatchObject({ repairEligible: 1, repairTriggers: 1, repairHealing: 0, repairPotentialHealing: 0, repairUnusedHealing: 0, repairMpSpent: 0, repairTriggerTurn: MATERIAL_REPAIR.turn });
    expect(result.trace.turns.flatMap((turn: { events: BattleEvent[] }) => turn.events).filter((event: BattleEvent) => event.kind === 'heal' && event.effect === 'material-repair').every((event: BattleEvent) => event.amount === 0)).toBe(true);
    expect(result.trace.finalState.allies[0]).toMatchObject({ repairReady: false, repairPercent: 0 });
    expect(result.sides.allies.mpSpent).toBeGreaterThan(0);
  });
});

describe('material same-policy accounting and replay evidence', () => {
  it.each([false, true])('accounts repair from passive/heal events, independently of casts and MP (material on right=%s)', reverse => {
    const result = runMatch({ teamA: reverse ? nature : material, teamB: reverse ? material : nature, seed: 42, trace: true });
    const trace: Trace = result.trace;
    const coreKey = reverse ? 'e0' : 'a0';
    const core = result.units.find((unit: { key: string }) => unit.key === coreKey);
    const initial = new Map(allUnits(trace.initialState).map(unit => [unit.key, unit]));
    const events = trace.turns.flatMap(turn => turn.events);
    const passives = events.filter(event => event.kind === 'passive' && event.actor === coreKey && event.effect === 'material-repair');
    const heals = events.filter(event => event.kind === 'heal' && event.actor === coreKey && event.effect === 'material-repair');
    const healing = heals.reduce((sum, event) => sum + (event.amount ?? 0), 0);
    const potential = heals.reduce((sum, event) => sum + Math.floor(initial.get(event.target!)!.monster.hp * MATERIAL_REPAIR_PERCENT / 100), 0);
    expect(passives).toHaveLength(1);
    expect(healing).toBeGreaterThan(0);
    expect(core).toMatchObject({ repairEligible: 1, repairTriggers: passives.length, repairRecipients: heals.length, repairHealing: healing,
      repairPotentialHealing: potential, repairUnusedHealing: potential - healing, repairCancellations: 0,
      repairFailedBeforeTrigger: 0, repairDispelled: 0, repairDefeatedBeforeTrigger: 0, repairMpSpent: 0, repairTriggerTurn: MATERIAL_REPAIR.turn });
    expect(core.casts).toBe(events.filter(event => event.kind === 'cast' && event.actor === coreKey).length);
    expect(core.mpSpent).toBe(events.filter(event => event.kind === 'resource' && event.actor === coreKey).reduce((sum, event) => sum + (event.amount ?? 0), 0));
    expect(core.healing).toBe(events.filter(event => event.kind === 'heal' && event.actor === coreKey).reduce((sum, event) => sum + (event.amount ?? 0), 0));
    for (const unit of result.units) {
      expect(unit.repairMpSpent).toBe(0);
      expect(unit.repairReceived).toBe(heals.filter(event => event.target === unit.key).reduce((sum, event) => sum + (event.amount ?? 0), 0));
    }
    expect(result.sides[reverse ? 'enemies' : 'allies'].repairHealing).toBe(healing);
    expect(result.sides[reverse ? 'enemies' : 'allies'].repairReceived).toBe(healing);
  });

  it.each(['before', 'after', 'ko', 'before-ko', 'after-ko'] as const)('separates %s cancellation, dispel, and pre-trigger defeat without double counting', kind => {
    for (const reverse of [false, true]) {
      const skill = { name: 'Fixture material pressure', kind: 'hit', power: kind.includes('ko') ? 10000 : 50, fixedDamage: true, all: true, mpCost: 1, priority: 10,
        ...(kind.startsWith('before') ? { breaksGuard: true } : kind.startsWith('after') ? { breaksGuardAfterHit: true } : {}) };
      const result = runMatch({ teamA: reverse ? nature : material, teamB: reverse ? material : nature, seed: 42,
        overrides: { monsters: { 14: { skills: [skill] } } }, trace: true });
      const coreKey = reverse ? 'e0' : 'a0', attackerKey = reverse ? 'a0' : 'e0';
      const core = result.units.find((unit: { key: string }) => unit.key === coreKey);
      const attacker = result.units.find((unit: { key: string }) => unit.key === attackerKey);
      const dispelled = kind === 'before' || kind === 'after' || kind === 'before-ko';
      expect(core).toMatchObject({ repairEligible: 1, repairTriggers: 0, repairHealing: 0, repairRecipients: 0,
        repairCancellations: 1, repairFailedBeforeTrigger: 1, repairDefeatedBeforeTrigger: dispelled ? 0 : 1, repairDispelled: 0,
        repairTriggerTurn: null, repairMpSpent: 0 });
      expect(attacker.repairDispelled).toBe(dispelled ? 1 : 0);
      expect(result.sides[reverse ? 'enemies' : 'allies'].repairCancellations).toBe(1);
      expect(result.sides[reverse ? 'allies' : 'enemies'].repairDispelled).toBe(dispelled ? 1 : 0);
      const events: BattleEvent[] = result.trace.turns[0].events;
      const breakIndex = events.findIndex(event => event.kind === 'break' && event.target === coreKey && event.repairReady === false);
      const damageIndex = events.findIndex(event => event.kind === 'damage' && event.target === coreKey);
      if (kind.startsWith('before')) expect(breakIndex).toBeLessThan(damageIndex);
      else if (kind === 'after') expect(breakIndex).toBeGreaterThan(damageIndex);
      else expect(breakIndex).toBe(-1);
    }
  });

  it('keeps starting eligibility after a member defeat and excludes defeated and nonmaterial recipients', () => {
    const result = runMatch({ teamA: three, teamB: nature, seed: 42, trace: true, overrides: { monsters: {
      20: { hp: 1 }, 14: { skills: [{ name: 'Fixture early pressure', kind: 'hit', power: 50, fixedDamage: true, all: true, mpCost: 1, priority: 10 }] },
    } } });
    const core = result.units.find((unit: { key: string }) => unit.key === 'a0');
    expect(core).toMatchObject({ repairEligible: 1, repairTriggers: 1, repairRecipients: 2, repairCancellations: 0 });
    const passive = result.trace.turns[0].events.find((event: BattleEvent) => event.kind === 'passive' && event.effect === 'material-repair');
    expect(passive.targets).toEqual(['a0', 'a2']);
    expect(result.units.find((unit: { key: string }) => unit.key === 'a1').repairReceived).toBe(0);
  });

  it('measures overhealing at the upper bound without inventing recipients for a patched nonmaterial core', () => {
    const result = runMatch({ teamA: material, teamB: nature, seed: 42, trace: true,
      overrides: { materialRepair: { percent: 100 }, monsters: { 19: { family: null } } } });
    const core = result.units.find((unit: { key: string }) => unit.key === 'a0');
    expect(core).toMatchObject({ repairEligible: 1, repairTriggers: 1, repairRecipients: 4, repairReceived: 0 });
    expect(core.repairUnusedHealing).toBeGreaterThan(0);
    expect(core.repairPotentialHealing).toBe(core.repairHealing + core.repairUnusedHealing);
    const passive = result.trace.turns[0].events.find((event: BattleEvent) => event.kind === 'passive' && event.effect === 'material-repair');
    expect(passive.targets).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('preserves absent tuning and consumed readiness in snapshots and tuned replay on either physical side', () => {
    const report = runSuite(config({ materialRepair: { percent: 11 } }));
    for (const orientation of ['a-left', 'a-right']) for (const variant of ['baseline', 'candidate']) {
      const match = report.matches.find((row: { variant: string; scenarioId: string; orientation: string }) => row.variant === variant && row.scenarioId === 'material-nature' && row.orientation === orientation);
      const replay = replayMatch(report, match.id);
      const coreKey = orientation === 'a-left' ? 'a0' : 'e0';
      expect(replay.result.traceHash).toBe(match.result.traceHash);
      for (const turn of replay.result.trace.turns) for (const unit of turn.unitsAfter as Snapshot[]) {
        if (unit.key === coreKey) {
          expect(unit.repairReady).toBe(false);
          if (variant === 'candidate') expect(unit.repairPercent).toBe(11);
          else expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
        } else expectAbsentRepair(unit);
      }
      expect(runMatch({ ...replay.request, trace: true })).toEqual(replay.result);
    }
    report.matches[0].result.traceHash = 'broken';
    expect(() => replayMatch(report, report.matches[0].id)).toThrow(/trace hash/);
  });

  it('reproduces identity candidates and reports disabled support as absent throughout the trace', () => {
    const report = runSuite(config());
    for (const baseline of report.matches.filter((row: { variant: string }) => row.variant === 'baseline')) {
      expect(report.matches.find((row: { id: string }) => row.id === baseline.id.replace(/baseline$/, 'candidate')).result).toEqual(baseline.result);
    }
    expect(report.summary.baseline.meanRepairTriggers).toBeGreaterThan(0);
    expect(report.summary.baseline.meanRepairHealing).toBeGreaterThan(0);
    expect(report.summary.baseline.meanRepairMpSpent).toBe(0);
    const disabled = runMatch({ teamA: material, teamB: nature, seed: 42, overrides: { materialRepair: { enabled: false } }, trace: true });
    for (const unit of allUnits(disabled.trace.initialState)) expectAbsentRepair(unit);
    for (const turn of disabled.trace.turns) for (const unit of turn.unitsAfter) expectAbsentRepair(unit);
    for (const unit of disabled.units) expect(unit).toMatchObject({ repairEligible: 0, repairTriggers: 0, repairHealing: 0, repairRecipients: 0, repairPotentialHealing: 0,
      repairUnusedHealing: 0, repairCancellations: 0, repairFailedBeforeTrigger: 0, repairDispelled: 0, repairDefeatedBeforeTrigger: 0, repairTriggerTurn: null, repairMpSpent: 0 });
    expect(disabled.sides.allies.mpSpent).toBeGreaterThan(0);
  });
});
