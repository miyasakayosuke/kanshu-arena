/** Separately frozen adaptive follow-up. Imports do not execute turns. */
import {readFileSync,existsSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {buildSchedule} from './core.mjs';
import {sha,load,readChunk,assertSource,scoreForA,sideForA,interval} from './all-family-support.mjs';
import {validateSuiteHeader,validateScheduledRow} from './all-family-evidence-contract.mjs';
import {meanUnitMetrics} from './all-family-statistics.mjs';
export const BASE='docs/all-family-leader-followup-freeze.json',BASE_SHA='70f2448a3c54334663e4d70c1503b0dfe574f91c4771c4e9456be36ee2bdf9c1';
export const AMENDMENT='docs/all-family-leader-followup-robustness.json',AMENDMENT_SHA='7e29323d85e1f29be841a3430f45ff2656c24a44c35f6104a1289ea4d7249322';
export const DERIVED='docs/all-family-leader-followup-config-freeze.json',ROOT='docs/all-family-leader-followup-packed',ANALYSIS='docs/all-family-leader-followup-analysis';
export function readFollowup(){
 if(sha(readFileSync(BASE))!==BASE_SHA||sha(readFileSync(AMENDMENT))!==AMENDMENT_SHA)throw Error('Follow-up base/amendment differs');
 const f=load(BASE),a=load(AMENDMENT);if(a.baseFreezeSha256!==BASE_SHA||!isDeepStrictEqual(a.changes.counterReservePoisonArms,[false,true])||!isDeepStrictEqual(a.changes.janusRecommendationReservePoisonArms,[false,true]))throw Error('Both policy arms required');
 if(f.counterSeeds.length!==128||f.janusRecommendation.seeds.length!==16||new Set([...f.counterSeeds,...f.janusRecommendation.seeds]).size!==144||f.counters.length!==4||f.shells.length!==2||f.janusRecommendation.opponents.length!==24)throw Error('Follow-up dimensions differ');
 return f;
}
export function deriveFollowup(f){
 const out=[],targets=f.janusRecommendation.targets,opponents=f.janusRecommendation.opponents;
 const original=opponents.find(t=>isDeepStrictEqual(t.ids,targets[0].ids));if(!original||original.id!=='janus-mixed')throw Error('Original Janus identity differs');
 const janusTeams=[...opponents,...targets.filter(t=>!opponents.some(o=>isDeepStrictEqual(o.ids,t.ids)))];
 for(const reservePoison of [false,true])for(const scale of [1,.5,0])for(const phase of ['counter','janus']){
  const arm=reservePoison?'reserve':'independent',id=`all-family-leader-${phase}-${arm}-${scale===.5?'half':scale}`;
  const teams=phase==='counter'?[...f.counters,...f.shells]:janusTeams,seeds=phase==='counter'?f.counterSeeds:f.janusRecommendation.seeds;
  const scenarios=phase==='counter'?f.shells.flatMap((shell,i)=>f.counters.map((c,j)=>({id:`counter-${i+1}-${j+1}`,a:c.id,b:shell.id}))):targets.flatMap((t,i)=>opponents.map((o,j)=>({id:`janus-${i+1}-${j+1}`,a:i===0?original.id:t.id,b:o.id})));
  out.push({id,phase,arm,scale,shell:null,config:{schemaVersion:1,suiteId:id,seeds:[...seeds],costLimit:17,teams:teams.map(t=>({id:t.id,ids:[...t.ids],role:'Frozen adaptive follow-up; '+t.id})),scenarios,candidate:{id:`${arm}-${scale===.5?'half':scale}`,label:`Frozen follow-up poison ${scale}, reservation ${reservePoison}, symmetric production autoOrders`,overrides:{poisonImpactScale:scale,reservePoison}},complaints:[]}});
 }
 return out;
}
export function verifiedFollowup(){
 readFollowup();const m=load(DERIVED);assertSource(m.source);
 if(m.base.sha256!==BASE_SHA||m.amendment.sha256!==AMENDMENT_SHA)throw Error('Derived follow-up binding differs');
 for(const original of m.originalEvidence)if(sha(readFileSync(original.path))!==original.sha256)throw Error('Original evidence differs: '+original.path);
 for(const t of m.tooling)if(sha(readFileSync(t.path))!==t.sha256)throw Error('Frozen follow-up tool differs: '+t.path);
 for(const c of m.configs){const b=readFileSync(c.path);if(sha(b)!==c.fileSha256||sha(JSON.stringify(JSON.parse(b)))!==c.canonicalSha256)throw Error('Frozen follow-up config differs');}
 return m;
}
export function *readFollowupSuite(entry,m,root=ROOT,derived=DERIVED){
 const index=load(`${root}/${entry.id}-index.json`),schedule=buildSchedule(load(entry.path));
 validateSuiteHeader(entry,m,index,schedule,sha(readFileSync(derived)));
 const chunks=index.chunkManifest.flatMap(c=>readChunk(root,c));let n=0;
 for(const c of chunks)for(const row of readChunk(root,c)){validateScheduledRow(row,schedule.cases[n++]);yield row;}
 if(n!==entry.matches)throw Error('Missing follow-up rows');
}
export function fresh(){return {games:0,score:0,wins:0,draws:0,turns:0,adjudications:0,seeds:{},orientations:{'a-left':{games:0,score:0},'a-right':{games:0,score:0}},sum:{},opponent:{},units:{}};}
export function add(a,row){
 const score=scoreForA(row),side=sideForA(row),other=side==='allies'?'enemies':'allies';a.games++;a.score+=score;a.wins+=score===1?1:0;a.draws+=score===.5?1:0;a.turns+=row.result.turns;a.adjudications+=row.result.adjudicated?1:0;
 const s=a.seeds[row.seed]??={games:0,score:0};s.games++;s.score+=score;const o=a.orientations[row.orientation];o.games++;o.score+=score;
 for(const [role,key]of[['sum',side],['opponent',other]])for(const[k,v]of Object.entries(row.result.sides[key]))if(typeof v==='number')a[role][k]=(a[role][k]??0)+v;
 for(const u of row.result.units){const key=(u.key[0]===(side==='allies'?'a':'e')?'focal/':'opponent/')+u.monsterId,t=a.units[key]??={appearances:0,sum:{},observations:{}};t.appearances++;for(const[k,v]of Object.entries(u))if(typeof v==='number'&&k!=='monsterId'){t.sum[k]=(t.sum[k]??0)+v;t.observations[k]=(t.observations[k]??0)+1;}}
}
export function finish(a){const ci=interval(Object.values(a.seeds).map(s=>s.score/s.games));return {games:a.games,wins:a.wins,draws:a.draws,scoreRate:a.score/a.games,meanTurns:a.turns/a.games,adjudicationRate:a.adjudications/a.games,seedClusters:ci.n,approximate95:ci.approximate95,orientations:Object.fromEntries(Object.entries(a.orientations).map(([k,v])=>[k,{games:v.games,scoreRate:v.score/v.games}])),mean:Object.fromEntries(Object.entries(a.sum).map(([k,v])=>[k,v/a.games])),opponentMean:Object.fromEntries(Object.entries(a.opponent).map(([k,v])=>[k,v/a.games])),units:Object.fromEntries(Object.entries(a.units).map(([k,v])=>[k,meanUnitMetrics(v)])),seedScores:Object.fromEntries(Object.entries(a.seeds).map(([k,v])=>[k,v.score/v.games]))};}
export function validatePanel(a,seeds,opponents=1){if(a.games!==seeds.length*2*opponents||Object.keys(a.seeds).length!==seeds.length||Object.entries(a.seeds).some(([s,v])=>!seeds.includes(Number(s))||v.games!==2*opponents)||Object.values(a.orientations).some(o=>o.games!==seeds.length*opponents))throw Error('Fixed follow-up seed/orientation panel differs');}
export function counterPass(s,f){return s.scoreRate>=f.scoreAtLeast&&s.approximate95[0]>f.approximateSeedClustered95LowerAbove&&Object.values(s.orientations).every(o=>o.scoreRate>f.bothPhysicalOrientationScoresAbove);}
export function recommendationPartition(opponent){return {common:opponent.id!=='janus-mixed',strict:opponent.id!=='janus-mixed'&&opponent.cost===17};}
export function pairedDifference(first,second){const seeds=Object.keys(first.seedScores);if(!isDeepStrictEqual(seeds,Object.keys(second.seedScores)))throw Error('Paired seeds differ');const values=seeds.map(s=>second.seedScores[s]-first.seedScores[s]),mean=values.reduce((a,b)=>a+b,0)/values.length,se=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(values.length-1)/values.length);return {direction:'second minus first',mean,seedClusters:values.length,approximate95:[Math.max(-1,mean-1.96*se),Math.min(1,mean+1.96*se)]};}
