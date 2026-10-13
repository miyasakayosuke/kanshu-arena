import { describe, expect, it } from 'vitest';
import { advanceWithEvents, DEFEND, BASIC_ATTACK, DEMON_PRESSURE, monsters, mpDamageFor, start } from './engine';
import type { BattleEvent, BattleOrderRecord, Skill, State, Unit } from './engine';
// @ts-ignore Development-only JavaScript shared with Node's native TypeScript loader.
import { createBattle, replayMatch, runMatch, runSuite, validateOverrides } from '../scripts/balance-lab/core.mjs';

const demons = [29, 1, 8, 30, 31];
const three = [29, 1, 8, 6, 10];
const two = [29, 1, 2, 6, 10];
const nature = [14, 3, 6, 9, 10];
const nonleader = [1, 29, 8, 6, 10];
const noCore = [1, 8, 30, 6, 10];
const claw = monsters[29].skills[0]!;
const allUnits = (state: State) => [...state.allies, ...state.enemies];
const absentBonus = (unit: object) => expect(Object.hasOwn(unit, 'mpDamageBonus')).toBe(false);
type Snapshot = { key: string; mpDamageBonus?: number };
type Turn = { turn: number; events: BattleEvent[]; orders: BattleOrderRecord[]; unitsAfter: Snapshot[] };
type Trace = { initialState: State; finalState: State; turns: Turn[] };
const config = (overrides = {}) => ({ schemaVersion: 1, suiteId: 'demon-contract', seeds: [0, 42], costLimit: 17,
  teams: [{ id: 'demons', ids: demons, role: 'qualified pressure' }, { id: 'nature', ids: nature, role: 'ward opponents' }],
  scenarios: [{ id: 'demon-nature', a: 'demons', b: 'nature', keyUnitId: 29 }],
  candidate: { id: 'trial', label: 'Isolated demon contract', overrides } });

// Synthetic survival and resource budgets exercise accounting, not balance evidence.
const paid: Skill = { name: 'Fixture paid anchor', kind: 'hit', power: 40, mpCost: 16, priority: -2 };
const guarding: Skill = { name: 'Fixture guard', kind: 'guard', power: 0, mpCost: 0, priority: 1 };
const pressure = (guard = false) => ({ monsters: Object.fromEntries([...demons, ...nature].map(id => [id,
  { hp: 1500, atk: 0, speed: id === 29 ? 100 : 0, mp: id === 29 ? 64 : 16,
    skills: id === 29 ? [claw] : nature.includes(id) ? [guard ? guarding : paid] : [] }])) });

function assertEventLedger(trace: Trace) {
  const current = new Map(allUnits(trace.initialState).map(unit => [unit.key, structuredClone(unit)]));
  let losses = 0;
  for (const turn of trace.turns) {
    let previous: BattleEvent | undefined;
    for (const event of turn.events) {
      const target = current.get(event.target!);
      if (event.kind === 'resource-loss') {
        losses++;
        const actor = current.get(event.actor!)!;
        expect(event).toMatchObject({ effect: 'mp-damage', phase: 'action' });
        expect(event).not.toHaveProperty('hp');
        expect(event.actor![0]).not.toBe(event.target![0]);
        expect(previous).toMatchObject({ kind: 'damage', actor: event.actor, target: event.target });
        expect(target!.hp).toBeGreaterThan(0);
        const skill = actor.monster.skills.find(skill => skill.name === event.skill)!;
        const scale = Math.min(target!.guard ? 0.5 : 1, target!.ward ? 1 - (target!.wardPercent ?? 10) / 100 : 1);
        const amount = Math.min(target!.mp, Math.floor(mpDamageFor(actor, skill) * scale));
        expect(event.amount).toBe(amount);
        expect(event.mp).toBe(target!.mp - amount);
      }
      if (target) {
        if (event.hp !== undefined) target.hp = event.hp;
        if (event.mp !== undefined) target.mp = event.mp;
        if (event.guard !== undefined) target.guard = event.guard;
        if (event.ward !== undefined) target.ward = event.ward;
      }
      previous = event;
    }
  }
  for (const unit of allUnits(trace.finalState)) expect(current.get(unit.key)!.mp).toBe(unit.mp);
  return losses;
}

describe('demon Lab schema and isolated starting resources', () => {
  it.each([{}, { enabled: true }, { enabled: false }, { base: 0 }, { base: 6, bonus: 4 }, { base: 30, bonus: 30 },
    { bonus: 0 }, { enabled: false, base: 30, bonus: 30 }])('accepts bounded independent pressure overrides %#', demonPressure => {
    expect(() => validateOverrides({ demonPressure })).not.toThrow();
  });

  it.each([null, false, [], 6, '6', { enabled: 1 }, { enabled: null }, { enabled: undefined },
    { minimumMembers: 2 }, { coreId: 1 }, { base: 6, typo: 1 },
    ...['base', 'bonus'].flatMap(field => [-1, 31, 1.5, NaN, Infinity, '6', null, undefined].map(value => ({ [field]: value })))])
  ('rejects malformed or unknown pressure configuration %#', demonPressure => {
    expect(() => validateOverrides({ demonPressure })).toThrow(/demonPressure/);
  });

  it.each([0, 6, 30])('accepts a bounded paid single-hit MP-damage field %s', mpDamage => {
    expect(() => validateOverrides({ monsters: { 29: { skills: [{ ...claw, mpDamage }] } } })).not.toThrow();
  });

  it.each([{ mpDamage: -1 }, { mpDamage: 31 }, { mpDamage: 1.5 }, { mpDamage: NaN }, { mpDamage: Infinity },
    { mpDamage: '6' }, { mpDamage: null }, { mpDamage: undefined }, { mpCost: 0 }, { kind: 'heal' }, { kind: 'guard' },
    { kind: 'poison' }, { kind: 'protect' }, { kind: 'cleanse' }, { kind: 'restoreMp' }, { all: true }, { randomHits: 1 },
    { fixedDamage: true }, { breaksGuard: true }, { breaksGuardAfterHit: true }, { dragonChargeFinisher: true }])
  ('rejects MP damage on unsupported skill shapes %#', patch => {
    expect(() => validateOverrides({ monsters: { 29: { skills: [{ ...claw, ...patch }] } } })).toThrow();
  });

  it.each([0, 42, 0xffffffff])('preserves shipping defaults through unrelated roster rebuilds at seed %s', seed => {
    for (const team of [demons, three, two, nonleader, noCore]) {
      const stock = start(team, nature, seed, { leaders: true });
      expect(createBattle(team, nature, seed)).toEqual(stock);
      for (const overrides of [{ demonPressure: {} }, { slimeSupply: {} }, { monsters: { 0: { mp: monsters[0].mp } } }]) {
        const rebuilt: State = createBattle(team, nature, seed, overrides);
        expect(rebuilt.allies).toEqual(stock.allies);
        expect(rebuilt.enemies).toEqual(stock.enemies);
      }
    }
  });

  it('tunes every explicitly MP-marked skill without adding pressure to unmarked attacks', () => {
    const custom = { ...claw, name: 'Fixture alternate pressure', mpDamage: 9 };
    const patch = { monsters: { 30: { skills: [custom, monsters[30].skills[1]!] } } };
    const before = structuredClone(monsters);
    for (const tuning of [{ base: 12 }, { enabled: false, base: 12 }]) {
      const state: State = createBattle(demons, demons, 42, { ...patch, demonPressure: tuning });
      for (const unit of allUnits(state).filter(unit => [29, 30].includes(unit.monster.id))) {
        expect(unit.monster.skills[0]!.mpDamage).toBe('enabled' in tuning ? 0 : 12);
        expect(unit.monster.skills[1]).not.toHaveProperty('mpDamage');
        if (unit.monster.id === 30) absentBonus(unit);
      }
    }
    expect(createBattle(demons, nature, 42, patch).allies[3].monster.skills[0].mpDamage).toBe(9);
    expect(monsters).toEqual(before);
  });

  it('recomputes membership after family patches, even when the core is not the leader', () => {
    const before = structuredClone(monsters);
    for (const team of [demons, three, nonleader]) for (const unit of allUnits(createBattle(team, team, 42, { demonPressure: { bonus: 0 } }))) {
      if (unit.monster.id === 29) expect(unit.mpDamageBonus).toBe(0);
      else absentBonus(unit);
    }
    for (const team of [two, noCore]) for (const unit of allUnits(createBattle(team, team, 42, { demonPressure: { bonus: 9 } }))) absentBonus(unit);
    expect(createBattle(two, two, 42, { monsters: { 2: { family: 'demon' } } }).allies[0].mpDamageBonus).toBe(4);
    for (const unit of allUnits(createBattle(three, three, 42, { monsters: { 8: { family: null } } }))) absentBonus(unit);
    for (const unit of allUnits(createBattle(three, three, 42, { monsters: { 29: { family: null } } }))) absentBonus(unit);
    // The core ID remains required; its own family is not required if three other demons remain.
    expect(createBattle(demons, demons, 42, { monsters: { 29: { family: null } } }).allies[0].mpDamageBonus).toBe(4);
    expect(monsters).toEqual(before);
  });

  it('separates disabled pressure, zero base and zero bonus without changing production data', () => {
    const before = structuredClone(monsters);
    for (const team of [demons, two]) {
      const disabled: State = createBattle(team, team, 42, { demonPressure: { enabled: false, base: 30, bonus: 30 } });
      for (const unit of allUnits(disabled)) {
        absentBonus(unit);
        if (unit.monster.id === 29) expect(mpDamageFor(unit, unit.monster.skills[0]!)).toBe(0);
      }
    }
    const baseOnly: Unit = createBattle(demons, nature, 42, { demonPressure: { bonus: 0 } }).allies[0];
    expect(baseOnly.mpDamageBonus).toBe(0);
    expect(baseOnly.monster.skills[0]!.mpDamage).toBe(DEMON_PRESSURE.base);
    expect(mpDamageFor(baseOnly, baseOnly.monster.skills[0]!)).toBe(6);
    const zeroBase: Unit = createBattle(demons, nature, 42, { demonPressure: { base: 0, bonus: 30 } }).allies[0];
    expect(mpDamageFor(zeroBase, zeroBase.monster.skills[0]!)).toBe(0);
    const capped: Unit = createBattle(demons, nature, 42, { demonPressure: { base: 30, bonus: 30 } }).allies[0];
    expect(mpDamageFor(capped, capped.monster.skills[0]!)).toBe(30);
    expect(monsters).toEqual(before);
  });
});

describe('demon Lab loss ledger, actual casts and replay', () => {
  it.each([false, true])('accounts source and target MP independently on either physical side (%s)', reverse => {
    const result = runMatch({ teamA: reverse ? nature : demons, teamB: reverse ? demons : nature, seed: 42,
      overrides: pressure(), trace: true });
    const trace: Trace = result.trace;
    const events = trace.turns.flatMap(turn => turn.events);
    expect(assertEventLedger(trace)).toBeGreaterThan(0);
    expect(events.filter(event => event.kind === 'resource-gain' && event.effect !== 'turn-mp-recovery')).toHaveLength(0);
    const losses = events.filter(event => event.kind === 'resource-loss');
    for (const unit of result.units) {
      const lost = losses.filter(event => event.target === unit.key).reduce((sum, event) => sum + event.amount!, 0);
      const inflicted = losses.filter(event => event.actor === unit.key).reduce((sum, event) => sum + event.amount!, 0);
      expect(unit.mpDamageReceived).toBe(lost);
      expect(unit.mpDamageActual).toBe(inflicted);
      const inflictedEvents = losses.filter(event => event.actor === unit.key);
      expect(unit.mpDamageEvents).toBe(inflictedEvents.length);
      expect(unit.mpDamageZeroEvents).toBe(inflictedEvents.filter(event => event.amount === 0).length);
      expect(unit.mpDamagePotential).toBe(unit.mpDamageActual + unit.mpDamageMitigated + unit.mpDamageClipped);
      expect(unit.pressureTargetMpBefore).toBe(inflictedEvents.reduce((sum, event) => sum + event.mp! + event.amount!, 0));
      expect(unit.pressureTargetMpAfter).toBe(inflictedEvents.reduce((sum, event) => sum + event.mp!, 0));
      expect(unit.fallbackCasts).toBe(events.filter(event => event.kind === 'fallback' && event.actor === unit.key).length);
      expect(unit.initialMp + unit.mpGenerated - unit.mpSpent - unit.mpDamageReceived).toBe(unit.finalMp);
      expect(unit.mpSpent).toBe(events.filter(event => event.kind === 'resource' && event.actor === unit.key).reduce((sum, event) => sum + event.amount!, 0));
    }
    const sourceSide = reverse ? 'enemies' : 'allies', targetSide = reverse ? 'allies' : 'enemies';
    const totalLoss = losses.reduce((sum, event) => sum + event.amount!, 0);
    expect(result.sides[sourceSide].mpDamageActual).toBe(totalLoss);
    expect(result.sides[targetSide].mpDamageReceived).toBe(totalLoss);
    expect(result.sides[sourceSide].mpGenerated).toBe(result.sides[sourceSide].turnMpRecovered);
  });

  it.each([10, 75])('validates guard and ward using the strongest protection with ward %s', percent => {
    // A fully explicit mechanic control guarantees guard and ward overlap;
    // tactical AI is now allowed to avoid guarded recipients.
    const initialState: State = createBattle(demons, nature, 42, { ...pressure(true), openingWard: { percent } });
    const result = advanceWithEvents(initialState, initialState.allies.map((unit,index)=>({key:unit.key,skill:index===0?0:DEFEND,...(index===0?{target:'e0'}:{})})), {enemyOrders: initialState.enemies.map(unit=>({key:unit.key,skill:DEFEND}))});
    const trace: Trace = {initialState,finalState:result.state,turns:[{turn:1,events:result.events,orders:result.state.history!.at(-1)!.orders,unitsAfter:result.state.enemies}]};
    expect(assertEventLedger(trace)).toBeGreaterThan(0);
    const first = result.events.find((event: BattleEvent) => event.kind === 'resource-loss')!;
    expect(first.amount).toBe(percent === 10 ? 5 : 2);
  });

  it.each([false,true])('distinguishes fresh allied choice from the fixed CPU anchor fallback (pressure on enemies=%s)', reverse => {
    const result = runMatch({ teamA: reverse?nature:demons, teamB: reverse?demons:nature, seed: 42, overrides: pressure(), trace: true });
    const trace: Trace = result.trace;
    const recipient=reverse?'a0':'e0';
    const loss = trace.turns[0].events.find(event => event.kind === 'resource-loss')!;
    expect(loss).toMatchObject({target:recipient,amount:9,mp:7});
    const fallback=trace.turns[0].events.find(event=>event.kind==='fallback');
    const recorded=trace.turns[0].orders.find(order => order.key === recipient)!;
    if(reverse){expect(fallback).toBeUndefined();expect(recorded).toMatchObject({skill:BASIC_ATTACK,source:'automatic',accepted:true,decisionPriority:0});}
    else {expect(fallback).toMatchObject({actor:recipient,fromSkill:0,toSkill:BASIC_ATTACK,requiredMP:16,queuePriority:-2});expect(recorded).toMatchObject({skill:0,source:'automatic',accepted:true});expect(recorded.decisionPriority).toBeUndefined();}
    const actorEvents = trace.turns[0].events.filter(event => event.actor === recipient);
    expect(actorEvents.filter(event => event.kind === 'cast')).toEqual([expect.objectContaining({ skill: '通常攻撃', effect: 'hit' })]);
    expect(actorEvents.filter(event => event.kind === 'resource')).toHaveLength(0);
    const metric = result.units.find((unit: { key: string }) => unit.key === recipient);
    expect(metric.fallbackCasts).toBe(trace.turns.flatMap(turn=>turn.events).filter(event=>event.kind==='fallback'&&event.actor===recipient).length);
    const debits=trace.turns.flatMap(turn=>turn.events).filter(event=>event.kind==='resource'&&event.actor===recipient);expect(metric.mpSpent).toBe(debits.reduce((sum,event)=>sum+event.amount!,0));expect(metric.paidCasts).toBe(debits.length);
    expect(metric.specialCasts).toBe(trace.turns.flatMap(turn=>turn.events).filter(event=>event.kind==='cast'&&event.actor===recipient&&event.skill!=='通常攻撃'&&event.skill!=='ぼうぎょ').length);
    expect(metric.casts).toBe(trace.turns.flatMap(turn => turn.events).filter(event => event.kind === 'cast' && event.actor === recipient).length);
  });

  it('counts HP kills separately instead of inventing an MP-loss event or potential budget', () => {
    const overrides = pressure();
    for (const id of nature) overrides.monsters[id].hp = 20;
    const result = runMatch({ teamA: demons, teamB: nature, seed: 42, overrides, trace: true });
    const core = result.units.find((unit: { key: string }) => unit.key === 'a0');
    expect(core.pressureCasts).toBeGreaterThan(0);
    expect(core.mpDamageKilledTargets).toBe(core.pressureCasts);
    expect(core).toMatchObject({ mpDamageActual: 0, mpDamageEvents: 0, mpDamagePotential: 0, mpDamageReceived: 0 });
    expect(result.trace.turns.flatMap((turn: Turn) => turn.events).filter((event: BattleEvent) => event.kind === 'resource-loss')).toHaveLength(0);
  });

  it('preserves absent-versus-zero bonus in snapshots and reproduces tuned/identity reports', () => {
    const report = runSuite(config({ demonPressure: { bonus: 0 } }));
    for (const orientation of ['a-left', 'a-right']) for (const variant of ['baseline', 'candidate']) {
      const match = report.matches.find((row: { scenarioId: string; orientation: string; variant: string }) =>
        row.scenarioId === 'demon-nature' && row.orientation === orientation && row.variant === variant);
      const replay = replayMatch(report, match.id);
      expect(replay.result.traceHash).toBe(match.result.traceHash);
      const key = orientation === 'a-left' ? 'a0' : 'e0';
      for (const turn of replay.result.trace.turns) for (const unit of turn.unitsAfter as Snapshot[]) {
        if (unit.key === key) expect(unit.mpDamageBonus).toBe(variant === 'candidate' ? 0 : 4);
        else absentBonus(unit);
      }
      expect(runMatch({ ...replay.request, trace: true })).toEqual(replay.result);
    }
    const identity = runSuite(config());
    for (const baseline of identity.matches.filter((row: { variant: string }) => row.variant === 'baseline')) {
      expect(identity.matches.find((row: { id: string }) => row.id === baseline.id.replace(/baseline$/, 'candidate')).result).toEqual(baseline.result);
    }
    const disabled = runMatch({ teamA: demons, teamB: nature, seed: 42, overrides: { demonPressure: { enabled: false } }, trace: true });
    for (const unit of allUnits(disabled.trace.initialState)) absentBonus(unit);
    for (const turn of disabled.trace.turns) for (const unit of turn.unitsAfter) absentBonus(unit);
    expect(disabled.trace.turns.flatMap((turn: Turn) => turn.events).filter((event: BattleEvent) => event.kind === 'resource-loss')).toHaveLength(0);
  });
});
