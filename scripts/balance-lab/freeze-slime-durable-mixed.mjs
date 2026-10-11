#!/usr/bin/env node
/** Retain every prior mixed target under E; never select only its strongest result. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateConfig } from './core.mjs';
const load=p=>JSON.parse(readFileSync(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const candidate=load('configs/balance-lab/slime-durable8.json').candidate;
const rows=['a','b'].map(letter=>{const config=load(`configs/balance-lab/slime-mixed-${letter}.json`);config.suiteId=`slime-durable-mixed-${letter}`;config.candidate={...candidate,id:`durable-mixed-${letter}`,label:'Post-diagnostic E on all original frozen mixed targets'};validateConfig(config);const path=`configs/balance-lab/${config.suiteId}.json`;if(existsSync(path))throw Error('E mixed diagnostics already frozen');return{path,config,raw:JSON.stringify(config,null,2)+'\n'};});
for(const row of rows)writeFileSync(row.path,row.raw);
writeFileSync('docs/slime-balance-durable-mixed-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock approximately9h ahead; freeze precedes own E mixed results.',phase:'Post-initial-mixed extension, all11targets retained without selection; E main matches still in progress when frozen.',priorFinding:'Original strongest sampled slime mixed [24,6,9,27,28] scored38.01%; this motivated checking the complete original mixed cohort under E.',configs:rows.map(({path,config,raw})=>({path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),seeds:config.seeds,matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4}))},null,2)+'\n');
