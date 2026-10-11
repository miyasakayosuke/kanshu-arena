#!/usr/bin/env node
/** Rebuild exact archived source in a NEW directory; no production edits. */
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
const [archive,out]=process.argv.slice(2);
if(!archive||!out)throw Error('Usage: node scripts/balance-lab/reconstruct-demon-source.mjs ARCHIVE_JSON NEW_DIRECTORY');
const root=resolve(out);if(existsSync(root))throw Error('Refusing existing output directory');
const historical=archive==='--slime-initial';const data=JSON.parse(readFileSync(historical?'docs/demon-balance-source/slime-final.json':archive));if(data.format!=='gzip-base64-utf8')throw Error('Unsupported archive');
const files=[];for(const[path,entry]of Object.entries(data.files)){if(!['src/engine.ts','src/families.ts','scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs'].includes(path))throw Error('Unexpected source path');const bytes=gunzipSync(Buffer.from(entry.data,'base64'));if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Hash mismatch: ${path}`);files.push([path,bytes]);}
if(historical){const spec=JSON.parse(readFileSync('docs/slime-balance-source-reconstruction.json')),entry=files.find(([path])=>path==='src/engine.ts');const source=entry[1].toString();if(createHash('sha256').update(source).digest('hex')!==spec.finalEngineSha256||source.slice(spec.characterOffset,spec.characterOffset+spec.replaceFinal.length)!==spec.replaceFinal)throw Error('Historical span mismatch');const original=source.slice(0,spec.characterOffset)+spec.withHistorical+source.slice(spec.characterOffset+spec.replaceFinal.length);if(createHash('sha256').update(original).digest('hex')!==spec.historicalEngineSha256)throw Error('Historical source hash mismatch');entry[1]=original;}
for(const[path,bytes]of [...files,['package.json','{"type":"module"}\n']]){const target=resolve(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
console.log(JSON.stringify({root,label:data.label,verifiedFiles:files.length,productionUnchanged:true}));
