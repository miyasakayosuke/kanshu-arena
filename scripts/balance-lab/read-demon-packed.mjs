#!/usr/bin/env node
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
const[suite,key]=process.argv.slice(2);if(!suite)throw Error('Usage: read-demon-packed.mjs SUITE [RECORD_KEY]');const root='docs/demon-balance-packed',sha=v=>createHash('sha256').update(v).digest('hex'),index=JSON.parse(readFileSync(`${root}/${suite}-index.json`));let found=false;
for(const entry of index.chunks){const raw=readFileSync(`${root}/${entry.file}`);if(sha(raw)!==entry.sha256)throw Error('Chunk hash differs');const compressed=JSON.parse(raw),bytes=gunzipSync(Buffer.from(compressed.data,'base64'));if(sha(bytes)!==compressed.sha256)throw Error('Logical bytes differ');const rows=JSON.parse(bytes);if(rows.length!==entry.records)throw Error('Record count differs');for(const row of rows)if(!key||row.key===key){console.log(key?JSON.stringify(row.value,null,2):row.key);found=true;}}
if(!found)throw Error('No matching record');
