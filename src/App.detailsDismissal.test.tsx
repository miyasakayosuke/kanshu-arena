// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

let root: Root;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
async function escape(target: EventTarget = document.activeElement!, prevented = false) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  if (prevented) event.preventDefault();
  await act(async () => target.dispatchEvent(event));
  return event;
}
async function mount() { await act(async () => root.render(<App />)); }
async function select(label: string, value: string) {
  const node = document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
  await act(async () => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function openCatalog() {
  await click(label('図鑑'));
  const input = document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'ケツァルコアトル');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click(document.querySelector<HTMLElement>('.filterDisclosure > summary')!);
  await select('系統で絞り込み', 'dragon'); await select('並べ替え', 'speed');
}

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>'; document.body.style.overflow = 'auto';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.style.overflow = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

describe('topmost monster-details dismissal in the real App', () => {
  it.each(['focused-control', 'dialog-body', 'window-fallback', 'close-button', 'backdrop'])('returns to the intact catalog via %s, including repeated reopening', async mode => {
    await mount(); await openCatalog();
    const catalog = document.querySelector<HTMLElement>('.candidatePanel')!;
    const list = document.querySelector<HTMLElement>('.candidateList')!;
    const opener = catalog.querySelector<HTMLButtonElement>('button[aria-label="ケツァルコアトルの詳細"]')!;
    const saved = localStorage.getItem('kanshu-workshop-v1');
    const focus = vi.spyOn(opener, 'focus');
    list.scrollTop = 137; catalog.scrollTop = 223;
    for (let repeat = 0; repeat < 3; repeat++) {
      opener.focus(); await click(opener);
      expect(document.querySelector('.profileModal')).toBeTruthy();
      if (mode === 'close-button') await click(label('詳細を閉じる'));
      else if (mode === 'backdrop') await click(document.querySelector<HTMLElement>('.overlay')!);
      else {
        const target = mode === 'window-fallback' ? window : mode === 'dialog-body' ? document.querySelector('.profilePanel:not([hidden])')! : document.activeElement!;
        const event = await escape(target);
        expect(event.defaultPrevented).toBe(true);
      }
      expect(document.querySelector('.profileModal')).toBeNull();
      expect(document.querySelector('.candidatePanel')).toBe(catalog);
      expect(document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!.value).toBe('ケツァルコアトル');
      expect(document.querySelector<HTMLSelectElement>('select[aria-label="系統で絞り込み"]')!.value).toBe('dragon');
      expect(document.querySelector<HTMLSelectElement>('select[aria-label="並べ替え"]')!.value).toBe('speed');
      expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')!.open).toBe(true);
      expect(list.scrollTop).toBe(137); expect(catalog.scrollTop).toBe(223);
      expect(document.activeElement).toBe(opener); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(document.body.style.overflow).toBe('auto');
      expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved); expect(window.location.hash).toBe('#catalog');
    }
    await escape();
    expect(document.querySelector('.candidatePanel')).toBe(catalog);
    expect(window.location.hash).toBe('#catalog');
    expect(document.activeElement).toBe(opener);
  });

  it('preserves a selected replacement and returns focus before a second Escape cancels it', async () => {
    await mount(); await click(label('編成'));
    await click(document.querySelectorAll<HTMLElement>('.builderSlots .teamUnit')[1]);
    await click(label('トロルを候補に選ぶ'));
    const saved = localStorage.getItem('kanshu-workshop-v1');
    const opener = label('比較中のトロルの詳細'); opener.focus(); await click(opener);
    await escape();
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.querySelector('.confirmReplacement')?.textContent).toContain('トロルに入れ替える');
    expect(document.activeElement).toBe(opener); expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
    await escape(); expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.activeElement).toBe(document.querySelectorAll('.builderSlots .teamUnit')[1]);
  });

  it('respects already handled Escape events in the App fallback', async () => {
    await mount(); await click(label('妖狐の詳細'));
    await escape(window, true); expect(document.querySelector('.profileModal')).toBeTruthy();
    await escape(window); expect(document.querySelector('.profileModal')).toBeNull();
  });

  it('retains ordinary target-selection Escape behavior unless another handler owns the event', async () => {
    await mount(); await click(label('闘技場')); await click(button('この編成で対戦する'));
    await click(button('たたかう'));
    expect(document.querySelector('.targetButtons')).toBeTruthy();
    await escape(window, true);
    expect(document.querySelector('.targetButtons')).toBeTruthy();
    await escape(window); expect(document.querySelector('.targetButtons')).toBeNull();
  });
});
