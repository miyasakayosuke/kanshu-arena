#!/usr/bin/env node
/** Full event recreation from a retained packed row, exact source and frozen configuration. */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { buildSchedule, runMatch } from './core.mjs';
import { load, sha, verifiedDerived, readSuite, PACKED_ROOT } from './all-family-support.mjs';
const [suite,matchId,out]=process.argv.slice(2);if(!suite||!matchId||!out)throw Error('Pass suite ID, exact match ID and a new output JSON path');
if(existsSync(out))throw Error('Refuse to replace an existing replay');
const manifest=verifiedDerived(),entry=manifest.configs.find(c=>c.id===suite);if(!entry)throw Error('Unknown frozen suite');
const index=load(`${PACKED_ROOT}/${suite}-index.json`);if(!isDeepStrictEqual(index.source,manifest.source)||index.configSha256!==entry.canonicalSha256||index.scheduleSha256!==entry.scheduleSha256)throw Error('Packed source/config/schedule differs');
const config=load(entry.path),schedule=buildSchedule(config);if(sha(JSON.stringify(schedule.cases))!==entry.scheduleSha256)throw Error('Schedule SHA-256 differs');
const item=schedule.cases.find(c=>c.id===matchId);if(!item)throw Error('Match absent from frozen schedule');
let expected;for(const row of readSuite(suite)){if(row.id===matchId){expected=row;break;}}if(!expected)throw Error('Match missing from packed evidence');
const result=runMatch({...item.request,trace:true}),{trace,...compact}=result;
if(!isDeepStrictEqual(compact,expected.result)||sha(JSON.stringify(compact))!==expected.resultSha256)throw Error('Exact replay outcome/resource/trace hash differs');
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({schemaVersion:1,verified:true,suite,matchId,source:manifest.source,configSha256:entry.canonicalSha256,request:item.request,result},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verified:true,suite,matchId,traceHash:result.traceHash,out}));
