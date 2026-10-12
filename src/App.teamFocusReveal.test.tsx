// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';
let root: Root;
let pageScroll: number;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const buttonText = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === text)!;
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => node.click()); }
beforeEach(() => {
  localStorage.clear(); window.history.replaceState(null, '', '#team'); document.body.innerHTML='<div id="root"></div>';
  Object.assign(globalThis,{ IS_REACT_ACT_ENVIRONMENT:true });
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  pageScroll=0; root=createRoot(document.getElementById('root')!);
  localStorage.setItem('kanshu-team-slots-v1',JSON.stringify([
    {team:[0,3,2,4,6],rule:'standard'}, {team:[1,2,3,4,6],rule:'light'}, {team:[3,2,0,4,6],rule:'standard'},
  ]));
  localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team:[12,0,2,6,10],rule:'standard'}));
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('revealing the restored editor slot above fixed docks', () => {
  it.each(['cancel','escape','confirm','remove','reorder','leader'] as const)('%s focuses and reveals the slot only after unhiding the overview',async action => {
    vi.stubGlobal('visualViewport',{offsetTop:0,height:432});
    const originalRect=HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
      if(this.matches('.builderSlots .teamUnit')) return new DOMRect(131.68,242.714-pageScroll,48.06,104);
      if(this.matches('.screenAction')) return new DOMRect(0,282,320,86);
      if(this.matches('.mainNav')) return new DOMRect(0,368,320,64);
      return originalRect.call(this);
    });
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(options=>{
      expect(document.querySelector<HTMLElement>('.teamOverview')!.hidden).toBe(false);
      expect(document.activeElement?.matches('.builderSlots .teamUnit')).toBe(true);
      pageScroll+=(options as ScrollToOptions).top ?? 0;
    });
    await act(async()=>root.render(<App/>)); await click(label('チーム1を選ぶ'));
    expect(buttonText('前回の一時編成に戻す')).toBeTruthy();
    const slot=label('3枠・バステトを入れ替える'); await click(slot);
    expect(document.querySelector<HTMLElement>('.teamOverview')!.hidden).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    const list=document.querySelector<HTMLElement>('.candidateList')!; list.scrollTop=175;
    if(action==='confirm') { await click(label('トロルを候補に選ぶ')); expect(list.scrollTop).toBe(175); await click(buttonText('トロルに入れ替える')); }
    else if(action==='cancel') await click(buttonText('キャンセル'));
    else if(action==='escape') await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    else if(action==='remove') await click(buttonText('編成から外す'));
    else if(action==='reorder') await click(buttonText('← 前へ'));
    else await click(label('バステトをリーダーにする'));
    expect(document.querySelector('.candidatePanel')).toBeNull(); expect(document.activeElement).toBe(slot);
    expect(scroll).toHaveBeenCalledTimes(1); expect(list.scrollTop).toBe(175);
    const restored=slot.getBoundingClientRect(); expect(restored.bottom).toBeCloseTo(270,3);
    expect((restored.top+restored.bottom)/2).toBeLessThan(282);
  });
  it('returns to the first usable empty slot when another tab removes the previously edited slot',async()=>{
    vi.stubGlobal('visualViewport',{offsetTop:0,height:432});
    const originalRect=HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
      if(this.matches('.builderSlots .teamUnit')) return new DOMRect(131.68,242.714-pageScroll,48.06,104);
      if(this.matches('.screenAction')) return new DOMRect(0,282,320,86);
      if(this.matches('.mainNav')) return new DOMRect(0,368,320,64);
      return originalRect.call(this);
    });
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(options=>{pageScroll+=(options as ScrollToOptions).top ?? 0;});
    await act(async()=>root.render(<App/>));await click(label('チーム1を選ぶ'));
    await click(label('5枠・ガルーダを入れ替える'));
    const key='kanshu-team-workshop-v2',remote=JSON.parse(localStorage.getItem(key)!);remote.teams[0].team=[0];
    localStorage.setItem(key,JSON.stringify(remote));
    await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(remote)})));
    const slot=label('2枠・空き枠に追加');
    expect(document.activeElement).toBe(slot);expect(slot.disabled).toBe(false);
    expect(document.querySelector('.candidatePanel')).toBeNull();expect(scroll).toHaveBeenCalledTimes(1);
    expect(slot.getBoundingClientRect().bottom).toBeCloseTo(270,3);
  });
  it.each([false,true])('keeps profile/movie focus after a remote team change, then restores and reveals after dismissal (movie=%s)',async movie => {
    vi.stubGlobal('visualViewport',{offsetTop:0,height:432});
    vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
    const originalRect=HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
      if(this.matches('.builderSlots .teamUnit')) return new DOMRect(131.68,242.714-pageScroll,48.06,104);
      if(this.matches('.screenAction')) return new DOMRect(0,282,320,86);
      if(this.matches('.mainNav')) return new DOMRect(0,368,320,64);
      return originalRect.call(this);
    });
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(options=>{pageScroll+=(options as ScrollToOptions).top ?? 0;});
    const legacy=JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!);legacy[0].team=[0,3,2,6,12];
    localStorage.setItem('kanshu-team-slots-v1',JSON.stringify(legacy));
    await act(async()=>root.render(<App/>));await click(label('チーム1を選ぶ'));
    await click(label('5枠・フェンリルを入れ替える'));await click(label('現在のフェンリルの詳細'));
    const close=label('詳細を閉じる');expect(document.activeElement).toBe(close);
    if(movie){await act(async()=>{await import('./components/MythVignette');});await click(document.querySelector('.mythPlay')!);expect(document.querySelector('.mythPlayer')).toBeTruthy();}
    const topmostFocus=document.activeElement;
    const key='kanshu-team-workshop-v2',remote=JSON.parse(localStorage.getItem(key)!);remote.teams[1].team=[];remote.selected=1;
    localStorage.setItem(key,JSON.stringify(remote));
    await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(remote)})));
    expect(document.querySelector('.candidatePanel')).toBeNull();expect(document.querySelector('.profileModal')).toBeTruthy();
    expect(document.activeElement).toBe(topmostFocus);expect(scroll).not.toHaveBeenCalled();
    if(movie){await act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));expect(document.querySelector('.mythPlayer')).toBeNull();expect(document.querySelector('.profileModal')).toBeTruthy();expect(scroll).not.toHaveBeenCalled();}
    await click(close);
    const slot=label('1枠・空き枠に追加');expect(document.activeElement).toBe(slot);expect(slot.disabled).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(1);expect(slot.getBoundingClientRect().bottom).toBeCloseTo(270,3);
    expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
  });
  it('preserves candidate-list position and does not reveal the hidden overview when a profile is dismissed',async()=>{
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{});
    await act(async()=>root.render(<App/>));await click(label('チーム1を選ぶ'));
    await click(label('3枠・バステトを入れ替える'));await click(label('トロルを候補に選ぶ'));
    const list=document.querySelector<HTMLElement>('.candidateList')!;list.scrollTop=175;
    await click(label('比較中のトロルの詳細'));await click(label('詳細を閉じる'));
    expect(document.querySelector<HTMLElement>('.teamOverview')!.hidden).toBe(true);
    expect(list.scrollTop).toBe(175);expect(scroll).not.toHaveBeenCalled();
    await click(label('ホーム'));expect(document.querySelector('.teamBuilder')).toBeNull();expect(scroll).not.toHaveBeenCalled();
  });
});
