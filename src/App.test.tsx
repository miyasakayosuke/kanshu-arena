// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
let root: Root;
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
async function click(el: HTMLElement) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function mount() { await act(async () => root.render(<App />)); }
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('complete playtest flow', () => {
  it('rejects a corrupted save and allows a valid party to enter battle', async () => {
    localStorage.setItem('kanshu-team', '[99,99,99,99,99]');
    await mount();
    expect(document.querySelectorAll('.teamUnit')).toHaveLength(5);
    await click(button('この編成で対戦する'));
    expect(document.querySelector('.battleMode')).toBeTruthy();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });
  it('requires an icon target, advances to the next ally, and resets all orders next turn', async () => {
    await mount(); await click(button('この編成で対戦する'));
    await click(button('狐火'));
    expect(button('対象を選んでください').disabled).toBe(true);
    expect(document.querySelectorAll('.battleTarget:not([disabled])')).toHaveLength(5);
    await click(document.querySelector<HTMLButtonElement>('.battleTarget:not([disabled])')!);
    expect(document.querySelector('.commander.active')?.getAttribute('aria-label')).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    await click(button('この指示でターン開始'));
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelector('.turnStart')).toBeTruthy();
    expect(document.querySelectorAll('.commander:not([disabled])').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect([...document.querySelectorAll('.commander:not([disabled]) i')].every(el => el.textContent === 'おまかせ')).toBe(true);
  });
  it('keeps HP unchanged during the windup and updates only at impact', async () => {
    await mount(); await click(button('この編成で対戦する'));
    const bars = () => [...document.querySelectorAll('.hpBar b')].map(b => b.getAttribute('style'));
    const before = bars();
    await click(button('この指示でターン開始'));
    await act(async () => vi.advanceTimersByTime(790));
    expect(bars()).toEqual(before);
    await act(async () => vi.advanceTimersByTime(25));
    // The first action may hit enemies. The visible cast cue must remain present.
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    await act(async () => vi.runAllTimers());
    expect(document.querySelector('.playingPanel')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
  });
  it('ignores repeated start clicks and can interrupt then start a clean battle', async () => {
    await mount(); await click(button('この編成で対戦する'));
    const start = button('この指示でターン開始');
    await act(async () => { start.click(); start.click(); });
    await click(label('対戦を中断して編成へ'));
    await click(button('この編成で対戦する'));
    await act(async () => vi.runAllTimers());
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('.playingPanel')).toBeNull();
  });
  it('reaches a result, opens and closes the log, and can play the next opponent', async () => {
    await mount(); await click(button('この編成で対戦する'));
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
      await click(button('この指示でターン開始'));
      await click(button('演出をスキップ'));
    }
    expect(document.querySelector('.result')).toBeTruthy();
    await click(button('ログ')); expect(document.querySelector('.logModal')).toBeTruthy();
    await click(label('戦闘ログを閉じる'));
    await click(button('編成に戻る')); expect(document.querySelector('footer')?.textContent).toContain('第2戦');
    await click(button('この編成で対戦する'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });
  it('filters anchors and preserves an edited party across remount', async () => {
    await mount(); await click(button('アンカー'));
    expect(document.querySelectorAll('.rosterItem')).toHaveLength(3);
    await click(label('妖狐の詳細')); await click(button('編成から外す'));
    expect(button('この編成で対戦する').disabled).toBe(true);
    await click(label('トロルの詳細')); await click(button('編成に加える'));
    expect(button('この編成で対戦する').disabled).toBe(false);
    expect(JSON.parse(localStorage.getItem('kanshu-team')!)).toContain(1);
  });
});
