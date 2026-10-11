#!/usr/bin/env node
/** Extract an immutable archived source into a NEW directory; never replace working files. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { load, readChunk, sha, SOURCE_ROOT } from './all-family-support.mjs';
const [label,destination]=process.argv.slice(2);if(!label||!destination)throw Error('Pass archive label and a new destination directory');
const index=load(`${SOURCE_ROOT}/${label}-index.json`);if(existsSync(destination))throw Error('Destination must not exist');
const files=index.chunks.flatMap(c=>readChunk(SOURCE_ROOT,c));
for(const f of files){const metadata=index.files.find(m=>m.path===f.path),raw=Buffer.from(f.data,'base64');if(!metadata||sha(raw)!==metadata.sha256||raw.length!==metadata.bytes||f.path.startsWith('/')||f.path.split('/').includes('..'))throw Error('Archived source mismatch');}
mkdirSync(destination,{recursive:true});for(const f of files){const path=resolve(destination,f.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,Buffer.from(f.data,'base64'),{flag:'wx'});}
console.log(JSON.stringify({label,destination,files:files.map(f=>({path:f.path,sha256:f.sha256})),source:index.source},null,2));
