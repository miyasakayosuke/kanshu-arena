import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoOrders, start, BASIC_ATTACK, DEFEND, type Order, type State } from './engine';
// @ts-ignore Development-only JavaScript.
import { runMatch } from '../scripts/balance-lab/core.mjs';
vi.mock('./engine',async original=>{const a=await original<typeof import('./engine')>();return{...a,start:vi.fn(a.start),autoOrders:vi.fn(a.autoOrders)};});
const pure=[32,4,33,34,35],mixed=[32,4,35,3,10],controls=[2,1,8,10,6],demons=[29,1,8,30,31];
const rows=(s:State,side:'allies'|'enemies',orders:Record<string,{skill:number;target?:string}>)=>s[side].filter(u=>u.hp>0).map(u=>({key:u.key,...(orders[u.key]??{skill:DEFEND})}));
beforeEach(async()=>{const a=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(start).mockReset().mockImplementation(a.start);vi.mocked(autoOrders).mockReset().mockImplementation(a.autoOrders);});
// These are explicit synthetic order/state fixtures for the Lab observer, not study outcomes.
const setup=async(change:(s:State)=>void,commands:(s:State,side:'allies'|'enemies')=>Order[])=>{const a=await vi.importActual<typeof import('./engine')>('./engine');vi.mocked(start).mockImplementation((...args)=>{const s=a.start(...args);change(s);return s;});vi.mocked(autoOrders).mockImplementation((s,side='allies')=>s.turn===1?commands(s,side):a.autoOrders(s,side));};
describe('undead Lab impact timing synthetic fixtures',()=>{
 it('observes poison→before-hit cleanse→zero cashout→slow Naga reapplication exactly once',async()=>{
  await setup(s=>{for(const u of [...s.allies,...s.enemies]){u.monster={...u.monster,hp:2000};u.hp=2000;}s.enemies[0].monster.speed=60;},(s,side)=>rows(s,side,side==='allies'?{a0:{skill:0,target:'e0'},a1:{skill:1},a4:{skill:1}}:{e0:{skill:3,target:'e0'}}));
  const r=runMatch({teamA:mixed,teamB:controls,seed:42,trace:true}),events=r.trace.turns[0].events;expect(events.filter((e:{target:string;kind:string})=>e.target==='e0'&&['poison','cleanse','poison-cashout'].includes(e.kind)).map((e:{kind:string;poison:number;poisonTicksConsumed?:number})=>[e.kind,e.poison,e.poisonTicksConsumed])).toEqual([['poison',3,undefined],['cleanse',0,undefined],['poison-cashout',0,0],['poison',3,undefined]]);expect(r.units[0].cashoutZeroPoison).toBeGreaterThan(0);expect(r.units[0].cashoutLaterReapplications).toBeGreaterThan(0);
 });
 it('consumes the actual retarget poison and keeps lethal consumption before defeat',async()=>{
  await setup(s=>{s.enemies[0].hp=1;s.enemies[0].poison=3;s.enemies[1].poison=2;s.enemies[2].poison=1;},(s,side)=>rows(s,side,side==='allies'?{a0:{skill:0,target:'e0'},a2:{skill:1,target:'e0'}}:{}));
  const r=runMatch({teamA:pure,teamB:controls,seed:42,trace:true}),events=r.trace.turns[0].events,consume=events.find((e:{kind:string})=>e.kind==='poison-cashout');expect(consume.target).not.toBe('e0');expect(r.units[0].cashoutRetargets).toBeGreaterThan(0);expect(consume.poisonTicksConsumed).toBe(consume.target==='e1'?2:consume.target==='e2'?1:0);
 });
 it('records lethal ticks even when ordinary damage already kills, without crediting extra HP or MP',async()=>{
  await setup(s=>{s.enemies[0].hp=1;s.enemies[0].poison=3;},(s,side)=>rows(s,side,side==='allies'?{a0:{skill:0,target:'e0'}}:{}));
  const r=runMatch({teamA:pure,teamB:controls,seed:42,trace:true}),events=r.trace.turns[0].events,i=events.findIndex((e:{kind:string})=>e.kind==='poison-cashout');expect(events.slice(i,i+3).map((e:{kind:string})=>e.kind)).toEqual(['poison-cashout','damage','defeat']);expect(events[i].poisonTicksConsumed).toBe(3);expect(events[i+1].amount).toBe(1);expect(r.units[0].cashoutTicksConsumed).toBeGreaterThanOrEqual(3);expect(events.some((e:{effect:string;kind:string})=>e.effect==='poison-cashout'&&['heal','resource-gain'].includes(e.kind))).toBe(false);
 });
 it('keeps poison on a target when MP pressure replaces the paid order with one free basic',async()=>{
  await setup(s=>{s.allies[0].mp=18;s.enemies[0].poison=3;for(const u of [...s.allies,...s.enemies]){u.monster={...u.monster,hp:1500};u.hp=1500;}},(s,side)=>rows(s,side,side==='allies'?{a0:{skill:0,target:'e0'}}:{e0:{skill:0,target:'a0'}}));
  const r=runMatch({teamA:pure,teamB:demons,seed:42,trace:true}),t=r.trace.turns[0];expect(t.events.find((e:{kind:string;actor:string})=>e.kind==='fallback'&&e.actor==='a0')).toMatchObject({fromSkill:0,toSkill:BASIC_ATTACK});expect(t.events.filter((e:{kind:string;actor:string})=>e.kind==='cast'&&e.actor==='a0')).toEqual([expect.objectContaining({skill:'通常攻撃'})]);expect(t.events.filter((e:{kind:string})=>e.kind==='poison-cashout')).toHaveLength(0);expect(t.unitsAfter.find((u:{key:string})=>u.key==='e0').poison).toBe(2);expect(t.unitsAfter.find((u:{key:string})=>u.key==='a0').mp).toBe(8);
 });
});
