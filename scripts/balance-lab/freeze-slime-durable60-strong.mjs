#!/usr/bin/env node
/** Test both strongest observed E mixed compositions under the same 60-only reduction. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateConfig } from './core.mjs';
const load=p=>JSON.parse(readFileSync(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const source=load('configs/balance-lab/slime-durable-mixed-b.json'),keep=['coherent-slime-poison-cleanse','coherent-slime-area'];
const targets=source.teams.filter(t=>keep.includes(t.id)),opponents=source.teams.slice(5);
const config={...source,suiteId:'slime-durable60-strong',teams:[...targets,...opponents],scenarios:source.scenarios.filter(s=>keep.includes(s.a)),candidate:{...load('configs/balance-lab/slime-durable60.json').candidate,id:'durable60-strong',label:'Post-E strongest two frozen mixed targets under60, unchanged prior seeds/opponents'}};
validateConfig(config);const path='configs/balance-lab/slime-durable60-strong.json';if(existsSync(path))throw Error('Strong60already frozen');const raw=JSON.stringify(config,null,2)+'\n';writeFileSync(path,raw);writeFileSync('docs/slime-balance-durable60-strong-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock approximately9h ahead.',phase:'Outcome-informed narrow dominance diagnostic, frozen before own60results; all11original mixed outcomes remain retained.',reason:'E produced82.43/83.11% in these two original frozen mixes. Check that the 60reduction does not hide this strength behind only the provisional/C17fist comparison.',targets,path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4},null,2)+'\n');
