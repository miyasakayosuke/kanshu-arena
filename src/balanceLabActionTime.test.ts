import {beforeEach,describe,it,expect,vi} from 'vitest';
import {advanceWithEvents,AUTO,DEFEND} from './engine';
// @ts-ignore Development-only native Node Lab.
import {runMatch,POLICY_ID,MatchFailure} from '../scripts/balance-lab/core.mjs';
vi.mock('./engine',async original=>{const actual=await original<typeof import('./engine')>();return {...actual,advanceWithEvents:vi.fn(actual.advanceWithEvents)};});
const request={teamA:[0,2,3,4,6],teamB:[1,5,8,10,6],seed:42,trace:true};
beforeEach(async()=>{const actual=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(advanceWithEvents).mockReset().mockImplementation(actual.advanceWithEvents);});
describe('primary Lab exercises deferred shipping choices and retains honest controls',()=>{
  it('submits allied AUTO and omits enemy orders to exercise the shipping pre-turn CPU',()=>{
    const result=runMatch(request);expect(POLICY_ID).toContain('action-time');
    for(const [state,orders,options] of vi.mocked(advanceWithEvents).mock.calls){
      expect(orders).toEqual(state.allies.filter(unit=>unit.hp>0).map(unit=>({key:unit.key,skill:AUTO})));
      expect(options?.enemyOrders).toBeUndefined();
    }
    for(const turn of result.trace.turns){
      expect(new Set(turn.orders.map((order:{key:string})=>order.key)).size).toBe(turn.orders.length);
      expect(turn.orders.every((order:{source:string})=>order.source==='automatic')).toBe(true);
      for(const order of turn.orders)if(order.accepted){expect(order.skill).not.toBe(AUTO);if(order.side==='allies'){expect(Number.isFinite(order.decisionPriority)).toBe(true);expect(Number.isFinite(order.nativePriority)).toBe(true);}else{expect(order.decisionPriority).toBeUndefined();expect(order.nativePriority).toBeUndefined();}}
    }
  });
  it('labels an opt-in explicit snapshot mechanic control and keeps it off the default path',()=>{
    const result=runMatch({...request,policy:'explicit-snapshot'});
    expect(result.trace.policy).toBe('explicit-snapshot');
    expect(result.trace.turns.flatMap((turn:{orders:{source:string}[]})=>turn.orders).every((order:{source:string})=>order.source==='explicit')).toBe(true);
    expect(()=>runMatch({...request,policy:'made-up'})).toThrow('unknown match policy');
  });
  it.each(['source','duplicate-actor','native-priority','checkpoint','skill-name','skill','target','seed','enemy-skill','enemy-target','enemy-late-checkpoint'] as const)('rejects corrupted %s without weakening the authoritative ledger',async mode=>{
    const actual=await vi.importActual<typeof import('./engine')>('./engine');
    vi.mocked(advanceWithEvents).mockImplementationOnce((state,orders,options)=>{
      const result=actual.advanceWithEvents(state,orders,options),records=result.state.history!.at(-1)!.orders;
      const order=records.find(order=>mode.startsWith('enemy-')?order.side==='enemies'&&order.accepted:order.accepted&&order.skill>=0&&order.target?.startsWith('e'))!;
      expect(order).toBeTruthy();
      if(mode==='source')order.source='explicit';
      else if(mode==='duplicate-actor')records[1].key=records[0].key;
      else if(mode==='native-priority')order.nativePriority=99;
      else if(mode==='checkpoint')order.decisionPriority=99;
      else if(mode==='skill-name')order.skillName='fabricated';
      else if(mode==='skill')order.skill=DEFEND;
      else if(mode==='target')order.target='a0';
      else if(mode==='enemy-skill')order.skill=order.skill===DEFEND?-1:DEFEND;
      else if(mode==='enemy-target')order.target='e0';
      else if(mode==='enemy-late-checkpoint')order.decisionPriority=0;
      else result.state.seed=(result.state.seed+1)>>>0;
      return result;
    });
    let failure:Error|undefined;try{runMatch(request);}catch(error){failure=error as Error;}
    expect(failure).toBeInstanceOf(MatchFailure);expect(failure!.message).toMatch(/shipping|automatic|checkpoint|RNG|legacy enemy/);
  });
});
