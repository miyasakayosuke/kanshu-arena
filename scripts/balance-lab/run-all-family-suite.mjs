#!/usr/bin/env node
/** Streaming exact result capture; every scheduled row is executed, including controls. */
import { existsSync, readFileSync } from 'node:fs';
import { buildSchedule, runMatch, MatchFailure } from './core.mjs';
import { DERIVED_PATH, PACKED_ROOT, sha, load, saveNew, saveCheckpoint, verifiedDerived, assertSource, writeBoundedRecords } from './all-family-support.mjs';
const ids=process.argv.slice(2); if(!ids.length)throw Error('Pass one or more frozen all-family suite IDs');
const manifest=verifiedDerived();
for(const tool of manifest.tooling.filter(t=>/all-family-support|run-all-family-suite/.test(t.path)))if(sha(readFileSync(tool.path))!==tool.sha256)throw Error(`Frozen runner differs: ${tool.path}`);
for(const id of ids){
  const entry=manifest.configs.find(c=>c.id===id);if(!entry)throw Error(`Unknown frozen suite ${id}`);
  if(entry.phase==='reserve'){
    const decision=load('docs/all-family-balance-extension-decision.json');
    if(decision.source.engineSha256!==manifest.source.engineSha256||!decision.authorizedSuiteIds.includes(id))throw Error('Reserved seeds lack the frozen statistical trigger');
  }
  const config=load(entry.path),schedule=buildSchedule(config),indexPath=`${PACKED_ROOT}/${id}-index.json`,checkpointPath=`lab-results/${id}/checkpoint.json`;
  if(sha(JSON.stringify(schedule.cases))!==entry.scheduleSha256||schedule.cases.length!==entry.matches)throw Error('Frozen schedule differs');
  if(existsSync(indexPath)||existsSync(checkpointPath))throw Error(`Refuse to replace or silently resume evidence: ${id}`);
  const prefix=id.replace('all-family-','af-').replace('independent','i').replace(/reserve/g,'r').replace('matrix','m').replace('counter','c');
  const index={schemaVersion:1,suite:id,status:'running',phase:entry.phase,arm:entry.arm,scale:entry.scale,shell:entry.shell,configPath:entry.path,configFileSha256:entry.fileSha256,configSha256:entry.canonicalSha256,derivedFreezeSha256:sha(readFileSync(DERIVED_PATH)),source:manifest.source,scheduleSha256:entry.scheduleSha256,scheduledMatches:entry.matches,executedMatches:0,chunks:[]};
  let buffer=[];
  const flush=()=>{if(buffer.length){index.chunks.push(...writeBoundedRecords(PACKED_ROOT,prefix,buffer,index.chunks.length));buffer=[];}saveCheckpoint(checkpointPath,index);};
  const finalize=()=>{flush();const chunks=index.chunks;const chunkManifest=writeBoundedRecords(PACKED_ROOT,`${prefix}-manifest`,chunks.map((chunk,i)=>({id:`chunk-${i+1}`,...chunk})));const {chunks:_,...header}=index;saveNew(indexPath,{...header,chunkManifest});};
  saveCheckpoint(checkpointPath,index);console.log(`${id}: ${schedule.cases.length} matches`);
  try{
    for(const item of schedule.cases){
      if(index.executedMatches%128===0)assertSource(manifest.source);
      const result=runMatch(item.request);const {request,keyUnitId,...metadata}=item;
      buffer.push({...metadata,result,resultSha256:sha(JSON.stringify(result))});index.executedMatches++;
      if(buffer.length>=128)flush();
      if(index.executedMatches%1000===0)console.log(`${id} ${index.executedMatches}/${schedule.cases.length}`);
    }
    assertSource(manifest.source);index.status='complete';finalize();console.log(`${id}: complete, ${index.chunks.length} bounded result chunks`);
  }catch(error){
    index.status='failed';index.failedMatchId=schedule.cases[index.executedMatches]?.id??null;index.error=error.message;
    if(error instanceof MatchFailure){
      const raw=JSON.stringify({error:error.message,request:error.request,trace:error.trace})+'\n';
      const bytes=Buffer.from(raw),parts=[];for(let offset=0;offset<bytes.length;offset+=32768)parts.push({id:`failure-part-${parts.length+1}`,offset,data:bytes.subarray(offset,offset+32768).toString('base64')});
      index.failure={sha256:sha(bytes),bytes:bytes.length,chunks:writeBoundedRecords(PACKED_ROOT,`${prefix}-failure`,parts)};
    }
    finalize();throw error;
  }
}
