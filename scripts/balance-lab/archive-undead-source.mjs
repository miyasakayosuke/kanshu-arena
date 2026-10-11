#!/usr/bin/env node
/** Exact bounded source snapshots. Never replaces an existing archive. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
const sha=v=>createHash('sha256').update(v).digest('hex');
const label=process.argv[2];if(!/^undead-[a-z0-9-]+$/.test(label??''))throw Error('Pass an undead-* archive label');
const dir='docs/undead-balance-source';mkdirSync(dir,{recursive:true});const indexPath=`${dir}/${label}-index.json`;if(existsSync(indexPath))throw Error('Archive already exists');
const files=[];for(const path of ['src/engine.ts','src/families.ts','scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs']){const bytes=readFileSync(path),gzip=gzipSync(bytes,{level:9});if(!gunzipSync(gzip).equals(bytes))throw Error('Round-trip mismatch');const record={format:'gzip-base64-utf8',path,sha256:sha(bytes),bytes:bytes.length,gzipSha256:sha(gzip),data:gzip.toString('base64')};const file=`${label}-${files.length+1}.json`,raw=JSON.stringify(record)+'\n';if(Buffer.byteLength(raw)>65000)throw Error('Source file exceeds compact bound');if(existsSync(`${dir}/${file}`))throw Error('Source file exists');writeFileSync(`${dir}/${file}`,raw);files.push({path,file,sha256:sha(bytes),archiveSha256:sha(raw),archiveBytes:Buffer.byteLength(raw)});}
const index={format:'bounded-source-index-v1',label,authoritativeDate:'2026-10-10 UTC',files};writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');console.log(JSON.stringify(index));
