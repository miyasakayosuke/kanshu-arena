import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceWithEvents } from './engine';
// @ts-ignore Development-only native Node Lab.
import { runMatch, MatchFailure } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine',async original=>{const actual=await original<typeof import('./engine')>();return {...actual,advanceWithEvents:vi.fn(actual.advanceWithEvents)};});
const nature=[14,3,6,10,28],janus=[36,12,2,30,26];
const request={teamA:nature,teamB:janus,seed:42,overrides:{poisonImpactScale:0,reservePoison:false}};
const capture=(req:object=request)=>{try{runMatch(req);}catch(e){expect(e).toBeInstanceOf(MatchFailure);return e as Error&{request:any;trace:any};}throw Error('Expected preserved failure');};
beforeEach(async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);});
describe('systemic controls and zero-impact failure evidence',()=>{
  it.each([false,true])('keeps explicit zero/false in first and partial failure snapshots, right=%s',async reverse=>{
    const actual=await vi.importActual<typeof import('./engine')>('./engine');
    for(const turn of [1,2]){vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);if(turn===2)vi.mocked(advanceWithEvents).mockImplementationOnce(actual.advanceWithEvents);vi.mocked(advanceWithEvents).mockImplementationOnce(()=>{throw Error('Injected zero-impact failure');});
      const failure=capture({...request,teamA:reverse?janus:nature,teamB:reverse?nature:janus});expect(failure.message).toBe('Injected zero-impact failure');expect(failure.trace.turns).toHaveLength(turn-1);expect(failure.request.overrides).toEqual({poisonImpactScale:0,reservePoison:false});expect(failure.trace.initialState.reservePoison).toBe(false);expect(failure.trace.lastState.reservePoison).toBe(false);expect(failure.trace.activeAttempt.unitsBefore.every((u:any)=>u.poisonImpactScale===0)).toBe(true);expect(JSON.parse(JSON.stringify(failure.trace))).toEqual(failure.trace);
    }
  });
  it.each(['scale','reservation'] as const)('rejects silent control changes: %s',async mode=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockImplementationOnce((s,o,p)=>{const result=actual.advanceWithEvents(s,o,p);if(mode==='scale')result.state.enemies[0].poisonImpactScale=.5;else result.state.reservePoison=true;return result;});expect(capture().message).toMatch(/poison.*changed/);});
  it.each(['damage','missing-application','duplicate-application'] as const)('rejects corrupted zero-scale impact stream: %s',async mode=>{
    const actual=await vi.importActual<typeof import('./engine')>('./engine');let changed=false;vi.mocked(advanceWithEvents).mockImplementation((s,o,p)=>{const result=actual.advanceWithEvents(s,o,p),i=result.events.findIndex(e=>e.kind==='poison');if(i<0||changed)return result;changed=true;const event=result.events[i];if(mode==='damage')result.events.splice(i,0,{kind:'damage',actor:event.actor,target:event.target,amount:1,hp:100,phase:'action'});else if(mode==='missing-application')result.events.splice(i,1);else result.events.splice(i,0,structuredClone(event));return result;});
    const failure=capture();expect(changed).toBe(true);expect(failure.message).toMatch(/zero-scale poison|RNG|HP\/poison|guard.*reconstruction|cashout.*damage/);expect(failure.trace.activeAttempt).toBeDefined();expect(failure.trace.turns.length).toBeGreaterThan(0);
  });
});
