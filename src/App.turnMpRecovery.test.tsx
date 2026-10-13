// @vitest-environment happy-dom
import React,{act} from 'react';import {createRoot,type Root}from'react-dom/client';import{beforeEach,afterEach,describe,it,expect,vi}from'vitest';
import App from './App';import * as E from './engine';import{buildTimeline}from'./playback';
let root:Root;const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(text))!;
async function click(node:HTMLElement){expect(node).toBeTruthy();await act(async()=>node.click());}
async function begin(){localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team:[0,2,3,4,6],rule:'standard'}));const start=E.start,advance=E.advanceWithEvents;
 vi.spyOn(E,'start').mockImplementationOnce((a,b,seed,options)=>{const s=start(a,b,seed,options);s.allies[0].mp=8;s.enemies[0].mp=0;return s;});
 const spy=vi.spyOn(E,'advanceWithEvents').mockImplementation((state,orders)=>advance(state,orders,{enemyOrders:state.enemies.map(u=>({key:u.key,skill:E.DEFEND}))}));
 await act(async()=>root.render(<App/>));await click(document.querySelector('[aria-label="闘技場"]')!);await click(button('この編成で対戦する'));
 for(let i=0;i<5;i++){await click(document.querySelectorAll<HTMLElement>('.commander')[i]);await click(button('ぼうぎょ'));}
 await click(button('この指示でターン開始'));return spy;
}
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});root=createRoot(document.getElementById('test-root')!);});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});
describe('recurring MP truthful UI and single authoritative gain',()=>{
 it('shows an isolated recovery heading after guard expiry, then real MP numbers before next input',async()=>{
  const spy=await begin(),r=spy.mock.results[0].value as ReturnType<typeof E.advanceWithEvents>,timeline=buildTimeline(r.events);
  const cue=timeline.cues.find(c=>c.passive==='turn-mp-recovery')!;expect(cue.updates!.some(e=>e.kind==='expire')).toBe(true);
  await act(async()=>vi.advanceTimersByTime(cue.at+1));expect(document.querySelector('.battleMessage')?.textContent).toContain('ターン開始・MP回復');expect(document.querySelector('.battleMessage')?.textContent).not.toContain('毒のダメージ');
  expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 8/54');
  await act(async()=>vi.advanceTimersByTime(240));expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 10/54');
  expect(document.querySelector('.commander .partyImpact.resource-gain')?.textContent).toBe('MP+2');
  await act(async()=>vi.advanceTimersByTime(timeline.duration-cue.at));expect(document.querySelector('.turnStart')).not.toBeNull();expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 10/54');expect(spy).toHaveBeenCalledTimes(1);
 });
 it.each(['before','during'] as const)('skip %s recovery keeps exactly the authoritative MP and no stale credit',async when=>{
  const spy=await begin(),r=spy.mock.results[0].value as ReturnType<typeof E.advanceWithEvents>,timeline=buildTimeline(r.events);
  if(when==='during')await act(async()=>vi.advanceTimersByTime(timeline.cues.find(c=>c.passive==='turn-mp-recovery'&&c.impacts.length)!.at+1));
  await click(button('演出をスキップ'));expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 10/54');
  await act(async()=>vi.advanceTimersByTime(1500));expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 10/54');expect(spy).toHaveBeenCalledTimes(1);expect(document.querySelector('.partyImpact')).toBeNull();
 });
});
