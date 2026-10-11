import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, monsters, type State, type BattleEvent } from './engine';
// @ts-ignore Development-only JavaScript.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine',async original=>{const actual=await original<typeof import('./engine')>();return {...actual,advanceWithEvents:vi.fn(actual.advanceWithEvents)};});
const pure=[32,4,33,34,35],nature=[14,3,6,9,10];
const fixture={monsters:Object.fromEntries([...pure,...nature].map(id=>[id,{hp:1000,atk:0,speed:id===4?100:id===32?40:0,mp:300,skills:id===32?[monsters[32].skills[0]!]:id===4?[monsters[4].skills[1]!]:[]}]))};
const req={teamA:pure,teamB:nature,seed:42,overrides:fixture};
type Failure=Error&{trace:{activeAttempt:{turn:number;unitsBefore:{key:string;poisonCashoutBonus?:number}[]};turns:{events:BattleEvent[]}[];initialState:State;lastState:State}};
const capture=(request:object=req):Failure=>{try{runMatch(request);}catch(e){expect(e).toBeInstanceOf(MatchFailure);return e as Failure;}throw Error('Expected preserved failure');};
beforeEach(async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);});
describe('undead Lab failure resource snapshots',()=>{
 it.each([false,true])('preserves absent/default/zero bonus on first and partial failure right=%s',async reverse=>{
  const actual=await vi.importActual<typeof import('./engine')>('./engine');
  for(const tuning of [{},{bonus:0},{enabled:false}])for(const turn of [1,2]){vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);if(turn===2)vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents);vi.mocked(advanceWithEvents).mockImplementationOnce(()=>{throw Error('Injected undead failure');});
   const f=capture({...req,teamA:reverse?nature:pure,teamB:reverse?pure:nature,overrides:{...fixture,undeadCashout:tuning}});expect(f.message).toBe('Injected undead failure');expect(f.trace.turns).toHaveLength(turn-1);expect(f.trace.activeAttempt.turn).toBe(turn);
   for(const u of f.trace.activeAttempt.unitsBefore)if(u.key===(reverse?'e0':'a0')&&!('enabled'in tuning))expect(u.poisonCashoutBonus).toBe('bonus'in tuning?0:8);else expect(Object.hasOwn(u,'poisonCashoutBonus')).toBe(false);
   expect(JSON.parse(JSON.stringify(f.trace))).toEqual(f.trace);
  }
 });
 it.each([undefined,null,false,'8',-1,0,9,31,1.5,NaN,Infinity])('rejects changed immutable opening bonus %#',async poisonCashoutBonus=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,p)=>{const r=actual.advanceWithEvents(s,o,p);Object.assign(r.state.allies[0],{poisonCashoutBonus});return r;});const f=capture();expect(f.message).toMatch(/resource invariant/);expect(f.trace.turns).toHaveLength(1);});
 it.each(['hp','mp','poison'] as const)('rejects unrecorded %s changes',async field=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,p)=>{const r=actual.advanceWithEvents(s,o,p);r.state.allies[0][field]++;return r;});expect(capture().message).toMatch(/ledger|resource invariant/);});
});
describe('undead Lab authoritative cashout invariants',()=>{
 it.each(['missing','duplicate','after-hit','missing-hit','wrong-target','wrong-actor','wrong-skill','wrong-phase','wrong-effect','negative-ticks','too-many-ticks','fractional-ticks','wrong-ticks','missing-ticks','wrong-coefficient','negative-coefficient','large-coefficient','wrong-addition','wrong-poison','hp-gain','mp-gain','wrong-damage','extra-cast'] as const)('rejects %s and preserves the entire failing stream',async mode=>{
  const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,p)=>{const r=actual.advanceWithEvents(s,o,p);const i=r.events.findIndex(e=>e.kind==='poison-cashout');expect(i).toBeGreaterThan(0);const e=r.events[i],hit=r.events[i+1];expect(hit.kind).toBe('damage');
   if(mode==='missing')r.events.splice(i,1);else if(mode==='duplicate')r.events.splice(i+1,0,structuredClone(e));else if(mode==='after-hit')[r.events[i],r.events[i+1]]=[hit,e];else if(mode==='missing-hit')r.events.splice(i+1,1);
   else if(mode==='wrong-target')e.target=e.target==='e0'?'e1':'e0';else if(mode==='wrong-actor')e.actor='a1';else if(mode==='wrong-skill')e.skill='bad';else if(mode==='wrong-phase')e.phase='turn-end';else if(mode==='wrong-effect')e.effect='mp';
   else if(mode==='negative-ticks')e.poisonTicksConsumed=-1;else if(mode==='too-many-ticks')e.poisonTicksConsumed=4;else if(mode==='fractional-ticks')e.poisonTicksConsumed=1.5;else if(mode==='wrong-ticks')e.poisonTicksConsumed=0;else if(mode==='missing-ticks')delete e.poisonTicksConsumed;
   else if(mode==='wrong-coefficient')e.poisonCashoutPerTick=14;else if(mode==='negative-coefficient')e.poisonCashoutPerTick=-1;else if(mode==='large-coefficient')e.poisonCashoutPerTick=31;else if(mode==='wrong-addition')e.poisonCashoutAdded!++;else if(mode==='wrong-poison')e.poison=1;
   else if(mode==='hp-gain')e.hp=1000;else if(mode==='mp-gain')e.mp=300;else if(mode==='wrong-damage')hit.amount!++;else if(mode==='extra-cast')r.events.splice(i+2,0,structuredClone(r.events.find(v=>v.kind==='cast'&&v.actor===e.actor)!));return r;});
  const f=capture();expect(f.message).toMatch(/cashout|cast|HP|MP/);expect(f.trace.turns).toHaveLength(1);expect(f.trace.activeAttempt.turn).toBe(1);expect(f.trace.turns[0].events.length).toBeGreaterThan(0);
 });
});

describe('undead lethal impact evidence is mandatory',()=>{
 it.each(['missing-defeat','wrong-actor','wrong-target','after-phase','duplicate-defeat'] as const)('rejects %s after a cashout lethal hit',async mode=>{
  const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents).mockImplementationOnce((s,o,p)=>{const r=actual.advanceWithEvents(s,o,p),i=r.events.findIndex(e=>e.kind==='poison-cashout');expect(i).toBeGreaterThan(0);expect(r.events[i+1]).toMatchObject({kind:'damage',hp:0});const d=r.events[i+2];expect(d.kind).toBe('defeat');if(mode==='missing-defeat')r.events.splice(i+2,1);else if(mode==='wrong-actor')d.actor='a1';else if(mode==='wrong-target')d.target=d.target==='e0'?'e1':'e0';else if(mode==='after-phase')r.events.splice(i+2,0,{kind:'phase',phase:'action-end',actor:d.actor});else r.events.splice(i+3,0,structuredClone(d));return r;});
  const f=capture({teamA:pure,teamB:nature,seed:42});expect(f.message).toMatch(/defeat|lethal/);expect(f.trace.turns).toHaveLength(2);expect(f.trace.activeAttempt.turn).toBe(2);
 });
});
