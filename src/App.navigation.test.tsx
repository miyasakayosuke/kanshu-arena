// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const dialog = () => document.querySelector('[role="alertdialog"][aria-label="対戦を中断しますか"]');
const timer = () => document.querySelector('[role="timer"]');
const team = () => [...document.querySelectorAll('.teamUnit')].map(element => element.getAttribute('aria-label'));
const partyVitals = () => [...document.querySelectorAll('.commanderHp, .commanderMp')].map(element => element.textContent);
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function mount() { await act(async () => root.render(<App />)); }
async function tick(milliseconds: number) { await act(async () => vi.advanceTimersByTime(milliseconds)); }
async function navigate(name: 'ホーム' | '編成・図鑑' | '闘技場') { await click(label(name)); }
async function startBattle() {
  if (window.location.hash !== '#arena') await navigate('闘技場');
  await click(button('この編成で対戦する'));
}
async function enterBattle() { await mount(); await startBattle(); }
async function historyMove(direction: 'back' | 'forward') {
  await act(async () => { window.history[direction](); await Promise.resolve(); });
}
async function finishBattle() {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始'));
    await click(button('演出をスキップ'));
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
function unloadingIsBlocked() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('separate home, workshop, and arena screens', () => {
  it('opens a quiet home hub and requires an explicit lobby start to enter battle', async () => {
    const start = vi.spyOn(engine, 'start');
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await mount();
    expect(window.location.hash).toBe('#home');
    expect(document.querySelector('[aria-label="ゲームホーム"]')).toBeTruthy();
    expect(team()).toHaveLength(5);
    expect(button('闘技場へ')).toBeTruthy();
    expect(button('編成・図鑑')).toBeTruthy();
    expect(document.querySelector('.ruleTabs')).toBeNull();
    expect(document.querySelector('.roster')).toBeNull();
    expect(button('この編成で対戦する')).toBeUndefined();
    expect(document.querySelector('canvas')).toBeNull();
    expect(timer()).toBeNull();
    await tick(60000);
    await click(button('闘技場へ'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('[aria-label="闘技場の受付"]')).toBeTruthy();
    expect(document.querySelector('.ruleTabs')).toBeTruthy();
    expect(button('この編成で対戦する')).toBeTruthy();
    expect(document.querySelector('.enemyIntel')).toBeNull();
    expect(timer()).toBeNull();
    await tick(60000);
    expect(start).not.toHaveBeenCalled();
    expect(advance).not.toHaveBeenCalled();
    await click(button('この編成で対戦する'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(start).toHaveBeenCalledTimes(1);
    expect(timer()?.getAttribute('aria-label')).toContain('残り30秒');
  });

  it('ignores repeated lobby-entry and battle-start clicks without duplicate history or battles', async () => {
    const start = vi.spyOn(engine, 'start');
    const push = vi.spyOn(window.history, 'pushState');
    await mount();
    const gate = button('闘技場へ');
    await act(async () => { gate.click(); gate.click(); });
    expect(window.location.hash).toBe('#arena');
    expect(push).toHaveBeenCalledTimes(1);
    const begin = button('この編成で対戦する');
    await act(async () => { begin.click(); begin.click(); });
    expect(window.location.hash).toBe('#arena/battle');
    expect(start).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(2);
    expect(timer()?.getAttribute('aria-label')).toContain('残り30秒');
  });

  it('keeps workshop edits and uses its footer to open the lobby rather than start a battle', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount();
    await navigate('編成・図鑑');
    expect(window.location.hash).toBe('#team');
    expect(document.querySelectorAll('.rosterItem')).toHaveLength(12);
    await click(label('バステトの詳細'));
    await click(button('リーダーにする'));
    const edited = team();
    await click(document.querySelector<HTMLButtonElement>('footer button')!);
    expect(window.location.hash).toBe('#arena');
    expect(team()).toEqual(edited);
    expect(start).not.toHaveBeenCalled();
    await click(button('軽量戦'));
    await navigate('ホーム');
    expect(team()).toEqual(edited);
    expect(document.querySelector('.ruleTabs')).toBeNull();
    await navigate('闘技場');
    expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain('軽量戦');
    expect(team()).toEqual(edited);
  });

  it('allows an incomplete team to visit the lobby but does not allow it to fight', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount(); await navigate('編成・図鑑');
    await click(label('妖狐の詳細')); await click(button('編成から外す'));
    expect(team()).toHaveLength(4);
    const gate = document.querySelector<HTMLButtonElement>('footer button')!;
    expect(gate.disabled).toBe(false);
    await click(gate);
    expect(window.location.hash).toBe('#arena');
    expect(button('この編成で対戦する').disabled).toBe(true);
    await click(button('この編成で対戦する'));
    expect(start).not.toHaveBeenCalled();
    await navigate('編成・図鑑');
    expect(team()).toHaveLength(4);
  });

  it('restores a partial draft, its leader order, and the selected rule after remount', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount(); await navigate('闘技場'); await click(button('軽量戦'));
    await navigate('編成・図鑑');
    await click(label('妖狐の詳細')); await click(button('編成から外す'));
    await click(label('ドリュアスの詳細')); await click(button('リーダーにする'));
    const draft = team();
    expect(draft).toHaveLength(4);
    expect(draft[0]).toBe('ドリュアスの詳細');
    expect(JSON.parse(localStorage.getItem('kanshu-workshop-v1')!)).toEqual({ team: [3, 2, 4, 6], rule: 'light' });
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('test-root')!);
    await mount();
    expect(window.location.hash).toBe('#team');
    expect(team()).toEqual(draft);
    expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain('軽量戦');
    await navigate('ホーム');
    expect(team()).toEqual(draft);
    await navigate('闘技場');
    expect(button('この編成で対戦する').disabled).toBe(true);
    expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain('軽量戦');
    expect(start).not.toHaveBeenCalled();
  });

  it('preserves all three session-only saved teams across screen and battle navigation', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw Error('blocked'); });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('blocked'); });
    await mount(); await navigate('編成・図鑑');
    await click(label('編成1に保存'));
    const first = team();
    await click(label('バステトの詳細')); await click(button('リーダーにする'));
    await click(label('編成2に保存'));
    const second = team();
    await click(label('ドリュアスの詳細')); await click(button('リーダーにする'));
    await click(label('編成3に保存'));
    const third = team();
    expect(document.querySelector('.saveNotice')?.textContent).toContain('保存できません');
    expect(document.querySelector('.saveNotice')?.textContent).toContain('再読み込みするまでは呼び出せます');
    await navigate('ホーム'); await startBattle();
    await click(label('闘技場に戻る')); await click(button('中断して移動'));
    await navigate('編成・図鑑');
    for (const [index, expected] of [first, second, third].entries()) {
      expect(label(`編成${index + 1}を呼び出す`).disabled).toBe(false);
      await click(label(`編成${index + 1}を呼び出す`));
      expect(team()).toEqual(expected);
    }
  });

  it('handles ordinary browser Back and Forward without starting a battle', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount(); await navigate('編成・図鑑'); await navigate('闘技場');
    await historyMove('back');
    expect(window.location.hash).toBe('#team');
    expect(document.querySelector('.roster')).toBeTruthy();
    await historyMove('back');
    expect(window.location.hash).toBe('#home');
    expect(document.querySelector('[aria-label="ゲームホーム"]')).toBeTruthy();
    await historyMove('forward');
    expect(window.location.hash).toBe('#team');
    await historyMove('forward');
    expect(window.location.hash).toBe('#arena');
    expect(start).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it.each([
    ['#home', '#home'], ['#team', '#team'], ['#arena', '#arena'],
    ['#arena/battle', '#arena'], ['#unknown', '#home'],
  ])('normalizes fresh navigation from %s to %s without automatic battle creation', async (initial, expected) => {
    const start = vi.spyOn(engine, 'start');
    window.history.replaceState(null, '', initial);
    await mount();
    expect(window.location.hash).toBe(expected);
    expect(document.querySelector('.battleMode')).toBeNull();
    expect(timer()).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });

  it('normalizes a reloaded battle entry to the lobby instead of restoring an unfinished battle', async () => {
    const start = vi.spyOn(engine, 'start');
    await enterBattle(); await click(button('この指示でターン開始'));
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('test-root')!);
    await mount();
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.battleMode')).toBeNull();
    expect(button('この編成で対戦する')).toBeTruthy();
    expect(timer()).toBeNull();
    await tick(60000);
    expect(start).toHaveBeenCalledTimes(1);
  });
});

describe('safe battle navigation', () => {
  it.each(['button', 'Escape', 'backdrop'] as const)('preserves confirmed and pending commands and the deadline after %s cancellation', async mode => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('ぼうぎょ'));
    await click(label('妖狐の行動を選択'));
    await click(button('とくぎ')); await click(button('狐火'));
    const before = partyVitals();
    await tick(5000);
    await click(label('ホーム'));
    expect(dialog()).toBeTruthy();
    expect(window.location.hash).toBe('#arena/battle');
    await tick(5000);
    if (mode === 'button') await click(button('対戦を続ける'));
    else if (mode === 'Escape') await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    else await click(document.querySelector<HTMLElement>('.leaveOverlay')!);
    expect(dialog()).toBeNull();
    expect(document.querySelector('.targetButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(document.querySelector('.commander.active')?.getAttribute('aria-label')).toBe('妖狐の行動を選択');
    expect(partyVitals()).toEqual(before);
    expect(timer()?.getAttribute('aria-label')).toContain('残り20秒');
    await tick(20000);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1][0]).toEqual({ key: 'a0', skill: engine.DEFEND, target: undefined });
  });

  it('continues the command clock while the leave dialog remains open', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle(); await tick(28000);
    await click(label('闘技場に戻る'));
    await tick(2000);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    expect(dialog()).toBeTruthy();
    await click(button('対戦を続ける'));
    expect(dialog()).toBeNull();
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    await click(button('演出をスキップ'));
    expect(timer()?.getAttribute('aria-label')).toContain('残り30秒');
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ホーム', '#home'], ['闘技場に戻る', '#arena'],
  ])('confirms a command-phase exit to %s and cancels every old deadline', async (destination, route) => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle(); await tick(28000);
    await click(label(destination)); await click(button('中断して移動'));
    expect(window.location.hash).toBe(route);
    expect(dialog()).toBeNull(); expect(timer()).toBeNull();
    expect(document.querySelector('.battleMode')).toBeNull();
    await tick(60000);
    await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(advance).not.toHaveBeenCalled();
    await startBattle();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    await tick(29800);
    expect(advance).not.toHaveBeenCalled();
    await tick(200);
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('keeps playback and its final HP/MP intact when leaving is canceled', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle(); await click(button('とくぎ')); await click(button('炎嵐'));
    await click(button('この指示でターン開始'));
    const expected: engine.State = advance.mock.results[0].value.state;
    await tick(100);
    await click(label('ホーム')); await tick(800); await click(button('対戦を続ける'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    await click(button('演出をスキップ'));
    for (const unit of expected.allies) {
      const actor = label(`${unit.monster.name}の行動を選択`);
      expect(actor.querySelector('.commanderHp')?.textContent).toBe(`HP ${unit.hp}/${unit.monster.hp}`);
      expect(actor.querySelector('.commanderMp')?.textContent).toBe(`MP ${unit.mp}/${unit.monster.mp}`);
    }
    expect(advance).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.partyArea')).toBeNull();
    expect(timer()?.getAttribute('aria-label')).toContain('残り30秒');
  });

  it.each([100, 800, 1600])('discards playback safely after %i ms and isolates the next battle', async elapsed => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle(); await click(button('この指示でターン開始')); await tick(elapsed);
    await click(label('闘技場に戻る')); await click(button('中断して移動'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.battleMode')).toBeNull();
    expect(document.querySelector('.partyArea')).toBeNull();
    await startBattle();
    const fresh = partyVitals();
    await tick(20000);
    expect(partyVitals()).toEqual(fresh);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('.playingPanel')).toBeNull();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('guards browser Back, preserves the battle after Cancel, and does not revive it on Forward after confirmation', async () => {
    const start = vi.spyOn(engine, 'start');
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle(); await tick(5000);
    await historyMove('back');
    expect(dialog()).toBeTruthy();
    expect(document.querySelector('.battleMode')).toBeTruthy();
    await click(button('対戦を続ける'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(timer()?.getAttribute('aria-label')).toContain('残り25秒');
    await historyMove('back');
    expect(dialog()).toBeTruthy();
    await click(button('中断して移動'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.battleMode')).toBeNull();
    await historyMove('forward');
    expect(window.location.hash).not.toBe('#arena/battle');
    expect(document.querySelector('.battleMode')).toBeNull();
    expect(timer()).toBeNull();
    await tick(60000);
    expect(start).toHaveBeenCalledTimes(1);
    expect(advance).not.toHaveBeenCalled();
  });

  it('uses native unload protection only for an active battle, including playback', async () => {
    await mount(); expect(unloadingIsBlocked()).toBe(false);
    await navigate('編成・図鑑'); expect(unloadingIsBlocked()).toBe(false);
    await navigate('闘技場'); expect(unloadingIsBlocked()).toBe(false);
    await startBattle(); expect(unloadingIsBlocked()).toBe(true);
    await click(button('この指示でターン開始')); expect(unloadingIsBlocked()).toBe(true);
    await click(label('ホーム')); await click(button('中断して移動'));
    expect(unloadingIsBlocked()).toBe(false);
    await startBattle(); await finishBattle();
    expect(unloadingIsBlocked()).toBe(false);
    await click(button('闘技場に戻る → 次の相手'));
    expect(dialog()).toBeNull();
    expect(window.location.hash).toBe('#arena');
    expect(unloadingIsBlocked()).toBe(false);
  });

  it('keeps rematches in arena and advances to the next opponent exactly once', async () => {
    const start = vi.spyOn(engine, 'start');
    await enterBattle();
    const original = structuredClone(start.mock.calls[0]);
    await finishBattle(); await click(button('同じ編成ですぐ再戦'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(start.mock.calls[1]).toEqual(original);
    await finishBattle();
    const next = button('闘技場に戻る → 次の相手');
    await act(async () => { next.click(); next.click(); });
    expect(window.location.hash).toBe('#arena');
    expect(document.body.textContent).toContain('第2戦');
    await navigate('ホーム'); await navigate('闘技場');
    expect(document.body.textContent).toContain('第2戦');
    await startBattle();
    expect(start.mock.calls[2][2]).toBe(original[2]! + 1);
  });
});
