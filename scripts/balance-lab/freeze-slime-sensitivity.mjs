#!/usr/bin/env node
/** Post-baseline diagnostic requested after 0.96% pure-slime curated score. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { monsters } from '../../src/engine.ts';
import { validateConfig } from './core.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const source=JSON.parse(readFileSync('configs/balance-lab/slime-broad.json'));
const teams=source.teams.filter(t=>!t.id.startsWith('generated-'));
const hp=Object.fromEntries([220,150,235,182,205].map((hp,i)=>[24+i,{hp}]));
const attack={24:{skills:monsters[24].skills.map((skill,i)=>i===1?{...skill,power:128}:skill)}};
const combined={...hp,24:{...hp[24],...attack[24]}};
const variants=[['hp', {monsters:hp}],['hp-attack',{monsters:combined}],['hp-supply12',{monsters:hp,slimeSupply:{amount:12}}],['attack',{monsters:attack}]];
const configs=variants.map(([id,overrides])=>{const config={...structuredClone(source),suiteId:`slime-sensitivity-${id}`,teams,scenarios:source.scenarios.filter(s=>teams.some(t=>t.id===s.b)),candidate:{id:`sensitivity-${id}`,label:`Post-baseline sensitivity ${id}; no production edits`,overrides}};validateConfig(config);const path=`configs/balance-lab/slime-sensitivity-${id}.json`;if(existsSync(path))throw Error('Diagnostic already frozen; do not redraw');return{path,config,raw:JSON.stringify(config,null,2)+'\n'};});
for(const row of configs)writeFileSync(row.path,row.raw);
writeFileSync('docs/slime-balance-sensitivity-freeze.json',JSON.stringify({executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor wall clock may differ from authoritative UTC; compare freeze/run ordering, not wall-clock timestamps alone.',phase:'post-baseline frozen before sensitivity outcomes',reason:'Parent requested four bounded diagnostics after original pure8/832 wins and provisional162/832 against13 frozen curated opponents. Original source and failed balance evidence remain.',engineSha256:sha(readFileSync('src/engine.ts')),scope:'Pure and provisional only; same13curated plus24coherent C17 opponents; exact original broad seeds, swaps, mirrors, production AI. HP-only; HP+core128; HP+amount12; originalHP+core128. Other stats, MP, skills and old roster unchanged.',configs:configs.map(({path,config,raw})=>({path,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),overrides:config.candidate.overrides,matches:(config.scenarios.length+config.teams.length)*config.seeds.length*4}))},null,2)+'\n');
console.log(configs.map(({path,config})=>[path,(config.scenarios.length+config.teams.length)*config.seeds.length*4]));
