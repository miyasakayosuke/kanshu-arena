// @vitest-environment happy-dom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MythVignette from './MythVignette';
import { MYTH_SCENES, MYTH_DURATION, MYTH_STILLS } from '../mythVignettes';

let root: Root, host: HTMLElement, raf: Map<number, FrameRequestCallback>, next: number, now: number;
let media: MediaQueryList, reduced: boolean;
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === label)!;
const stage = () => document.querySelector<HTMLElement>('.mythStage')!;
const time = () => Number(stage().dataset.time);
async function click(node: HTMLElement) { await act(async () => node.click()); }
async function mount(id = 12) { await act(async () => root.render(<MythVignette id={id} />)); }
async function open() { const trigger = document.querySelector<HTMLButtonElement>('.mythPlay')!; trigger.focus(); await click(trigger); return trigger; }
async function advance(ms: number) {
  const steps=Math.ceil(ms/50),delta=ms/steps;
  for(let i=0;i<steps;i++){now+=delta;const callbacks=[...raf.values()];raf.clear();await act(async()=>callbacks.forEach(callback=>callback(now)));}
}
async function key(key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  await act(async () => document.activeElement!.dispatchEvent(event)); return event;
}
beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div><button id="background">背景</button><div id="already-inert" inert></div>';
  document.body.style.overflow = 'auto'; host = document.getElementById('host')!;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(host);
  raf=new Map();next=0;now=0;reduced=false;
  media=new EventTarget() as MediaQueryList;
  Object.defineProperty(media,'matches',{get:()=>reduced});
  vi.spyOn(window,'matchMedia').mockReturnValue(media);
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{const id=++next;raf.set(id,callback);return id;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>raf.delete(id));
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();vi.restoreAllMocks();document.body.style.overflow='';});

describe('eight user-triggered, bounded myth scenes',()=>{
  it.each(MYTH_SCENES.map(scene=>[scene.id,scene.name] as const))('opens %s (%s), completes once, replays and disposes',async(id)=>{
    await mount(id);expect(document.querySelector('.mythPlayer')).toBeNull();expect(raf.size).toBe(0);
    const trigger=await open();expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(stage().dataset.scene).toBe(String(id));expect(stage().querySelector('svg')).toBeTruthy();expect(raf.size).toBe(1);
    await advance(9500);expect(time()).toBe(MYTH_DURATION);expect(raf.size).toBe(0);expect(button('もう一度見る')).toBeTruthy();
    const final=stage().innerHTML;await advance(1000);expect(stage().innerHTML).toBe(final);
    await click(button('もう一度見る'));expect(time()).toBe(0);expect(raf.size).toBe(1);
    await click(button('詳細に戻る'));expect(document.querySelector('.mythPlayer')).toBeNull();expect(raf.size).toBe(0);expect(document.activeElement).toBe(trigger);
    expect(host.hasAttribute('inert')).toBe(false);expect(document.getElementById('already-inert')!.hasAttribute('inert')).toBe(true);expect(document.body.style.overflow).toBe('auto');
  });
  it('does not invent scenes for other roster IDs',async()=>{await mount(0);expect(host.innerHTML).toBe('');expect(raf.size).toBe(0);});
  it('pauses precisely, resumes without jumping, restarts and skips',async()=>{
    await mount();await open();await advance(2100);await click(button('一時停止'));const paused=time();expect(raf.size).toBe(0);
    await advance(20000);expect(time()).toBe(paused);await click(button('続きから'));await advance(300);expect(time()).toBeGreaterThan(paused);expect(time()).toBeLessThan(paused+400);
    await click(button('はじめから'));expect(time()).toBe(0);await click(button('結末へ'));expect(time()).toBe(MYTH_DURATION);expect(raf.size).toBe(0);expect(button('結末へ').disabled).toBe(true);
  });
  it('never creates duplicate running loops after repeated controls',async()=>{
    await mount();await open();for(let i=0;i<5;i++){await click(button('はじめから'));expect(raf.size).toBe(1);}await click(button('一時停止'));expect(raf.size).toBe(0);
  });
  it('pauses on hidden and requires an explicit resume',async()=>{
    await mount();await open();await advance(500);
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(raf.size).toBe(0);const paused=time();
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));await advance(5000);expect(time()).toBe(paused);expect(button('続きから')).toBeTruthy();
  });
  it('uses three manually stepped stills for reduced motion and never schedules RAF',async()=>{
    reduced=true;await mount();await open();expect(time()).toBe(MYTH_STILLS[0]);expect(raf.size).toBe(0);expect(button('一時停止')).toBeUndefined();
    await click(button('次の場面'));expect(time()).toBe(MYTH_STILLS[1]);await click(button('次の場面'));expect(time()).toBe(MYTH_STILLS[2]);expect(button('次の場面').disabled).toBe(true);
    await click(button('前の場面'));expect(time()).toBe(MYTH_STILLS[1]);await click(button('はじめから'));expect(time()).toBe(MYTH_STILLS[0]);expect(raf.size).toBe(0);
  });
  it('stops promptly when reduced motion is enabled mid-scene',async()=>{
    await mount();await open();await advance(1000);reduced=true;await act(async()=>media.dispatchEvent(new Event('change')));expect(raf.size).toBe(0);expect(time()).toBe(MYTH_STILLS[0]);
  });
  it('isolates Escape and pointer events from profile/page, with nested focus return',async()=>{
    const outerClick=vi.fn(),outerKey=vi.fn(),windowKey=vi.fn();window.addEventListener('keydown',windowKey);
    try{await act(async()=>root.render(<section onClick={outerClick} onKeyDown={outerKey}><MythVignette id={12}/></section>));const trigger=await open();expect(outerClick).not.toHaveBeenCalled();
    await click(button('一時停止'));expect(outerClick).not.toHaveBeenCalled();const event=await key('Escape');expect(event.defaultPrevented).toBe(true);expect(outerKey).not.toHaveBeenCalled();expect(windowKey).not.toHaveBeenCalled();expect(document.activeElement).toBe(trigger);}finally{window.removeEventListener('keydown',windowKey);}
  });
  it('traps Tab including source disclosure, and ignores closed links',async()=>{
    await mount();await open();const close=document.activeElement;expect((await key('Tab',true)).defaultPrevented).toBe(true);expect(document.activeElement).toBe(button('詳細に戻る'));
    await key('Tab');expect(document.activeElement).toBe(close);button('結末へ').focus();await key('Tab');expect(document.activeElement?.tagName).toBe('SUMMARY');await key('Tab');expect(document.activeElement).toBe(button('詳細に戻る'));
    const details=document.querySelector('details')!;details.open=true;details.querySelector('summary')!.focus();await key('Tab');expect(document.activeElement?.tagName).toBe('A');
  });
  it('closes on backdrop, but not on the scene itself',async()=>{
    await mount();await open();await click(stage());expect(stage()).toBeTruthy();await click(document.querySelector<HTMLElement>('.mythOverlay')!);expect(document.querySelector('.mythPlayer')).toBeNull();expect(raf.size).toBe(0);
  });
  it('cancels timeline immediately when the inspected monster changes or unmounts',async()=>{
    await mount();await open();await advance(1000);await mount(14);expect(document.querySelector('.mythPlayer')).toBeNull();expect(raf.size).toBe(0);await open();expect(time()).toBe(0);await act(async()=>root.render(null));expect(raf.size).toBe(0);expect(document.querySelector('.mythOverlay')).toBeNull();
  });
  it('does not re-lock scrolling if the enclosing profile restores its own lock',async()=>{
    document.body.style.overflow='hidden';await mount();await open();document.body.style.overflow='auto';await act(async()=>root.render(null));expect(document.body.style.overflow).toBe('auto');
  });
  it('releases inert before a parent profile passively returns focus during simultaneous unmount',async()=>{
    const originalFocus=HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype,'focus').mockImplementation(function(this:HTMLElement,options?:FocusOptions){
      if(this.closest('[inert]'))return;
      originalFocus.call(this,options);
    });
    const outside=document.getElementById('background')!;outside.focus();
    function ParentProfile(){
      useEffect(()=>{const previous=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous.focus({preventScroll:true});};},[]);
      return <section><MythVignette id={12}/></section>;
    }
    await act(async()=>root.render(<ParentProfile/>));await open();expect(outside.hasAttribute('inert')).toBe(true);
    await act(async()=>root.render(null));expect(outside.hasAttribute('inert')).toBe(false);expect(document.activeElement).toBe(outside);expect(document.body.style.overflow).toBe('auto');expect(document.getElementById('already-inert')!.hasAttribute('inert')).toBe(true);expect(raf.size).toBe(0);
  });

});
