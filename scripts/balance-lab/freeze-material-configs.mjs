#!/usr/bin/env node
/** Freeze this wave's bounded opponent set before examining any outcomes. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generateSeeds, sampleLegalMemberSets, validateConfig } from './core.mjs';
import { monsters } from '../../src/engine.ts';
const path = 'configs/balance-lab/';
if (existsSync(`${path}material-identity.json`)) throw new Error('Frozen configurations already exist; do not redraw after observing results.');
const old = JSON.parse(readFileSync(`${path}dragon-identity.json`));
const focals = [
 {id:'purematerial',ids:[19,20,21,22,23],role:'Pure material, core leader; COST17'},
 {id:'threematerial',ids:[19,20,23,2,10],role:'Exactly three starting material, healing and protect mixed; COST16'},
 {id:'twomaterial',ids:[19,20,3,2,10],role:'Exactly two starting material, repair inactive; COST15'},
 {id:'core-replaced',ids:[14,20,21,22,23],role:'Exact COST5 core replacement by Genbu, other four unchanged; COST17. Changes leader and skills as well as passive.'},
 {id:'core-nonleader',ids:[20,19,21,22,23],role:'Same pure material members; Karakasa speed leader; COST17'},
];
const controls = [...old.teams.filter(t => !['puredragon','threedragon','twodragon','core-replaced','core-nonleader'].includes(t.id)),{id:'puredragon',ids:[15,5,16,17,18],role:'Adopted full dragon unchanged; COST17'}];
const make = (id, targets, opponents, overrides = {}, count = 32) => ({schemaVersion:1,suiteId:`material-${id}`,seeds:generateSeeds(count,20261010),costLimit:17,teams:[...targets,...opponents],scenarios:targets.flatMap(t => opponents.map(o => ({id:`${t.id}-vs-${o.id}`,a:t.id,b:o.id,keyUnitId:t.id==='core-replaced'?14:19}))),candidate:{id,label:`Material frozen ${id}`,overrides},complaints:[],sampling:{count:0,seed:20261010}});
const save = (id, cfg) => {validateConfig(cfg);writeFileSync(`${path}material-${id}.json`,JSON.stringify(cfg,null,2)+'\n');};
save('identity',make('identity',focals,controls));
const pool = monsters.filter(m => m.id!==19);
const sampled = sampleLegalMemberSets({roster:pool,excluded:[...focals,...controls].map(t=>t.ids).filter(ids=>!ids.includes(19)),count:24,costLimit:17,seed:20261010});
const generated = sampled.members.map((ids,i)=>({id:`generated-${i+1}`,ids,role:'Frozen seeded material-core-free legal team; leader/order shuffled; not uniform sampling'}));
save('broad',make('broad',focals,[...controls,...generated],{},16));
for(const [id,repair] of [['repair-disabled',{enabled:false}],['repair-zero',{percent:0}]]) save(id,make(id,focals.slice(0,2),controls,{materialRepair:repair}));
console.log(JSON.stringify({frozenAt:new Date().toISOString(),generator:'legal-suffix-dp-coprime-rank-walk-v1',sample:sampled,counts:{curated:59*128,broad:203*64,isolation:29*128}},null,2));
