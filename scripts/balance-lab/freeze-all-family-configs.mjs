#!/usr/bin/env node
/** Derive every schedule from the immutable matrix. No turns or outcomes are evaluated. */
import { readFileSync, existsSync } from 'node:fs';
import { buildSchedule } from './core.mjs';
import { monsters } from '../../src/engine.ts';
import { MATRIX_PATH, MATRIX_SHA256, DERIVED_PATH, sha, readMatrix, sourceVersion, deriveConfigs, saveNew, jsonBytes, archiveSource } from './all-family-support.mjs';
if (existsSync(DERIVED_PATH)) throw Error('The derived study is already frozen');
const freeze = readMatrix();
for (const team of freeze.teams) {
  const units = team.ids.map(id=>monsters.find(m=>m.id===id));
  if (units.some(u=>!u) || units.reduce((n,u)=>n+u.cost,0)!==team.cost || JSON.stringify(units.map(u=>u.family))!==JSON.stringify(team.families)) throw Error(`Frozen roster identity/cost changed: ${team.id}`);
}
const configs = deriveConfigs(freeze).map(entry=> {
  const schedule=buildSchedule(entry.config), path=`configs/balance-lab/${entry.id}.json`, raw=jsonBytes(entry.config);
  if(existsSync(path))throw Error(`Config already exists: ${path}`);
  if(schedule.cases.length>20000)throw Error('Existing Lab cap exceeded');
  return {...entry,path,raw,fileSha256:sha(raw),canonicalSha256:sha(JSON.stringify(entry.config)),matches:schedule.cases.length,scheduleSha256:sha(JSON.stringify(schedule.cases))};
});
const required=configs.filter(c=>c.phase!=='reserve').reduce((n,c)=>n+c.matches,0);
if(required!==132096)throw Error(`Unexpected required budget ${required}`);
const tooling=['scripts/balance-lab/all-family-support.mjs','scripts/balance-lab/archive-all-family-source.mjs','scripts/balance-lab/freeze-all-family-configs.mjs','scripts/balance-lab/run-all-family-suite.mjs','scripts/balance-lab/analyze-all-family.mjs','scripts/balance-lab/verify-all-family.mjs','scripts/balance-lab/reconstruct-all-family-source.mjs','scripts/balance-lab/all-family-observer-definitions.mjs','src/balanceLabAllFamily.test.ts','src/balanceLabAllFamilyFailure.test.ts','src/balanceLabAllFamilyCli.test.ts'];
for(const path of tooling)readFileSync(path);
const manifest={schemaVersion:1,status:'frozen-before-system-candidate-outcomes',authoritativeDate:'2026-10-10 UTC',executorRecordedAt:new Date().toISOString(),timestampCaution:'Wall-clock metadata is auxiliary; hashes and freeze-before-execution establish the evidence sequence.',matrix:{path:MATRIX_PATH,sha256:MATRIX_SHA256},source:sourceVersion(),tooling:tooling.map(path=>({path,sha256:sha(readFileSync(path))})),
requiredExecutedMatches:required,reservedMaximumExecutedMatches:configs.filter(c=>c.phase==='reserve').reduce((n,c)=>n+c.matches,0),
counting:{matrixExecuted:115200,matrixCandidateRows:57600,matrixUniqueUnorderedNonmirrorGames:52992,matrixUniquePhysicalMirrorGames:2304,matrixUniquePhysicalCandidateGames:55296,counterExecuted:16896,counterCandidateNonmirrorGames:4608,note:'Every required config executes baseline and candidate, both orientations, and mirrors. Repeated default baselines, identity candidates, and swapped mirror duplicates are controls; never extra independent observations. Logical reversed matrix rows do not add games.'},
teamFeatures:freeze.teams.map(t=>({id:t.id,cost:t.cost,poisonOwners:t.ids.filter(id=>monsters[id].skills.some(s=>s.kind==='poison')).length,singleCleanseOwners:t.ids.filter(id=>monsters[id].skills.some(s=>s.kind==='cleanse')).length,wholeCleanseOwners:t.ids.filter(id=>monsters[id].skills.some(s=>s.kind==='responseCleanse')).length,healingOwners:t.ids.filter(id=>monsters[id].skills.some(s=>['heal','cleanse'].includes(s.kind)&&s.power>0)).length,guardOwners:t.ids.filter(id=>monsters[id].skills.some(s=>['guard','protect','responseGuard'].includes(s.kind))).length,breakerOwners:t.ids.filter(id=>monsters[id].skills.some(s=>s.breaksGuard||s.breaksGuardAfterHit)).length,priorityAttackOwners:t.ids.filter(id=>monsters[id].skills.some(s=>s.kind==='hit'&&s.priority>0)).length})),
policy:'Explicit production autoOrders on both sides. Independent/default and reserve-planned arms each run scale1, scale0.5 and scale0. Compare a candidate against scale1 in the SAME arm, and also show the scale1 policy difference. Repeated suite baselines always use shipping defaults and are verified as controls.',
partitions:['COST<=17: each row against all other frozen teams','exactC17: only exactC17 rows against the other exactC17 opponents'],
reserveRule:{status:'PENDING_PARENT_PREOUTCOME_CONFIRMATION',rule:'Extend all three fixed counterplans for one arm/scale/shell together only when fewer than two have passed and at least one remaining counter meets point score >=60% and both physical-orientation scores >50%, but its approximate seed-clustered 95% lower bound is <=50%, such that two passes remain possible. Use all64 reserved seeds once, then combine all128 seeds. Never extend clear point/orientation failures, replace teams, or change thresholds.'},
selection:'Prefer scale0.5 if all gates pass; consider scale0 only if scale0.5 fails and scale0 passes. An unresolved new >=90% row holds adoption. Both fail means the mechanism-only hypothesis is insufficient and the milestone remains open. Parent reviews before production adoption.',
configs:configs.map(({config,raw,...entry})=>entry)};
if(process.argv[2]!=='--reserve-rule-confirmed')throw Error('Parent must confirm the pre-outcome reserve trigger before freezing; pass --reserve-rule-confirmed only after that signal');
manifest.reserveRule.status='confirmed-before-outcomes';
for(const entry of configs)saveNew(entry.path,entry.config);
saveNew(DERIVED_PATH,manifest);
archiveSource('all-family-frozen-system', [...tooling, MATRIX_PATH, DERIVED_PATH]);
console.log(JSON.stringify({requiredExecutedMatches:required,configs:manifest.configs.map(({id,matches,phase})=>({id,matches,phase})),source:manifest.source},null,2));
