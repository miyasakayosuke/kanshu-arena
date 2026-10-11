import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, DEFEND, start, type BattleEvent, type Order, type State } from './engine';
import { applyBattleEvents, buildTimeline, CAST_IMPACT_MS, type BattleCue } from './playback';

const resources=(state:State)=>({allies:state.allies,enemies:state.enemies});
const cueEvents=(cue:BattleCue)=>[...(cue.updates??[]),...cue.impacts];
const noOrders=(state:State,side:'allies'|'enemies'='allies'):Order[]=>state[side].map(unit=>({key:unit.key,skill:99}));
const replay=(initial:State,events:BattleEvent[],speed:number)=>{
  let state=initial; const timeline=buildTimeline(events),pending=[...timeline.cues];
  for(let clock=0;clock<=timeline.duration/speed+17;clock+=17)while(pending[0]&&pending[0].at<=clock*speed)state=applyBattleEvents(state,cueEvents(pending.shift()!));
  expect(pending).toHaveLength(0); return state;
};
const allPaths=(initial:State,result:ReturnType<typeof advanceWithEvents>)=>{
  const before=structuredClone(initial),original=structuredClone(result),timeline=buildTimeline(result.events);
  for(const speed of [1,2])expect(resources(replay(initial,result.events,speed))).toEqual(resources(result.state));
  expect(resources(applyBattleEvents(initial,result.events))).toEqual(resources(result.state));
  for(let index=0;index<=timeline.cues.length;index++){
    const partial=timeline.cues.slice(0,index).reduce((state,cue)=>applyBattleEvents(state,cueEvents(cue)),initial);
    expect(resources(applyBattleEvents(partial,timeline.cues.slice(index).flatMap(cueEvents)))).toEqual(resources(result.state));
    expect(resources(applyBattleEvents(partial,result.events))).toEqual(resources(result.state));
  }
  expect(initial).toEqual(before); expect(result).toEqual(original);
  expect(result.state.history!.at(-1)!.events).toEqual(result.events);
};

describe('playtest poison defaults and explicit comparison arms using authoritative playback',()=>{
  it.each((['allies','enemies'] as const).flatMap(side => [undefined,0].map(scale => ({side,scale}))))('animates default/explicit zero on $side (override $scale): paid MP at cast, poison at impact, HP only at tick',({side,scale})=>{
    const state=start(side==='allies'?[3]:[1,14,7],side==='enemies'?[3]:[1,14,7],31,scale === undefined ? undefined : {poisonImpactScale:scale});
    const caster=state[side][0],opposing=side==='allies'?'enemies':'allies';
    const orders=[{key:caster.key,skill:2}];
    const result=advanceWithEvents(state,side==='allies'?orders:noOrders(state),{enemyOrders:side==='enemies'?orders:noOrders(state,'enemies')});
    const timeline=buildTimeline(result.events),[cast,impact]=timeline.cues.filter(cue=>cue.cast?.actor===caster.key);
    expect(cast.cast).toMatchObject({scope:'all',effect:'poison',targets:state[opposing].map(unit=>unit.key)});
    expect(cast.impacts).toEqual([]); expect(cast.updates!.map(event=>event.kind)).toEqual(['resource']);
    expect(impact.at-cast.at).toBe(CAST_IMPACT_MS);
    expect(impact.impacts.map(event=>event.kind)).toEqual(['poison','poison','poison']);
    const casting=applyBattleEvents(state,cueEvents(cast));
    expect(casting[side][0].mp).toBe(caster.mp-16);
    expect(casting[opposing]).toEqual(state[opposing]);
    const poisoned=applyBattleEvents(casting,cueEvents(impact));
    expect(poisoned[opposing].map(unit=>unit.hp)).toEqual(state[opposing].map(unit=>unit.hp));
    expect(poisoned[opposing].map(unit=>unit.poison)).toEqual([3,3,3]);
    expect(resources(applyBattleEvents(poisoned,cueEvents(impact)))).toEqual(resources(poisoned));
    expect(result.events.filter(event=>event.kind==='damage').every(event=>event.effect==='poison'&&event.phase==='turn-end')).toBe(true);
    allPaths(state,result);
  });
  it('preserves wide intent for one survivor, excludes dead recipients, and replays tick defeat cleanup',()=>{
    const state=start([3],[1,14,7],42,{poisonImpactScale:0}); state.enemies[0].hp=0; state.enemies[1].hp=1; state.enemies[2].hp=0;
    const result=advanceWithEvents(state,[{key:'a0',skill:2}],{enemyOrders:noOrders(state,'enemies')});
    const cast=buildTimeline(result.events).cues.find(cue=>cue.cast)?.cast;
    expect(cast).toMatchObject({scope:'all',targets:['e1']}); expect(cast!.target).toBeUndefined();
    expect(result.events.find(event=>event.kind==='defeat')).toMatchObject({target:'e1',phase:'turn-end',effect:'poison',hp:0,poison:0,ward:0});
    allPaths(state,result);
  });
  it.each([1,.5,0])('keeps guard, ward expiry, and unmitigated poison playback at scale %s',poisonImpactScale=>{
    const state=start([3],[14,7],173,{poisonImpactScale});
    const result=advanceWithEvents(state,[{key:'a0',skill:2}],{enemyOrders:state.enemies.map(unit=>({key:unit.key,skill:DEFEND}))});
    expect(result.events.filter(event=>event.kind==='damage'&&event.effect==='poison').map(event=>event.amount)).toEqual([14,11]);
    allPaths(state,result);
  });
  it('replays cleanse then slower reapplication without inventing a direct HP hit',()=>{
    const state=start([10],[7],42,{poisonImpactScale:0}); state.enemies[0].poison=2; state.enemies[0].hp=130;
    const result=advanceWithEvents(state,[{key:'a0',skill:1}],{enemyOrders:[{key:'e0',skill:3,target:'e0'}]});
    expect(result.events.filter(event=>event.kind==='damage'&&event.actor)).toEqual([]);
    expect(result.events.filter(event=>event.kind==='cleanse'||event.kind==='poison').map(event=>event.kind)).toEqual(['cleanse','poison']);
    allPaths(state,result);
  });
  it('replays immediate poison cleansing and later cashout/reapplication with correct absolute status',()=>{
    const state=start([32,10,4,35],[7,1],42,{poisonImpactScale:0}); state.enemies[1].poison=3;
    const result=advanceWithEvents(state,[{key:'a0',skill:0,target:'e1'},{key:'a1',skill:1},{key:'a2',skill:1},{key:'a3',skill:99}],{enemyOrders:[{key:'e0',skill:3,target:'e0'},{key:'e1',skill:99}]});
    expect(result.events.filter(event=>event.kind==='damage'&&event.actor).map(event=>event.actor)).toEqual(['a0']);
    expect(result.events.some(event=>event.kind==='poison-cashout')).toBe(true);
    expect(result.events.some(event=>event.kind==='cleanse')).toBe(true);
    allPaths(state,result);
  });
  it.each([undefined,1,.5,0])('matches every normal, 2x, and partial/full skip turn of a complete Janus poison battle with scale override %s',poisonImpactScale=>{
    let state=start([36,4,3,10,30],[36,14,10,20,35],42,poisonImpactScale === undefined ? {leaders:true} : {leaders:true,poisonImpactScale,reservePoison:true});
    let turns=0;
    while(!state.winner){
      const result=advanceWithEvents(state,autoOrders(state),{enemyOrders:autoOrders(state,'enemies')});
      allPaths(state,result); state=result.state; turns++;
    }
    expect(turns).toBeGreaterThan(1); expect(turns).toBeLessThanOrEqual(20);
    expect(state.winner).not.toBeNull();
  },20000);
});
