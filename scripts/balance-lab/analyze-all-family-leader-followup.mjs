#!/usr/bin/env node
/** Full read-only evidence verification, fixed replay samples, then descriptive aggregation. */
import{readFileSync,writeFileSync,existsSync}from'node:fs';import{isDeepStrictEqual}from'node:util';
import{buildSchedule,runMatch}from'./core.mjs';
import{sha,load,saveNew,writeBoundedRecords}from'./all-family-support.mjs';
import{readFollowup,verifiedFollowup,readFollowupSuite,DERIVED,ROOT,ANALYSIS,fresh,add,finish,validatePanel,counterPass,recommendationPartition,pairedDifference}from'./all-family-leader-followup.mjs';
const f=readFollowup(),m=verifiedFollowup(),counter={},janus={},details=[],baseline=new Map(),replays=[];let rows=0,identities=0,baselineRepeats=0;
const mechanical=r=>{const{traceHash,...rest}=r;return rest;};
for(const entry of m.configs){
 const schedule=buildSchedule(load(entry.path)),n=schedule.cases.length,samples=new Set([0,1,Math.floor(n/4),Math.floor(n/4)+1,Math.floor(n/2),Math.floor(n/2)+1,Math.floor(n*3/4),Math.floor(n*3/4)+1,n-2,n-1]);
 const pairs={},summaries={},mirrors={};let position=0,pending=null;
 for(const row of readFollowupSuite(entry,m)){
  const item=schedule.cases[position];
  for(const u of row.result.units){if(u.initialMp+u.mpGenerated-u.mpSpent-u.mpDamageReceived!==u.finalMp||u.poisonApplications!==u.poisonNewApplications+u.poisonRedundantApplications+u.poisonRefreshApplications)throw Error('Follow-up resource ledger differs');}
  if(row.variant==='baseline'){pending=row.result;const key=sha(JSON.stringify(item.request)),prior=baseline.get(key);if(prior&&prior!==row.resultSha256)throw Error('Follow-up repeated baseline changed');if(prior)baselineRepeats++;else baseline.set(key,row.resultSha256);}
  else{
   if(entry.scale===0&&row.result.units.some(u=>u.poisonDirectHp!==0))throw Error('Zero poison direct HP leakage');
   if(entry.scale===1&&entry.arm==='independent'){if(!isDeepStrictEqual(mechanical(pending),mechanical(row.result)))throw Error('Follow-up stock identity changed');identities++;}
   if(row.kind==='mirror')add(mirrors[row.teamAId]??=fresh(),row);
   else{
    const key=row.teamAId+'/'+row.teamBId;add(pairs[key]??=fresh(),row);
    if(entry.phase==='janus'){const opponent=f.janusRecommendation.opponents.find(o=>o.id===row.teamBId),p=recommendationPartition(opponent);for(const partition of ['raw24',...(p.common?['common23']:[]),...(p.strict?['strictC17']:[])])add(summaries[row.teamAId+'/'+partition]??=fresh(),row);}
   }
  }
  if(samples.has(position)){const actual=runMatch(item.request);if(!isDeepStrictEqual(actual,row.result)||sha(JSON.stringify(actual))!==row.resultSha256)throw Error('Exact follow-up replay differs');replays.push({suite:entry.id,id:row.id,traceHash:actual.traceHash,resultSha256:row.resultSha256});}
  position++;rows++;
 }
 const key=entry.arm+'/'+entry.scale;
 if(entry.phase==='counter'){
  counter[key]=Object.fromEntries(Object.entries(pairs).map(([id,a])=>{validatePanel(a,f.counterSeeds);const s=finish(a);details.push({id:entry.id+'/'+id,...s});return[id,{...s,passes:counterPass(s,f.counterCriterion)}];}));
  if(Object.keys(pairs).length!==8)throw Error('Counter cells missing');
 }else{
  janus[key]={cells:Object.fromEntries(Object.entries(pairs).map(([id,a])=>{validatePanel(a,f.janusRecommendation.seeds);const s=finish(a);details.push({id:entry.id+'/'+id,selfMirror:id==='janus-mixed/janus-mixed',...s});return[id,s];})),partitions:Object.fromEntries(Object.entries(summaries).map(([id,a])=>{validatePanel(a,f.janusRecommendation.seeds,id.endsWith('raw24')?24:id.endsWith('common23')?23:19);const s=finish(a);details.push({id:entry.id+'/'+id,...s});return[id,s];}))};
  if(Object.keys(pairs).length!==48)throw Error('Janus cells missing');
 }
 for(const[id,a]of Object.entries(mirrors)){validatePanel(a,entry.phase==='counter'?f.counterSeeds:f.janusRecommendation.seeds);details.push({id:entry.id+'/mirror/'+id,...finish(a)});}
 console.log('Verified and aggregated '+entry.id+': '+position+' rows');
}
if(rows!==m.executedMatches)throw Error('Follow-up execution count differs');
const compact=s=>({games:s.games,scoreRate:s.scoreRate,seedClusters:s.seedClusters,approximate95:s.approximate95,orientations:s.orientations,meanTurns:s.meanTurns,adjudicationRate:s.adjudicationRate,passes:s.passes});
const gates={};for(const arm of ['independent','reserve'])for(const scale of [1,.5,0]){const key=arm+'/'+scale,cells=counter[key],required=f.shells.flatMap(shell=>f.counterCriterion.requiredCounters.map(c=>({counter:c,shell:shell.id,...compact(cells[c+'/'+shell.id])})));gates[key]={arm,scale,required,passes:required.every(c=>c.passes),allCounters:Object.fromEntries(Object.entries(cells).map(([id,s])=>[id,compact(s)])),leaderPaired:Object.fromEntries(f.shells.map(s=>[s.id,pairedDifference(cells['demon-original/'+s.id],cells['demon-kobold-leader/'+s.id])]))};}
const recommendation={};for(const arm of ['independent','reserve'])for(const scale of [1,.5,0]){const key=arm+'/'+scale,j=janus[key];recommendation[key]={cells:Object.fromEntries(Object.entries(j.cells).map(([id,s])=>[id,{selfMirror:id==='janus-mixed/janus-mixed',...compact(s)}])),partitions:Object.fromEntries(Object.entries(j.partitions).map(([id,s])=>[id,compact(s)])),paired:Object.fromEntries(['common23','strictC17'].map(p=>[p,pairedDifference(j.partitions['janus-mixed/'+p],j.partitions['janus-five-tags/'+p])]))};}
const original=load('docs/all-family-balance-initial64.json'),bothPolicies=Object.fromEntries([.5,0].map(scale=>[scale,['independent','reserve'].every(arm=>{const g=original.gates[arm+'/'+scale];return gates[arm+'/'+scale].passes&&g.knownShells.every(s=>s.below90Both&&s.improvementPass)&&!g.newDominance.length&&Object.values(g.adjudication).every(a=>a.passes);})]));
const selection=bothPolicies[0.5] ? 0.5 : bothPolicies[0] ? 0 : null;
const chunks=writeBoundedRecords(ANALYSIS,'leader-details',details),chunkManifest=writeBoundedRecords(ANALYSIS,'leader-manifest',chunks.map((c,i)=>({id:`chunk-${i+1}`,...c})));
const result={schemaVersion:1,adaptive:true,originalProtocol:'FAILED; this diagnostic does not retroactively pass it.',source:m.source,base:m.base,amendment:m.amendment,derivedFreezeSha256:sha(readFileSync(DERIVED)),analysisSourceSha256:sha(readFileSync('scripts/balance-lab/analyze-all-family-leader-followup.mjs')),executed:rows,verification:{allRowsBound:true,replayed:replays.length,stockIdentityComparisons:identities,repeatedBaselineComparisons:baselineRepeats,replays},gates,bothPolicies,selection,adoption:'Parent review and player-discoverable/manual checks remain required. This is not production authorization.',recommendation,details:{root:ANALYSIS,chunkManifest},limits:f.limits};
saveNew('docs/all-family-leader-followup-results.json',result);
const p=x=>(100*x).toFixed(2)+'%',lines=['# Separately frozen leader-choice and Janus follow-up','','Original systemic protocol: **failed and unchanged**. This is an adaptive follow-up, with both-policy robustness fixed before new leader outcomes. No production adoption is authorized.','',`Actual executions: ${rows}; exact sample replays: ${replays.length}; stock identity comparisons: ${identities}; repeated baselines: ${baselineRepeats}. Every row is source/config/schedule/hash bound and retains all ten resource ledgers.`,`Both-policy counter screening selection: ${selection===null?'none':selection}. Material and new-leader demon must both qualify against each shell under BOTH policies.`,'','## All fixed counter outcomes','| Policy / scale | Counter / shell | Score | Clustered 95% | Orientations | Pass |','| --- | --- | ---: | --- | --- | --- |'];
for(const[key,g]of Object.entries(gates))for(const[id,c]of Object.entries(g.allCounters))lines.push(`| ${key} | ${id} | ${p(c.scoreRate)} | ${c.approximate95.map(p).join('–')} | ${Object.values(c.orientations).map(o=>p(o.scoreRate)).join(' / ')} | ${c.passes} |`);
lines.push('','## Separate Janus recommendation comparison','Both targets are compared against the same 23 opponents, excluding the original Janus identity for BOTH. The strict-C17 subset has 19 opponents. All 24 raw cells, including the original self mirror, remain in JSON and detailed ledgers. Four and five family tags grant the same single allowance. This recommendation is not substituted into the failed original counter gate.','| Policy / scale | Target / partition | Score | Mean turns | Adjudication |','| --- | --- | ---: | ---: | ---: |');
for(const[key,j]of Object.entries(recommendation))for(const[id,s]of Object.entries(j.partitions))lines.push(`| ${key} | ${id} | ${p(s.scoreRate)} | ${s.meanTurns.toFixed(2)} | ${p(s.adjudicationRate)} |`);
lines.push('','## Actual response and resource opportunity costs','Values are per game over common 23 opponents. A cast consumes an action; no whole-battle alternate-action value is inferred. Guard prevention is a same-impact local marginal. All available response counters, effective/overhealing, MP, paid casts, attack damage and early-KO ledgers remain in the detailed record for both focal and opponent units.','| Policy / scale | Target | Response casts | Cleanse / guard | Response MP | Cleared ticks | Guard HP prevented | Unused | Dead unused | Total MP | Direct HP | Early action deaths |','| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for(const[key,j]of Object.entries(janus))for(const target of ['janus-mixed','janus-five-tags']){const s=j.partitions[target+'/common23'].mean;lines.push(`| ${key} | ${target} | ${s.responseCasts.toFixed(2)} | ${s.responseCleanseCasts.toFixed(2)} / ${s.responseGuardCasts.toFixed(2)} | ${s.responseMpSpent.toFixed(2)} | ${s.responseClearedTicks.toFixed(2)} | ${s.responseGuardActualPrevented.toFixed(2)} | ${s.responseUnused.toFixed(2)} | ${s.responseDeadWithUnused.toFixed(2)} | ${s.mpSpent.toFixed(2)} | ${s.directDamage.toFixed(2)} | ${s.deathsBeforeTurnAction.toFixed(2)} |`);}
lines.push('','## Limits','No new seed extension, counter replacement, leader search, parameter tuning or target-50% adjustment follows these outcomes. The existing leader swap changes HP, speed, slots and RNG assignment; it is not a pure speed causal test. New seeds reduce seed reuse but do not erase adaptive hypothesis selection or automatic-policy bias. Same-roll poison RNG is preserved, but divergent actions make whole-battle roll allocation diverge. Public/manual explanation remains a separate parent-owned gate.','');
if(existsSync('docs/all-family-leader-followup-results.md'))throw Error('Report exists');writeFileSync('docs/all-family-leader-followup-results.md',lines.join('\n'));console.log(JSON.stringify({executed:rows,selection,bothPolicies,passes:Object.fromEntries(Object.entries(gates).map(([k,v])=>[k,v.passes]))},null,2));
