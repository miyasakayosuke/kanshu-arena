// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
let root: Root;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const label = (value: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${value}"]`)!;
const browse = (direction: string) => document.querySelector<HTMLButtonElement>(`.profileBrowse [aria-label^="${direction}のモンスター"]`)!;
const profile = () => document.querySelector('.profileModal')!;
const cards = () => [...document.querySelectorAll<HTMLButtonElement>('.catalogCardOpen')];
const currentName = () => profile().getAttribute('aria-label');
const tab = (name: string) => click(document.querySelector(`[data-detail-tab=${name}]`)!);
async function select(name: string, value: string) {
 const node=document.querySelector<HTMLSelectElement>(`select[aria-label="${name}"]`)!;
 await act(async()=>{ node.value=value; node.dispatchEvent(new Event('change',{bubbles:true})); });
}
beforeEach(()=>{
 localStorage.clear(); window.history.replaceState(null,'','#catalog');
 document.body.innerHTML='<div id="test-root"></div>'; Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 root=createRoot(document.getElementById('test-root')!);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();});
async function mount(){await act(async()=>root.render(<App/>));}
describe('continuous catalog detail viewing',()=>{
 it('browses the filtered sorted order and keeps the active tab, original opener, scroll, and saved teams',async()=>{
  const start=vi.spyOn(engine,'start'); await mount();
  const saved=localStorage.getItem('kanshu-workshop-v1');
  await select('系統で絞り込み','dragon'); await select('並べ替え','speed');
  const names=cards().map(node=>node.getAttribute('aria-label')); expect(names.length).toBeGreaterThan(1);
  const opener=cards()[0], gallery=document.querySelector<HTMLElement>('.catalogGallery')!;
  gallery.scrollTop=187; await click(opener); await tab('story');
  for(let index=1;index<names.length;index++){
   const next=browse('次'); next.focus(); await click(next);
   expect(currentName()).toBe(names[index]); expect(document.activeElement).toBe(next);
   expect(document.querySelector('[data-detail-tab=story]')!.getAttribute('aria-selected')).toBe('true');
  }
  expect(browse('次').getAttribute('aria-disabled')).toBe('true'); await click(browse('次')); expect(currentName()).toBe(names.at(-1));
  await click(browse('前')); expect(currentName()).toBe(names.at(-2));
  await click(label('詳細を閉じる')); expect(document.activeElement).toBe(opener); expect(gallery.scrollTop).toBe(187);
  expect(cards().map(node=>node.getAttribute('aria-label'))).toEqual(names);
  expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved); expect(start).not.toHaveBeenCalled();
  await click(opener); expect(document.querySelector('[data-detail-tab=appearance]')!.getAttribute('aria-selected')).toBe('true');
 });
 it('stops at the first item, names adjacent monsters, resets skill selection and supports Escape',async()=>{
  await mount(); const names=cards().map(node=>node.getAttribute('aria-label')); const opener=cards()[0];
  await click(opener); expect(browse('前').getAttribute('aria-disabled')).toBe('true'); await click(browse('前')); expect(currentName()).toBe(names[0]);
  expect(browse('次').getAttribute('aria-label')).toContain(names[1]!.replace('の詳細',''));
  await tab('skills'); const skills=document.querySelectorAll<HTMLButtonElement>('.detailSkillPicker button'); await click(skills[skills.length-1]);
  await click(browse('次')); expect(document.querySelector('[data-detail-tab=skills]')!.getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('.detailSkillPicker button')!.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelectorAll('.detailSkillReading:not([hidden])')).toHaveLength(1);
  await act(async()=>browse('前').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
  expect(document.querySelector('.profileModal')).toBeNull(); expect(document.activeElement).toBe(opener);
 });
 it('resets ability pages, keeps tab-arrow navigation local, and includes header controls in the focus trap',async()=>{
  await mount(); await click(cards()[12]); await tab('abilities');
  const pager=document.querySelector<HTMLElement>('.detailPager')!;
  await click(pager.querySelectorAll<HTMLButtonElement>('button')[1]); expect(pager.textContent).toContain('2 /');
  const reader=document.querySelector<HTMLElement>('.profileBody')!; reader.scrollTop=84;
  await click(browse('次')); expect(document.querySelector('.detailPager')!.textContent).toContain('1 /'); expect(reader.scrollTop).toBe(0);
  const selected=document.querySelector<HTMLElement>('[data-detail-tab=abilities]')!; const name=currentName();
  selected.focus(); await act(async()=>selected.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true})));
  expect(currentName()).toBe(name); expect(document.querySelector('[data-detail-tab=skills]')!.getAttribute('aria-selected')).toBe('true');
  browse('前').focus(); await act(async()=>browse('前').dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));
  expect(profile().contains(document.activeElement)).toBe(true); expect(document.activeElement?.closest('[hidden]')).toBeNull();
 });
 it('browses into a movie, dismisses both layers, and returns to the original catalog card',async()=>{
  vi.stubGlobal('requestAnimationFrame',()=>1); vi.stubGlobal('cancelAnimationFrame',()=>{});
  try {
   await mount(); const opener=cards()[11]; const gallery=document.querySelector<HTMLElement>('.catalogGallery')!; gallery.scrollTop=154;
   const saved=localStorage.getItem('kanshu-workshop-v1'); await click(opener); await click(browse('次'));
   expect(currentName()).toBe('フェンリルの詳細'); await act(async()=>{await import('./components/MythVignette');});
   const trigger=document.querySelector<HTMLButtonElement>('.mythPlay')!; trigger.focus(); await click(trigger);
   expect(document.querySelector('.mythPlayer')).toBeTruthy(); expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(true);
   await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
   expect(document.querySelector('.mythPlayer')).toBeNull(); expect(currentName()).toBe('フェンリルの詳細'); expect(document.activeElement).toBe(trigger);
   await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
   expect(document.querySelector('.profileModal')).toBeNull(); expect(document.activeElement).toBe(opener); expect(gallery.scrollTop).toBe(154);
   expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(false); expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
  } finally {vi.unstubAllGlobals();}
 });
 it('omits navigation for a single result and for home details',async()=>{
  await mount(); const input=document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'ヤヌス');input.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(cards()).toHaveLength(1); await click(cards()[0]); expect(document.querySelector('.profileBrowse')).toBeNull();
  await click(label('詳細を閉じる')); await click(label('ホーム')); await click(document.querySelector<HTMLElement>('.pastureMonster')!);
  expect(document.querySelector('.profileBrowse')).toBeNull();
 });
});
