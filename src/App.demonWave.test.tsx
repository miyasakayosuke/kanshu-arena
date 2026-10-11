// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline } from './playback';
let root:Root;
const pure=[29,1,8,30,31];
const label=(s:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${s}"]`)!;
const button=(s:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(n=>n.textContent?.includes(s))!;
const click=async(n:HTMLElement)=>{expect(n).toBeTruthy();await act(async()=>n.click());};
const tick=async(ms:number)=>{await act(async()=>vi.advanceTimersByTime(ms));};
const mp=()=>[...document.querySelectorAll('.commanderMp')].map(n=>n.textContent);
async function mount(team=pure,rule='standard'){localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team,rule}));await act(async()=>root.render(<App/>));}
async function begin(){await mount();await click(label('闘技場'));await click(button('この編成で対戦する'));}
function fixture(){
 const start=engine.start,advance=engine.advanceWithEvents;
 vi.spyOn(engine,'start').mockImplementationOnce(()=>{const s=start(pure,pure,8291);s.allies[2].mp=12;return s;});
 return vi.spyOn(engine,'advanceWithEvents').mockImplementation((s,o)=>advance(s,o,{enemyOrders:s.enemies.map((u,i)=>i===0?{key:u.key,skill:0,target:'a2'}:{key:u.key,skill:engine.DEFEND})}));
}
async function orders(){
 for(const id of pure){await click(label(`${engine.monsters[id].name}の行動を選択`));if(id===8){await click(button('とくぎ'));await click(button('灼熱拳'));await click(label('マモンを対象に選択'));}else await click(button('ぼうぎょ'));}
}
beforeEach(()=>{
  // Pin ordinary draws to pure slime; scenario-specific fixtures may override it.
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);root=createRoot(document.getElementById('test-root')!);});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});
describe('demon family playable resource pressure',()=>{
 it.each([1,2])('shows both actual HP and MP loss at impact then explicit fallback at %sx',async speed=>{
  const resolve=fixture();await begin();if(speed===2)await click(label('演出速度'));await orders();
  const portraits=[...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src);const beforeMp=mp();await click(button('この指示でターン開始'));
  const result=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(result.events);
  const hit=tl.cues.find(c=>c.impacts.some(e=>e.kind==='resource-loss'&&e.target==='a2'))!;expect(hit).toBeTruthy();
  const loss=hit.impacts.find(e=>e.kind==='resource-loss')!;const damage=hit.impacts.find(e=>e.kind==='damage')!;
  await tick(hit.at/speed-1);expect(mp()[2]).toBe(beforeMp[2]);expect(document.querySelector('.partyImpact.resource-loss')).toBeNull();
  await tick(2);expect(mp()[2]).toBe(`MP ${loss.mp}/${engine.monsters[8].mp}`);
  const target=document.querySelectorAll('.commander')[2];expect(target.querySelector('.partyImpact.damage')?.textContent).toBe(`−${damage.amount}`);expect(target.querySelector('.partyImpact.resource-loss')?.textContent).toBe(`MP−${loss.amount}`);expect(target.querySelector('.partyImpact.resource-gain')).toBeNull();
  expect([...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src)).toEqual(portraits);
  const fallback=tl.cues.find(c=>c.updates?.some(e=>e.kind==='fallback'))!;expect(fallback).toBeTruthy();await tick((fallback.at-hit.at)/speed+1);expect(document.body.textContent).toContain('MP不足で通常攻撃');
  await click(button('演出をスキップ'));expect(mp()).toEqual(result.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));await click(label('イフリートの行動を選択'));await click(button('とくぎ'));expect(button('灼熱拳').disabled).toBe(true);
 });
 it('skip before the drain applies final MP once and clears transient feedback',async()=>{
  const resolve=fixture();await begin();await orders();await click(button('この指示でターン開始'));await click(button('演出をスキップ'));
  const result=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;expect(mp()).toEqual(result.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect(document.querySelector('.partyImpact.resource-loss')).toBeNull();await tick(20000);expect(mp()).toEqual(result.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));
 });
 it('keeps the pure team legal only in standard and old saves readable',async()=>{
  localStorage.setItem('kanshu-team-slots-v1',JSON.stringify([{team:[0,2,3,4,6],rule:'standard'},null,null]));await mount(pure,'light');await click(label('闘技場'));expect(button('この編成で対戦する').disabled).toBe(true);expect(document.body.textContent).toContain('17/15');
 });
});
