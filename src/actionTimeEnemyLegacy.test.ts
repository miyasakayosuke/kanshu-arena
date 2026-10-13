import {describe,it,expect} from 'vitest';
import * as engine from './engine';
import {battleOrderLine} from './battleInsights';
import * as baseline from '../tests/reference-v02030/engine';
const teams=[
  [0,2,3,4,6],[1,2,5,8,10],[14,3,6,9,10],[24,25,26,27,28],
  [15,5,16,17,18],[19,20,21,22,23],[29,1,8,30,31],[32,4,33,34,35],[36,12,2,30,26],
];
describe('approved enemy difficulty scope preserves the healthy legacy pre-turn policy',()=>{
  it.each(teams.flatMap((team,index)=>[0,1,42,20261008,0xffffffff].map(seed=>({team,index,seed}))))('keeps exact enemy choices, initiative and action events before next-turn recovery for healthy opening $index / $seed',({team,index,seed})=>{
    const opponents=teams[(index+3)%teams.length];
    const old=baseline.start(team,opponents,seed,{leaders:true}),state=engine.start(team,opponents,seed,{leaders:true});
    // Fully concrete allied commands isolate the CPU preservation requirement.
    // Omitted opposing orders exercise shipping legacy CPU, never a test-only scorer.
    const orders=baseline.autoOrders(old);
    const expected=baseline.advanceWithEvents(old,orders),actual=engine.advanceWithEvents(state,orders);
    expect(actual.events.filter(e=>e.phase!=='next-turn-start')).toEqual(expected.events);
    expect(actual.state.seed).toBe(expected.state.seed);expect(actual.state.winner).toBe(expected.state.winner);
    expect(actual.state.history![0].orders).toEqual(expected.state.history![0].orders);
    for(const side of ['allies','enemies'] as const)for(const [i,u]of actual.state[side].entries()){
      const oldUnit=expected.state[side][i]; const mp=oldUnit.hp>0&&!expected.state.winner?Math.min(oldUnit.monster.mp,oldUnit.mp+2):oldUnit.mp;
      expect(u).toEqual({...oldUnit,mp});
    }
  });
  it.each([0,1,42,20261008,0xffffffff])('makes progress when every remaining enemy learned option is a free guard (seed %s)',seed=>{
    let state=engine.start([1,2,5,8,10],[1,2,5,8,10],seed,{leaders:true});
    [...state.allies,...state.enemies].forEach(unit=>unit.mp=0);
    let turns=0,enemyBasics=0;
    while(!state.winner){
      expect(turns++).toBeLessThan(engine.MAX_TURNS);
      const result=engine.advanceWithEvents(state,engine.automaticOrders(state));
      const casts=result.events.filter(event=>event.kind==='cast');
      expect(new Set(casts.map(event=>event.actor)).size).toBe(casts.length);
      expect(casts.some(event=>event.effect==='hit')).toBe(true);
      enemyBasics+=casts.filter(event=>event.actor?.startsWith('e')&&event.skill==='通常攻撃').length;
      expect([...result.state.allies,...result.state.enemies].every(unit=>unit.mp>=0&&unit.mp<=unit.monster.mp)).toBe(true);
      state=result.state;
    }
    expect(enemyBasics).toBeGreaterThan(0);expect(state.winner).not.toBeNull();
  });
});


describe('exhausted enemy exception is bounded to a learned-guard-only pool',()=>{
  it.each([0,1,7])('allows basic progress with %s MP left and no affordable offensive learned skill',mp=>{
    const state=engine.start([0],[1],42);state.enemies[0].mp=mp;
    state.enemies[0].monster={...state.enemies[0].monster,skills:[{name:'paid attack',kind:'hit',power:80,priority:0,mpCost:8},{name:'free guard',kind:'guard',power:0,priority:1,mpCost:0}]};
    for(const token of [0,1,42,0xffffffff])expect(engine.chooseLegacyEnemyOrder(state,'e0',token).skill).toBe(engine.BASIC_ATTACK);
  });
  it('keeps the legacy healthy random candidate mapping when the paid attack is affordable',()=>{
    const old=baseline.start([0],[1],42),state=engine.start([0],[1],42);
    old.enemies[0].mp=8;state.enemies[0].mp=8;
    const skills:engine.SpecialSkills=[{name:'paid attack',kind:'hit',power:80,priority:0,mpCost:8},{name:'free guard',kind:'guard',power:0,priority:1,mpCost:0}];
    old.enemies[0].monster={...old.enemies[0].monster,skills};state.enemies[0].monster={...state.enemies[0].monster,skills};
    for(const seed of [0,1,42,0xffffffff]){
      const previous=baseline.advanceWithEvents({...old,seed},[{key:'a0',skill:baseline.DEFEND}]);
      const actual=engine.advanceWithEvents({...state,seed},[{key:'a0',skill:engine.DEFEND}]);
      expect(actual.events.filter(e=>e.phase!=='next-turn-start')).toEqual(previous.events);expect(actual.state.seed).toBe(previous.state.seed);expect(actual.state.history![0].orders).toEqual(previous.state.history![0].orders);
    }
  });
});


it('keeps a healthy CPU attack fixed even when later injury would make live healing attractive',()=>{
  const state=engine.start([0],[2],42);
  const [attacker]=state.allies,[healer]=state.enemies;
  attacker.monster={...attacker.monster,hp:500,atk:0,speed:100,skills:[{name:'先行強打',kind:'hit',power:300,priority:2,mpCost:0}]};attacker.hp=500;
  healer.monster={...healer.monster,hp:500,atk:0,speed:10,skills:[{name:'予定した攻撃',kind:'hit',power:10,priority:0,mpCost:8},{name:'遅い回復',kind:'heal',power:160,priority:0,mpCost:8}]};healer.hp=500;
  const orders=[{key:'a0',skill:0,target:'e0'}];
  const actual=engine.advanceWithEvents(state,orders),enemy=actual.state.history!.at(-1)!.orders.find(order=>order.key==='e0')!;
  expect(enemy).toMatchObject({skill:0,source:'automatic',accepted:true});expect(enemy.decisionPriority).toBeUndefined();expect(enemy.nativePriority).toBeUndefined();
  expect(actual.events.find(event=>event.kind==='cast'&&event.actor==='e0')?.skill).toBe('予定した攻撃');
  expect(battleOrderLine(actual.state,enemy)).toContain('ターン開始時の指示');expect(battleOrderLine(actual.state,enemy)).not.toContain('行動時に判断');
  const diagnostic=engine.advanceWithEvents(state,orders,{enemyOrders:[{key:'e0',skill:engine.AUTO}]});
  expect(diagnostic.state.history!.at(-1)!.orders.find(order=>order.key==='e0')).toMatchObject({skill:1,target:'e0',decisionPriority:0});
});
