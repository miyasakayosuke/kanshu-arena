#!/usr/bin/env node
/** Final adopted playtest source, fresh seed holdout and finite-supply ablations. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateSeeds,validateConfig } from './core.mjs';
const load=p=>JSON.parse(readFileSync(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const frozen=load('docs/slime-balance-budget-freeze.json');
if(sha(readFileSync('src/engine.ts'))!==frozen.budgetEngineSha256)throw Error('Final engine differs from the tested cost-split source');
const old=load('configs/balance-lab/slime-budget-previous.json'),fresh=load('configs/balance-lab/slime-budget-previous-newpool.json');
const seeds=generateSeeds(8,112610210),configs=[];
const save=(id,targets,opponents,overrides={})=>{const config={schemaVersion:1,suiteId:`slime-final-${id}`,seeds,costLimit:17,teams:[...targets,...opponents],scenarios:targets.flatMap((t,i)=>opponents.map((o,j)=>({id:`f${i+1}-o${j+1}`,a:t.id,b:o.id,keyUnitId:24}))),candidate:{id,label:`Final E60 C4/C5 playtest ${id}; fresh fixed seed holdout`,overrides},complaints:[],sampling:{count:0,seed:112610210}};validateConfig(config);const path=`configs/balance-lab/${config.suiteId}.json`;if(existsSync(path))throw Error('Final freeze already exists');const raw=JSON.stringify(config,null,2)+'\n';configs.push({path,raw,config});};
save('identity',old.teams.slice(0,5),old.teams.slice(5));
save('newpool',fresh.teams.slice(0,5),fresh.teams.slice(5));
const opponents=[...old.teams.slice(5).filter(t=>!t.id.startsWith('coherent-')),...fresh.teams.slice(5)];
for(const[id,slimeSupply]of[['supply-enabled',{enabled:true}],['supply-disabled',{enabled:false}],['supply-zero',{amount:0}],['supply8',{amount:8}],['supply12',{amount:12}]])save(id,old.teams.slice(0,2),opponents,{slimeSupply});
for(const r of configs)writeFileSync(r.path,r.raw);
writeFileSync('docs/slime-balance-final-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock approximately9h ahead; configs frozen before fresh-seed outcomes.',status:'Adopted bounded playtest candidate; no fairness claim',engineSha256:sha(readFileSync('src/engine.ts')),budgetSourceByteIdentical:true,priorExactSourceMatches:67888,sourceChoice:'Parent chose E60, coreC4/bruteC5, supply8. No further tuning to force50%.',holdout:'Eight new seeds from112610210. Retained35opponents and newly sampled24coherent opponents reported separately; four maximum-MP member sets overlap between pools, so pool totals are not independent populations.',requiredNextWave:'At the all-family milestone, produce a same-budget matrix and an intentional system-balance wave addressing nature/poison dominance. Nature+Aoe97–99% is a known imbalance, not final quality.',configs:configs.map(({path,raw,config})=>({path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4,candidate:config.candidate}))},null,2)+'\n');console.log(configs.map(r=>[r.path,(r.config.scenarios.length+r.config.teams.length)*r.config.seeds.length*4]));
