import * as historical from '../tests/reference-v02030/engine';
import { describe, expect, it } from 'vitest';
import { autoOrders, monsters, poisonCashoutPerTickFor, start, type BattleEvent, type Skill, type State, type Unit } from './engine';
// @ts-ignore Development-only lab loaded through the native Node TypeScript loader.
import { createBattle, replayMatch, runMatch, runSuite, validateOverrides } from '../scripts/balance-lab/core.mjs';
const pure = [32, 4, 33, 34, 35], mixed = [32, 4, 35, 3, 10], nature = [14, 3, 6, 9, 10];
const cash = monsters[32].skills[0]!;
const units = (s: State) => [...s.allies, ...s.enemies];
const config = (overrides = {}) => ({ schemaVersion: 1, suiteId: 'undead-contract', seeds: [0, 42], costLimit: 17,
 teams: [{ id: 'undead', ids: pure, role: 'pure17' }, { id: 'nature', ids: nature, role: 'old15' }],
 scenarios: [{ id: 'fixture', a: 'undead', b: 'nature', keyUnitId: 32 }], candidate: { id: 'trial', label: 'Isolated undead contract', overrides } });
const synthetic = (mode = 'poison') => ({ monsters: Object.fromEntries([...pure, ...nature].map(id => [id,
 { hp: 1000, atk: 0, speed: id === 4 ? 100 : id === 32 ? 40 : 0, mp: id === 32 ? 62 : 300,
 skills: id === 32 ? [cash] : id === 4 ? [monsters[4].skills[1]!] : nature.includes(id) && mode === 'guard' ? [{ name: 'Fixture guard', kind: 'guard', power: 0, mpCost: 0, priority: 1 }] : [] }])) });

describe('undead strict isolated Lab configuration', () => {
 it.each([{}, {enabled:true}, {enabled:false}, {base:0}, {bonus:0}, {base:30,bonus:30}, {enabled:false,base:30,bonus:30}])('accepts independent bounded tuning %#', undeadCashout => expect(() => validateOverrides({undeadCashout})).not.toThrow());
 it.each([null,false,[],14,'14',{enabled:0},{enabled:undefined},{coreId:32},{minimumMembers:2},
 ...['base','bonus'].flatMap(k => [-1,31,1.5,NaN,Infinity,'8',null,undefined].map(v => ({[k]:v})))])('rejects malformed tuning %#', undeadCashout => expect(() => validateOverrides({undeadCashout})).toThrow(/undeadCashout/));
 it.each([0,14,30])('permits a bounded plain paid single-hit field%s', poisonCashout => expect(() => validateOverrides({monsters:{32:{skills:[{...cash,poisonCashout}]}}})).not.toThrow());
 it.each([{poisonCashout:-1},{poisonCashout:31},{poisonCashout:1.5},{poisonCashout:NaN},{poisonCashout:undefined},{poisonCashout:null},{mpCost:0},{mpDamage:0},{mpDamage:6},{all:true},{randomHits:1},{breaksGuard:true},{breaksGuardAfterHit:true},{fixedDamage:true},{dragonChargeFinisher:true},...['heal','cleanse','guard','protect','poison','restoreMp'].map(kind=>({kind}))])('rejects unsupported cashout skill shapes %#', patch => expect(() => validateOverrides({monsters:{32:{skills:[{...cash,...patch}]}}})).toThrow());
 it('keeps stock/rebuilt states, nonleader eligibility and independent base/bonus gates', () => {
  const before=JSON.stringify(monsters);
  for(const team of [pure,mixed,[4,32,33,34,35],[32,4,2,3,10],[28,4,33,34,35]]) {
   const stock=start(team,nature,42,{leaders:true});expect(createBattle(team,nature,42)).toEqual(stock);
   for(const overrides of [{undeadCashout:{}},{demonPressure:{}},{monsters:{0:{mp:monsters[0].mp}}}]) expect(units(createBattle(team,nature,42,overrides))).toEqual(units(stock));
  }
  for(const [tuning,bonus,perTick] of [[{bonus:0},0,14],[{base:0},8,0],[{base:30,bonus:30},30,30],[{enabled:false,base:30,bonus:30},undefined,0]] as const) {
   const state=createBattle(pure,nature,42,{undeadCashout:tuning});expect(state.allies[0].poisonCashoutBonus).toBe(bonus);expect(poisonCashoutPerTickFor(state.allies[0],state.allies[0].monster.skills[0])).toBe(perTick);
  }
  expect(createBattle(pure,nature,42,{monsters:{35:{family:null},34:{family:null},33:{family:null}}}).allies[0]).not.toHaveProperty('poisonCashoutBonus');
  expect(JSON.stringify(monsters)).toBe(before);
 });
 it('uses the same core32 public-state policy under absent or zero skill field despite stale bonus', () => {
  for(const poisonCashout of [0,undefined]) {const s=createBattle(pure,nature,42);s.allies[0].monster.skills=[{...cash,poisonCashout},monsters[32].skills[1]!];s.enemies[0].hp=90;s.enemies[1].hp=30;
   const original=structuredClone(s);const chosen=autoOrders(s)[0];expect(chosen.skill).toBe(1);expect(s).toEqual(original);expect(poisonCashoutPerTickFor(s.allies[0],s.allies[0].monster.skills[0])).toBe(0);
  }
 });
});

describe('undead actual impact and resource accounting',()=>{
 it.each(['poison','guard'])('counts actual cashout, mitigation and sacrificed ticks under explicit %s mechanic controls',mode=>{
  for(const reverse of [false,true]) {const r=runMatch({teamA:reverse?nature:pure,teamB:reverse?pure:nature,seed:42,overrides:synthetic(mode),trace:true,policy:'explicit-snapshot'});const key=reverse?'e0':'a0',core=r.units.find((u:Unit)=>u.key===key);
   const events=r.trace.turns.flatMap((t:{events:unknown[]})=>t.events);const consumed=events.filter((e:{kind:string;actor:string})=>e.kind==='poison-cashout'&&e.actor===key);
   expect(consumed.length).toBeGreaterThan(0);expect(core.cashoutEvents).toBe(consumed.length);expect(core.cashoutCasts).toBe(consumed.length);expect(core.cashoutMpSpent).toBe(consumed.length*18);
   expect(core.cashoutTicksConsumed).toBe(consumed.reduce((n:number,e:{poisonTicksConsumed:number})=>n+e.poisonTicksConsumed,0));expect(core.cashoutAddedBasis).toBe(core.cashoutTicksConsumed*22);
   expect(core.cashoutActualAddedDamage).toBeGreaterThan(0);expect(core.cashoutFuturePoisonNominal).toBeGreaterThan(core.cashoutActualAddedDamage);if(mode==='guard')expect(core.cashoutGuardedEvents).toBeGreaterThan(0);
   // The explicit snapshot control preserves the original repeated-cashout mechanic fixture.
   expect(core.cashoutSurvivingTargets).toBe(consumed.length);
   expect(r.units.find((u:Unit)=>u.key===(reverse?'e1':'a1')).poisonReapplicationsAfterCashout).toBe(consumed.length);
   for(const event of consumed) expect(events.findIndex((next:BattleEvent,index:number)=>index>events.indexOf(event)&&next.kind==='poison'&&next.target===event.target)).toBeGreaterThan(events.indexOf(event));
   for(const u of r.units){const initial=units(r.trace.initialState).find(x=>x.key===u.key)!;expect(u.finalMp).toBe(initial.mp+u.mpGenerated-u.mpSpent-u.mpDamageReceived);expect(u.finalHp).toBe(initial.hp+u.hpHealingReceived-u.hpDamageTaken);}
  }
 });
 it('disables consumption AND addition at zero base, while bonus-only off retains consumption',()=>{
  for(const tuning of [{enabled:false},{base:0},{bonus:0}]) {const r=runMatch({teamA:pure,teamB:nature,seed:42,overrides:{...synthetic(),undeadCashout:tuning},trace:true});const c=r.units[0];if('bonus'in tuning){expect(c.cashoutTicksConsumed).toBeGreaterThan(0);expect(c.cashoutAddedBasis).toBe(c.cashoutTicksConsumed*14);}else{expect(c.cashoutEvents).toBe(0);expect(c.cashoutActualAddedDamage).toBe(0);expect(c.cashoutTicksConsumed).toBe(0);}}
 });
 it('preserves replay hashes and identity candidates under the default same-AI policy',()=>{
  const report=runSuite(config({undeadCashout:{bonus:0}}));for(const m of report.matches.filter((m:{scenarioId:string})=>m.scenarioId==='fixture')){const replay=replayMatch(report,m.id);expect(replay.result.traceHash).toBe(m.result.traceHash);expect(runMatch({...replay.request,trace:true})).toEqual(replay.result);}
  const identity=runSuite(config());for(const m of identity.matches.filter((m:{variant:string})=>m.variant==='baseline'))expect(identity.matches.find((c:{id:string})=>c.id===m.id.replace(/baseline$/,'candidate')).result).toEqual(m.result);
 });
 it('retains the historical impact=1, reservation=false loss and three-tick overkill fixture',()=>{
  // This original loss is a historical mechanic control, not an outcome promised by the adopted defaults.
  let state=historical.start(pure,nature,42,{leaders:true,poisonImpactScale:1,reservePoison:false});
  const cashouts: historical.BattleEvent[]=[];let addedDamage=0,kills=0,decisiveKills=0;
  const step=(seed:number)=>(Math.imul(seed,1664525)+1013904223)>>>0;
  while(!state.winner){const result=historical.advanceWithEvents(state,historical.autoOrders(state),{enemyOrders:historical.autoOrders(state,'enemies')});
   const current=new Map([...state.allies,...state.enemies].map(unit=>[unit.key,structuredClone(unit)]));
   let seed=state.seed;for(const order of result.state.history!.at(-1)!.orders)if(order.accepted)seed=step(seed);
   const bases=new Map<string,number>();let pending:historical.BattleEvent|undefined;
   for(const event of result.events){
    if(event.kind==='cast'){const source=current.get(event.actor!)!,order=result.state.history!.at(-1)!.orders.find(order=>order.key===event.actor)!;bases.set(event.actor!,historical.baseDamage(source,historical.battleSkill(source.monster,order.skill)!));}
    if(event.kind==='poison-cashout'&&event.actor==='a0'){cashouts.push(event);pending=event;}
    if(event.kind==='damage'&&event.effect!=='poison'){
     seed=step(seed);const roll=(90+seed%21)/100;
     if(pending){const target=current.get(event.target!)!,without=Math.min(target.hp,Math.max(1,Math.floor(bases.get(event.actor!)!*roll*historical.directDamageScale(target))));
      addedDamage+=event.amount!-without;if(event.hp===0)kills++;if(event.hp===0&&without<target.hp)decisiveKills++;pending=undefined;}
    }
    if(event.target&&current.has(event.target)){const target=current.get(event.target)!;for(const field of ['hp','mp','guard','poison','ward','rally'] as const)if(event[field]!==undefined)Object.assign(target,{[field]:event[field]});}
   }state=result.state;}
  expect(state.winner).toBe('lose');expect(cashouts).toHaveLength(1);expect(cashouts[0].poisonTicksConsumed).toBe(3);expect(addedDamage).toBe(0);expect(kills).toBe(1);expect(decisiveKills).toBe(0);

 });
});
