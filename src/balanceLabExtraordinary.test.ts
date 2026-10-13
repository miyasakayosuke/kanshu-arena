import {describe,it,expect} from 'vitest';
import {monsters,start,assignedFamilyCount,extraordinaryResponseEligible,autoOrders} from './engine';
// @ts-ignore Development-only native Node Lab.
import {createBattle,runMatch,validateOverrides,runSuite,replayMatch} from '../scripts/balance-lab/core.mjs';
const mixed=[36,12,2,30,26],ward=[36,14,10,20,35],nature=[14,3,6,9,10];
const units=(s:ReturnType<typeof start>)=>[...s.allies,...s.enemies];
describe('extraordinary isolated typed Lab contract',()=>{
 it.each([{}, {enabled:true},{enabled:false}])('accepts only independent response enabled control %#',extraordinaryResponse=>expect(()=>validateOverrides({extraordinaryResponse})).not.toThrow());
 it.each([null,false,[],24,'true',{enabled:0},{enabled:null},{enabled:undefined},{enabled:'false'},{coreId:36},{mpCost:0},{maxUses:2},{minimumFamilies:3}])('rejects malformed response tuning %#',extraordinaryResponse=>expect(()=>validateOverrides({extraordinaryResponse})).toThrow(/extraordinaryResponse/));
 it.each([0,1])('accepts exact typed stock response%i',i=>expect(()=>validateOverrides({monsters:{36:{skills:[monsters[36].skills[i]]}}})).not.toThrow());
 it.each([{all:false},{all:undefined},{power:1},{mpCost:0},{mpCost:23},{priority:1},{randomHits:1},{mpDamage:0},{poisonCashout:0},{breaksGuard:false},{breaksGuardAfterHit:true},{fixedDamage:false},{dragonChargeFinisher:false},{familyBonusHit:'beast'}])('rejects unsupported response modifiers %#',patch=>expect(()=>validateOverrides({monsters:{36:{skills:[{...monsters[36].skills[0],...patch}]}}})).toThrow());
 it('preserves stock and every prior allowance through unrelated or explicit-enabled rebuilding',()=>{
  const before=JSON.stringify(monsters);
  for(const t of [mixed,ward,[12,36,2,30,26],[36,12,2,10,9],[36,12,4,20,26],[19,20,21,22,23],[24,25,26,27,28],[29,1,8,30,31],[32,4,33,34,35],[15,5,16,17,18]]){
   const stock=start(t,mixed,42,{leaders:true});expect(createBattle(t,mixed,42)).toEqual(stock);
   for(const overrides of [{extraordinaryResponse:{}},{extraordinaryResponse:{enabled:true}},{demonPressure:{}},{undeadCashout:{}},{monsters:{0:{mp:monsters[0].mp}}}])expect(units(createBattle(t,mixed,42,overrides))).toEqual(units(stock));
  }
  expect(JSON.stringify(monsters)).toBe(before);
 });
 it('fixes three/four/five-tag eligibility from the assigned original roster, both sides and nonleader',()=>{
  for(const team of [[36,12,2,10,9],mixed,[36,12,4,20,26],[12,36,2,30,26]])for(const reverse of [false,true]){
   const s:ReturnType<typeof start>=createBattle(reverse?nature:team,reverse?team:nature,42,{extraordinaryResponse:{enabled:true}}),own=reverse?s.enemies:s.allies,core=own.find(u=>u.monster.id===36)!;
   expect(core.responseReady).toBe(assignedFamilyCount(own)>=4?true:undefined);const ready=core.responseReady;own.filter(u=>u!==core).forEach(u=>u.hp=0);expect(core.responseReady).toBe(ready);expect(extraordinaryResponseEligible(own)).toBe(ready===true);
  }
  const absent=createBattle(mixed,nature,42,{extraordinaryResponse:{enabled:false}});expect(absent.allies[0]).not.toHaveProperty('responseReady');expect(absent.allies[0].mp).toBe(58);
  expect(createBattle(mixed,nature,42,{monsters:{30:{family:'beast'}}}).allies[0]).not.toHaveProperty('responseReady');
 });
 it.each([[mixed],[ward]])('conserves both choices, current MP, poison and exact local guard accounting %#',team=>{
  for(const reverse of [false,true]){const r=runMatch({teamA:reverse?nature:team,teamB:reverse?team:nature,seed:42,trace:true});const k=reverse?'e0':'a0',core=r.units.find((u:{key:string})=>u.key===k),events=r.trace.turns.flatMap((t:{events:unknown[]})=>t.events);
   expect(core.responseCasts).toBeLessThanOrEqual(1);expect(core.responseCasts).toBe(core.responseCleanseCasts+core.responseGuardCasts);expect(core.responseMpSpent).toBe(core.responseCasts*24);expect(core.responseSourceMpAtCast-core.responseMpAfterCast).toBe(core.responseMpSpent);
   expect(core.responseGuardActualPrevented).toBeGreaterThanOrEqual(0);expect(events.filter((e:{kind:string;actor:string})=>e.kind==='response'&&e.actor===k)).toHaveLength(core.responseCasts);
   for(const u of r.units){expect(u.finalMp).toBe(u.initialMp+u.mpGenerated-u.mpSpent-u.mpDamageReceived);const initial=units(r.trace.initialState).find(x=>x.key===u.key)!;expect(u.finalHp).toBe(initial.hp+u.hpHealingReceived-u.hpDamageTaken);expect(u.responseUnused).toBe(u.responseDeadWithUnused+u.responseSurvivedUnused);}
  }
 });
 it('counts actual clear, nominal ticks and reapplication separately without any response healing',()=>{
  const overrides={monsters:Object.fromEntries(ward.map(id=>[id,{hp:1000,atk:0,mp:300,speed:id===10?100:id===36?10:0,skills:id===36?monsters[36].skills:id===10?[monsters[10].skills[1]]:[]}]))};const r=runMatch({teamA:ward,teamB:ward,seed:0,overrides,trace:true});const c=r.units[0];expect(c.responseCleanseCasts).toBe(1);expect(c.responseClearedTicks).toBeGreaterThan(0);expect(c.responseClearNominalPotential).toBeGreaterThan(0);expect(c.responseLaterReapplications).toBeGreaterThan(0);
  expect(r.trace.turns.flatMap((t:{events:{kind:string;effect?:string}[]})=>t.events).some((e:{kind:string;effect?:string})=>e.kind==='heal'&&e.effect?.startsWith('extraordinary'))).toBe(false);
 });
 it('never borrows natural slime MP and retains exact enabled control and disabled shared policy',()=>{
  const cfg={schemaVersion:1,suiteId:'extraordinary-contract',seeds:[0,42],costLimit:17,teams:[{id:'mixed',ids:mixed,role:'C17'},{id:'nature',ids:nature,role:'C15'}],scenarios:[{id:'fixture',a:'mixed',b:'nature',keyUnitId:36}],candidate:{id:'enabled',label:'Stock-enabled',overrides:{extraordinaryResponse:{enabled:true}}}};
  const report=runSuite(cfg);for(const row of report.matches.filter((m:{variant:string})=>m.variant==='baseline')){const other=report.matches.find((m:{id:string})=>m.id===row.id.replace(/baseline$/,'candidate'));expect(other.result.units).toEqual(row.result.units);expect(other.result.winner).toBe(row.result.winner);const replay=replayMatch(report,other.id);expect(replay.verified).toBe(true);}
  const s=createBattle(mixed,nature,42,{extraordinaryResponse:{enabled:false}}),before=structuredClone(s);expect(autoOrders(s)).toEqual(autoOrders(before));const off=runMatch({teamA:mixed,teamB:nature,seed:42,overrides:{extraordinaryResponse:{enabled:false}}});expect(off.units[0].responseCasts).toBe(0);expect(off.units[0].mpGenerated).toBe(0);
 });
});
