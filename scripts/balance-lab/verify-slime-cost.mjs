#!/usr/bin/env node
/** Verify the adopted price change does not change combat for identical retained compositions. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load=p=>JSON.parse(readFileSync(p));
const paths=['lab-results/slime-durable60/report.json','lab-results/slime-budget-previous/report.json'];
const [before,after]=paths.map(load), ids=new Set(['pureslime','provisional','c17-fist']);
const key=m=>`${m.teamAId}|${m.teamBId}|${m.seed}|${m.orientation}`;
const prior=new Map(before.matches.filter(m=>m.kind==='matchup'&&m.variant==='candidate'&&ids.has(m.teamAId)).map(m=>[key(m),m]));
const projection=m=>{const{traceHash,...result}=m.result;return JSON.stringify(result);};
let checked=0;const mismatches=[];
for(const m of after.matches.filter(m=>m.kind==='matchup'&&m.variant==='candidate'&&ids.has(m.teamAId))){const old=prior.get(key(m));if(!old)throw Error(`Missing exact prior schedule: ${key(m)}`);checked++;if(projection(old)!==projection(m))mismatches.push(key(m));}
if(checked!==3360||mismatches.length)throw Error(`Cost-only combat equality failed: ${checked} pairs; ${mismatches.length} differing`);
const result={check:'Cost-only combat equality on all retained same-composition pure/provisional/fist matchups',pairs:checked,mismatches:0,projection:'Every reported result field except traceHash; traces contain roster cost snapshots and therefore intentionally differ.',reports:paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),exclusionLedger:'docs/slime-balance-budget-freeze.json',note:'Two prior opponent compositions now cost18 and are explicitly excluded from current legal comparisons, never deleted from previous-budget evidence.'};
writeFileSync('docs/slime-balance-cost-verification.json',JSON.stringify(result,null,2)+'\n');console.log(result);
