#!/usr/bin/env node
/** Seed-clustered, paired, correctly reversed logical rows. No outcome-driven team changes. */
import { existsSync, readFileSync } from 'node:fs';
import { sha, load, saveNew, readMatrix, verifiedDerived, readSuite, physicalScore, scoreForA, sideForA, reverseRow, interval, writeBoundedRecords, PACKED_ROOT } from './all-family-support.mjs';
import { readVerifiedSuite, loadCompletedExtensions, validateCounterSeedPanel, validateAnalyzerRevision } from './all-family-evidence-contract.mjs';
import { meanUnitMetrics } from './all-family-statistics.mjs';
const stage=process.argv[2]??'initial64';if(!['initial64','combined128'].includes(stage))throw Error('Use initial64 or combined128');
const f=readMatrix(),manifest=verifiedDerived(),analysisSource=validateAnalyzerRevision(manifest),extensions=stage==='combined128'?loadCompletedExtensions(manifest):null,cost=new Map(f.teams.map(t=>[t.id,t.cost]));
const avg=vs=>vs.reduce((n,v)=>n+v,0)/vs.length;
function fresh(){return {games:0,wins:0,draws:0,physicalScore:0,adjudications:0,turns:0,bySeed:{},orientations:{'a-left':{games:0,score:0},'a-right':{games:0,score:0}},sum:{},units:{}};}
function add(acc,row,units=false){
  const score=scoreForA(row),side=sideForA(row),r=row.result;
  if(typeof r.adjudicated!=='boolean')throw Error('Actual adjudication classification missing; turnLimit is not sufficient');
  acc.games++;acc.physicalScore+=physicalScore(r);acc.wins+=score===1?1:0;acc.draws+=score===.5?1:0;acc.adjudications+=r.adjudicated?1:0;acc.turns+=r.turns;
  const seed=acc.bySeed[row.seed]??={games:0,score:0};seed.games++;seed.score+=score;
  const o=acc.orientations[row.orientation];o.games++;o.score+=score;
  for(const[k,v]of Object.entries(r.sides[side]))if(typeof v==='number')acc.sum[k]=(acc.sum[k]??0)+v;
  const opposite=r.sides[side==='allies'?'enemies':'allies'];
  for(const [key,value] of Object.entries({poisonTickHpInflicted:opposite.poisonDamageTaken,opponentCleanseCasts:opposite.cleanseCasts,opponentCleanseMpSpent:opposite.cleanseMpSpent,opponentCleanseEffectiveHealing:opposite.cleanseEffectiveHealing,opponentCleanseResponseAllowanceSpent:opposite.cleanseResponseAllowanceSpent}))acc.sum[key]=(acc.sum[key]??0)+value;
  if(units)for(const unit of r.units.filter(u=>u.key[0]===(side==='allies'?'a':'e'))){const a=acc.units[unit.monsterId]??={appearances:0,sum:{},observations:{}};a.appearances++;for(const[k,v]of Object.entries(unit))if(typeof v==='number'&&k!=='monsterId'){a.sum[k]=(a.sum[k]??0)+v;a.observations[k]=(a.observations[k]??0)+1;}}
}
function finish(a){
  const cluster=interval(Object.values(a.bySeed).map(v=>v.score/v.games));
  return {games:a.games,wins:a.wins,draws:a.draws,scoreRate:(a.wins+a.draws*.5)/a.games,physicalAllyScoreRate:a.physicalScore/a.games,seedClusters:cluster.n,approximate95:cluster.approximate95,physicalOrientations:Object.fromEntries(Object.entries(a.orientations).map(([k,v])=>[k,{games:v.games,scoreRate:v.games?v.score/v.games:null}])),adjudications:a.adjudications,adjudicationRate:a.adjudications/a.games,meanTurns:a.turns/a.games,mean:Object.fromEntries(Object.entries(a.sum).map(([k,v])=>[k,v/a.games])),units:Object.fromEntries(Object.entries(a.units).map(([k,v])=>[k,meanUnitMetrics(v)])),seedScores:Object.fromEntries(Object.entries(a.bySeed).map(([k,v])=>[k,v.score/v.games]))};
}
const matrix={},counter={},details=[];
for(const entry of manifest.configs.filter(c=>c.phase==='matrix')){
  const rows=Object.fromEntries(f.teams.map(t=>[t.id,{all:fresh(),c17:fresh()}])),pairs={},overall={all:fresh(),c17:fresh()},mirror=fresh();
  for(const row of readVerifiedSuite(entry,manifest))if(row.variant==='candidate'){
    if(row.kind==='mirror'){add(mirror,row);continue;}
    add(overall.all,row);if(cost.get(row.teamAId)===17&&cost.get(row.teamBId)===17)add(overall.c17,row);
    const key=[row.teamAId,row.teamBId].join('__');add(pairs[key]??=fresh(),row);
    for(const perspective of [row,reverseRow(row)]){add(rows[perspective.teamAId].all,perspective,true);if(cost.get(perspective.teamBId)===17)add(rows[perspective.teamAId].c17,perspective,true);}
  }
  const value={id:entry.id,arm:entry.arm,scale:entry.scale,overall:Object.fromEntries(Object.entries(overall).map(([k,v])=>[k,finish(v)])),mirror:finish(mirror),rows:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,{cost:cost.get(k),all:finish(v.all),c17Opponents:finish(v.c17)}])),pairs:Object.fromEntries(Object.entries(pairs).map(([k,v])=>[k,finish(v)]))};
  matrix[`${entry.arm}/${entry.scale}`]=value;
  for(const[k,v]of Object.entries(value.rows))details.push({id:`${entry.id}/row/${k}`,...v});
  for(const[k,v]of Object.entries(value.pairs))details.push({id:`${entry.id}/pair/${k}`,...v});
  details.push({id:`${entry.id}/overall`,overall:value.overall,mirror:value.mirror});
}
for(const entry of manifest.configs.filter(c=>c.phase==='counter')){
  const counters={};
  const collect=id=>{const definition=manifest.configs.find(c=>c.id===id);for(const row of readVerifiedSuite(definition,manifest))if(row.variant==='candidate'&&row.kind==='matchup'){const key=`${row.teamBId}/${row.teamAId}`;add(counters[key]??=fresh(),row,true);}};
  collect(entry.id);
  if(stage==='combined128')for(const extension of manifest.configs.filter(c=>c.phase==='reserve'&&c.arm===entry.arm&&c.scale===entry.scale))if(extensions.authorized.has(extension.id))collect(extension.id);
  const value=Object.fromEntries(Object.entries(counters).map(([key,acc])=>{const shell=key.split('/')[0],extended=!!extensions&&manifest.configs.some(c=>c.phase==='reserve'&&c.arm===entry.arm&&c.scale===entry.scale&&c.shell===shell&&extensions.authorized.has(c.id));validateCounterSeedPanel(acc,f.counterSeeds,f.reserveCounterSeeds,extended);const s=finish(acc),pointOrientationPass=s.scoreRate>=f.gates.counterScoreAtLeast&&Object.values(s.physicalOrientations).every(o=>o.scoreRate>f.gates.counterOrientationScoreAbove);return[key,{...s,pointOrientationPass,passes:pointOrientationPass&&s.approximate95[0]>f.gates.counterSeedClustered95LowerBoundAbove}];}));
  counter[`${entry.arm}/${entry.scale}`]=value;
  for(const[k,v]of Object.entries(value))details.push({id:`${entry.id}/${stage}/${k}`,...v});
}
const cohorts=[];
for(const m of Object.values(matrix))for(const feature of ['poisonOwners','singleCleanseOwners','wholeCleanseOwners','healingOwners','guardOwners','breakerOwners','priorityAttackOwners'])for(const number of [...new Set(manifest.teamFeatures.map(t=>t[feature]))].sort((a,b)=>a-b)){
  const members=manifest.teamFeatures.filter(t=>t[feature]===number),rows=members.map(t=>m.rows[t.id].all),fields=Object.keys(rows[0].mean);
  const row={arm:m.arm,scale:m.scale,feature,owners:number,teamIds:members.map(t=>t.id),costs:members.map(t=>t.cost),rowAppearances:rows.reduce((n,r)=>n+r.games,0),meanTeamScore:avg(rows.map(r=>r.scoreRate)),mean:Object.fromEntries(fields.map(field=>[field,avg(rows.map(r=>r.mean[field]))])),caution:'Overlapping ownership cohorts of frozen teams; row appearances are not additional independent games and ownership is not execution.'};
  cohorts.push(row);details.push({id:`cohort/${m.arm}/${m.scale}/${feature}/${number}`,...row});
}
const extensionTriggers=[],gates={};
for(const arm of ['independent','reserve'])for(const scale of f.scales){
  const k=`${arm}/${scale}`,now=matrix[k],base=matrix[`${arm}/1`];
  const knownShells=f.knownShells.map(id=>{
    const row=now.rows[id],old=base.rows[id],improvement=old.c17Opponents.scoreRate-row.c17Opponents.scoreRate;
    const seedDifferences=Object.keys(row.c17Opponents.seedScores).map(seed=>old.c17Opponents.seedScores[seed]-row.c17Opponents.seedScores[seed]);
    const m=avg(seedDifferences),se=Math.sqrt(seedDifferences.reduce((n,v)=>n+(v-m)**2,0)/(seedDifferences.length-1)/seedDifferences.length);
    const counters=f.counterplans.map(id2=>({id:id2,...counter[k][`${id}/${id2}`]}));
    const pointEligible=counters.filter(c=>c.pointOrientationPass).length,passing=counters.filter(c=>c.passes).length;
    if(stage==='initial64'&&pointEligible>=2&&passing<2)extensionTriggers.push({arm,scale,shell:id,pointOrientationQualifying:pointEligible,passing,reason:'Two-counter gate unresolved only by the clustered lower bound; extend all three frozen counterplans together.'});
    return {id,scoreAll:row.all.scoreRate,scoreC17:row.c17Opponents.scoreRate,opponentScoreImprovement:improvement,pairedApproximate95:[Math.max(-1,m-1.96*se),Math.min(1,m+1.96*se)],pairedGames:row.c17Opponents.games,below90Both:row.all.scoreRate<f.gates.knownShellScoreBelow&&row.c17Opponents.scoreRate<f.gates.knownShellScoreBelow,improvementPass:improvement+1e-12>=f.gates.knownShellExactC17OpponentScoreImprovementAtLeast,passingCounterplans:passing,counterGate:passing>=2,counters:counters.map(({id,games,seedClusters,scoreRate,approximate95,physicalOrientations,pointOrientationPass,passes})=>({id,games,seedClusters,scoreRate,approximate95,physicalOrientations,pointOrientationPass,passes}))};
  });
  const newDominance=[],persistentDominance=[];
  for(const team of f.teams)for(const partition of ['all','c17Opponents']){
    if(partition==='c17Opponents'&&team.cost!==17)continue;
    const current=now.rows[team.id][partition].scoreRate,prior=base.rows[team.id][partition].scoreRate;
    if(current>=f.gates.newDominanceScoreAtLeast&&prior<f.gates.newDominanceScoreAtLeast)newDominance.push({team:team.id,cost:team.cost,partition,baseline:prior,candidate:current});
    if(current>=f.gates.newDominanceScoreAtLeast&&prior>=f.gates.newDominanceScoreAtLeast)persistentDominance.push({team:team.id,cost:team.cost,partition,baseline:prior,candidate:current});
  }
  const adjudication=Object.fromEntries(['all','c17'].map(p=>[p,{baseline:base.overall[p].adjudicationRate,candidate:now.overall[p].adjudicationRate,change:now.overall[p].adjudicationRate-base.overall[p].adjudicationRate,passes:now.overall[p].adjudicationRate-base.overall[p].adjudicationRate<=f.gates.maxAdjudicationRateIncrease+1e-12}]));
  const flaggedPairs=Object.entries(now.pairs).filter(([_,v])=>v.adjudicationRate>=f.gates.individualAdjudicationFlagAtLeast).map(([pair,v])=>({pair,games:v.games,adjudications:v.adjudications,rate:v.adjudicationRate,meanTurns:v.meanTurns,meanRemainingHpFraction:v.mean.remainingHpFraction}));
  const passes=scale!==1&&knownShells.every(s=>s.below90Both&&s.improvementPass&&s.counterGate)&&!newDominance.length&&Object.values(adjudication).every(a=>a.passes);
  gates[k]={arm,scale,knownShells,newDominance,persistentDominance,adjudication,flaggedPairs,passes};
}
if(stage==='initial64'){
  const authorizedSuiteIds=extensionTriggers.map(t=>manifest.configs.find(c=>c.phase==='reserve'&&c.arm===t.arm&&c.scale===t.scale&&c.shell===t.shell).id);
  saveNew('docs/all-family-balance-extension-decision.json',{schemaVersion:1,source:manifest.source,rule:manifest.reserveRule,triggers:extensionTriggers,authorizedSuiteIds,unchangedFailedGatesRemainFailures:true});
}
const selection=Object.fromEntries(['independent','reserve'].map(arm=>[arm,gates[`${arm}/0.5`].passes?0.5:gates[`${arm}/0`].passes?0:null]));
const counts=manifest.configs.filter(c=>existsSync(`${PACKED_ROOT}/${c.id}-index.json`)).map(c=>{const i=load(`${PACKED_ROOT}/${c.id}-index.json`);return{id:c.id,status:i.status,executed:i.executedMatches,scheduled:i.scheduledMatches};});
const compactRows=Object.values(matrix).map(m=>({arm:m.arm,scale:m.scale,rows:Object.entries(m.rows).map(([id,v])=>({id,cost:v.cost,scoreAll:v.all.scoreRate,scoreAgainstC17:v.c17Opponents.scoreRate,adjudicationAll:v.all.adjudicationRate,meanTurnsAll:v.all.meanTurns}))}));
for(const [id,value] of Object.entries(gates))details.push({id:`gates/${id}`,...value});
const chunks=writeBoundedRecords('docs/all-family-balance-analysis',stage,details);
const chunkManifest=writeBoundedRecords('docs/all-family-balance-analysis',`${stage}-manifest`,chunks.map((chunk,i)=>({id:`chunk-${i+1}`,...chunk})));
const compactGates=Object.fromEntries(Object.entries(gates).map(([k,v])=>[k,{...v,flaggedPairCount:v.flaggedPairs.length,flaggedPairs:v.flaggedPairs.slice(0,10),flaggedPairsCompleteInDetails:true}]));
const summary={schemaVersion:1,stage,analysisSource,source:manifest.source,matrixFreezeSha256:manifest.matrix.sha256,derivedFreezeSha256:sha(readFileSync('docs/all-family-balance-config-freeze.json')),counts:{executedMatches:counts.reduce((n,c)=>n+c.executed,0),suites:counts},selection,adoption:'Parent review required; passing a screening gate is not a production adoption authorization.',gates:compactGates,rows:compactRows,details:{root:'docs/all-family-balance-analysis',chunkManifest},limits:f.limits};
saveNew(`docs/all-family-balance-${stage}.json`,summary);
const pct=n=>(n*100).toFixed(2)+'%',lines=[`# All-family systemic study: ${stage}`,'','No production rule has been adopted. All matrix teams, seed sets, rule candidates and gates were fixed before outcomes.','',`Actual executed matches: ${summary.counts.executedMatches}. Required matrix/counter schedule: ${manifest.requiredExecutedMatches}. Repeated baselines, identity candidates and mirror swaps are controls, not new independent evidence.`,'','## Predeclared gates',''];
for(const [key,g]of Object.entries(gates)){lines.push(`### ${key}`,`Screening result: ${g.passes?'PASS, pending parent review':'FAIL / reference control'}. New dominant rows: ${g.newDominance.length}. Persistent dominant rows: ${g.persistentDominance.length}. >=25% adjudication pairs: ${g.flaggedPairs.length}.`,'','| Known shell | All score | C17 score | Opponent improvement | Passing counterplans |','| --- | ---: | ---: | ---: | ---: |');for(const s of g.knownShells){lines.push(`| ${s.id} | ${pct(s.scoreAll)} | ${pct(s.scoreC17)} | ${pct(s.opponentScoreImprovement)} | ${s.passingCounterplans}/3 |`);for(const c of s.counters)lines.push(`Counter ${s.id} / ${c.id}: ${pct(c.scoreRate)}, approximate clustered95 ${c.approximate95.map(pct).join('–')}, orientations ${Object.values(c.physicalOrientations).map(v=>pct(v.scoreRate)).join('/')}; ${c.seedClusters} seeds; ${c.passes?'passes':'does not pass'}.`);}lines.push('',`Persistent dominance: ${g.persistentDominance.map(r=>`${r.team} (${r.partition}) ${pct(r.candidate)}`).join('; ')||'none'}.`, `New dominance: ${g.newDominance.map(r=>`${r.team} (${r.partition}) ${pct(r.candidate)}`).join('; ')||'none'}.`,`Adjudication increase: all ${pct(g.adjudication.all.change)}, exact C17 ${pct(g.adjudication.c17.change)}.`,'');}
lines.push('## Complete row matrix summaries','Pure nature spends C15. Exact-C17-opponent results for lower-cost rows remain cross-budget comparisons. Strict-C17 dominance/adjudication gates use only C17 rows and opponents.','');
for(const m of compactRows){lines.push(`### ${m.arm}/${m.scale}`,'| Team | Cost | All opponents | C17 opponents | Mean turns | Adjudication |','| --- | ---: | ---: | ---: | ---: | ---: |');for(const r of m.rows)lines.push(`| ${r.id} | ${r.cost} | ${pct(r.scoreAll)} | ${pct(r.scoreAgainstC17)} | ${r.meanTurnsAll.toFixed(2)} | ${pct(r.adjudicationAll)} |`);lines.push('');}
lines.push('## Actual mechanism ledgers per focal game','Tick HP inflicted is the opposing side’s actorless poison-tick HP loss; it is not inferred from a nominal poison basis. Enemy cleanse healing is shown because a cleanse may already have been needed for HP.','');
for(const m of Object.values(matrix)){
  lines.push(`### ${m.arm}/${m.scale}`,'| Team | Poison casts | Direct poison HP | Tick HP inflicted | 3→3 applications | Enemy cleanse MP | Enemy cleanse healing | Guard HP prevented | Cashout added actual HP |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for(const id of ['fullnature',...f.knownShells,'old-triple-poison','undead-reapply','janus-poison']){const a=m.rows[id].all.mean;lines.push(`| ${id} | ${a.poisonCasts.toFixed(2)} | ${a.poisonDirectHp.toFixed(2)} | ${a.poisonTickHpInflicted.toFixed(2)} | ${a.poisonRedundantApplications.toFixed(2)} | ${a.opponentCleanseMpSpent.toFixed(2)} | ${a.opponentCleanseEffectiveHealing.toFixed(2)} | ${a.guardActualPrevented.toFixed(2)} | ${a.cashoutActualAddedDamage.toFixed(2)} |`);}
  lines.push('');
}
lines.push('## Fixed role cohorts','All ownership counts and per-cohort actual execution/resource metrics are retained in the analysis chunks. Cohorts overlap; their row appearances are not extra independent games.','| Team | Cost | Poison | Single cleanse | Whole cleanse | HP heal | Guard | Breaker | Priority attack |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for(const t of manifest.teamFeatures)lines.push(`| ${t.id} | ${t.cost} | ${t.poisonOwners} | ${t.singleCleanseOwners} | ${t.wholeCleanseOwners} | ${t.healingOwners} | ${t.guardOwners} | ${t.breakerOwners} | ${t.priorityAttackOwners} |`);
lines.push('','## Interpretation limits',f.limits,'','Actual HP-clipped direct poison, ticks, effective and excess healing, executed cleanse resources, local same-impact guard prevention, cashout marginal damage and nominal future poison, MP and early-KO ledgers are retained for every row, pair and unit in the lossless analysis chunks. Guard/cashout counterfactuals are local same-impact calculations, not a claim about a whole alternate battle. Poison totals can increase when lower initial damage leaves more casters, healers, cleansers and repair users alive.','',`Preference within each policy arm: ${JSON.stringify(selection)}. A null selection means the initial mechanism-only hypothesis did not satisfy all gates; the all-family quality milestone remains open.`,'');
const {writeFileSync}=await import('node:fs');const md=`docs/all-family-balance-${stage}.md`;if(existsSync(md))throw Error('Report already exists');writeFileSync(md,lines.join('\n'));
console.log(JSON.stringify({stage,executed:summary.counts.executedMatches,selection,extensionTriggers,gateSummary:Object.fromEntries(Object.entries(gates).map(([k,v])=>[k,{passes:v.passes,newDominance:v.newDominance,adjudication:v.adjudication,knownShells:v.knownShells.map(({id,scoreAll,scoreC17,opponentScoreImprovement,passingCounterplans})=>({id,scoreAll,scoreC17,opponentScoreImprovement,passingCounterplans}))}]))},null,2));
