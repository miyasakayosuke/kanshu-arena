// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import App from './App';
import * as engine from './engine';
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const card = (key: string) => document.querySelector(`#party-hp-${key}`)!.parentElement!;
const stateLabel = (key: string) => card(key).querySelector('i')!.textContent;
async function begin() { await act(async () => root.render(<App />)); await click(label('闘技場')); await click(button('この編成で対戦する')); }
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [19,20,21,22,23], rule: 'standard' }));
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  document.body.innerHTML = '<div id="test-root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

function fixture(winner = false) {
  return vi.spyOn(engine, 'advanceWithEvents').mockImplementation(state => ({
    state: { ...state, turn: state.turn + 1, ...(winner ? { winner: 'lose' as const } : {}), allies: state.allies.map(unit => unit.key === 'a0' ? { ...unit, hp: 0, mp: 10 } : unit) },
    events: [
      {kind:'cast',actor:'e0',skill:'連打',scope:'random',hits:4,hitTargets:['a0','a0','a1','a0']},
      {kind:'damage',actor:'e0',target:'a0',amount:11,hp:100,hitIndex:0},
      {kind:'resource-loss',actor:'e0',target:'a0',amount:3,mp:10,hitIndex:0},
      {kind:'damage',actor:'e0',target:'a0',amount:12,hp:88,hitIndex:1},
      {kind:'damage',actor:'e0',target:'a1',amount:13,hp:90,hitIndex:2},
      {kind:'damage',actor:'e0',target:'a0',amount:88,hp:0,hitIndex:3},
      {kind:'defeat',actor:'e0',target:'a0',hp:0,hitIndex:3},
      {kind:'cast',actor:'a2',skill:'ぼうぎょ',target:'a2'},
      {kind:'guard',actor:'a2',target:'a2'},
    ],
  }));
}
const numbers = (key='a0') => [...card(key).querySelectorAll('.partyImpact')].map(node=>node.textContent);
describe('retained ally hit labels', () => {
  it.each([1,2])('keeps prior hit and MP labels at %sx without replaying HP', async speed => {
    const advance=fixture(); await begin(); if(speed===2) await click(label('演出速度'));
    await click(button('この指示でターン開始'));
    await tick(801/speed); expect(numbers()).toEqual(['−11','MP−3']);
    const firstNode=card('a0').querySelector('.partyImpact');
    const id=firstNode!.getAttribute('data-number-id');
    await tick(180/speed); expect(numbers()).toEqual(['−11','MP−3','−12']);
    expect(card('a0').querySelector('.partyImpact')).toBe(firstNode);
    expect(card('a0').querySelector('.partyImpact')!.getAttribute('data-number-id')).toBe(id);
    expect(card('a0').querySelector('.commanderHp')?.textContent).toContain('88/');
    await tick(180/speed); expect(numbers('a1')).toEqual(['−13']); expect(numbers()).toHaveLength(3);
    await tick(180/speed); expect(numbers()).toEqual(['−11','MP−3','−12','−88']);
    expect(stateLabel('a0')).toBe('戦闘不能');
    await tick(140/speed); expect(numbers()).toEqual(['−12','−88']);
    expect(card('a0').querySelector('.commanderHp')?.textContent).toContain('0/');
    await tick(180/speed); expect(numbers()).toEqual(['−88']);
    await tick(400/speed); expect(numbers()).toHaveLength(0); expect(numbers('a1')).toHaveLength(0);
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it('clears on skip, new replay, navigation, and a new lobby battle without stale timers', async () => {
    fixture(); await begin(); await click(button('この指示でターン開始')); await tick(801);
    expect(numbers()).toHaveLength(2); await click(button('演出をスキップ'));
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
    await click(button('この指示でターン開始')); await tick(801); expect(numbers()).toHaveLength(2);
    await click(label('ホーム')); await click(button('中断して移動')); await tick(5000);
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
    await click(label('闘技場')); await click(button('この編成で対戦する'));
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
    vi.mocked(engine.advanceWithEvents).mockRestore(); fixture(true);
    await click(button('この指示でターン開始')); await tick(801); await click(button('演出をスキップ'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.arenaLobby .result')).toBeTruthy();
    expect(document.querySelector('.battleMode,.partyImpact,[role=timer]')).toBeNull();
    await tick(5000);
    expect(document.querySelector('.partyImpact')).toBeNull();
    await click(button('この編成で対戦する')); await tick(1000);
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
  });
  it('separates wrapped status/response badges from four numeric lanes and stable portrait/vitals', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [14,3,6,9,10], rule: 'standard' }));
    const originalStart = engine.start;
    vi.spyOn(engine, 'start').mockImplementation((...args) => {
      const state = originalStart(...args);
      state.allies[0].guard = true; state.allies[0].poison = 3;
      return state;
    });
    const advance = fixture();
    const implementation = advance.getMockImplementation()!;
    advance.mockImplementation((...args) => {
      const result = implementation(...args);
      // Keep the barrage nonlethal to exercise a real wrapped status combination.
      // The following guard supplies a response badge in its separate region.
      result.events = result.events.filter(event => event.kind !== 'defeat');
      result.events.find(event => event.kind === 'damage' && event.hitIndex === 3)!.hp = 1;
      result.events.push({kind:'guard',actor:'a2',target:'a0',effect:'extraordinary-response-guard',hitIndex:3});
      return result;
    });
    await begin(); await click(button('この指示でターン開始')); await tick(801);
    const visual = card('a0').querySelector('.commanderVisual')!;
    const portrait = visual.querySelector('.commanderIcon')!;
    const hp = card('a0').querySelector('.commanderHp')!;
    await tick(540);
    expect(numbers()).toHaveLength(4);
    expect(card('a0').querySelector('.commanderVisual')).toBe(visual);
    expect(visual.querySelector('.commanderIcon')).toBe(portrait);
    expect(card('a0').querySelector('.commanderHp')).toBe(hp);
    const badges = card('a0').querySelector('.commanderBadges')!;
    expect(badges.textContent).toContain('守り:今T・毒:残3回・自然障壁:残2T');
    expect(badges.contains(card('a0').querySelector('.commanderStatus'))).toBe(true);
    expect(visual.querySelector('.commanderStatus,.partyResponse')).toBeNull();
    expect(badges.compareDocumentPosition(hp) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    for (const number of visual.querySelectorAll('.partyImpact')) expect(number.closest('[aria-hidden="true"]')).toBeNull();
    expect(visual.tagName).toBe('DIV'); expect(badges.tagName).toBe('DIV');
    await tick(1500); // Next guard's response occupies its own in-flow badge region.
    expect(badges.querySelector('.partyResponse')?.textContent).toBe('守り:今T');
  });
  it('keeps number labels static for reduced motion and reserves space above HP', () => {
    const css=readFileSync('src/style.css','utf8');
    expect(css).toContain('.partyImpact{animation:none!important;opacity:1;transform:none}');
    expect(css).toContain('.retainingNumbers .commanderIcon{min-height:58px;');
    expect(css).toContain('.commanderRow .commander{display:flex;flex-direction:column;justify-content:flex-start}');
    expect(css).toContain('.commanderVisual{position:relative;flex:none;width:100%}');
    expect(css).toContain('.commander .commanderBadges .commanderStatus,.commander .commanderBadges .partyResponse{position:static;');
    expect(css).not.toContain('.commander:has(.commanderStatus:not(:empty))>span');
    expect(css).toContain('.commander.fallen .commanderIcon{opacity:.35;filter:grayscale(1)}');
  });
});
