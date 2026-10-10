#!/usr/bin/env node
/** Lossless split compact review evidence. Never changes gameplay or reruns matches. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { summarize, pairedDelta } from './core.mjs';
import { monsters } from '../../src/engine.ts';
const [output,...paths]=process.argv.slice(2);
if(!output||!paths.length) throw new Error('Usage: node scripts/balance-lab/summarize-material.mjs OUTPUT.json REPORT.json ...');
const sha=data=>createHash('sha256').update(data).digest('hex');
const dir=`${basename(output,'.json')}-runs`;
mkdirSync(join(dirname(output),dir),{recursive:true});
const selected=['games','wins','losses','draws','scoreRate','winRate','meanTurns','turnLimitGames','zeroCastDeathRate','meanMpSpent','meanNoAffordableSpecialTurns','meanZeroMpTurns','meanHealing','meanGuardApplications','meanEffectiveCleanses','meanPoisonApplications','meanDispelApplications','meanRepairEligible','meanRepairTriggers','meanRepairHealing','meanRepairReceived','meanRepairRecipients','meanRepairPotentialHealing','meanRepairUnusedHealing','meanRepairCancellations','meanRepairFailedBeforeTrigger','meanRepairDispelled','meanRepairDefeatedBeforeTrigger','meanRepairTriggerTurn','meanRepairMpSpent','meanDamageConcentration'];
const round=n=>Math.round(n*1e6)/1e6;
const view=rows=>{
 const s=summarize(rows);
 const ownUnits=rows.flatMap(m=>m.result.units.filter(u=>u.key[0]===(m.orientation==='a-left'?'a':'e')));
 const cores=ownUnits.filter(u=>u.monsterId===19);
 return {...Object.fromEntries(selected.map(k=>[k,s[k]])),firstTurnDeaths:ownUnits.filter(u=>u.deathTurn===1).length,unitMeans:[...new Set(ownUnits.map(u=>u.monsterId))].map(monsterId=>{const units=ownUnits.filter(u=>u.monsterId===monsterId);return {monsterId,...Object.fromEntries(['casts','directDamage','healing','repairHealing','mpSpent','guardApplications','effectiveCleanses','dispelApplications','noAffordableSpecialTurns'].map(k=>[k,round(units.reduce((sum,u)=>sum+u[k],0)/units.length)]))};}),core:{appearances:cores.length,firstTurnDeaths:cores.filter(u=>u.deathTurn===1).length,firstTurnDeathsWithoutRepair:cores.filter(u=>u.deathTurn===1&&!u.repairTriggers).length,readyCoreDefeatsBeforeTrigger:cores.reduce((sum,u)=>sum+u.repairDefeatedBeforeTrigger,0),firstTurnDeathsAfterPriorStrip:cores.filter(u=>u.deathTurn===1&&!u.repairTriggers&&!u.repairDefeatedBeforeTrigger&&u.repairCancellations).length,noCastDeaths:cores.filter(u=>u.diedBeforeAnyCast).length,defeatsWithoutRepair:cores.filter(u=>u.finalHp===0&&!u.repairTriggers).length}};
};
const result={schemaVersion:1,status:paths.some(path=>path.includes('material-final-'))?'adopted14-percent-with-final-source-validation':'exploratory-until-parent-adopts-and-final-source-rerun',note:'Fixed same-autoOrders policy, swaps and mirrors. Draws score half. No human/optimal-play or universal-balance claim. Original fullnature [14,3,6,9,10] and fullbeast [12,0,2,11,13] retained. Generated teams exclude only material core19 and may include other cores; frozen before outcomes.',format:'lossless-split-json-each-file-under-70000-bytes',reports:[]};
for(const [i,path] of paths.entries()){
 const raw=readFileSync(path);const report=JSON.parse(raw);
 const phase=path.includes('material-final-')?'final-source':'exploratory';
 const info={rawReportPath:path,rawReportSha256:sha(raw),phase,source:report.source,suiteId:report.config.suiteId,candidate:report.config.candidate,scheduleCounts:report.scheduleCounts,seeds:report.config.seeds,teams:report.teams.map(t=>({id:t.id,ids:t.ids,cost:t.ids.reduce((sum,id)=>sum+monsters[id].cost,0)})),identityChangedOutcomes:report.summary.pairedDelta.changedOutcomes,mirrors:{baselinePhysicalAllyScore:report.mirrorControls.baseline.physicalAllyScoreRate,candidatePhysicalAllyScore:report.mirrorControls.candidate.physicalAllyScoreRate},focalTeams:[]};
 for(const id of [...new Set(report.matches.filter(m=>m.kind==='matchup').map(m=>m.teamAId))]){
  const rows=report.matches.filter(m=>m.kind==='matchup'&&m.teamAId===id);
  const partition=predicate=>Object.fromEntries(['baseline','candidate'].map(v=>[v,view(rows.filter(m=>m.variant===v&&predicate(m)))]));
  const focal={id,...partition(()=>true),pairedDelta:pairedDelta(rows),...(rows.some(m=>m.teamBId.startsWith('generated-'))?{curated:partition(m=>!m.teamBId.startsWith('generated-')),generated:partition(m=>m.teamBId.startsWith('generated-')),generatedCostBands:[...new Set(report.teams.filter(t=>t.id.startsWith('generated-')).map(t=>t.ids.reduce((sum,id)=>sum+monsters[id].cost,0)))].sort((a,b)=>a-b).map(cost=>{const ids=report.teams.filter(t=>t.id.startsWith('generated-')&&t.ids.reduce((sum,id)=>sum+monsters[id].cost,0)===cost).map(t=>t.id);return {cost,opponentTeams:ids,...partition(m=>ids.includes(m.teamBId))};})}:{}),controls:report.scenarios.filter(s=>s.kind==='matchup'&&s.a===id).map(s=>({opponent:s.b,...Object.fromEntries(['baseline','candidate'].map(v=>[v,{...Object.fromEntries(['games','wins','draws','losses','scoreRate','meanTurns','meanRepairTriggers','meanRepairHealing','meanRepairFailedBeforeTrigger','meanRepairCancellations','meanRepairDefeatedBeforeTrigger','meanRepairDispelled','meanMpSpent','meanNoAffordableSpecialTurns'].map(k=>[k,s[v][k]])),coreFirstTurnDeaths:s[v].keyUnit?.turnOneDeaths??null}]))}))};
  if(focal.generatedCostBands){const file=`${String(i+1).padStart(2,'0')}-${phase}-${report.config.suiteId}-${id}-costs.json`;const content=JSON.stringify(focal.generatedCostBands,null,2)+'\n';if(Buffer.byteLength(content)>70000)throw new Error(`Cost evidence exceeds budget: ${file}`);writeFileSync(join(dirname(output),dir,file),content);focal.generatedCostBands={evidenceFile:`${dir}/${file}`,sha256:sha(content)};}
  const file=`${String(i+1).padStart(2,'0')}-${phase}-${report.config.suiteId}-${id}.json`;const content=JSON.stringify(focal,null,2)+'\n';
  if(Buffer.byteLength(content)>70000) throw new Error(`Evidence exceeds compact budget: ${file}`);
  writeFileSync(join(dirname(output),dir,file),content);info.focalTeams.push({id,evidenceFile:`${dir}/${file}`,sha256:sha(content)});
 }
 const file=`${String(i+1).padStart(2,'0')}-${phase}-${report.config.suiteId}-index.json`; const metadata=JSON.stringify(info,null,2)+'\n';
 if(Buffer.byteLength(metadata)>70000)throw new Error(`Report metadata exceeds budget: ${file}`);writeFileSync(join(dirname(output),dir,file),metadata);
 result.reports.push({suiteId:info.suiteId,phase,evidenceFile:`${dir}/${file}`,sha256:sha(metadata)});
}
for(const [field,file]of[['verification','material-balance-verification.json'],['postHocFreeze','material-coherent-freeze.json']]){const path=join(dirname(output),file);if(existsSync(path))result[field]={evidenceFile:file,sha256:sha(readFileSync(path))};}
const content=JSON.stringify(result,null,2)+'\n';if(Buffer.byteLength(content)>70000)throw new Error('Index exceeds compact budget');writeFileSync(output,content);
console.log(`Saved ${paths.length} report indexes and bounded focal files to ${output}`);
