import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-ignore Development-only native Node module is tested by Vitest.
import { validateOverrides, createBattle, runMatch, buildSchedule, isAdjudicatedState } from '../scripts/balance-lab/core.mjs';
// @ts-ignore Development-only study helper is exercised independently.
import { readMatrix, deriveConfigs, reverseRow, scoreForA, sideForA, packPayload, unpackPayload, MATRIX_SHA256, sha } from '../scripts/balance-lab/all-family-support.mjs';
import { start, autoOrders, advanceWithEvents, BASIC_ATTACK, DEFEND } from './engine';

describe('all-family fixed inputs and isolated controls',()=>{
  it('retains the exact immutable roster and all three disjoint seed sets',()=>{
    const f=readMatrix();expect(sha(readFileSync('docs/all-family-matrix-freeze.json'))).toBe(MATRIX_SHA256);
    expect(f.teams).toHaveLength(24);expect(f.teams.filter((t:any)=>t.cost===17)).toHaveLength(20);expect(f.teams.find((t:any)=>t.id==='fullnature').cost).toBe(15);
    expect(new Set([...f.matrixSeeds,...f.counterSeeds,...f.reserveCounterSeeds]).size).toBe(144);
  });
  it('derives every scale in both arms, never redraws seeds and stays within the legacy workload cap',()=>{
    const f=readMatrix(),configs=deriveConfigs(f);expect(configs).toHaveLength(24);
    let required=0;for(const e of configs){const s=buildSchedule(e.config);expect(s.cases.length).toBeLessThanOrEqual(20000);if(e.phase!=='reserve')required+=s.cases.length;
      expect(e.config.seeds).toEqual(e.phase==='matrix'?f.matrixSeeds:e.phase==='counter'?f.counterSeeds:f.reserveCounterSeeds);
    }expect(required).toBe(132096);
  });
  it('strictly validates scalar/boolean overrides while preserving explicit zero and false',()=>{
    for(const value of [-1,1.01,NaN,Infinity,null,undefined,'0',true,{},[]])expect(()=>validateOverrides({poisonImpactScale:value})).toThrow();
    for(const value of [0,1,'false',null,undefined,{},[]])expect(()=>validateOverrides({reservePoison:value})).toThrow();
    expect(validateOverrides({poisonImpactScale:0,reservePoison:false})).toEqual({poisonImpactScale:0,reservePoison:false});
    const ids=[14,3,6,10,28],other=[36,12,2,30,26],s=createBattle(ids,other,42,{poisonImpactScale:0,reservePoison:false});
    expect(s.reservePoison).toBe(false);expect([...s.allies,...s.enemies].every((u:any)=>u.poisonImpactScale===0)).toBe(true);
    expect(createBattle(ids,other,42)).toEqual(start(ids,other,42,{leaders:true}));
  });
  it('reverses the logical row and physical metrics without duplicating a physical game',()=>{
    const row={teamAId:'a',teamBId:'b',orientation:'a-left',result:{winner:'win',sides:{allies:{directDamage:40},enemies:{directDamage:20}}}};
    expect(scoreForA(row)).toBe(1);expect(scoreForA(reverseRow(row))).toBe(0);expect(sideForA(reverseRow(row))).toBe('enemies');expect(reverseRow(reverseRow(row))).toEqual(row);
  });
  it('losslessly packs null, false, zero, arrays and full resource records and rejects corruption',()=>{
    const value=[{id:'row',result:{winner:'draw',units:[{zero:0,flag:false,deathTurn:null}],sides:{allies:{hp:0}}}}];
    const packed=packPayload(value);expect(unpackPayload(packed)).toEqual(value);expect(()=>unpackPayload({...packed,sha256:'0'.repeat(64)})).toThrow();
  });
  it('records zero-scale poison applications with no direct HP leakage and deterministic replay',()=>{
    const request={teamA:[14,3,6,10,28],teamB:[36,12,2,30,26],seed:42,overrides:{poisonImpactScale:0,reservePoison:false},trace:true};
    const r=runMatch(request);expect(r.units.reduce((n:number,u:any)=>n+u.poisonApplications,0)).toBeGreaterThan(0);expect(r.units.every((u:any)=>u.poisonDirectHp===0)).toBe(true);
    expect(r.traceHash).toBe(runMatch(request).traceHash);
    const poisonActors=new Set<string>();for(const turn of r.trace.turns){poisonActors.clear();for(const event of turn.events){if(event.kind==='cast'&&event.effect==='poison')poisonActors.add(event.actor);if(event.kind==='phase'&&event.phase==='before-action')poisonActors.delete(event.actor);expect(event.kind==='damage'&&poisonActors.has(event.actor)).toBe(false);}}
    expect(typeof r.adjudicated).toBe('boolean');
  });
  it('keeps the per-turn observer RNG aligned at all three scales in both policy arms',()=>{
    for(const reservePoison of [false,true])for(const poisonImpactScale of [1,.5,0]){
      const r=runMatch({teamA:[32,4,33,3,10],teamB:[36,12,2,30,26],seed:43,overrides:{poisonImpactScale,reservePoison},trace:true});
      for(const turn of r.trace.turns)expect(Number.isInteger(turn.seedAfter)).toBe(true);
      for(const u of r.units)expect(u.poisonApplications).toBe(u.poisonNewApplications+u.poisonRedundantApplications+u.poisonRefreshApplications);
    }
  });
  it('distinguishes actual turn20 adjudication from a turn20 elimination',()=>{
    const initial=()=>{const state=structuredClone(start([0,1,2,3,4],[5,6,7,8,9],42));for(const side of ['allies','enemies'] as const)state[side].forEach((u,i)=>{u.hp=i===0?20:0;u.monster.hp=20;u.monster.atk=0;u.monster.speed=side==='allies'?100:1;u.monster.skills=[];});return state;};
    let eliminated=initial();for(let i=0;i<20;i++)eliminated=advanceWithEvents(eliminated,[{key:'a0',skill:BASIC_ATTACK,target:'e0'}],{enemyOrders:[{key:'e0',skill:BASIC_ATTACK,target:'a0'}]}).state;
    expect(eliminated.turn).toBe(21);expect(eliminated.winner).toBe('win');expect(eliminated.enemies[0].hp).toBe(0);expect(isAdjudicatedState(eliminated)).toBe(false);
    let judged=initial();for(let i=0;i<20;i++)judged=advanceWithEvents(judged,[{key:'a0',skill:DEFEND}],{enemyOrders:[{key:'e0',skill:DEFEND}]}).state;
    expect(judged.turn).toBe(21);expect(judged.winner).toBe('draw');expect(isAdjudicatedState(judged)).toBe(true);
  });
  it('reconciles all sampled turn states with explicit production orders on both physical sides',()=>{
    let state=createBattle([14,3,6,10,28],[36,12,2,30,26],44,{poisonImpactScale:0,reservePoison:true});
    for(let i=0;i<3&&!state.winner;i++){const allies=autoOrders(state,'allies'),enemies=autoOrders(state,'enemies');state=advanceWithEvents(state,allies,{enemyOrders:enemies}).state;expect(state.history.at(-1)?.orders.every((o:any)=>o.source==='explicit'&&o.accepted)).toBe(true);}
  });
});
