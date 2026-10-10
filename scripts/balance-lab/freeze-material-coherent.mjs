#!/usr/bin/env node
/** Post-hoc diagnostic, frozen once before observing its outcomes. Not a random population. */
import { existsSync, writeFileSync } from 'node:fs';
import { monsters } from '../../src/engine.ts';
import { generateSeeds, validateConfig } from './core.mjs';
const path='configs/balance-lab/material-coherent-repair14.json';
if(existsSync(path))throw new Error('Post-hoc diagnostic already frozen; never redraw against observed outcomes.');
let seed=42610210; const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const features=ids=>{const units=ids.map(id=>monsters[id]);const skills=units.flatMap(u=>u.skills);return{healers:units.filter(u=>u.skills.some(s=>s.kind==='heal')).length,poisoners:units.filter(u=>u.skills.some(s=>s.kind==='poison')).length,cleansers:units.filter(u=>u.skills.some(s=>s.kind==='cleanse')).length,noncoreStrippers:units.slice(1).filter(u=>u.skills.some(s=>s.breaksGuard||s.breaksGuardAfterHit)).length,areaUsers:units.filter(u=>u.skills.some(s=>s.all)).length,priorityUsers:units.filter(u=>u.skills.some(s=>s.kind==='hit'&&s.priority>=2)).length,totalMp:units.reduce((sum,u)=>sum+u.mp,0)};};
const strata=[['healers',f=>f.healers>=2],['poison-cleanse',f=>f.poisoners>=1&&f.cleansers>=1],['strip',f=>f.noncoreStrippers>=1],['area',f=>f.areaUsers>=2],['priority',f=>f.priorityUsers>=2],['duration',()=>true]];
const selected=[];const pools=[];
for(const [family,core] of [['beast',12],['nature',14],['dragon',15]]){
 const pool=[];const rest=monsters.filter(m=>![19,core].includes(m.id));
 const visit=(ids,from)=>{if(ids.length===4){const members=[core,...ids];if(members.reduce((sum,id)=>sum+monsters[id].cost,0)===17&&members.filter(id=>monsters[id].family===family).length>=3)pool.push({ids:members,features:features(members)});return;}for(let i=from;i<=rest.length-(4-ids.length);i++)visit([...ids,rest[i].id],i+1);};visit([],0);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const used=new Set();pools.push({family,core,exactC17EligibleMemberSets:pool.length});
 for(const [stratum,qualifies] of strata){const candidates=pool.filter(row=>!used.has(row.ids.join(','))&&qualifies(row.features));if(!candidates.length)throw new Error(`No ${family}/${stratum} candidate`);if(stratum==='duration')candidates.sort((a,b)=>b.features.totalMp-a.features.totalMp);const row=candidates[0];used.add(row.ids.join(','));selected.push({id:`coherent-${family}-${stratum}`,ids:row.ids,role:`Post-hoc frozen ${family} core leader + at least3 family, exactC17; ${stratum} ownership stratum (actual execution measured)`,features:row.features});}
}
const targets=[
 {id:'purematerial',ids:[19,20,21,22,23],role:'Pure material; C17'},
 {id:'mixed-bull',ids:[19,20,23,2,10],role:'Three materials bull + Bastet/Naga; C16'},
 {id:'mixed-shield',ids:[19,20,21,2,10],role:'Same old support pair, shield replaces bull; C15'},
 {id:'mixed-healer',ids:[19,20,22,2,10],role:'Same old support pair, Trivet replaces bull; C15'},
 {id:'c17-bull',ids:[19,20,23,7,10],role:'Three materials bull + Selkie/Naga; exactC17'},
 {id:'c17-shield',ids:[19,20,21,7,3],role:'Three materials shield + Selkie/Dryas heal-poison; exactC17'},
 {id:'c17-healer',ids:[19,20,22,7,3],role:'Three materials Trivet + Selkie/Dryas, three learned healers; exactC17'},
];
const anchors=[{id:'fullbeast',ids:[12,0,2,11,13],role:'Original pure beast anchor C17'}, {id:'fullnature',ids:[14,3,6,9,10],role:'Original triple poison nature anchor C15; separate from exactC17 sample'}, {id:'puredragon',ids:[15,5,16,17,18],role:'Original pure dragon anchor C17'}];
const opponents=[...selected.map(({features,...team})=>team),...anchors];
const config={schemaVersion:1,suiteId:'material-coherent-repair14',seeds:generateSeeds(16,42610210),costLimit:17,teams:[...targets,...opponents],scenarios:targets.flatMap(t=>opponents.map(o=>({id:`${t.id}-vs-${o.id}`,a:t.id,b:o.id,keyUnitId:19}))),candidate:{id:'repair14',label:'Post-hoc exactC17 coherent diagnostics,18%baselinevs14%',overrides:{materialRepair:{percent:14}}},complaints:[],sampling:{count:0,seed:42610210}};
validateConfig(config);writeFileSync(path,JSON.stringify(config,null,2)+'\n');writeFileSync('docs/material-coherent-freeze.json',JSON.stringify({frozenAt:new Date().toISOString(),status:'post-hoc-diagnostic-frozen-before-own-results',seedBase:42610210,method:'Enumerate every exactC17 five-member set with chosen leader and >=3samefamily, exclude only material core19, seeded pool shuffle, select first distinct qualifying row in five skill-ownership strata; duration maximizes totalMP among remaining. Not uniform, role ownership is not execution. Three prior pure-family anchors separate.',pools,targets,opponents:selected},null,2)+'\n');console.log(`Frozen ${targets.length}targets,${opponents.length}opponents,16freshseeds:11200matches`);
