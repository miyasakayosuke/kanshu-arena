#!/usr/bin/env node
/** Freeze member sets and seeds once, before suite outcomes. Never redraw a bad result. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { monsters } from '../../src/engine.ts';
import { generateSeeds, sampleLegalMemberSets, validateConfig } from './core.mjs';
const root='configs/balance-lab/';
if(existsSync(`${root}slime-identity.json`)) throw new Error('Slime configurations already frozen; do not redraw.');
const sha=s=>createHash('sha256').update(s).digest('hex');
const source=JSON.parse(readFileSync(`${root}material-identity.json`));
const anchors=source.teams.filter(t=>!['purematerial','threematerial','twomaterial','core-replaced','core-nonleader'].includes(t.id));
const team=(id,ids,role)=>({id,ids,role});
const controls=[...anchors,
 team('purematerial',[19,20,21,22,23],'Adopted material14 pure C17'),
 team('material-strong',[19,20,23,7,10],'Prior coherent diagnostic strongest material mixed C17; preserve known strong comparison'),
 team('mixed-duration',[7,1,10,8,22],'Prior material generated-12 near-complete counter; C15'),
 team('mixed-beast',[1,13,12,0,4],'Prior material generated-16 counter with beast support; C16'),
];
const targets=[
 team('pureslime',[24,25,26,27,28],'Pure slime core leader; C17'),
 team('provisional',[24,25,28,2,10],'Unendorsed provisional mixed slime + Bastet/Naga; C16'),
 team('twoslime',[24,25,3,2,10],'Two slime: supply ineligible; C15'),
 team('core-replaced',[14,25,26,27,28],'Exact C5 core replacement; C17; leader/stats/skills also change, not causal supply test'),
 team('core-nonleader',[25,24,26,27,28],'Same five slime members, speed leader, supply retained; C17'),
];
let random=72610210;const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
const features=ids=>{const units=ids.map(id=>monsters[id]);return {healers:units.filter(u=>u.skills.some(s=>s.kind==='heal')).length,poisoners:units.filter(u=>u.skills.some(s=>s.kind==='poison')).length,cleansers:units.filter(u=>u.skills.some(s=>s.kind==='cleanse')).length,strippers:units.slice(1).filter(u=>u.skills.some(s=>s.breaksGuard||s.breaksGuardAfterHit)).length,areaUsers:units.filter(u=>u.skills.some(s=>s.all&&s.kind!=='restoreMp')).length,priorityUsers:units.filter(u=>u.skills.some(s=>s.kind==='hit'&&s.priority>=2)).length,totalMp:units.reduce((n,u)=>n+u.mp,0)};};
const strata=[['healers',f=>f.healers>=2],['poison-cleanse',f=>f.poisoners>=1&&f.cleansers>=1],['strip',f=>f.strippers>=1],['area',f=>f.areaUsers>=2],['priority',f=>f.priorityUsers>=2],['duration',()=>true]];
const pools=[], selected=[];
for(const [family,core]of[['beast',12],['nature',14],['dragon',15],['material',19],['slime',24]]){
 const pool=[],rest=monsters.filter(m=>m.id!==core&&(family==='slime'||m.id!==24));
 const visit=(ids,from)=>{if(ids.length===4){const members=[core,...ids];if(members.reduce((n,id)=>n+monsters[id].cost,0)===17&&members.filter(id=>monsters[id].family===family).length>=3)pool.push({ids:members,features:features(members)});return;}for(let i=from;i<=rest.length-(4-ids.length);i++)visit([...ids,rest[i].id],i+1);};visit([],0);
 const poolHash=sha(JSON.stringify(pool));for(let i=pool.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const used=new Set(),counts={};
 for(const [stratum,qualifies]of strata){counts[stratum]=pool.filter(row=>qualifies(row.features)).length;const candidates=pool.filter(row=>!used.has(row.ids.join(','))&&qualifies(row.features));if(!candidates.length)throw new Error(`Empty stratum ${family}/${stratum}`);if(stratum==='duration')candidates.sort((a,b)=>b.features.totalMp-a.features.totalMp);const row=candidates[0];used.add(row.ids.join(','));selected.push({id:`coherent-${family}-${stratum}`,ids:row.ids,role:`Frozen full legal exactC17 ${family} core-leader pool, >=3 family; ${stratum} skill-ownership stratum`,features:row.features});}
 pools.push({family,core,exactC17LegalMemberSets:pool.length,poolSha256:poolHash,stratumCandidateCounts:counts});
}
const coherent=selected.filter(t=>!t.id.startsWith('coherent-slime')).map(({features,...row})=>row);
const sampled=sampleLegalMemberSets({roster:monsters.filter(m=>m.id!==24),excluded:[...controls,...coherent].map(t=>t.ids),count:16,costLimit:17,seed:82610210});
const randomTeams=sampled.members.map((ids,i)=>team(`generated-${i+1}`,ids,'Frozen core24-free legal rank sample, random leader; supplementary only, not matched/strong pool'));
const mixed=[
 team('mixed-shield',[24,25,26,2,10],'Same Bastet/Naga pair, shield instead of fist; C15'),
 team('mixed-healer',[24,25,27,2,10],'Same Bastet/Naga pair, healer instead of fist; C15'),
 team('c17-fist',[24,25,28,7,10],'Slime fist + Selkie/Naga; C17'),
 team('c17-shield',[24,25,26,7,3],'Slime shield + Selkie/Dryas; C17'),
 team('c17-healer',[24,25,27,7,3],'Slime healer + Selkie/Dryas; C17'),
 ...selected.filter(t=>t.id.startsWith('coherent-slime')).map(({features,...row})=>row),
];
const configs=[];
const save=(id,focals,opponents,overrides={},count=16,seed=62610210)=>{const config={schemaVersion:1,suiteId:`slime-${id}`,seeds:generateSeeds(count,seed),costLimit:17,teams:[...focals,...opponents],scenarios:focals.flatMap((t,ti)=>opponents.map((o,oi)=>({id:`f${ti+1}-o${oi+1}`,a:t.id,b:o.id,keyUnitId:t.ids.includes(24)?24:14}))),candidate:{id,label:`Frozen slime ${id}; same production policy`,overrides},complaints:[],sampling:{count:0,seed}};validateConfig(config);const raw=JSON.stringify(config,null,2)+'\n';if(Buffer.byteLength(raw)>70000)throw new Error(`${id} config exceeds70KB`);const path=`${root}slime-${id}.json`;configs.push({id,path,raw,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(config)),seeds:count,targets:focals.length,opponents:opponents.length,matches:(config.scenarios.length+config.teams.length)*count*4});};
save('identity',targets,controls,{},32);
for(const[id,supply]of[['supply-enabled',{enabled:true}],['supply-disabled',{enabled:false}],['supply-zero',{amount:0}],['supply8',{amount:8}],['supply12',{amount:12}]])save(id,targets.slice(0,2),controls,{slimeSupply:supply},32);
save('broad',targets.slice(0,2),[...controls,...coherent,...randomTeams],{},16,82610210);
save('mixed-a',mixed.slice(0,6),[...controls,...coherent],{},12,92610210);
save('mixed-b',mixed.slice(6),[...controls,...coherent],{},12,92610210);
for(const config of configs) { writeFileSync(config.path,config.raw); delete config.raw; }
const freeze={executorRecordedAt:new Date().toISOString(),timestampCaution:'Executor wall clock may differ from authoritative UTC; compare freeze/run ordering, not wall-clock timestamps alone.',status:'frozen-before-suite-outcomes',preOutcomeFreezeError:'Initial generation stopped before any suite ran: combined scenario labels exceeded the strict64-character ID bound. Replaced only scenario IDs with indexed IDs; team/seed selection unchanged. All configs now validate before writes.',priorProbe:'One pure-slime/nature seed42 contract smoke observed before freeze: loss, no supply. No team/seed was selected from that outcome.',engineSha256:sha(readFileSync('src/engine.ts')),selectionSeed:72610210,method:'Enumerate every legal exactC17 5-member set with core leader and >=3 same family. Opponent families exclude only core24, permit all other slime companions. Slime pool permits full roster. Seeded shuffle, first unused qualifying row per ownership stratum; duration chooses highest total MP among unused. No observed outcomes used, no redraw. Preserve all selected teams, even weak/duplicate-outcome examples.',limitations:['Strata are skill ownership, not proof of actual use or optimal play.','Pools are exhaustively enumerated; matches sample six sets per family, not every set or every leader permutation.','Additional rank-sampled legal teams are not uniform or strong; coherent and known-strong comparisons remain separate.','Prior material strong/counter teams are purposive evidence-informed anchors, not independent random observations.'],pools,selected,supplementarySample:{algorithm:sampled.algorithm,pool:sampled.unusedLegalMemberSets,teams:randomTeams},targets,mixed,configs};
writeFileSync('docs/slime-balance-freeze.json',JSON.stringify(freeze,null,2)+'\n');console.log(JSON.stringify({pools,configs,totalMatches:configs.reduce((s,c)=>s+c.matches,0)},null,2));
