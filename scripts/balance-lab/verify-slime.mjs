#!/usr/bin/env node
/** Verify ledgers, identity controls, ablations and CLI replay against exact recorded source. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { resolveSlimeSource } from './resolve-slime-source.mjs';
const paths=process.argv.slice(2);if(!paths.length)throw Error('Pass one or more completed report.json paths.');
const load=p=>JSON.parse(readFileSync(p));const sha=s=>createHash('sha256').update(s).digest('hex');
const gameplay=r=>[r.winner,r.turns,r.units.map(u=>['monsterId','finalHp','finalMp','casts','specialCasts','paidCasts','directDamage','healing','mpSpent','deathTurn'].map(k=>u[k]))];
const noTrace=r=>{const{traceHash,...rest}=r;return rest;};
const verification={status:'verified-exact-recorded-source',reports:[],replays:[],checks:[]};
mkdirSync('lab-results/slime-verified-replays',{recursive:true});
const ablations=new Map();
for(const path of paths){const report=load(path),tag=path.split('/').at(-2);const engineRoot=resolveSlimeSource(report.source);for(const [key,files]of[['engineSha256',['src/engine.ts']],['familySha256',['src/families.ts']],['labSha256',['scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs']]]){const value=sha(files.map(f=>readFileSync(resolve(engineRoot,f),'utf8')).join('\n'));if(value!==report.source[key])throw Error(`No exact recorded source for ${tag}/${key}`);}
 const bad=report.matches.flatMap(m=>m.result.units).filter(u=>u.initialMp+u.mpGenerated-u.mpSpent!==u.finalMp||u.finalMp<0||u.peakMp>u.maximumMp||u.supplyCasts>1||u.supplyMpSpent!==0||u.supplyGenerated>u.supplyPotential);
 if(bad.length)throw Error(`Bad resource ledgers: ${tag}`);
 const pair=new Map(report.matches.filter(m=>m.variant==='baseline').map(m=>[`${m.scenarioId}|${m.seed}|${m.orientation}`,m]));
 const identity=!Object.keys(report.config.candidate.overrides).length;
 const explicitDefault=Object.keys(report.config.candidate.overrides).length===1&&(JSON.stringify(report.config.candidate.overrides.slimeSupply)==='{"amount":8}'||JSON.stringify(report.config.candidate.overrides.slimeSupply)==='{"enabled":true}');
 let identityMetricMismatches=null;
 if(identity||explicitDefault){identityMetricMismatches=report.matches.filter(m=>m.variant==='candidate').filter(m=>{const b=pair.get(`${m.scenarioId}|${m.seed}|${m.orientation}`);return JSON.stringify(identity?b.result:noTrace(b.result))!==JSON.stringify(identity?m.result:noTrace(m.result));}).length;if(identityMetricMismatches)throw Error(`Identity/default mismatch ${tag}`);}
 if(tag.endsWith('supply-disabled')){const phase=tag.replace(/supply-disabled$/,'');const pair=ablations.get(phase)??{};pair.disabled=report.matches.filter(m=>m.variant==='candidate').map(m=>({id:`${m.scenarioId}|${m.seed}|${m.orientation}`,gameplay:gameplay(m.result)}));ablations.set(phase,pair);}
 if(tag.endsWith('supply-zero')){const phase=tag.replace(/supply-zero$/,'');const pair=ablations.get(phase)??{};pair.zero=report.matches.filter(m=>m.variant==='candidate').map(m=>({id:`${m.scenarioId}|${m.seed}|${m.orientation}`,gameplay:gameplay(m.result)}));ablations.set(phase,pair);}
 verification.reports.push({path,rawSha256:sha(readFileSync(path)),source:report.source,matches:report.matches.length,illegalLedgers:bad.length,identityMetricMismatches,engineRoot});
 for(const orientation of ['a-left','a-right']){
  const eligible=report.matches.filter(m=>m.variant==='candidate'&&m.kind==='matchup'&&m.orientation===orientation&&m.teamAId==='pureslime');const pool=eligible.length?eligible:report.matches.filter(m=>m.variant==='candidate'&&m.kind==='matchup'&&m.orientation===orientation);
  const key=orientation==='a-left'?'a':'e';const found=pool.find(m=>m.result.units.some(u=>u.monsterId===24&&u.key[0]===key&&u.supplyCasts))??pool[0];
  const output=`lab-results/slime-verified-replays/${tag}-${orientation}.json`;
  execFileSync(process.execPath,[resolve(engineRoot,'scripts/balance-lab/cli.mjs'),'replay','--report',resolve(path),'--match',found.id,'--out',resolve(output)],{cwd:engineRoot,stdio:'pipe'});
  const replay=load(output);if(!replay.verified||replay.result.traceHash!==found.result.traceHash)throw Error('CLI replay mismatch');
  verification.replays.push({report:path,matchId:found.id,path:output,traceHash:replay.result.traceHash,verified:true,sourceRoot:engineRoot});
 }
}
for(const [phase,{disabled,zero}]of ablations)if(disabled&&zero){if(disabled.length!==zero.length)throw Error(`Ablation schedule differs: ${phase}`);const mismatches=disabled.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(zero[i])).length;if(mismatches)throw Error('Zero and disabled gameplay differs');verification.checks.push({phase,check:'zero-versus-disabled production-policy gameplay equality',matches:disabled.length,mismatches,note:'Allowance state/events and eligibility metrics intentionally differ; zero amount is never selected by production AI. Compares winner/turns and every unit monsterId/finalHP/finalMP/cast/paid/special/damage/healing/MPspent/deathTurn.'});}
verification.totalMatches=verification.reports.reduce((n,r)=>n+r.matches,0);
writeFileSync('docs/slime-balance-verification.json',JSON.stringify(verification,null,2)+'\n');console.log(JSON.stringify({matches:verification.totalMatches,replays:verification.replays.length,checks:verification.checks},null,2));
