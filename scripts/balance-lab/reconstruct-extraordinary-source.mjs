#!/usr/bin/env node
/** Reconstruct archived source into a separate empty directory, never production. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
const sha=v=>createHash('sha256').update(v).digest('hex'),allowed=['src/engine.ts','src/families.ts','scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs'];
const [archiveArg,rootArg]=process.argv.slice(2);if(!archiveArg||!rootArg)throw Error('Usage: reconstruct-extraordinary-source ARCHIVE DESTINATION');
const root=resolve(rootArg),archive=resolve(archiveArg),data=JSON.parse(readFileSync(archive));if(existsSync(root))throw Error('Destination must not exist');const files=[];
if(data.format==='bounded-source-index-v1'){for(const entry of data.files){if(!allowed.includes(entry.path)||!/^[a-z0-9-]+\.json$/.test(entry.file))throw Error('Unexpected source entry');const raw=readFileSync(resolve(dirname(archive),entry.file));if(sha(raw)!==entry.archiveSha256)throw Error('Archive hash mismatch');const row=JSON.parse(raw),compressed=Buffer.from(row.data,'base64'),bytes=gunzipSync(compressed);if(row.path!==entry.path||sha(compressed)!==row.gzipSha256||sha(bytes)!==entry.sha256||sha(bytes)!==row.sha256)throw Error('Source hash mismatch');files.push([entry.path,bytes]);}}
else if(data.format==='gzip-base64-utf8'){for(const[path,entry]of Object.entries(data.files)){if(!allowed.includes(path))throw Error('Unexpected source path');const compressed=Buffer.from(entry.data,'base64'),bytes=gunzipSync(compressed);if(sha(bytes)!==entry.sha256||(entry.gzipSha256&&sha(compressed)!==entry.gzipSha256))throw Error('Source hash mismatch');files.push([path,bytes]);}}
else throw Error('Unsupported archive');
for(const[path,bytes]of[...files,['package.json','{"type":"module"}\n']]){const target=resolve(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
console.log(JSON.stringify({root,label:data.label,verifiedFiles:files.length,productionUnchanged:true}));
