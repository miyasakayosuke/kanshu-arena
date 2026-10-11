#!/usr/bin/env node
import{readFileSync,existsSync}from'node:fs';
import{buildSchedule,runMatch,MatchFailure}from'./core.mjs';
import{sha,load,saveNew,saveCheckpoint,assertSource,writeBoundedRecords}from'./all-family-support.mjs';
import{verifiedFollowup,DERIVED as LEADER_DERIVED,ROOT as LEADER_ROOT}from'./all-family-leader-followup.mjs';
import{verifiedPure,PURE_DERIVED,PURE_ROOT}from'./all-family-pure-confirmation.mjs';
const pure=process.argv[2]==='--pure',DERIVED=pure?PURE_DERIVED:LEADER_DERIVED,ROOT=pure?PURE_ROOT:LEADER_ROOT,m=pure?verifiedPure():verifiedFollowup(),ids=process.argv.slice(pure?3:2);if(!ids.length)throw Error('Pass frozen follow-up suite IDs');
for(const id of ids){
 const entry=m.configs.find(c=>c.id===id);if(!entry)throw Error('Unknown follow-up suite');
 const schedule=buildSchedule(load(entry.path)),indexPath=`${ROOT}/${id}-index.json`,checkpointPath=`lab-results/${id}/checkpoint.json`;
 if(sha(JSON.stringify(schedule.cases))!==entry.scheduleSha256||schedule.cases.length!==entry.matches)throw Error('Follow-up schedule differs');
 if(existsSync(indexPath)||existsSync(checkpointPath))throw Error('Refuse to overwrite or silently resume follow-up');
 const prefix=id.replace('all-family-leader-','lf-').replace('independent','i').replace('reserve','r');
 const index={schemaVersion:1,suite:id,status:'running',phase:entry.phase,arm:entry.arm,scale:entry.scale,shell:null,configPath:entry.path,configFileSha256:entry.fileSha256,configSha256:entry.canonicalSha256,derivedFreezeSha256:sha(readFileSync(DERIVED)),source:m.source,scheduleSha256:entry.scheduleSha256,scheduledMatches:entry.matches,executedMatches:0,chunks:[]};let buffer=[];
 const flush=()=>{if(buffer.length){index.chunks.push(...writeBoundedRecords(ROOT,prefix,buffer,index.chunks.length));buffer=[];}saveCheckpoint(checkpointPath,index);};
 const finalize=()=>{flush();const chunks=index.chunks,chunkManifest=writeBoundedRecords(ROOT,prefix+'-manifest',chunks.map((c,i)=>({id:`chunk-${i+1}`,...c}))),{chunks:_,...header}=index;saveNew(indexPath,{...header,chunkManifest});};
 saveCheckpoint(checkpointPath,index);console.log(id+': '+entry.matches+' matches');
 try{for(const item of schedule.cases){if(index.executedMatches%128===0)assertSource(m.source);const result=runMatch(item.request),{request,keyUnitId,...metadata}=item;buffer.push({...metadata,result,resultSha256:sha(JSON.stringify(result))});index.executedMatches++;if(buffer.length>=128)flush();if(index.executedMatches%1000===0)console.log(id+' '+index.executedMatches+'/'+entry.matches);}assertSource(m.source);index.status='complete';finalize();console.log(id+': complete');}
 catch(error){index.status='failed';index.failedMatchId=schedule.cases[index.executedMatches]?.id??null;index.error=error.message;if(error instanceof MatchFailure){const bytes=Buffer.from(JSON.stringify({error:error.message,request:error.request,trace:error.trace})+'\n'),parts=[];for(let n=0;n<bytes.length;n+=32768)parts.push({id:`failure-part-${parts.length+1}`,offset:n,data:bytes.subarray(n,n+32768).toString('base64')});index.failure={sha256:sha(bytes),bytes:bytes.length,chunks:writeBoundedRecords(ROOT,prefix+'-failure',parts)};}finalize();throw error;}
}
