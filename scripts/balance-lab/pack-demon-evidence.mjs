#!/usr/bin/env node
/** Compact aggregates AND per-match outcome/trace/MP ledgers; no discarded bad results. */
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {summarize} from './core.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const ids=process.argv.slice(2);if(!ids.length)throw Error('Pass one or more frozen suite IDs');
const root='docs/demon-balance-packed';mkdirSync(root,{recursive:true});
for(const id of ids){const path=`lab-results/${id}/report.json`,raw=readFileSync(path),r=JSON.parse(raw);if(r.config.suiteId!==id)throw Error('Wrong report');const records=[];
const add=(key,value)=>records.push({key,value});
add(`${id}/index`,{source:r.source,reportSha256:sha(raw),config:r.config,scheduleCounts:r.scheduleCounts,methodology:r.methodology,summary:r.summary,mirrorControls:r.mirrorControls,teams:r.teams});
for(const s of r.scenarios)add(`${id}/scenario/${s.id}`,s);
for(const target of new Set(r.scenarios.filter(s=>s.kind==='matchup').map(s=>s.a))){const rows=r.matches.filter(m=>m.kind==='matchup'&&m.teamAId===target);add(`${id}/target/${target}`,Object.fromEntries(['baseline','candidate'].map(v=>[v,summarize(rows.filter(m=>m.variant===v),r.teams.find(t=>t.id===target).ids.includes(29)?29:undefined)])));}
// Every match retains source-linked outcome, trace hash, and full unit accounting without full event trees.
for(const m of r.matches)add(`${id}/match/${m.id}`,{id:m.id,scenarioId:m.scenarioId,kind:m.kind,seed:m.seed,orientation:m.orientation,variant:m.variant,teamAId:m.teamAId,teamBId:m.teamBId,result:{winner:m.result.winner,turns:m.result.turns,traceHash:m.result.traceHash,units:m.result.units}});
const chunks=[];let chunk=[];let rawSize=0;
const flush=()=>{if(!chunk.length)return;const uncompressed=JSON.stringify(chunk)+'\n';const payload={format:'gzip-base64-json',sha256:sha(uncompressed),data:gzipSync(uncompressed,{level:9}).toString('base64')};const bytes=JSON.stringify(payload)+'\n';if(Buffer.byteLength(bytes)>65000){const all=chunk;chunk=all.slice(0,Math.floor(all.length/2));flush();chunk=all.slice(Math.floor(all.length/2));flush();return;}if(gunzipSync(Buffer.from(payload.data,'base64')).toString()!==uncompressed)throw Error('Round-trip mismatch');const file=`${id}-${String(chunks.length+1).padStart(3,'0')}.json`;if(existsSync(`${root}/${file}`))throw Error(`Refuse existing ${file}`);writeFileSync(`${root}/${file}`,bytes);chunks.push({file,sha256:sha(bytes),bytes:Buffer.byteLength(bytes),first:chunk[0].key,last:chunk.at(-1).key,records:chunk.length});chunk=[];rawSize=0;};
for(const record of records){const size=Buffer.byteLength(JSON.stringify(record));if(rawSize+size>2000000)flush();chunk.push(record);rawSize+=size;}flush();
const index={schemaVersion:1,suite:id,source:r.source,rawReportSha256:sha(raw),records:records.length,chunks};const indexBytes=JSON.stringify(index)+'\n';if(Buffer.byteLength(indexBytes)>65000)throw Error('Index too big');writeFileSync(`${root}/${id}-index.json`,indexBytes);console.log(JSON.stringify({suite:id,matches:r.matches.length,chunks:chunks.length,maxBytes:Math.max(...chunks.map(c=>c.bytes))}));}
