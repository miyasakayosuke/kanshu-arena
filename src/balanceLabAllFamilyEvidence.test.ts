import { describe, expect, it } from 'vitest';
// @ts-ignore Development-only read-only evidence guards.
import { validateSuiteHeader, validateScheduledRow, validateExtensionCompletion, validateCounterSeedPanel } from '../scripts/balance-lab/all-family-evidence-contract.mjs';
// @ts-ignore Development-only deterministic hashing.
import { sha } from '../scripts/balance-lab/all-family-support.mjs';
const cases=[{id:'a',scenarioId:'pair',kind:'matchup',variant:'candidate',orientation:'a-left',seed:42,teamAId:'a',teamBId:'b',request:{teamA:[0,1,2,3,4],teamB:[5,6,7,8,9],seed:42,overrides:{}}}];
const source={engineSha256:'engine',labSha256:'lab',familySha256:'family'};
const entry={id:'suite',phase:'matrix',arm:'independent',scale:.5,shell:null,matches:1,path:'config.json',scheduleSha256:sha(JSON.stringify(cases)),canonicalSha256:'canonical',fileSha256:'file'};
const index={status:'complete',suite:'suite',phase:'matrix',arm:'independent',scale:.5,shell:null,executedMatches:1,scheduledMatches:1,configPath:'config.json',scheduleSha256:entry.scheduleSha256,configSha256:'canonical',configFileSha256:'file',derivedFreezeSha256:'derived',source};
const result={winner:'win',turns:3,turnLimit:false,adjudicated:false,units:Array.from({length:10},(_,i)=>({key:`u${i}`})),traceHash:'a'.repeat(64)};
const {request,...metadata}=cases[0];
const row={...metadata,result,resultSha256:sha(JSON.stringify(result))};
const reserveEntry={id:'reserve-one',phase:'reserve',arm:'independent',scale:.5,shell:'dryas',matches:1792};
const second={...reserveEntry,id:'reserve-two',shell:'tengu'};
const manifest={source,reserveRule:{rule:'frozen'},configs:[reserveEntry,second]};
const decision={source,rule:manifest.reserveRule,authorizedSuiteIds:['reserve-one'],triggers:[{arm:'independent',scale:.5,shell:'dryas'}]};
const reserveIndex={status:'complete',executedMatches:1792,scheduledMatches:1792};
const initial=Array.from({length:64},(_,i)=>i+1),reserved=Array.from({length:64},(_,i)=>i+65);
const panel=(seeds:number[])=>({games:seeds.length*2,bySeed:Object.fromEntries(seeds.map(seed=>[seed,{games:2}])),orientations:{'a-left':{games:seeds.length},'a-right':{games:seeds.length}}});
describe('analysis requires bound complete evidence before declaring results',()=>{
  it('accepts the exact frozen source/config/schedule/count and row',()=>{expect(()=>validateSuiteHeader(entry,{source},index,{cases},'derived')).not.toThrow();expect(()=>validateScheduledRow(row,cases[0])).not.toThrow();});
  it.each(['status','suite','phase','arm','scale','shell','executedMatches','scheduledMatches','configPath','scheduleSha256','configSha256','configFileSha256','derivedFreezeSha256','source'])('rejects stale/misrouted suite %s',field=>{const changed={...index,[field]:field==='source'?{...source,engineSha256:'stale'}:'wrong'};expect(()=>validateSuiteHeader(entry,{source},changed,{cases},'derived')).toThrow(/binding/);});
  it.each(['id','scenarioId','kind','variant','orientation','seed','teamAId','teamBId','resultSha256'])('rejects altered row %s',field=>{expect(()=>validateScheduledRow({...row,[field]:'wrong'},cases[0])).toThrow(/binding/);});
  it('rejects missing scheduled row, extra row, changed result and malformed outcome',()=>{expect(()=>validateSuiteHeader({...entry,matches:2},{source},index,{cases},'derived')).toThrow();expect(()=>validateScheduledRow(row,undefined)).toThrow();expect(()=>validateScheduledRow({...row,result:{...result,turns:4}},cases[0])).toThrow();const bad={...result,adjudicated:true};expect(()=>validateScheduledRow({...row,result:bad,resultSha256:sha(JSON.stringify(bad))},cases[0])).toThrow(/schema/);});
});
describe('reserved counters cannot be relabeled or incompletely combined',()=>{
  it('accepts only the authorized complete extension set',()=>{expect([...validateExtensionCompletion(manifest,decision,{'reserve-one':reserveIndex})]).toEqual(['reserve-one']);});
  it('rejects missing and partial authorized suites',()=>{expect(()=>validateExtensionCompletion(manifest,decision,{})).toThrow(/incomplete|missing/);expect(()=>validateExtensionCompletion(manifest,decision,{'reserve-one':{...reserveIndex,status:'running'}})).toThrow(/incomplete/);expect(()=>validateExtensionCompletion(manifest,decision,{'reserve-one':{...reserveIndex,executedMatches:1791}})).toThrow(/incomplete/);});
  it('rejects unauthorized reserve indexes, wrong decisions, duplicated and unknown authorizations',()=>{
    expect(()=>validateExtensionCompletion(manifest,decision,{'reserve-one':reserveIndex,'reserve-two':reserveIndex})).toThrow(/Unauthorized/);
    for(const changed of [{...decision,source:{...source,engineSha256:'old'}},{...decision,rule:{}},{...decision,authorizedSuiteIds:['reserve-one','reserve-one']},{...decision,authorizedSuiteIds:['unknown']},{...decision,authorizedSuiteIds:[]},{...decision,triggers:[]}])expect(()=>validateExtensionCompletion(manifest,changed,{'reserve-one':reserveIndex})).toThrow();
  });
  it('requires exactly128 distinct seeds after an authorized extension, and64 otherwise',()=>{expect(()=>validateCounterSeedPanel(panel(initial),initial,reserved,false)).not.toThrow();expect(()=>validateCounterSeedPanel(panel([...initial,...reserved]),initial,reserved,true)).not.toThrow();expect(()=>validateCounterSeedPanel(panel(initial),initial,reserved,true)).toThrow();expect(()=>validateCounterSeedPanel(panel([...initial,...reserved]),initial,reserved,false)).toThrow();});
  it('rejects substituted seeds, duplicated rows and missing orientations even at the expected nominal count',()=>{expect(()=>validateCounterSeedPanel(panel([0,...initial.slice(1)]),initial,reserved,false)).toThrow();const duplicate=panel(initial);duplicate.bySeed[1].games++;expect(()=>validateCounterSeedPanel(duplicate,initial,reserved,false)).toThrow();const side=panel(initial);side.orientations['a-right'].games--;expect(()=>validateCounterSeedPanel(side,initial,reserved,false)).toThrow();});
});

// @ts-ignore Development-only descriptive statistics.
import { meanUnitMetrics } from '../scripts/balance-lab/all-family-statistics.mjs';
describe('nullable timing denominators remain explicit',()=>{
  it('uses observed deaths rather than all appearances for conditional mean death turn',()=>{const value=meanUnitMetrics({appearances:2,sum:{deathTurn:5,mpSpent:12},observations:{deathTurn:1,mpSpent:2}});expect(value.mean.deathTurn).toBe(5);expect(value.mean.mpSpent).toBe(6);expect(value.conditionalObservations.deathTurn).toBe(1);});
  it('preserves real zero resources and returns null when no timing event occurred',()=>{const value=meanUnitMetrics({appearances:2,sum:{mpSpent:0},observations:{mpSpent:2}});expect(value.mean.mpSpent).toBe(0);expect(value.mean.deathTurn).toBe(null);expect(value.mean.supplyTurn).toBe(null);expect(value.conditionalObservations.deathTurn).toBe(0);});
});
