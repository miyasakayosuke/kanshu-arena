// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const textButton = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const mount = async () => { await act(async () => root.render(<App />)); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const catalog = () => document.querySelector('.catalogScreen');
const list = () => document.querySelector<HTMLElement>('[aria-label="図鑑一覧"]')!;
const activePage = () => document.querySelector('.mainNav [aria-current="page"]')?.getAttribute('aria-label');
async function history(direction: 'back' | 'forward') {
  await act(async () => { window.history[direction](); await Promise.resolve(); });
}
async function select(name: string, value: string) {
  const node = document.querySelector<HTMLSelectElement>(`select[aria-label="${name}"]`)!;
  await act(async () => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function search(value: string) {
  const node = document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function catalogHash() {
  await act(async () => {
    window.history.pushState(null, '', '#catalog');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('first-class read-only footer catalog', () => {
  it('opens all 37 monsters directly, marks the current footer, and does not edit or fight', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount();
    const saved = localStorage.getItem('kanshu-workshop-v1');
    expect([...document.querySelectorAll('.mainNav button')].map(node => node.getAttribute('aria-label'))).toEqual(['ホーム', '編成', '図鑑', '闘技場']);
    expect(document.querySelector('.gameHome .browseBestiary')).toBeNull();
    const push = vi.spyOn(window.history, 'pushState');
    const button = label('図鑑'); button.focus();
    await act(async () => { button.click(); button.click(); });
    expect(window.location.hash).toBe('#catalog'); expect(activePage()).toBe('図鑑');
    expect(document.activeElement).toBe(document.querySelector('.catalogScreen h2'));
    expect(document.querySelectorAll('.rosterItem')).toHaveLength(37);
    expect(document.querySelector('.candidateSelect')).toBeNull();
    expect(document.querySelector('.confirmReplacement')).toBeNull();
    expect(document.querySelector('.screenAction')).toBeNull();
    expect(document.querySelector('.builderSlots')).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
    expect(start).not.toHaveBeenCalled();
  });

  it('restores search, sort, all filters, disclosure and list position across footer and Back/Forward navigation', async () => {
    await mount(); await click(label('図鑑'));
    await search('竜'); await select('並べ替え', 'speed');
    await click(document.querySelector('.filterDisclosure > summary')!);
    await select('系統で絞り込み', 'dragon');
    await select('リーダー効果で絞り込み', 'atk');
    await select('コストで絞り込み', '3');
    await click(textButton('すべて'));
    await act(async () => { list().scrollTop = 121; list().dispatchEvent(new Event('scroll')); });
    const names = [...list().querySelectorAll('.rosterText strong')].map(node => node.textContent);
    await click(label('闘技場')); expect(activePage()).toBe('闘技場');
    await history('back');
    expect(window.location.hash).toBe('#catalog'); expect(activePage()).toBe('図鑑');
    expect(document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!.value).toBe('竜');
    expect(document.querySelector<HTMLSelectElement>('[aria-label="並べ替え"]')!.value).toBe('speed');
    expect(document.querySelector<HTMLSelectElement>('[aria-label="系統で絞り込み"]')!.value).toBe('dragon');
    expect(document.querySelector<HTMLSelectElement>('[aria-label="リーダー効果で絞り込み"]')!.value).toBe('atk');
    expect(document.querySelector<HTMLSelectElement>('[aria-label="コストで絞り込み"]')!.value).toBe('3');
    expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')!.open).toBe(true);
    expect(list().scrollTop).toBe(121);
    expect([...list().querySelectorAll('.rosterText strong')].map(node => node.textContent)).toEqual(names);
    await history('forward'); expect(activePage()).toBe('闘技場');
    await click(label('ホーム')); await click(label('図鑑'));
    expect(document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!.value).toBe('竜');
    await click(label('絞り込みをリセット'));
    expect(list().querySelectorAll('.rosterItem')).toHaveLength(37);
    expect(document.querySelector<HTMLSelectElement>('[aria-label="並べ替え"]')!.value).toBe('id');
  });

  it('shares the existing roster filter semantics and never leaks a replacement into catalog browsing', async () => {
    await mount(); await click(label('編成'));
    const saved = localStorage.getItem('kanshu-workshop-v1');
    await click(label('2枠・バステトを入れ替える'));
    await click(label('トロルを候補に選ぶ'));
    expect(document.querySelector('.confirmReplacement')).toBeTruthy();
    await click(label('図鑑'));
    expect(document.querySelector('.confirmReplacement')).toBeNull();
    expect(document.querySelector('.candidateSelect')).toBeNull();
    await click(document.querySelector('.filterDisclosure > summary')!);
    await click(textButton('毒解除')); await select('系統で絞り込み', 'extraordinary');
    expect(list().querySelectorAll('.rosterItem')).toHaveLength(1);
    expect(list().textContent).toContain('ヤヌス');
    await click(label('ヤヌスの詳細')); await click(label('詳細を閉じる'));
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
    await click(label('編成'));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
    await click(document.querySelector<HTMLButtonElement>('.browseBestiary')!);
    expect(window.location.hash).toBe('#catalog');
    expect(document.querySelector('.builderSlots')).toBeNull();
    expect(list().textContent).toContain('ヤヌス');
  });

  it('supports a fresh or reloaded #catalog route and closes details on history departure', async () => {
    window.history.replaceState(null, '', '#catalog');
    await mount(); expect(catalog()).toBeTruthy(); expect(activePage()).toBe('図鑑');
    await click(label('ホーム')); await click(label('図鑑'));
    await click(label('妖狐の詳細')); expect(document.querySelector('.profileModal')).toBeTruthy();
    await history('back');
    expect(window.location.hash).toBe('#home'); expect(document.querySelector('.profileModal')).toBeNull();
    await history('forward'); expect(window.location.hash).toBe('#catalog'); expect(catalog()).toBeTruthy();
    await act(async () => root.unmount()); root = createRoot(document.getElementById('test-root')!);
    await mount(); expect(catalog()).toBeTruthy(); expect(activePage()).toBe('図鑑');
    expect(document.querySelector('.battleMode')).toBeNull();
  });
});

describe('catalog navigation during a match', () => {
  it.each([false, true])('keeps the existing battle-only navigation and protects a catalog hash during playback=%s', async playing => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await mount(); await click(label('闘技場')); await click(textButton('この編成で対戦する'));
    await click(textButton('ぼうぎょ'));
    if (playing) await click(textButton('この指示でターン開始'));
    else { await click(label('妖狐の行動を選択')); await click(textButton('とくぎ')); await click(textButton('狐火')); }
    await tick(500);
    expect(document.querySelector('.mainNav')).toBeNull();
    const ordered = document.querySelectorAll('.commander.ordered').length;
    await catalogHash();
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(catalog()).toBeNull();
    await click(textButton('対戦を続ける'));
    expect(document.querySelector('.battleMode')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(ordered);
    if (playing) expect(document.querySelector('.playingPanel')).toBeTruthy();
    else expect(document.querySelector('.targetButtons')).toBeTruthy();
    await catalogHash(); await click(textButton('中断して移動'));
    expect(window.location.hash).toBe('#catalog'); expect(activePage()).toBe('図鑑');
    expect(document.querySelector('.battleMode')).toBeNull();
    const count = advance.mock.calls.length;
    await tick(60000); expect(advance).toHaveBeenCalledTimes(count);
    await click(label('闘技場')); await click(textButton('この編成で対戦する'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('残り30秒');
  });
});
