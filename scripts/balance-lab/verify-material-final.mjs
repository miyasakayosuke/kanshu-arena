#!/usr/bin/env node
/** Final-source material verification against frozen saved evidence; no mutations to gameplay. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=m=>`${m.scenarioId}|${m.seed}|${m.orientation}`;
const projection=result=>{const {traceHash,...rest}=result;return rest;};
const compare=(priorPath,nextPath,priorVariant,nextVariant,filter=()=>true)=>{
 const prior=load(priorPath);const next=load(nextPath);const expected=new Map(next.matches.filter(m=>m.variant===nextVariant).map(m=>[key(m),m]));
 const rows=prior.matches.filter(m=>m.variant===priorVariant&&filter(m));
 const bad=rows.filter(m=>!expected.has(key(m))||JSON.stringify(projection(m.result))!==JSON.stringify(projection(expected.get(key(m)).result)));
 if(bad.length)throw new Error(`${priorPath} -> ${nextPath}: ${bad.length}/${rows.length} metric mismatches`);
 return{priorPath,nextPath,priorVariant,nextVariant,comparedMatches:rows.length,mismatches:bad.length,projection:'Every recorded result field except traceHash. Explicit overrides change initial logs/optional tuning fields, so trace equality is not claimed.'};
};
const finalReports=['identity','broad','repair-disabled','repair-zero','coherent-identity','restore18','light-recommendation'];
const prefix='lab-results/material-final-';
const verification={status:'final-source-verified',source:load(`${prefix}identity/report.json`).source,checks:[],replays:[]};
const initial=readFileSync('lab-results/material-initial-source/src/engine.ts','utf8');
const current=readFileSync('src/engine.ts','utf8');
verification.engineChangeOnlyRepair18To14=initial.replace('export const MATERIAL_REPAIR_PERCENT = 18;','export const MATERIAL_REPAIR_PERCENT = 14;')===current;
if(!verification.engineChangeOnlyRepair18To14)throw new Error('Engine differs beyond the approved repair percentage change');
verification.checks.push(compare('lab-results/material-stage1-identity/report.json',`${prefix}restore18/report.json`,'baseline','candidate'));
verification.checks.push(compare('lab-results/material-stage1-repair14/report.json',`${prefix}identity/report.json`,'candidate','baseline'));
verification.checks.push(compare('lab-results/material-stage1-repair14-broad/report.json',`${prefix}broad/report.json`,'candidate','baseline'));
verification.checks.push(compare('lab-results/material-stage1-coherent-repair14/report.json',`${prefix}coherent-identity/report.json`,'candidate','baseline'));
const disabled=load(`${prefix}repair-disabled/report.json`).matches.filter(m=>m.variant==='candidate');
const zero=load(`${prefix}repair-zero/report.json`).matches.filter(m=>m.variant==='candidate');
const uf=['finalHp','finalMp','casts','specialCasts','paidCasts','directDamage','healing','mpSpent','deathTurn'];
const gp=m=>[m.result.winner,m.result.turns,m.result.units.map(u=>uf.map(f=>u[f]))];
const gameplayMismatches=disabled.filter((m,i)=>JSON.stringify(gp(m))!==JSON.stringify(gp(zero[i]))).length;
if(gameplayMismatches)throw new Error('Disabled and zero-percent gameplay diverged');
verification.zeroIsolation={matches:disabled.length,gameplayMismatches,unitFields:uf,resultFields:['winner','turns'],dispelCountDifferences:disabled.filter((m,i)=>m.result.units.some((u,j)=>u.dispelApplications!==zero[i].result.units[j].dispelApplications)).length,note:'Zero retains valid readiness/passive/strip events; event traces intentionally differ.'};
verification.runTotals=[];
mkdirSync('lab-results/material-final-replays',{recursive:true});
for(const name of finalReports){
 const path=`${prefix}${name}/report.json`;const report=load(path);
 const sameSource=['engineSha256','familySha256','labSha256'].every(f=>report.source[f]===verification.source[f]);if(!sameSource)throw new Error(`${name} source changed`);
 verification.runTotals.push({name,matches:report.scheduleCounts.matches,identityChangedOutcomes:report.summary.pairedDelta.changedOutcomes,engineSha256:report.source.engineSha256,reportSha256:sha(readFileSync(path))});
 const selectors=name==='identity'?['trigger','cancel']:['repair-disabled','repair-zero','restore18'].includes(name)?['any']:name==='coherent-identity'?['c17-bull']:[];
 for(const select of selectors)for(const orientation of['a-left','a-right']){
  const match=report.matches.find(m=>m.variant==='candidate'&&m.kind==='matchup'&&m.orientation===orientation&&(select==='c17-bull'?m.teamAId==='c17-bull':m.teamAId==='purematerial')&&(select==='trigger'||select==='cancel'?m.result.units.some(u=>u.monsterId===19&&u.key[0]===(orientation==='a-left'?'a':'e')&&(select==='trigger'?u.repairTriggers>0:u.repairCancellations>0)):true));
  if(!match)throw new Error(`No replay ${name}/${orientation}/${select}`);
  const out=`lab-results/material-final-replays/${name}-${orientation}-${select}.json`;
  execFileSync(process.execPath,['scripts/balance-lab/cli.mjs','replay','--report',path,'--match',match.id,'--out',out],{stdio:'pipe'});
  const replay=load(out);if(!replay.verified||replay.result.traceHash!==match.result.traceHash)throw new Error('Replay verification failed');
  verification.replays.push({report:path,matchId:match.id,path:out,traceHash:replay.result.traceHash,verified:true});
 }
}
verification.finalSourceMatches=verification.runTotals.reduce((sum,r)=>sum+r.matches,0);
writeFileSync('docs/material-balance-verification.json',JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({matches:verification.finalSourceMatches,replays:verification.replays.length,comparisons:verification.checks.map(c=>[c.comparedMatches,c.mismatches]),engineChangeOnlyRepair18To14:verification.engineChangeOnlyRepair18To14},null,2));
