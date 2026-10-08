// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
let root: Root;
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const targets = () => [...document.querySelectorAll<HTMLButtonElement>('.targetButtons button')];
const target = (name: string) => document.querySelector<HTMLButtonElement>(`.targetButtons button[aria-label="${name}を対象に選択"]`)!;
const activeCommander = () => document.querySelector('.commander.active')?.getAttribute('aria-label');
async function click(el: HTMLElement) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function mount() { await act(async () => root.render(<App />)); }
async function enterBattle() { await mount(); await click(button('この編成で対戦する')); }
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
  it('replaces skills with enemy targets, advances to the next ally, and resets all orders next turn', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const skillRegion = document.querySelector('.skillButtons')?.parentElement;
    await click(button('狐火'));
    expect(button('対象を選んでください').disabled).toBe(true);
    expect(document.querySelector('.skillButtons')).toBeNull();
    expect(document.querySelector('.targetButtons')?.parentElement).toBe(skillRegion);
    expect(targets().map(b => b.getAttribute('aria-label'))).toEqual(
      ['トロル', 'ケツァルコアトル', 'イフリート', 'ナーガ', 'ガルーダ'].map(name => `${name}を対象に選択`),
    );
    expect(targets().every(b => !b.disabled)).toBe(true);
    await click(button('対象を選んでください'));
    expect(advance).not.toHaveBeenCalled();
    await click(target('トロル'));
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e0' });
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
    const played = [...(document.querySelector('.log')?.textContent ?? '').matchAll(/── TURN (\d+) ──/g)];
    expect(document.querySelector('.battleTop')?.textContent).toContain(`TURN ${played.at(-1)![1]}`);
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

describe('command and target controls', () => {
  it('offers only allied targets for healing and records the selected ally', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(label('バステトの行動を選択'));
    await click(button('生命の雫'));
    expect(document.querySelector('.skillButtons')).toBeNull();
    expect(targets().map(b => b.getAttribute('aria-label'))).toEqual(
      ['妖狐', 'バステト', 'ドリュアス', 'バンシー', 'ガルーダ'].map(name => `${name}を対象に選択`),
    );
    expect(target('トロル')).toBeNull();
    await click(target('ドリュアス'));
    expect(activeCommander()).toContain('妖狐');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a2' });
  });

  it('commits all-target attacks, guard, and poison without entering target selection', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    for (const [skill, nextActor, ready] of [
      ['炎嵐', 'バステト', 1],
      ['鉄壁の構え', 'ドリュアス', 2],
      ['毒霧', 'バンシー', 3],
    ] as const) {
      await click(button(skill));
      expect(document.querySelector('.targetButtons')).toBeNull();
      expect(document.querySelector('.skillButtons')).toBeTruthy();
      expect(activeCommander()).toContain(nextActor);
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(ready);
      expect(button('この指示でターン開始').disabled).toBe(false);
    }
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([
      { key: 'a0', skill: 2, target: undefined },
      { key: 'a1', skill: 2, target: undefined },
      { key: 'a2', skill: 2, target: undefined },
    ]));
  });

  it('resets partial orders and pending targets to automatic orders for every living ally', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const automatic = engine.autoOrders(engine.start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 20261008));
    expect(button('全員おまかせ').disabled).toBe(false);
    await click(button('炎嵐'));
    await click(button('鉄壁の構え'));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(2);
    await click(button('生命の雫'));
    expect(targets()).toHaveLength(5);
    const reset = button('全員おまかせ');
    expect(reset.disabled).toBe(false);
    await act(async () => { reset.click(); reset.click(); });
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    expect(document.querySelector('.skillButtons .chosen')).toBeNull();
    expect(activeCommander()).toContain('妖狐');
    expect(button('この指示でターン開始').disabled).toBe(false);
    expect([...document.querySelectorAll('.commander i')].every(el => el.textContent === 'おまかせ')).toBe(true);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(automatic);
  });

  it('keeps the automatic reset visible but disabled throughout playback', async () => {
    await enterBattle();
    await click(button('この指示でターン開始'));
    const reset = button('全員おまかせ');
    expect(reset).toBeTruthy();
    expect(reset.disabled).toBe(true);
    await click(reset);
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    expect(document.querySelectorAll('.commander:not([disabled])')).toHaveLength(0);
    await click(button('演出をスキップ'));
    expect(button('全員おまかせ').disabled).toBe(false);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
  });

  it('returns to skills without erasing an existing order or committing a replacement', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('狐火'));
    await click(target('トロル'));
    await click(label('妖狐の行動を選択'));
    await click(button('疾風斬り'));
    const back = button('特技に戻る');
    expect(back.closest('.commandHeading')).toBeTruthy();
    await click(back);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons .chosen')?.textContent).toContain('狐火');
    expect(activeCommander()).toContain('妖狐');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(button('この指示でターン開始').disabled).toBe(false);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e0' });
  });

  it('cancels pending targets with Escape or an actor change without creating orders', async () => {
    await enterBattle();
    await click(button('狐火'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(button('この指示でターン開始').disabled).toBe(false);
    await click(button('疾風斬り'));
    await click(label('バステトの行動を選択'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons')?.textContent).toContain('生命の雫');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(button('生命の雫'));
    expect(target('妖狐')).toBeTruthy();
    expect(target('トロル')).toBeNull();
    await click(button('特技に戻る'));
    expect(button('この指示でターン開始').disabled).toBe(false);
  });

  it('handles repeated target clicks and repeated order edits without ordering another actor', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('狐火'));
    const firstTarget = target('トロル');
    await act(async () => { firstTarget.click(); firstTarget.click(); });
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    for (const name of ['ナーガ', 'イフリート']) {
      await click(label('妖狐の行動を選択'));
      await click(button('疾風斬り'));
      await click(button('特技に戻る'));
      await click(button('狐火'));
      await click(target(name));
      expect(activeCommander()).toContain('バステト');
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
      expect(document.querySelector('.targetButtons')).toBeNull();
    }
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e2' });
  });

  it('excludes defeated units from targets and resets to the first living actor', async () => {
    const start = engine.start;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args);
      state.allies[0].hp = 0;
      state.enemies[0].hp = 0;
      return state;
    });
    await enterBattle();
    expect(label('妖狐の行動を選択').disabled).toBe(true);
    expect(activeCommander()).toContain('バステト');
    await click(button('爪撃'));
    expect(targets()).toHaveLength(4);
    expect(target('トロル')).toBeNull();
    await click(button('特技に戻る'));
    await click(button('生命の雫'));
    expect(targets()).toHaveLength(4);
    expect(target('妖狐')).toBeNull();
    await click(target('バステト'));
    expect(activeCommander()).toContain('ドリュアス');
    await click(button('樹海の槍'));
    await click(button('全員おまかせ'));
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(button('この指示でターン開始').disabled).toBe(false);
  });

  it('clears pending selection when leaving and restarting a battle', async () => {
    await enterBattle();
    await click(button('炎嵐'));
    await click(button('生命の雫'));
    await click(label('対戦を中断して編成へ'));
    await click(button('この編成で対戦する'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(activeCommander()).toContain('妖狐');
    expect(button('この指示でターン開始').disabled).toBe(false);
    expect(button('全員おまかせ').disabled).toBe(false);
  });
});
