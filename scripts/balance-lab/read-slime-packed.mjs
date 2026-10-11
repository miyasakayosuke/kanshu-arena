#!/usr/bin/env node
/** Resolve a logical evidence record from the verified bounded chunk manifest. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const sha=s=>createHash('sha256').update(s).digest('hex');
let cached;
export function readPackedRecord(id, root=process.cwd()) {
 const dir=resolve(root,'docs/slime-balance-packed');
 if(!cached||cached.dir!==dir){const manifest=JSON.parse(readFileSync(`${dir}/manifest.json`));const locations=new Map(),chunks=new Map();for(const file of manifest.catalogs){const raw=readFileSync(`${dir}/${file.path}`);if(sha(raw)!==file.sha256)throw Error(`Catalog hash differs: ${file.path}`);for(const loc of JSON.parse(raw).entries)locations.set(`${loc.type}:${loc.id}`,loc);}cached={dir,manifest,locations,chunks,shared:new Map()};}
 const get=(type,key)=>{const loc=cached.locations.get(`${type}:${key}`);if(!loc)throw Error(`Unknown packed ${type}: ${key}`);const spec=cached.manifest.chunks[loc.chunk];if(!cached.chunks.has(loc.chunk)){const raw=readFileSync(`${dir}/${spec.path}`);if(sha(raw)!==spec.sha256)throw Error(`Chunk hash differs: ${spec.path}`);cached.chunks.set(loc.chunk,JSON.parse(raw));}const entry=cached.chunks.get(loc.chunk).entries[loc.index];if(entry.type!==type||entry.id!==key)throw Error('Packed locator differs');return entry;};
 const expand=value=>{if(!value||typeof value!=='object')return value;if(!Array.isArray(value)&&Object.keys(value).length===1&&typeof value.$evidenceRef==='string'){const key=value.$evidenceRef;if(!cached.shared.has(key)){const entry=get('shared',key),data=expand(entry.value);if(sha(JSON.stringify(data))!==entry.canonicalSha256)throw Error('Shared value hash differs');cached.shared.set(key,data);}return structuredClone(cached.shared.get(key));}if(!Array.isArray(value)&&typeof value.$evidenceShape==='string'){const shape=get('shape',value.$evidenceShape);if(sha(JSON.stringify(shape.value))!==shape.canonicalSha256||shape.value.length!==value.values.length)throw Error('Key shape differs');return Object.fromEntries(shape.value.map((key,i)=>[key,expand(value.values[i])]));}return Array.isArray(value)?value.map(expand):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,expand(v)]));};
 const entry=get('record',basename(id)),value=expand(entry.value);
 if(sha(JSON.stringify(value))!==entry.canonicalSha256||sha(JSON.stringify(value,null,2)+'\n')!==entry.prettySha256)throw Error(`Reconstructed evidence hash differs: ${id}`);
 return value;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(!process.argv[2])throw Error('Pass a logical record filename or former path');process.stdout.write(JSON.stringify(readPackedRecord(process.argv[2]),null,2)+'\n');}
