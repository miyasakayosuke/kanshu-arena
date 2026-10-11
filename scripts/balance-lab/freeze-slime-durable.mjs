#!/usr/bin/env node
/** Separately frozen E diagnostic, following the failed A–D pure-family results. */
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { monsters } from '../../src/engine.ts';
import { validateConfig } from './core.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const broad=JSON.parse(readFileSync('configs/balance-lab/slime-broad.json'));
const opponents=broad.teams.filter(t=>!['pureslime','provisional'].includes(t.id)&&!t.id.startsWith('generated-'));
const hp=Object.fromEntries([235,160,250,195,220].map((hp,i)=>[i+24,{hp}]));
const patch={...hp,24:{...hp[24],skills:monsters[24].skills.map((s,i)=>i===1?{...s,power:128}:s)},28:{...hp[28],skills:monsters[28].skills.map((s,i)=>i===1?{...s,power:64}:s)}};
const team=(id,ids,role)=>({id,ids,role});
const focal=[...broad.teams.slice(0,2),team('c17-fist',[24,25,28,7,10],'Same C17 fist/Selkie/Naga as initial mixed diagnostic; no favorable selection from own outcomes')];
const oldCores=[
 team('beast-with-fist',[12,0,13,2,28],'C17 fourbeast + slime brute; Beast core leader; compare global E companion buffs'),
 team('nature-with-fist',[14,3,9,10,28],'C17 fournature triple-poison + slime brute; nature core leader'),
 team('dragon-with-fist',[15,16,18,2,28],'C17 threeragon with heal-cleanse + slime brute; charge eligible'),
 team('material-shield-fist',[19,20,21,2,28],'C17 threematerial shield/Bastet + slime brute; repair eligible'),
 team('material-healer-fist',[19,20,22,2,28],'C17 threematerial twohealer + slime brute; repair eligible'),
 team('material-bull-swapped',[19,20,28,7,10],'Exact C17 prior strongest bull replacement by slime brute; only2material and repairineligible. Not causal damage-only comparison'),
];
const definitions=[['durable8',focal,{monsters:patch}],['durable16',focal,{monsters:patch,slimeSupply:{amount:16}}],['durable-oldcores',oldCores,{monsters:patch}]];
const configs=definitions.map(([id,targets,overrides])=>{const config={...structuredClone(broad),suiteId:`slime-${id}`,teams:[...targets,...opponents],scenarios:targets.flatMap((t,i)=>opponents.map((o,j)=>({id:`f${i+1}-o${j+1}`,a:t.id,b:o.id,keyUnitId:t.ids[0]}))),candidate:{id,label:`Post-diagnostic E: ${id}`,overrides}};validateConfig(config);const path=`configs/balance-lab/slime-${id}.json`;if(existsSync(path))throw Error('E already frozen; no redraw');const raw=JSON.stringify(config,null,2)+'\n';if(Buffer.byteLength(raw)>70000)throw Error('Config exceeds70KB');return{path,raw,config};});
for(const r of configs)writeFileSync(r.path,r.raw);
writeFileSync('docs/slime-balance-durable-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor clock is approximately9hours ahead; preserve raw time. Parent requested this phase after A/B pure11.49/14.53% overall results; frozen before own E outcomes.',phase:'post-diagnostic E; no production edits',reason:'Parent requested more durable HP235/160/250/195/220, corefixed128, bruteAoE64/MP20, supply8 and isolated16 comparison. No extra passive added.',engineSha256:sha(readFileSync('src/engine.ts')),scope:'Same13curated and24coherentC17 opponents, same16seeds as broad/A–D, bothsides andmirrors. Three slimecore targets plus six explicitly preserved oldcore mixes with28. Global patches also affect opponent slimecompanions.',configs:configs.map(({path,raw,config})=>({path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),targets:config.teams.slice(0,config.teams.length-opponents.length),overrides:config.candidate.overrides,matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4}))},null,2)+'\n');
console.log(configs.map(({path,config})=>[path,(config.scenarios.length+config.teams.length)*config.seeds.length*4]));
