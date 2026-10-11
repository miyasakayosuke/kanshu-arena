import{describe,it,expect}from'vitest';
// @ts-ignore Development-only fixed follow-up.
import{readPure,derivePure,pureCriteria}from'../scripts/balance-lab/all-family-pure-confirmation.mjs';
// @ts-ignore Development-only schedule.
import{buildSchedule}from'../scripts/balance-lab/core.mjs';
// @ts-ignore Development-only shared evidence rules.
import{readFollowup,counterPass}from'../scripts/balance-lab/all-family-leader-followup.mjs';
const f=readPure(),leader=readFollowup();
describe('separate pure-family confirmation freeze',()=>{
 it('preserves exact original recommended teams and order',()=>{expect(f.targets.map((t:any)=>t.ids)).toEqual([[19,20,21,22,23],[29,1,8,30,31]]);expect(f.shells.map((t:any)=>t.ids)).toEqual([[14,3,6,10,28],[14,6,9,10,28]]);});
 it('keeps128 fresh seed clusters disjoint from the leader and Janus panels',()=>{expect(f.seeds).toHaveLength(128);expect(new Set(f.seeds).size).toBe(128);expect(f.seeds.some((s:number)=>[...leader.counterSeeds,...leader.janusRecommendation.seeds].includes(s))).toBe(false);});
 it('runs all six scale/policy conditions with exact bounded schedules',()=>{const configs=derivePure(f);expect(configs).toHaveLength(6);let n=0;for(const c of configs){const s=buildSchedule(c.config);expect(s.cases).toHaveLength(4096);expect(c.config.seeds).toEqual(f.seeds);expect(c.config.teams).toHaveLength(4);expect(c.config.scenarios).toHaveLength(4);expect(c.config.candidate.overrides.reservePoison).toBe(c.arm==='reserve');expect(c.config.candidate.overrides.poisonImpactScale).toBe(c.scale);n+=s.cases.length;}expect(n).toBe(24576);});
 it('uses the same strict score, lower-bound and orientation conditions',()=>{const criteria=pureCriteria(f),good={scoreRate:.6,approximate95:[.51,.8],orientations:{left:{scoreRate:.6},right:{scoreRate:.6}}};expect(counterPass(good,criteria)).toBe(true);expect(counterPass({...good,scoreRate:.59},criteria)).toBe(false);expect(counterPass({...good,approximate95:[.5,.8]},criteria)).toBe(false);expect(counterPass({...good,orientations:{left:{scoreRate:.5},right:{scoreRate:.7}}},criteria)).toBe(false);});
});
