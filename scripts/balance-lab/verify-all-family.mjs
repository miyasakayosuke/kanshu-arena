#!/usr/bin/env node
/** Verify every retained row, exact schedule/config/source, controls and bounded source-linked replay. */
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { buildSchedule, runMatch } from './core.mjs';
import { monsters } from '../../src/engine.ts';
import { load, sha, verifiedDerived, readSuite, saveNew, PACKED_ROOT, readChunk, readMatrix, reverseRow, scoreForA, sideForA } from './all-family-support.mjs';
const manifest=verifiedDerived(),freeze=readMatrix(),baselineHashes=new Map(),nonpoisonHashes=new Map();
const specific=process.argv.indexOf('--match');
const ids=process.argv.filter((_,i)=>i>1&&!(specific>=0&&(i===specific||i===specific+1))).filter(x=>!x.startsWith('--'));
const entries=manifest.configs.filter(e=>(!ids.length||ids.includes(e.id))&&existsSync(`${PACKED_ROOT}/${e.id}-index.json`));
if(!entries.length)throw Error('No matching completed suites');
const records=[];let replayed=0,total=0,baselineRepeats=0,nonpoisonComparisons=0,identityComparisons=0;
for(const entry of entries){
  const index=load(`${PACKED_ROOT}/${entry.id}-index.json`),config=load(entry.path),schedule=buildSchedule(config);
  if(index.status!=='complete'||index.executedMatches!==entry.matches||index.scheduledMatches!==entry.matches||index.scheduleSha256!==entry.scheduleSha256||index.configSha256!==entry.canonicalSha256||index.configFileSha256!==entry.fileSha256||!isDeepStrictEqual(index.source,manifest.source)||sha(JSON.stringify(schedule.cases))!==entry.scheduleSha256)throw Error(`Suite index differs: ${entry.id}`);
  let position=0;const samples=new Set([0,1,Math.floor(schedule.cases.length/4),Math.floor(schedule.cases.length/4)+1,Math.floor(schedule.cases.length/2),Math.floor(schedule.cases.length/2)+1,Math.floor(schedule.cases.length*3/4),Math.floor(schedule.cases.length*3/4)+1,schedule.cases.length-2,schedule.cases.length-1]);
  let pendingBaseline=null;
  for(const row of readSuite(entry.id)){
    const item=schedule.cases[position];if(!item)throw Error('Packed suite has extra rows');
    const {request,keyUnitId,...metadata}=item;const {result,resultSha256,...storedMetadata}=row;
    if(!isDeepStrictEqual(metadata,storedMetadata)||sha(JSON.stringify(result))!==resultSha256)throw Error(`Packed row schedule/result differs: ${row.id}`);
    if(!/^[a-f0-9]{64}$/.test(result.traceHash)||typeof result.adjudicated!=='boolean'||result.adjudicated&&!result.turnLimit||result.units.length!==10)throw Error('Outcome or trace schema invalid');
    if(reverseRow(reverseRow(row)).teamAId!==row.teamAId||scoreForA(row)+scoreForA(reverseRow(row))!==1||sideForA(row)===sideForA(reverseRow(row)))throw Error('Logical reversal is incorrect');
    for(const u of result.units){if(u.initialMp+u.mpGenerated-u.mpSpent-u.mpDamageReceived!==u.finalMp||u.finalMp<0||u.finalMp>u.maximumMp)throw Error('Packed MP ledger mismatch');if(u.poisonDirectHp<0||u.poisonTickHpTaken<0||u.poisonApplications!==u.poisonNewApplications+u.poisonRedundantApplications+u.poisonRefreshApplications)throw Error('Packed poison ledger mismatch');}
    if(row.variant==='baseline'){
      pendingBaseline=result;const key=sha(JSON.stringify(request));const previous=baselineHashes.get(key);
      if(previous&&previous!==resultSha256)throw Error(`Repeated default baseline changed: ${row.id}`);if(previous)baselineRepeats++;else baselineHashes.set(key,resultSha256);
    }else{
      if(entry.scale===0&&result.units.some(u=>u.poisonDirectHp!==0))throw Error('Scale zero leaked direct poison HP damage');
      const mechanical=r=>{const {traceHash,...rest}=r;return rest;};
      if(entry.scale===1&&entry.arm==='independent'){if(!isDeepStrictEqual(mechanical(pendingBaseline),mechanical(result)))throw Error('Explicit stock controls differ from shipping defaults');identityComparisons++;}
      const noPoison=[...request.teamA,...request.teamB].every(id=>!monsters.find(m=>m.id===id).skills.some(s=>s.kind==='poison'));
      if(noPoison){const key=sha(JSON.stringify({...request,overrides:{}}));const hash=sha(JSON.stringify(mechanical(result))),previous=nonpoisonHashes.get(key);if(previous&&previous!==hash)throw Error('Non-poison result changed across scale/policy arms');if(previous)nonpoisonComparisons++;else nonpoisonHashes.set(key,hash);}
    }
    if(specific>=0?row.id===process.argv[specific+1]:samples.has(position)){
      const actual=runMatch(request);if(!isDeepStrictEqual(actual,result)||sha(JSON.stringify(actual))!==resultSha256)throw Error(`Exact replay mismatch: ${entry.id}/${row.id}`);replayed++;records.push({suite:entry.id,id:row.id,traceHash:actual.traceHash,resultSha256});
    }
    position++;total++;
  }
  if(position!==entry.matches)throw Error(`Missing scheduled rows: ${entry.id}`);
  for(const chunk of index.chunkManifest){readChunk(PACKED_ROOT,chunk);}
  console.log(`Verified ${entry.id}: ${position} retained rows`);
}
if(specific>=0&&!replayed)throw Error('Requested replay ID not present');
const report={schemaVersion:1,source:manifest.source,matrixFreezeSha256:manifest.matrix.sha256,allStoredRowsVerified:total,replayed,baselineRepeatsCompared:baselineRepeats,identityPairsCompared:identityComparisons,nonPoisonComparisons:nonpoisonComparisons,recordedSourceAndConfigExact:true,fullResultsLossless:true,fullEvents:'Recreated from exact archived source and frozen requests; not duplicated per stored row.',replays:records};
if(specific<0)saveNew('docs/all-family-balance-verification.json',report);
console.log(JSON.stringify(report,null,2));
