import {describe,it,expect} from 'vitest';
// @ts-ignore Development-only fixed study utilities.
import {readFollowup,deriveFollowup,fresh,validatePanel,counterPass,recommendationPartition,pairedDifference} from '../scripts/balance-lab/all-family-leader-followup.mjs';
// @ts-ignore Development-only frozen Lab schedule.
import {buildSchedule} from '../scripts/balance-lab/core.mjs';
const f=readFollowup(),derived=deriveFollowup(f);
describe('separate frozen adaptive follow-up',()=>{
 it('keeps original three counters, the sole permitted leader swap, exact slots and both policies',()=>{
  expect(f.counters.map((t:any)=>t.ids)).toEqual([[36,12,2,30,26],[19,20,23,7,10],[29,8,30,7,2],[30,8,29,7,2]]);
  expect(derived).toHaveLength(12);expect(new Set(derived.map((c:any)=>c.config.candidate.overrides.reservePoison))).toEqual(new Set([false,true]));
  for(const c of derived)expect(c.config.candidate.overrides.poisonImpactScale).toBe(c.scale);
 });
 it('freezes all scales with no fresh draws and keeps each schedule below20k',()=>{
  const counts=derived.map((c:any)=>{const s=buildSchedule(c.config);expect(s.cases.length).toBe(c.phase==='counter'?7168:4672);expect(c.config.seeds).toEqual(c.phase==='counter'?f.counterSeeds:f.janusRecommendation.seeds);expect(s.cases.every((r:any)=>r.request.overrides.reservePoison===undefined||r.request.overrides.reservePoison===c.config.candidate.overrides.reservePoison)).toBe(true);return s.cases.length;});
  expect(counts.reduce((a:number,b:number)=>a+b,0)).toBe(71040);
 });
 it('does not duplicate the original target identity as a separate team',()=>{for(const c of derived.filter((c:any)=>c.phase==='janus')){expect(c.config.teams).toHaveLength(25);expect(c.config.scenarios).toHaveLength(48);expect(c.config.scenarios.filter((s:any)=>s.a===s.b)).toHaveLength(1);}});
 it('excludes original Janus identity for BOTH recommendation comparisons',()=>{const partitions=f.janusRecommendation.opponents.map(recommendationPartition);expect(partitions.filter((p:any)=>p.common)).toHaveLength(23);expect(partitions.filter((p:any)=>p.strict)).toHaveLength(19);expect(recommendationPartition({id:'janus-mixed',cost:17})).toEqual({common:false,strict:false});expect(recommendationPartition({id:'fullnature',cost:15})).toEqual({common:true,strict:false});});
 it('requires exact prelisted clusters and both physical orientations',()=>{const a=fresh();a.games=256;a.seeds=Object.fromEntries(f.counterSeeds.map((s:number)=>[s,{games:2,score:1}]));a.orientations={'a-left':{games:128,score:64},'a-right':{games:128,score:64}};expect(()=>validatePanel(a,f.counterSeeds)).not.toThrow();expect(()=>validatePanel({...a,games:254},f.counterSeeds)).toThrow();expect(()=>validatePanel({...a,seeds:{...a.seeds,0:{games:2,score:1}}},f.counterSeeds)).toThrow();expect(()=>validatePanel({...a,orientations:{...a.orientations,'a-right':{games:127,score:64}}},f.counterSeeds)).toThrow();});
 it.each([.59,.599999])('rejects below60%% even with a good lower bound (%s)',scoreRate=>{expect(counterPass({scoreRate,approximate95:[.51,.8],orientations:{a:{scoreRate:.7},b:{scoreRate:.7}}},f.counterCriterion)).toBe(false);});
 it.each([.5,.49])('rejects a lower bound at or below50%% (%s)',lower=>{expect(counterPass({scoreRate:.7,approximate95:[lower,.8],orientations:{a:{scoreRate:.7},b:{scoreRate:.7}}},f.counterCriterion)).toBe(false);});
 it.each([.5,.49])('rejects an orientation at or below50%% (%s)',score=>{expect(counterPass({scoreRate:.7,approximate95:[.51,.8],orientations:{a:{scoreRate:.7},b:{scoreRate:score}}},f.counterCriterion)).toBe(false);});
 it('accepts exactly60% only when every unchanged remaining threshold passes',()=>{expect(counterPass({scoreRate:.6,approximate95:[.500001,.8],orientations:{a:{scoreRate:.51},b:{scoreRate:.69}}},f.counterCriterion)).toBe(true);});
 it('paired comparison keeps seed clusters and rejects mismatched panels',()=>{expect(pairedDifference({seedScores:{1:.2,2:.4}},{seedScores:{1:.4,2:.6}}).mean).toBeCloseTo(.2);expect(()=>pairedDifference({seedScores:{1:.2,2:.4}},{seedScores:{1:.4,3:.6}})).toThrow();});
});
