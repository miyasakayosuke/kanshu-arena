import { describe, expect, it } from 'vitest';
import * as D from './domain';
import * as E from '../engine';
const ids = Array.from({ length: 37 }, (_, i) => String(i));
const rules = D.proposedTrialRules();
const fresh = () => D.createProgress(ids, rules);
const context = (): D.BattleContext => ({ initialStateJson: JSON.stringify(E.start([0,1,2,3,4], [5,6,7,8,9], 42)), mode: 'normal', teamId: 'team-1', statRuleVersion: D.STAT_RULE_VERSION });
function battle(state: D.Progress, outcome: 'win' | 'lose' | 'draw' = 'win') {
  const started = D.beginBattle(state, context(), rules);
  return D.settleBattle(started, started.activeBattle!.sequence, { kind: 'engine-terminal', engineState: { winner: outcome } });
}
function frozen<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) frozen(child); } return value; }
describe('isolated awakening integer rules', () => {
  it('preserves all 37 level-zero records and every non-target property at every level', () => {
    const roster = [...E.start(ids.map(Number), [], 1).allies.map(unit => unit.monster)];
    expect(roster).toHaveLength(37);
    for (const monster of roster) {
      expect(D.deriveAwakeningMonster(monster, 0)).toEqual(monster);
      for (let n = 0; n <= 99; n++) {
        const next = D.deriveAwakeningMonster(monster, n);
        const { hp: _hp, atk: _atk, ...other } = next;
        const { hp: _baseHp, atk: _baseAtk, ...baseOther } = monster;
        expect(other).toEqual(baseOther);
      }
    }
  });
  it('matches an independent exact BigInt oracle at every level for bases 1..1000', () => {
    for (let base = 1; base <= 1000; base++) {
      let previous = base;
      for (let level = 0; level <= 99; level++) {
        const num = BigInt(level <= 4 ? 380 + 3 * level : 9302 + 2 * level);
        const den = BigInt(level <= 4 ? 380 : 9025);
        const product = BigInt(base) * num;
        const expected = Number(product / den + ((product % den) * 2n >= den ? 1n : 0n));
        const actual = D.awakeningStat(base, level);
        if (actual !== expected || actual < previous) throw new Error(`Mismatch ${base}/${level}`);
        previous = actual;
      }
      expect(D.awakeningStat(base, 0)).toBe(base);
    }
  });
  it('matches approved examples, plateau disclosure and last-stage edge', () => {
    expect([0,1,4,10,20,50,99].map(n => D.awakeningStat(220,n))).toEqual([220,222,227,227,228,229,232]);
    expect([0,1,4,10,20,50,99].map(n => D.awakeningStat(31,n))).toEqual([31,31,32,32,32,32,33]);
    expect(D.awakeningStat(200,98)).toBe(210); expect(D.awakeningStat(200,99)).toBe(211);
    expect(D.nextStatChange(24,4)).toBeNull(); expect(D.nextStatChange(200,98)).toEqual({ level:99,value:211 });
    expect(D.nextStatChange(220,99)).toBeNull();
  });
  it.each([-1,100,1.5,NaN,Infinity,'4',null,undefined])('rejects invalid level %s', value => {
    expect(() => D.awakeningStat(100,value as number)).toThrow();
  });
  it.each([0,-1,1.5,1_000_001,NaN,Infinity])('rejects invalid base %s', base => expect(() => D.awakeningStat(base,0)).toThrow());
  it('leaves the existing leader rounding untouched', () => {
    expect(Math.round(D.awakeningStat(170,0) * 1.15)).toBe(195);
    expect(D.awakeningStat(1_000_000,99)).toBe(1_052_632);
  });
});
describe('materials and one-stage consumption', () => {
  it('uses same-species materials first and common for the remainder, immutably', () => {
    const state = fresh(); state.common = 20; state.monsters['0'].essence = 7; state.monsters['1'].essence = 100;
    frozen(state); const next = D.upgradeOnce(state,'0',0,ids,rules);
    expect(next.monsters['0']).toEqual({ level:1,essence:0 }); expect(next.common).toBe(17);
    expect(next.monsters['1']).toEqual(state.monsters['1']); expect(state.common).toBe(20);
    expect(() => D.upgradeOnce(next,'0',0,ids,rules)).toThrow('Stale level');
  });
  it.each([0,3,4,98])('handles the cost boundary from %s', level => {
    const state = fresh(); state.monsters['0'].level = level; state.common = 30;
    const quote = D.previewUpgrade(state,'0',level,ids,rules);
    expect(quote.cost).toBe(level < 4 ? 10 : 20);
    expect(D.upgradeOnce(state,'0',level,ids,rules).monsters['0'].level).toBe(level+1);
  });
  it('does not consume anything on insufficient funds, max level, unknown ID or active battle', () => {
    const state = fresh(), original = structuredClone(state);
    expect(() => D.upgradeOnce(state,'0',0,ids,rules)).toThrow('Insufficient'); expect(state).toEqual(original);
    state.common = 100; state.monsters['0'].level = 99;
    expect(() => D.upgradeOnce(state,'0',99,ids,rules)).toThrow('maximum');
    expect(() => D.upgradeOnce(state,'retired',0,ids,rules)).toThrow('Unknown');
    expect(() => D.upgradeOnce(D.beginBattle(state,context(),rules),'1',0,ids,rules)).toThrow('settled');
  });
  it('requires explicit configurable rules, independent fixture copies, and exact table shape', () => {
    const custom = D.proposedTrialRules(); custom.stepCosts[0] = 3; custom.version = 'custom-trial';
    const state = D.createProgress(ids,custom); state.common = 3;
    expect(D.upgradeOnce(state,'0',0,ids,custom).common).toBe(0);
    expect(rules.stepCosts[0]).toBe(10);
    expect(() => D.upgradeOnce(state,'0',0,ids,rules)).toThrow('version');
    for (const costs of [[], [1], Array(99).fill(-1), Array(99).fill(0), Array(99).fill(1.1)]) expect(() => D.validateRules({...rules,stepCosts:costs})).toThrow();
  });
});
describe('battle receipt lifecycle', () => {
  it.each([['win',5,1],['lose',1,0],['draw',1,0]] as const)('credits terminal %s once', (winner,common,wins) => {
    const start = frozen(D.beginBattle(fresh(),context(),rules));
    const result = D.settleBattle(start,1,{kind:'engine-terminal',engineState:{winner}});
    expect(result.state.common).toBe(common); expect(result.state.wins).toBe(wins);
    const duplicate = D.settleBattle(frozen(result.state),1,{kind:'engine-terminal',engineState:{winner:'win'}});
    expect(duplicate.duplicate).toBe(true); expect(duplicate.state).toEqual(result.state);
    expect(duplicate.receipt).toEqual(result.receipt); expect(start.common).toBe(0);
  });
  it('accepts the actual finished engine State without reading the result UI', () => {
    let engine = E.start([0,1,2,3,4], [5,6,7,8,9], 42);
    const state = D.beginBattle(fresh(),{...context(),initialStateJson:JSON.stringify(engine)},rules);
    while (!engine.winner) engine = E.advanceWithEvents(engine,E.automaticOrders(engine)).state;
    const result = D.settleBattle(state,1,{kind:'engine-terminal',engineState:engine});
    expect(result.receipt.outcome).toBe(engine.winner);
  });
  it.each(['surrender','abandoned'] as const)('never grants for %s, including late terminal callbacks', kind => {
    const result = D.settleBattle(D.beginBattle(fresh(),context(),rules),1,{kind});
    expect(result.state.common).toBe(0); expect(result.state.wins).toBe(0);
    expect(D.settleBattle(result.state,1,{kind:'engine-terminal',engineState:{winner:'win'}}).receipt.outcome).toBe(kind);
  });
  it('rejects incomplete, foreign and stale results, and serializes only in a future storage adapter', () => {
    const first = D.beginBattle(fresh(),context(),rules);
    expect(() => D.beginBattle(first,context(),rules)).toThrow('active');
    expect(() => D.settleBattle(first,1,{kind:'engine-terminal',engineState:{winner:null}})).toThrow('terminal');
    expect(() => D.settleBattle(first,2,{kind:'engine-terminal',engineState:{winner:'win'}})).toThrow('matching');
    const done = D.settleBattle(first,1,{kind:'abandoned'}).state, second = D.beginBattle(done,context(),rules);
    expect(second.activeBattle!.sequence).toBe(2);
    expect(() => D.settleBattle(second,1,{kind:'engine-terminal',engineState:{winner:'win'}})).toThrow('matching');
  });
  it('freezes supplied context and reward rules against later caller mutation', () => {
    const supplied = D.proposedTrialRules(), ctx = context(); const state = D.beginBattle(fresh(),ctx,supplied);
    supplied.winBonusCommon = 999; ctx.teamId = 'other';
    expect(state.activeBattle!.context.teamId).toBe('team-1'); expect(D.settleBattle(state,1,{kind:'engine-terminal',engineState:{winner:'win'}}).state.common).toBe(5);
  });
  it('creates each earned selection once, permits later choice and never consumes the roster', () => {
    let state = fresh(); for (let i=0;i<20;i++) state = battle(state).state;
    expect(state.selections.map(s => s.id)).toEqual(['wins-10','wins-20']);
    const claimed = D.claimSelection(frozen(state),'wins-10','0',ids,rules);
    expect(claimed.monsters['0'].essence).toBe(10); expect(Object.keys(claimed.monsters)).toEqual(ids);
    expect(claimed.selections.map(s=>s.id)).toEqual(['wins-20']);
    expect(() => D.claimSelection(claimed,'wins-10','1',ids,rules)).toThrow('already claimed');
    expect(() => D.claimSelection(claimed,'wins-20','unknown',ids,rules)).toThrow('Unknown');
  });
  it('retains selections for maxed or overfilled targets and permits exact remaining capacity', () => {
    let state = fresh(); for(let i=0;i<10;i++) state = battle(state).state;
    state.monsters['0'].level = 99;
    expect(() => D.claimSelection(state,'wins-10','0',ids,rules)).toThrow('maximum');
    state.monsters['0'] = {level:98,essence:11};
    expect(() => D.claimSelection(state,'wins-10','0',ids,rules)).toThrow('remaining');
    expect(state.selections).toHaveLength(1); expect(state.monsters['0'].essence).toBe(11);
    state.monsters['0'].essence = 10;
    expect(D.claimSelection(state,'wins-10','0',ids,rules).monsters['0'].essence).toBe(20);
  });
  it('rejects balance and sequence overflow without mutating the input', () => {
    const state = fresh(); state.common = Number.MAX_SAFE_INTEGER;
    const started = frozen(D.beginBattle(state,context(),rules)); expect(() => D.settleBattle(started,1,{kind:'engine-terminal',engineState:{winner:'win'}})).toThrow();
    expect(started.common).toBe(Number.MAX_SAFE_INTEGER);
    const exhausted = fresh(); exhausted.nextBattleSequence = Number.MAX_SAFE_INTEGER;
    exhausted.receipt = {sequence:Number.MAX_SAFE_INTEGER-1,outcome:'abandoned',common:0,selection:null};
    expect(() => D.beginBattle(exhausted,context(),rules)).toThrow();
  });
});
describe('migration plans preserve existing saves and corrupt evidence', () => {
  const teams = frozen({ teams:[[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14]], selected:2, draft:[15,16,17,18,19], prior:[20,21,22,23,24], rule:'light' });
  it('creates zero progress only when data is absent and leaves team-save identity intact', () => {
    const plan = D.planMigration(null,teams,ids,rules); expect(plan.status).toBe('ready'); expect(plan.existingTeamSave).toBe(teams);
    if(plan.status !== 'ready') throw new Error(); expect(plan.state).toEqual(fresh()); expect(plan.backupRaw).toBeNull();
    const again = D.planMigration(JSON.stringify(plan.state),teams,ids,rules);
    expect(again.status).toBe('ready'); if(again.status === 'ready') expect(again.state).toEqual(plan.state);
  });
  it('retains unknown species, adds newly introduced species at zero, and requires raw backup before commit', () => {
    const state = fresh(); state.monsters['retired'] = {level:42,essence:17}; state.monsters['0'] = {level:4,essence:6};
    const raw = JSON.stringify(state), plan = D.planMigration(raw,teams,[...ids,'new-species'],rules);
    if(plan.status !== 'ready') throw new Error(); expect(plan.requiresAtomicBackup).toBe(true); expect(plan.backupRaw).toBe(raw);
    expect(plan.state.monsters.retired).toEqual({level:42,essence:17}); expect(plan.state.monsters['new-species']).toEqual({level:0,essence:0});
    const again = D.planMigration(JSON.stringify(plan.state),teams,[...ids,'new-species'],rules);
    if(again.status !== 'ready') throw new Error(); expect(again.requiresAtomicBackup).toBe(false); expect(again.state).toEqual(plan.state);
  });
  it.each(['','null','{bad','[]','{}'])('blocks corrupt raw data %s without resetting', raw => {
    expect(D.planMigration(raw,teams,ids,rules)).toMatchObject({status:'blocked',preservedRaw:raw,existingTeamSave:teams});
  });
  it('blocks unsupported versions, invalid levels/counts, extra derived values and duplicate rights', () => {
    const variants: unknown[] = [ {...fresh(),schemaVersion:2}, {...fresh(),economyRuleVersion:'future'}, {...fresh(),common:-1}, {...fresh(),common:1.2}, {...fresh(),wins:'10'}, {...fresh(),hp:100}, {...fresh(),wins:1} ];
    const badLevel = fresh(); badLevel.monsters['0'].level = 100; variants.push(badLevel);
    let rights = fresh(); for(let i=0;i<10;i++) rights = battle(rights).state; rights.selections = [{id:'wins-10',atWins:10,amount:10},{id:'wins-10',atWins:10,amount:10}]; variants.push(rights);
    for(const value of variants) { const raw = JSON.stringify(value); expect(D.planMigration(raw,teams,ids,rules)).toMatchObject({status:'blocked',preservedRaw:raw}); }
  });
  it('blocks inconsistent win receipts and orphaned sequence counters', () => {
    const state = battle(fresh()).state; state.wins = 0;
    expect(() => D.validateProgress(state)).toThrow('without a win');
    const orphan = fresh(); orphan.nextBattleSequence = 2;
    expect(() => D.validateProgress(orphan)).toThrow('Missing latest');
    let tenth = fresh(); for(let i=0;i<10;i++) tenth = battle(tenth).state;
    tenth.receipt!.selection!.atWins = 9; tenth.receipt!.selection!.id = 'wins-9';
    expect(() => D.validateProgress(tenth)).toThrow('receipt selection');
  });
  it('reloads active and settled progress without accidental credits', () => {
    const active = D.beginBattle(fresh(),context(),rules);
    for(const state of [active, D.settleBattle(active,1,{kind:'engine-terminal',engineState:{winner:'win'}}).state]) {
      const plan = D.planMigration(JSON.stringify(state),teams,ids,rules); if(plan.status !== 'ready') throw new Error(); expect(plan.state).toEqual(state);
    }
  });
});
