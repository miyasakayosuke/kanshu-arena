import fs from 'node:fs';
import {actorSvg,PANEL} from './rig.mjs';
import {actorSvg as oldActorSvg} from './baseline-rig.mjs';
const times=new Set(Array.from({length:1501},(_,i)=>i));
for(let i=0;i<360;i++)times.add(Number((i*1000/240).toFixed(6)));
const frames=[...times].sort((a,b)=>a-b).map(ms=>({ms,actor:actorSvg(ms)}));
fs.writeFileSync(new URL('../evidence/pixel-audit-input.json',import.meta.url),JSON.stringify({panels:PANEL,padding:64,frames,oldPositiveControl:{ms:200,actor:oldActorSvg(200)}}));
console.log(`Prepared ${frames.length} audit timestamps at 1 ms plus every unique movie time.`);
