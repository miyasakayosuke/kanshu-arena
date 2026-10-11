#!/usr/bin/env node
/** Generate full events from compact source-linked evidence with ordinary CLI source/hash verification. */
import{readFileSync,writeFileSync,mkdirSync,mkdtempSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{execFileSync}from'node:child_process';import{readPacked}from'./read-extraordinary-packed.mjs';
const[suite,matchId,out,sourceRoot='.']=process.argv.slice(2);if(!suite||!matchId||!out)throw Error('Usage: replay-extraordinary-packed SUITE MATCH_ID OUTPUT [RECONSTRUCTED_SOURCE_ROOT]');
const{rows}=readPacked(suite),head=rows.find(r=>r.key===`${suite}/index`).value,match=rows.find(r=>r.key===`${suite}/match/${matchId}`)?.value;if(!match)throw Error('Unknown packed match');
const scratch=mkdtempSync(join(tmpdir(),'extraordinary-packed-replay-')),report=join(scratch,'report.json');writeFileSync(report,JSON.stringify({config:head.config,source:head.source,matches:[match]}));
execFileSync(process.execPath,[resolve(sourceRoot,'scripts/balance-lab/cli.mjs'),'replay','--report',report,'--match',matchId,'--out',resolve(out)],{stdio:'inherit'});const replay=JSON.parse(readFileSync(out));if(!replay.verified||replay.result.traceHash!==match.result.traceHash)throw Error('Unverified packed replay');
