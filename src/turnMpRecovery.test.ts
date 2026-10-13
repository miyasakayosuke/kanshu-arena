import {describe,it,expect} from 'vitest';
import * as E from './engine';
import * as prior from '../tests/reference-v02031/engine';
import {applyBattleEvents,buildTimeline} from './playback';
const teams=[[0,2,3,4,6],[1,2,5,8,10],[14,3,6,9,10],[24,25,26,27,28],[15,5,16,17,18],[19,20,21,22,23],[29,1,8,30,31],[32,4,33,34,35],[36,12,2,30,26],[12,0,2,11,13],[2,7,10,1,8]];
const values=(s:E.State)=>({turn:s.turn,seed:s.seed,winner:s.winner,allies:s.allies,enemies:s.enemies});
describe('shipping recurring MP: authoritative next command boundary',()=>{
 it('starts full without a first-turn credit and caps live slots independently',()=>{
  const s=E.start([0,0,2],[1],42);s.allies[0].mp=53;s.allies[1].mp=0;s.allies[2].hp=0;s.allies[2].mp=0;s.enemies[0].mp=44;
  const r=E.advanceWithEvents(s,s.allies.map(u=>({key:u.key,skill:E.DEFEND})),{enemyOrders:[{key:'e0',skill:E.DEFEND}]});
  expect(r.state.allies.map(u=>u.mp)).toEqual([54,2,0]);expect(r.state.enemies[0].mp).toBe(44);
  expect(r.events.filter(e=>e.effect==='turn-mp-recovery')).toEqual([
   {kind:'resource-gain',target:'a0',amount:1,mp:54,effect:'turn-mp-recovery',nextTurn:2,phase:'next-turn-start'},
   {kind:'resource-gain',target:'a1',amount:2,mp:2,effect:'turn-mp-recovery',nextTurn:2,phase:'next-turn-start'},
  ]);expect(s.allies[0].mp).toBe(53);
 });
 it('does not display or delay an empty recovery when every survivor is full',()=>{
  const s=E.start([0],[1],42);const r=E.advanceWithEvents(s,[{key:'a0',skill:E.DEFEND}],{enemyOrders:[{key:'e0',skill:E.DEFEND}]});
  expect(r.events.some(e=>e.phase==='next-turn-start')).toBe(true);expect(r.events.some(e=>e.effect==='turn-mp-recovery')).toBe(false);
  const t=buildTimeline(r.events);expect(t.cues.some(c=>c.passive==='turn-mp-recovery')).toBe(false);expect(t.duration).toBe(2*1500+150);
 });
 it('makes the real recovered MP available before manual input and does not charge on selection',()=>{
  const s=E.start([0],[1],42);s.allies[0].mp=8;
  const first=E.advanceWithEvents(s,[{key:'a0',skill:E.DEFEND}],{enemyOrders:[{key:'e0',skill:E.DEFEND}]}).state;
  expect(first.allies[0].mp).toBe(10);expect(E.canUseSkill(first.allies[0],first.allies[0].monster.skills[0]!)).toBe(true);
  const second=E.advanceWithEvents(first,[{key:'a0',skill:0,target:'e0'}],{enemyOrders:[{key:'e0',skill:E.DEFEND}]});
  expect(second.events.find(e=>e.kind==='resource')).toMatchObject({amount:10,mp:0});expect(first.allies[0].mp).toBe(10);
 });
 it.each(['knockout','poison','judgment'] as const)('does not recover after terminal %s',kind=>{
  const s=E.start([0],[1],42);s.allies[0].mp=0;s.enemies[0].mp=0;
  if(kind==='knockout')s.enemies[0].hp=1;if(kind==='poison'){s.enemies[0].hp=1;s.enemies[0].poison=1;}if(kind==='judgment')s.turn=20;
  const r=E.advanceWithEvents(s,[{key:'a0',skill:kind==='knockout'?E.BASIC_ATTACK:E.DEFEND,target:'e0'}],{enemyOrders:[{key:'e0',skill:E.DEFEND}]});
  expect(r.state.winner).not.toBeNull();expect(r.events.some(e=>e.phase==='next-turn-start')).toBe(false);expect(E.advanceWithEvents(r.state,[])).toEqual({state:r.state,events:[]});
 });
 it('replays absolute credits without duplicate gain and never counts them as actions',()=>{
  const s=E.start([0,2],[1,8],42);s.allies[0].mp=0;s.allies[1].mp=71;
  const r=E.advanceWithEvents(s,E.automaticOrders(s)),t=buildTimeline(r.events);let played=s;
  for(const cue of t.cues)played=applyBattleEvents(played,[...(cue.updates??[]),...cue.impacts]);
  expect([...played.allies,...played.enemies].map(u=>u.mp)).toEqual([...r.state.allies,...r.state.enemies].map(u=>u.mp));
  const gains=r.events.filter(e=>e.effect==='turn-mp-recovery');expect(applyBattleEvents(played,gains)).toEqual(played);
  expect(t.commands).toHaveLength(r.events.filter(e=>e.kind==='cast').length);
  const cues=t.cues.filter(c=>c.passive==='turn-mp-recovery');expect(cues.length).toBeGreaterThan(0);expect(cues.every(c=>c.cast===null)).toBe(true);
 });
 it.each(teams.flatMap((team,index)=>[0,1,42,20261013,0xffffffff].map(seed=>({team,index,seed}))))('matches frozen v31 plus synthetic 2 MP at every boundary, team$index seed$seed',({team,index,seed})=>{
  const opponents=teams[(index+3)%teams.length];let actual=E.start(team,opponents,seed,{leaders:true}),expected=prior.start(team,opponents,seed,{leaders:true});
  for(let turn=1;!actual.winner;turn++){
   expect(turn).toBeLessThanOrEqual(20);expect(values(actual)).toEqual(values(expected));
   const a=E.advanceWithEvents(actual,E.automaticOrders(actual)),b=prior.advanceWithEvents(expected,prior.automaticOrders(expected));
   expect(a.events.filter(e=>e.phase!=='next-turn-start')).toEqual(b.events);
   expect(a.state.history!.at(-1)!.orders).toEqual(b.state.history!.at(-1)!.orders);
   if(!b.state.winner)for(const u of [...b.state.allies,...b.state.enemies])if(u.hp>0)u.mp=Math.min(u.monster.mp,u.mp+2);
   actual=a.state;expected=b.state;expect(values(actual)).toEqual(values(expected));
  }
 });
});
