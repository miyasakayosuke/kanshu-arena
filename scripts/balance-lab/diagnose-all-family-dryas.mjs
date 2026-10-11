#!/usr/bin/env node
/** Descriptive post-study diagnosis from retained rows and four requested exact replays. No new battles. */
import {readFileSync,writeFileSync,existsSync}from'node:fs';
import {isDeepStrictEqual}from'node:util';
import {baseDamage,battleSkill,BASIC_ATTACK,directDamageScale,poisonImpactScaleFor}from'../../src/engine.ts';
import {verifiedDerived,load,sha,scoreForA,sideForA,saveNew,writeBoundedRecords}from'./all-family-support.mjs';
import {readVerifiedSuite}from'./all-family-evidence-contract.mjs';
import {meanUnitMetrics}from'./all-family-statistics.mjs';
const manifest=verifiedDerived(),selection=load('docs/all-family-balance-dryas-trace-selection.json');if(!isDeepStrictEqual(selection.source,manifest.source))throw Error('Trace selection source differs');
const groups=[];
for(const scale of [1,.5,0]){
 const entry=manifest.configs.find(c=>c.phase==='counter'&&c.arm==='independent'&&c.scale===scale),stats={};
 for(const row of readVerifiedSuite(entry,manifest))if(row.variant==='candidate'&&row.kind==='matchup'&&row.teamBId==='nature-brute-dryas'&&['material-strong','demon-dual-cleanse'].includes(row.teamAId)){
  const a=stats[row.teamAId]??={games:0,score:0,turns:0,adjudications:0,teams:{counter:{},dryas:{}},units:{counter:{},dryas:{}}};a.games++;a.score+=scoreForA(row);a.turns+=row.result.turns;a.adjudications+=row.result.adjudicated?1:0;
  const counterSide=sideForA(row);for(const[role,side]of[['counter',counterSide],['dryas',counterSide==='allies'?'enemies':'allies']]){
   for(const[k,v]of Object.entries(row.result.sides[side]))if(typeof v==='number')a.teams[role][k]=(a.teams[role][k]??0)+v;
   for(const u of row.result.units.filter(u=>u.key[0]===(side==='allies'?'a':'e'))){const t=a.units[role][u.monsterId]??={appearances:0,sum:{},observations:{}};t.appearances++;for(const[k,v]of Object.entries(u))if(typeof v==='number'&&k!=='monsterId'){t.sum[k]=(t.sum[k]??0)+v;t.observations[k]=(t.observations[k]??0)+1;}}
  }
 }
 for(const[counter,a]of Object.entries(stats))groups.push({id:`independent/${scale}/${counter}`,scale,counter,games:a.games,counterScore:a.score/a.games,meanTurns:a.turns/a.games,adjudicationRate:a.adjudications/a.games,teams:Object.fromEntries(Object.entries(a.teams).map(([role,s])=>[role,Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v/a.games]))])),units:Object.fromEntries(Object.entries(a.units).map(([role,u])=>[role,Object.fromEntries(Object.entries(u).map(([id,stats])=>[id,meanUnitMetrics(stats)]))]))});
}
const rng=s=>(Math.imul(s,1664525)+1013904223)>>>0,traces=[];
for(const[counter,row]of Object.entries(selection.chosen))for(const scale of [1,0]){
 const path=`lab-results/all-family-residual-dryas/${counter}-scale${scale}.json`,r=load(path),trace=r.result.trace;
 if(!r.verified||r.matchId!==row.matchId||!isDeepStrictEqual(r.source,manifest.source)||sha(JSON.stringify(trace))!==r.result.traceHash)throw Error('Diagnostic replay provenance differs');
 const current=new Map([...trace.initialState.allies,...trace.initialState.enemies].map(u=>[u.key,structuredClone(u)])),protection={allies:{guard:0,ward:0,both:0,wardHits:0},enemies:{guard:0,ward:0,both:0,wardHits:0}},directBySkill={},timeline=[];
 for(const turn of trace.turns){let seed=turn.seedBefore;for(const order of turn.orders)seed=rng(seed);const skills=new Map(),bases=new Map(),fallback=new Set();let cashout=0;
  for(const event of turn.events){const actor=current.get(event.actor),target=current.get(event.target);
   if(event.kind==='fallback')fallback.add(event.actor);
   if(event.kind==='cast'){const order=turn.orders.find(o=>o.key===event.actor),skill=battleSkill(actor.monster,fallback.has(event.actor)?BASIC_ATTACK:order.skill);skills.set(event.actor,skill);bases.set(event.actor,baseDamage(actor,skill));}
   if(event.kind==='poison-cashout')cashout=event.poisonCashoutAdded;
   if(event.kind==='damage'&&actor){const skill=skills.get(event.actor);if(skill.randomHits)seed=rng(seed);seed=rng(seed);const roll=.9+(seed%21)/100,basis=bases.get(event.actor)+cashout;
    const hp=t=>Math.min(target.hp,Math.max(1,Math.floor(basis*roll*directDamageScale(t))));
    const observed=hp(target);if(observed!==event.amount||event.hp!==target.hp-observed)throw Error('Diagnostic direct-hit reconstruction differs');
    const side=event.target[0]==='a'?'allies':'enemies',p=protection[side];p.guard+=hp({...target,guard:false})-observed;p.ward+=hp({...target,ward:0})-observed;p.both+=hp({...target,guard:false,ward:0})-observed;if(target.ward)p.wardHits++;
    const key=event.actor+'/'+skill.name;directBySkill[key]=(directBySkill[key]??0)+event.amount;cashout=0;
   }
   if(event.kind==='poison'&&actor&&poisonImpactScaleFor(actor)===0)seed=rng(seed);
   if(turn.turn<=4&&['cast','damage','resource-loss','heal','defeat','cleanse','poison','fallback'].includes(event.kind))timeline.push({turn:turn.turn,...event});
   if(target)for(const field of ['hp','mp','poison','guard','rally','ward','dragonCharge','repairReady','supplyReady','responseReady'])if(event[field]!==undefined)target[field]=event[field];
  }
  if(seed!==turn.seedAfter)throw Error('Diagnostic RNG reconstruction differs');
 }
 for(const side of ['allies','enemies'])if(protection[side].guard!==r.result.sides[side].guardActualPrevented)throw Error('Guard reconstruction differs from frozen observer');
 traces.push({id:`trace/${counter}/${scale}`,counter,scale,seed:row.seed,matchId:r.matchId,path,traceHash:r.result.traceHash,winner:r.result.winner,turns:r.result.turns,protection,directBySkill,timeline,units:r.result.units});
}
const root='docs/all-family-balance-diagnosis',chunks=writeBoundedRecords(root,'dryas',[...groups,...traces]);
const summary={schemaVersion:1,source:manifest.source,selection,diagnosticScriptSha256:sha(readFileSync('scripts/balance-lab/diagnose-all-family-dryas.mjs')),groups:groups.map(({units,...g})=>g),traceSummaries:traces.map(({timeline,units,...t})=>t),packed:{root,chunks},limits:'Selected traces intentionally illustrate residual losses. They do not estimate frequency. Ward and guard figures are separate same-impact local counterfactuals; their marginals need not add to removing both. No new study games, parameters, seeds, teams or gate changes.'};
saveNew('docs/all-family-balance-dryas-diagnosis.json',summary);console.log(JSON.stringify({groups:groups.map(g=>({id:g.id,games:g.games,counterScore:g.counterScore,meanTurns:g.meanTurns,teams:g.teams})),traces:summary.traceSummaries},null,2));
