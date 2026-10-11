/** Read-only evidence binding and reserved-seed completion gates. Never resolves battles. */
import { readFileSync, existsSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { buildSchedule } from './core.mjs';
import { load, sha, readSuite, PACKED_ROOT, DERIVED_PATH } from './all-family-support.mjs';
export function validateSuiteHeader(entry,manifest,index,schedule,derivedSha256){
  if(index.status!=='complete'||index.suite!==entry.id||index.phase!==entry.phase||index.arm!==entry.arm||index.scale!==entry.scale||index.shell!==entry.shell||index.executedMatches!==entry.matches||index.scheduledMatches!==entry.matches||index.scheduleSha256!==entry.scheduleSha256||index.configPath!==entry.path||index.configSha256!==entry.canonicalSha256||index.configFileSha256!==entry.fileSha256||index.derivedFreezeSha256!==derivedSha256||!isDeepStrictEqual(index.source,manifest.source)||sha(JSON.stringify(schedule.cases))!==entry.scheduleSha256||schedule.cases.length!==entry.matches)throw Error(`Suite source/config/schedule/count binding differs: ${entry.id}`);
}
export function validateScheduledRow(row,item){
  if(!item)throw Error('Packed suite has extra rows');
  const {request,keyUnitId,...metadata}=item;const {result,resultSha256,...stored}=row;
  if(!isDeepStrictEqual(metadata,stored)||sha(JSON.stringify(result))!==resultSha256)throw Error(`Packed row metadata/result binding differs: ${row.id}`);
  if(!['win','lose','draw'].includes(result.winner)||!Number.isInteger(result.turns)||result.turns<1||result.turns>20||result.turnLimit!==(result.turns===20)||typeof result.adjudicated!=='boolean'||result.adjudicated&&!result.turnLimit||!Array.isArray(result.units)||result.units.length!==10||!/^[a-f0-9]{64}$/.test(result.traceHash))throw Error('Packed result schema differs');
}
export function *readVerifiedSuite(entry,manifest){
  const raw=readFileSync(entry.path),config=JSON.parse(raw);
  if(sha(raw)!==entry.fileSha256||sha(JSON.stringify(config))!==entry.canonicalSha256)throw Error('Frozen config bytes differ');
  const schedule=buildSchedule(config),index=load(`${PACKED_ROOT}/${entry.id}-index.json`);
  validateSuiteHeader(entry,manifest,index,schedule,sha(readFileSync(DERIVED_PATH)));
  let position=0;for(const row of readSuite(entry.id)){validateScheduledRow(row,schedule.cases[position++]);yield row;}
  if(position!==entry.matches)throw Error(`Missing scheduled rows: ${entry.id}`);
}
export function validateExtensionCompletion(manifest,decision,indexes){
  if(!isDeepStrictEqual(decision.source,manifest.source)||!isDeepStrictEqual(decision.rule,manifest.reserveRule)||!Array.isArray(decision.authorizedSuiteIds)||new Set(decision.authorizedSuiteIds).size!==decision.authorizedSuiteIds.length)throw Error('Extension decision source/rule/authorized set differs');
  if(!decision.authorizedSuiteIds.length)throw Error('No extension was authorized; retain the initial64 report');
  const reserved=manifest.configs.filter(c=>c.phase==='reserve'),authorized=new Set(decision.authorizedSuiteIds);
  for(const id of authorized)if(!reserved.some(c=>c.id===id))throw Error('Unknown authorized extension suite');
  const triggerIds=(decision.triggers??[]).map(t=>reserved.find(c=>c.arm===t.arm&&c.scale===t.scale&&c.shell===t.shell)?.id);
  if(triggerIds.includes(undefined)||triggerIds.length!==authorized.size||triggerIds.some(id=>!authorized.has(id))||new Set(triggerIds).size!==triggerIds.length)throw Error('Extension triggers and authorized set differ');
  for(const entry of reserved){const index=indexes[entry.id];if(index&&!authorized.has(entry.id))throw Error(`Unauthorized reserve index exists: ${entry.id}`);if(authorized.has(entry.id)&&(!index||index.status!=='complete'||index.executedMatches!==entry.matches||index.scheduledMatches!==entry.matches))throw Error(`Authorized extension incomplete or missing: ${entry.id}`);}
  return authorized;
}
export function loadCompletedExtensions(manifest){
  const initial=load('docs/all-family-balance-initial64.json');
  if(initial.stage!=='initial64'||!isDeepStrictEqual(initial.source,manifest.source)||initial.derivedFreezeSha256!==sha(readFileSync(DERIVED_PATH)))throw Error('The preserved initial64 report does not match this frozen study');
  const decision=load('docs/all-family-balance-extension-decision.json'),indexes={};
  for(const entry of manifest.configs.filter(c=>c.phase==='reserve')){const path=`${PACKED_ROOT}/${entry.id}-index.json`;if(existsSync(path))indexes[entry.id]=load(path);}
  return {decision,authorized:validateExtensionCompletion(manifest,decision,indexes)};
}
export function validateCounterSeedPanel(accumulator,initialSeeds,reserveSeeds,extended){
  const expected=new Set([...initialSeeds,...(extended?reserveSeeds:[])]),actual=Object.keys(accumulator.bySeed).map(Number);
  if(actual.length!==expected.size||actual.some(seed=>!expected.has(seed))||accumulator.games!==expected.size*2||Object.values(accumulator.bySeed).some(row=>row.games!==2)||Object.values(accumulator.orientations).some(row=>row.games!==expected.size))throw Error(`Counter seed panel differs: expected ${extended?'128':'64'} distinct seeds with both orientations exactly once`);
}
export function validateAnalyzerRevision(manifest){
  const expected=manifest.tooling.find(t=>t.path==='scripts/balance-lab/analyze-all-family.mjs').sha256,actual=sha(readFileSync('scripts/balance-lab/analyze-all-family.mjs'));
  if(expected===actual)return {frozenAnalyzerSha256:expected,currentAnalyzerSha256:actual,revision:null};
  const revision=load('docs/all-family-balance-analysis-revision.json');
  if(revision.frozenAnalyzerSha256!==expected||revision.currentAnalyzerSha256!==actual)throw Error('Analyzer revision attribution differs');
  for(const file of revision.files)if(sha(readFileSync(file.path))!==file.sha256)throw Error(`Revised analysis source differs: ${file.path}`);
  return {frozenAnalyzerSha256:expected,currentAnalyzerSha256:actual,revisionPath:'docs/all-family-balance-analysis-revision.json',revisionSha256:sha(readFileSync('docs/all-family-balance-analysis-revision.json'))};
}
