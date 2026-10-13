import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents } from './engine';
import type { State } from './engine';
// @ts-ignore Development-only lab.
import { MatchFailure, runMatch } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine',async original=>{const actual=await original<typeof import('./engine')>();return {...actual,advanceWithEvents:vi.fn(actual.advanceWithEvents)};});
const pure=[24,25,26,27,28],nature=[14,3,6,9,10];
const pressure={monsters:Object.fromEntries(pure.map(id=>[id,{hp:1200,mp:30}])),slimeSupply:{amount:11}};
const request={teamA:pure,teamB:nature,seed:42,overrides:pressure};
beforeEach(async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);});
const capture=(r=request)=>{try{runMatch(r);}catch(e){expect(e).toBeInstanceOf(MatchFailure);return e as Error&{trace:{turns:unknown[];activeAttempt:{unitsBefore:{key:string;supplyReady?:boolean;supplyAmount?:number}[]};lastState:State}};}throw Error('Expected preserved supply failure');};
describe('slime malformed state and preserved partial failures',()=>{
 it.each([false,true])('preserves optional ready/tuned fields in failed attempt on right=%s',async reverse=>{vi.mocked(advanceWithEvents).mockImplementationOnce(()=>{throw Error('Injected supply resolver failure');});const f=capture({...request,teamA:reverse?nature:pure,teamB:reverse?pure:nature});expect(f.message).toBe('Injected supply resolver failure');expect(f.trace.turns).toHaveLength(0);const key=reverse?'e0':'a0';expect(f.trace.activeAttempt.unitsBefore.find(u=>u.key===key)).toMatchObject({supplyReady:true,supplyAmount:11});for(const u of f.trace.activeAttempt.unitsBefore)if(u.key!==key){expect(Object.hasOwn(u,'supplyReady')).toBe(false);expect(Object.hasOwn(u,'supplyAmount')).toBe(false);}});
 it.each([{supplyReady:undefined},{supplyReady:0},{supplyReady:'false'},{supplyReady:null},{supplyAmount:12},{supplyAmount:undefined},{supplyAmount:-1},{supplyAmount:31},{supplyAmount:1.5},{supplyAmount:NaN},{supplyAmount:Infinity}])('rejects malformed/replaced isolated state %#',async patch=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,opt)=>{const r=actual.advanceWithEvents(s,o,opt);Object.assign(r.state.allies[0],patch);return r;});const f=capture();expect(f.message).toMatch(/resource invariant/);expect(f.trace.turns).toHaveLength(1);});
 it('rejects created readiness on an ineligible noncore',async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,opt)=>{const r=actual.advanceWithEvents(s,o,opt);r.state.allies[1].supplyReady=false;return r;});expect(capture().message).toMatch(/resource invariant/);});
 it('rejects unrecorded MP credit even while below maximum',async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,opt)=>{const r=actual.advanceWithEvents(s,o,opt);const recipient=r.state.allies.find(unit=>unit.mp<unit.monster.mp)!;expect(recipient).toBeDefined();recipient.mp++;return r;});expect(capture().message).toMatch(/MP ledger/);});
});
describe('slime event credit and once-only action invariants',()=>{
 it.each(['duplicate-spend','spend-target','spend-phase','missing-spend','wrong-target','duplicate-gain','missing-gain','amount','absolute-mp','gain-phase','gain-as-heal','supply-as-debit','reenable','break-supply','cast-effect','debit-amount','unrecorded-credit','missing-cast'] as const)('preserves and rejects %s corruption',async kind=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');let changed=false;vi.mocked(advanceWithEvents).mockImplementation((s,o,opt)=>{const r=actual.advanceWithEvents(s,o,opt);const index=r.events.findIndex(e=>e.kind==='supply');if(index<0||changed)return r;changed=true;const spend=r.events[index],gainIndex=r.events.findIndex(e=>e.kind==='resource-gain'),gain=r.events[gainIndex];
 if(kind==='duplicate-spend')r.events.splice(index+1,0,structuredClone(spend));
 if(kind==='spend-target')spend.target='a1';
 if(kind==='spend-phase')spend.phase='turn-end';
 if(kind==='missing-spend')r.events.splice(index,1);
 if(kind==='wrong-target')gain.target='e0';
 if(kind==='duplicate-gain')r.events.splice(gainIndex+1,0,structuredClone(gain));
 if(kind==='missing-gain')r.events.splice(gainIndex,1);
 if(kind==='amount')gain.amount!++;
 if(kind==='absolute-mp')gain.mp!++;
 if(kind==='gain-phase')gain.phase='turn-end';
 if(kind==='gain-as-heal')gain.kind='heal';
 if(kind==='supply-as-debit')gain.kind='resource';
 if(kind==='reenable')r.events.push({kind:'expire',target:'a0',supplyReady:true});
 if(kind==='break-supply')r.events.push({kind:'break',target:'a0',supplyReady:false});
 if(kind==='cast-effect')r.events.find(e=>e.kind==='cast'&&e.effect==='restoreMp')!.effect='heal';
 if(kind==='debit-amount'){const debit=r.events.find(e=>e.kind==='resource');if(debit)debit.amount!++;else r.events.push({kind:'resource',actor:'a0',target:'a0',amount:1,mp:1,effect:'mp'});}
 if(kind==='unrecorded-credit')r.state.allies[0].mp++;
 if(kind==='missing-cast')r.events=r.events.filter(e=>!(e.kind==='cast'&&e.effect==='restoreMp'));
 return r;});const f=capture();expect(changed).toBe(true);expect(f.message).toMatch(/supply|MP|resource invariant/);expect(f.trace.turns.length).toBeGreaterThan(0);});
});
