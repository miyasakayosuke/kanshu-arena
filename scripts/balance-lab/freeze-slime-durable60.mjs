#!/usr/bin/env node
/** Narrow E/8 sensitivity: only brute AoE64->60, frozen before its own outcomes. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateConfig } from './core.mjs';
const load=p=>JSON.parse(readFileSync(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const rows=[['durable8','durable60'],['durable-oldcores','durable60-oldcores']].map(([prior,id])=>{const config=load(`configs/balance-lab/slime-${prior}.json`);config.suiteId=`slime-${id}`;config.candidate.id=id;config.candidate.label='E with brute area60; all other E values and supply8 unchanged';config.candidate.overrides.monsters[28].skills[1].power=60;validateConfig(config);const path=`configs/balance-lab/${config.suiteId}.json`;if(existsSync(path))throw Error('60 diagnostic already frozen');return{path,config,raw:JSON.stringify(config,null,2)+'\n'};});
for(const r of rows)writeFileSync(r.path,r.raw);
writeFileSync('docs/slime-balance-durable60-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock approximately9h ahead; own60outcomes not observed before freeze.',phase:'Parent-requested single-factor64to60 AoE diagnostic after E/8 results',configs:rows.map(({path,config,raw})=>({path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4,overrides:config.candidate.overrides}))},null,2)+'\n');
