#!/usr/bin/env node
/** Diagnose the pre-existing nature shell with every old C4 replacement, not selected winners. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { monsters } from '../../src/engine.ts';
import { validateConfig } from './core.mjs';
const load=p=>JSON.parse(readFileSync(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const original=load('configs/balance-lab/slime-durable-oldcores.json'),opponents=original.teams.slice(6);
const ids=monsters.filter(m=>m.id<24&&m.cost===4).map(m=>m.id);if(JSON.stringify(ids)!=='[0,5,7,11,12,23]')throw Error('Old C4 list changed');
const targets=ids.map(id=>({id:`nature-old-c4-${id}`,ids:[14,3,9,10,id],role:`Exact old C4 substitution ${id} for28 in triple-poison nature shell; C17`}));targets.push({id:'nature-old-pure',ids:[14,3,6,9,10],role:'Exact prior pure nature triple-poison/fast area anchor; C15'});
const config={...original,suiteId:'slime-nature-old-controls',teams:[...targets,...opponents],scenarios:targets.flatMap((t,i)=>opponents.map((o,j)=>({id:`f${i+1}-o${j+1}`,a:t.id,b:o.id,keyUnitId:14}))),candidate:{...original.candidate,id:'nature-old-controls',label:'Matched old C4 and pure nature controls; baseline and same global E8 source'}};
validateConfig(config);const path='configs/balance-lab/slime-nature-old-controls.json';if(existsSync(path))throw Error('Nature controls already frozen');const raw=JSON.stringify(config,null,2)+'\n';writeFileSync(path,raw);
writeFileSync('docs/slime-balance-nature-controls-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock approximately9h ahead; freeze-before-own-outcomes.',phase:'Post-E dominance countercheck explicitly requested by parent',reason:'[14,3,9,10,28] scored96.49%original and99.75%E; distinguish old triple-poison shell from unique new-brute value. Every old C4 substitution retained, plus original C15pure. No global mechanics changed.',comparison:'Use nature-with-fist from slime-durable-oldcores at the same16seeds,37opponents,physical swaps and source. Candidate E affects only opponent slime companions for these old-only focal controls.',path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),targets,matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4},null,2)+'\n');
