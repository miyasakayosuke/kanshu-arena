// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as trials from './familyTrials';
let root: Root;
const oldTeam = [0,2,3,4,6];
const saved = JSON.stringify([{team:[15,5,16,17,18],rule:'standard'}, {team:[19,20,21,22,23],rule:'standard'}, {team:oldTeam,rule:'light'}]);
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const mount = async () => { await act(async () => root.render(<App />)); };
const active = () => JSON.parse(localStorage.getItem('kanshu-workshop-v1')!);
const picker = () => document.querySelector('.familyTrialDialog');
async function open() { if (window.location.hash === '#home') await click(label('闘技場')); await click(button('系統パーティを試す')); }
async function choose(id: string) { await click(document.querySelector<HTMLButtonElement>(`.familyTrialCard[data-family="${id}"] .familyTrialChoose`)!); }
async function finish() {
  for (let turn=0; turn<20 && !document.querySelector('.result'); turn++) { await click(button('この指示でターン開始')); await click(button('演出をスキップ')); }
  expect(document.querySelector('.result')).toBeTruthy();
}
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  localStorage.clear(); localStorage.setItem('kanshu-team-slots-v1', saved);
  window.history.replaceState(null, '', '#home'); document.body.innerHTML='<div id="test-root"></div>';
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root=createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('one-click family trials without saving over slots', () => {
  it('removes the home shortcut but keeps the arena picker reachable through the footer', async () => {
    await mount(); expect(button('系統パーティを試す')).toBeUndefined();
    expect(document.querySelector('.homeDestinations')).toBeNull();
    await click(label('闘技場')); await open(); expect(picker()).toBeTruthy();
    await click(label('編成を変えずに閉じる'));
    await click(label('ホーム')); expect(button('系統パーティを試す')).toBeUndefined();
    expect(active().team).toEqual(oldTeam); expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(saved);
  });
  it.each(trials.familyTrialPresets)('applies $id with its leader and opens reception without starting a battle', async preset => {
    const start=vi.spyOn(engine,'start'); const draw=vi.spyOn(trials,'familyEncounterForSeed');
    await mount(); await open(); await choose(preset.id);
    expect(window.location.hash).toBe('#arena'); expect(picker()).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.arenaLobby h2.srOnly'));
    expect(active()).toEqual({team:preset.team,rule:'standard'});
    expect([...document.querySelectorAll('.teamUnit')].map(n=>Number(n.getAttribute('data-monster-id')))).toEqual(preset.team);
    expect(button('この編成で対戦する').disabled).toBe(false);
    expect(draw).not.toHaveBeenCalled(); expect(start.mock.calls.filter(([,enemy])=>enemy.length)).toHaveLength(0);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(saved);
    expect(document.body.textContent).toContain('保存した3枠はそのまま');
    await click(label('ホーム')); expect(active().team).toEqual(preset.team);
    await act(async()=>root.unmount()); root=createRoot(document.getElementById('test-root')!); await mount();
    expect(active().team).toEqual(preset.team); expect(picker()).toBeNull();
  });
  it.each(['close','escape','cancel','backdrop'])('leaves the active light team and all saves unchanged on %s',async mode=>{
    localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team:oldTeam,rule:'light'}));
    await mount(); const original=localStorage.getItem('kanshu-workshop-v1'); await open();
    if(mode==='escape') await act(async()=>{picker()!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});
    else await click(mode==='close'?label('編成を変えずに閉じる'):mode==='cancel'?button('キャンセルして'):document.querySelector<HTMLElement>('.familyTrialOverlay')!);
    expect(picker()).toBeNull(); expect(window.location.hash).toBe('#arena');
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(original); expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(saved);
  });
  it('retains light for nature and explicitly switches to standard for COST17',async()=>{
    localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team:oldTeam,rule:'light'}));
    await mount(); await open();
    expect(document.querySelector('[data-family="nature"] .familyTrialChoose')?.textContent).toBe('軽量戦 COST15のまま受付へ');
    expect(document.querySelector('[data-family="dragon"] .familyTrialChoose')?.textContent).toBe('標準戦 COST17に切り替えて受付へ');
    await choose('nature'); expect(active().rule).toBe('light'); expect(document.body.textContent).toContain('相手は自然系のみ');
    await open(); await choose('dragon'); expect(active().rule).toBe('standard'); expect(document.activeElement).toBe(document.querySelector('.arenaLobby h2.srOnly')); expect(button('この編成で対戦する').disabled).toBe(false);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(saved);
  });
  it('preserves practice on cancel but clears it and draws anew after applying a preset',async()=>{
    const draw=vi.spyOn(trials,'familyEncounterForSeed');
    await mount(); await click(label('闘技場')); await click(button('この編成で対戦する')); await finish();
    await click(button('編成を見直して再戦')); await click(label('闘技場'));
    expect(button('この編成で同じ相手に再戦')).toBeTruthy();
    await open(); await click(label('編成を変えずに閉じる'));
    expect(button('この編成で同じ相手に再戦')).toBeTruthy(); expect(draw).toHaveBeenCalledTimes(1);
    await open(); await choose('beast'); expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(draw).toHaveBeenCalledTimes(1); await click(button('この編成で対戦する')); expect(draw).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(saved);
  });
  it('closes on a route change and does not apply a merely opened preset',async()=>{
    await mount(); await open(); await click(label('編成'));
    expect(picker()).toBeNull(); expect(active().team).toEqual(oldTeam);
    await click(label('ホーム')); expect(picker()).toBeNull();
  });
});
