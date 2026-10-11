#!/usr/bin/env node
/** Lossless verified packing. Run only once final-source evidence is complete. */
import { existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readPackedRecord } from './read-slime-packed.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex'),limit=65000;
const source='docs/slime-balance-runs',output='docs/slime-balance-packed';
if(existsSync(`${output}/manifest.json`))throw Error('Already packed; do not replace final evidence blindly');
const files=readdirSync(source).filter(f=>/^slime-.*\.json$/.test(f)).sort();
if(files.length!==readdirSync(source).length)throw Error('Unexpected files in generated-fragment folder; refuse deletion');
const records=files.map(id=>({id,raw:readFileSync(`${source}/${id}`,'utf8')}));
const priorSummary=JSON.parse(readFileSync('docs/slime-balance-summary.json'));
records.push({id:'slime-balance-summary-unpacked.json',raw:JSON.stringify(priorSummary,null,2)+'\n'});
for(const record of records)record.data=JSON.parse(record.raw);
const counts=new Map(),values=new Map(),shapeCounts=new Map(),shapeValues=new Map();
const collect=value=>{if(!value||typeof value!=='object')return;if(Object.hasOwn(value,'$evidenceRef')||Object.hasOwn(value,'$evidenceShape'))throw Error('Reserved reference field already exists');if(!Array.isArray(value)){const keys=Object.keys(value),shape=JSON.stringify(keys);if(keys.length>=4&&shape.length>50){const key=sha(shape);shapeCounts.set(key,(shapeCounts.get(key)??0)+1);shapeValues.set(key,keys);}}const raw=JSON.stringify(value);if(raw.length>=500){const key=sha(raw);counts.set(key,(counts.get(key)??0)+1);values.set(key,value);}for(const v of Object.values(value))collect(v);};
for(const r of records)collect(r.data);
const sharedIds=new Map([...counts].filter(([,n])=>n>1).map(([key])=>key).sort().map((key,i)=>[key,`s${String(i+1).padStart(5,'0')}`]));
const shapeIds=new Map([...shapeCounts].filter(([,n])=>n>1).map(([key])=>key).sort().map((key,i)=>[key,`k${String(i+1).padStart(4,'0')}`]));
const shared=new Map(),shapes=new Map();
const transform=(value,skip)=>{if(!value||typeof value!=='object')return value;const raw=JSON.stringify(value),key=raw.length>=500?sha(raw):null,id=sharedIds.get(key);if(id&&key!==skip){if(!shared.has(id)){shared.set(id,null);shared.set(id,{type:'shared',id,canonicalSha256:key,value:transform(value,key)});}return {$evidenceRef:id};}if(Array.isArray(value))return value.map(v=>transform(v));const shapeKey=sha(JSON.stringify(Object.keys(value))),shapeId=shapeIds.get(shapeKey);if(shapeId){shapes.set(shapeId,{type:'shape',id:shapeId,canonicalSha256:shapeKey,value:shapeValues.get(shapeKey)});return {$evidenceShape:shapeId,values:Object.values(value).map(v=>transform(v))};}return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v)]));};
const packedRecords=records.map(r=>({type:'record',id:r.id,canonicalSha256:sha(JSON.stringify(r.data)),prettySha256:sha(r.raw),value:transform(r.data)}));
const entries=[...shapes.values(),...shared.values(),...packedRecords];
const chunks=[],locators=[];let chunk={schemaVersion:1,entries:[]};
for(const entry of entries){if(Buffer.byteLength(JSON.stringify({...chunk,entries:[...chunk.entries,entry]}))>=limit){if(!chunk.entries.length)throw Error(`Single entry exceeds65KB: ${entry.id}`);chunks.push(chunk);chunk={schemaVersion:1,entries:[]};}locators.push({type:entry.type,id:entry.id,chunk:chunks.length,index:chunk.entries.length});chunk.entries.push(entry);}
if(chunk.entries.length)chunks.push(chunk);
const catalogs=[];let catalog={schemaVersion:1,entries:[]};for(const loc of locators){if(Buffer.byteLength(JSON.stringify({...catalog,entries:[...catalog.entries,loc]}))>=limit){catalogs.push(catalog);catalog={schemaVersion:1,entries:[]};}catalog.entries.push(loc);}if(catalog.entries.length)catalogs.push(catalog);
const summary={records:records.length,sharedObjects:shared.size,keyShapes:shapes.size,chunkFiles:chunks.length,catalogFiles:catalogs.length,originalBytes:records.reduce((n,r)=>n+Buffer.byteLength(r.raw),0),packedBytes:chunks.reduce((n,c)=>n+Buffer.byteLength(JSON.stringify(c)),0)+catalogs.reduce((n,c)=>n+Buffer.byteLength(JSON.stringify(c)),0)};
if(process.argv.includes('--dry-run')){console.log(JSON.stringify(summary,null,2));process.exit(0);}
mkdirSync(output,{recursive:true});
const save=(name,value)=>{const raw=JSON.stringify(value)+'\n';if(Buffer.byteLength(raw)>limit)throw Error(`File exceeds65KB: ${name}`);writeFileSync(`${output}/${name}`,raw);return{path:name,sha256:sha(raw),bytes:Buffer.byteLength(raw)};};
const manifest={schemaVersion:1,format:'lossless-JSON-records-shared-subtrees-and-key-shapes-v1',byteLimit:limit,...summary,originalDirectory:source,referenceMeaning:'Former path values inside reconstructed records are logical record IDs, resolved by this catalog; they are not dangling filesystem delivery links.',reader:'node scripts/balance-lab/read-slime-packed.mjs RECORD_FILENAME',chunks:chunks.map((c,i)=>save(`chunk-${String(i+1).padStart(3,'0')}.json`,c)),catalogs:catalogs.map((c,i)=>save(`catalog-${String(i+1).padStart(3,'0')}.json`,c))};
save('manifest.json',manifest);
// Read actual persisted bytes through the public reader; check every original byte-equivalent pretty JSON record before removing fragments.
for(const r of records){const restored=readPackedRecord(r.id);if(JSON.stringify(restored,null,2)+'\n'!==r.raw)throw Error(`Lossless reconstruction failed: ${r.id}`);}
const backup='lab-results/slime-fragments-before-pack';mkdirSync(backup,{recursive:true});for(const r of records)writeFileSync(`${backup}/${r.id}`,r.raw);
const recordLocations=new Map(locators.filter(l=>l.type==='record').map(l=>[l.id,l]));
const index={schemaVersion:1,status:priorSummary.status,policy:priorSummary.policy,limitations:priorSummary.limitations,format:manifest.format,manifest:{path:`${output}/manifest.json`,sha256:sha(readFileSync(`${output}/manifest.json`))},verification:{reconstructedRecords:records.length,byteEquivalentPrettyJson:true,removedOnlySupersededGeneratedFragments:true},reports:priorSummary.reports.map(r=>{const id=basename(r.path),loc=recordLocations.get(id);return {suite:r.suite,recordId:id,path:`${output}/${manifest.chunks[loc.chunk].path}`,canonicalSha256:packedRecords.find(p=>p.id===id).canonicalSha256};})};
writeFileSync('docs/slime-balance-summary.json',JSON.stringify(index,null,2)+'\n');
for(const file of files)unlinkSync(`${source}/${file}`);
console.log(JSON.stringify({...summary,verifiedRecords:records.length,largestFile:Math.max(...manifest.chunks.map(c=>c.bytes),...manifest.catalogs.map(c=>c.bytes))},null,2));
