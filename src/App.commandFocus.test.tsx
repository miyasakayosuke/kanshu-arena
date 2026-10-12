// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

const team = [0, 2, 3, 4, 6];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const turnStart = () => document.querySelector<HTMLButtonElement>('.turnStart')!;
const actor = (index: number) => label(`${engine.monsters[team[index]].name}の行動を選択`);
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => { element.focus(); element.click(); }); }
async function begin(mutate?: (state: engine.State) => void) {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  const start = engine.start;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    const state = start(team, [1, 5, 8, 10, 6], 20261008, { leaders: true }); mutate?.(state); return state;
  });
  const advance = vi.spyOn(engine, 'advanceWithEvents');
  await act(async () => root.render(<App />)); await click(label('闘技場')); await click(button('この編成で対戦する'));
  return { state: setup.mock.results[0].value as engine.State, advance };
}
async function defend(indices: number[]) { for (const index of indices) { await click(actor(index)); await click(button('ぼうぎょ')); } }
async function special(name: string) { await click(button('とくぎ')); await click(button(name)); }
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home'); document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('last confirmed command focuses the explicit turn start', () => {
  it('removes only whole-team auto and focuses after all five basic attacks, without starting', async () => {
    const { advance } = await begin(); expect(button('全員おまかせ')).toBeUndefined(); expect(button('おまかせ')).toBeTruthy();
    for (let index = 0; index < 5; index++) {
      await click(button('たたかう')); expect(document.activeElement).not.toBe(turnStart()); expect(turnStart().disabled).toBe(true);
      await click(label('トロルを対象に選択'));
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(index + 1);
      expect(document.activeElement === turnStart()).toBe(index === 4); expect(advance).not.toHaveBeenCalled();
    }
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    await click(turnStart()); expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(team.map((_, index) => ({ key: `a${index}`, skill: engine.BASIC_ATTACK, target: 'e0' })));
    expect(button('全員おまかせ')).toBeUndefined();
  });
  it.each(['defend', 'all-target special', 'single-target special', 'ally-target special', 'individual auto'] as const)('focuses only after final %s is committed, entered out of party order', async mode => {
    const { advance } = await begin(); const last = mode === 'ally-target special' ? 1 : 0;
    await defend([4, 2, 3, last === 0 ? 1 : 0]); expect(document.activeElement).not.toBe(turnStart()); await click(actor(last));
    if (mode === 'defend') await click(button('ぼうぎょ'));
    if (mode === 'individual auto') await click(button('おまかせ'));
    if (mode === 'all-target special') await special('炎嵐');
    if (mode === 'single-target special' || mode === 'ally-target special') {
      await special(mode === 'single-target special' ? '狐火' : '生命の雫');
      expect(document.activeElement).not.toBe(turnStart()); expect(turnStart().disabled).toBe(true);
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(4);
      await click(label(`${mode === 'single-target special' ? 'トロル' : '妖狐'}を対象に選択`));
    }
    expect(document.activeElement).toBe(turnStart()); expect(turnStart().disabled).toBe(false);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(5); expect(advance).not.toHaveBeenCalled();
  });
  it.each([{living:[0,1]}, {living:[0,1,4]}, {living:[2]}])('requires only living actors $living, including defeated final party slots', async ({living}) => {
    const { advance } = await begin(state => state.allies.forEach((unit, index) => { if (!living.includes(index)) unit.hp = 0; }));
    for (const index of living.slice(0, -1)) { await defend([index]); expect(document.activeElement).not.toBe(turnStart()); }
    await defend(living.slice(-1)); expect(document.activeElement).toBe(turnStart());
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(living.length); expect(advance).not.toHaveBeenCalled();
  });
  it('refocuses when a complete order is replaced, but not on menus or cancellation', async () => {
    const { advance } = await begin(); await defend([0,1,2,3,4]); expect(document.activeElement).toBe(turnStart());
    await click(actor(0)); await special('狐火'); expect(document.activeElement).not.toBe(turnStart()); expect(turnStart().disabled).toBe(true);
    await click(button('特技に戻る')); expect(document.activeElement).not.toBe(turnStart()); expect(turnStart().disabled).toBe(false);
    await click(button('狐火')); await click(label('トロルを対象に選択')); expect(document.activeElement).toBe(turnStart());
    await click(actor(0)); await click(button('おまかせ')); expect(document.activeElement).toBe(turnStart());
    expect(actor(0).textContent).toContain('おまかせ ✓'); expect(advance).not.toHaveBeenCalled();
  });
  it.each(['back','escape','actor change'] as const)('does not commit a last pending target cancelled by %s', async mode => {
    const { advance } = await begin(); await defend([1,2,3,4]); await special('狐火');
    if (mode === 'back') await click(button('特技に戻る'));
    if (mode === 'escape') await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})));
    if (mode === 'actor change') await click(actor(1));
    expect(document.activeElement).not.toBe(turnStart()); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(4);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  });
  it.each(['timeout','overdue target click'] as const)('preserves confirmed orders and auto-completes unfinished last target on %s without stealing focus', async mode => {
    const { state, advance } = await begin(); await defend([1,2,3,4]); await special('狐火');
    if (mode === 'timeout') await act(async () => vi.advanceTimersByTime(30000));
    else await act(async () => { vi.setSystemTime(Date.now() + 30001); label('トロルを対象に選択').click(); });
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [1,2,3,4].map(index => ({key:`a${index}`,skill:engine.DEFEND}))));
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(turnStart()).toBeNull();
    await click(button('演出をスキップ')); expect(document.activeElement).not.toBe(turnStart()); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
  });
  it.each(['details','tactics','log','leave'] as const)('does not steal focus from %s opened in final command batch or defer until dismissal', async overlay => {
    const { advance } = await begin(); await defend([0,1,2,3]); const final = button('ぼうぎょ');
    const opener = overlay === 'details' ? button('詳細') : overlay === 'tactics' ? button('作戦') : overlay === 'log' ? button('ログ') : label('闘技場に戻る');
    await act(async () => { final.click(); opener.click(); }); expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeTruthy();
    expect(document.activeElement).not.toBe(turnStart()); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true,cancelable:true})));
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull(); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  });
  it('rejects held activation keys after focus moves, then accepts deliberate start once', async () => {
    const { advance } = await begin(); await defend([0,1,2,3,4]);
    for (const key of ['Enter',' ']) {
      const event = new KeyboardEvent('keydown', {key,repeat:true,bubbles:true,cancelable:true});
      await act(async () => turnStart().dispatchEvent(event)); expect(event.defaultPrevented).toBe(true);
    }
    const key = new KeyboardEvent('keydown', {key:'Enter',bubbles:true,cancelable:true});
    await act(async () => turnStart().dispatchEvent(key)); expect(key.defaultPrevented).toBe(false); expect(advance).not.toHaveBeenCalled();
    const start = turnStart(); await act(async () => { start.click(); start.click(); }); expect(advance).toHaveBeenCalledTimes(1);
    await click(button('演出をスキップ')); expect(document.activeElement).not.toBe(turnStart()); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
  });
});
