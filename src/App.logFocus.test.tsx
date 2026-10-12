// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const escape = async () => { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))); };
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="root"></div>'; document.body.style.overflow = 'auto';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('battle log app entry points', () => {
  it('returns to live battle and post-match openers, preserving the saved team', async () => {
    await act(async () => root.render(<App />));
    await click(document.querySelector<HTMLButtonElement>('[aria-label="闘技場"]')!);
    await click(button('この編成で対戦する'));
    const saved = localStorage.getItem('kanshu-workshop-v1');
    const liveLog = button('ログ'); await click(liveLog);
    expect(document.activeElement).toBe(document.querySelector('.logModal .close'));
    await escape(); expect(document.activeElement).toBe(liveLog);
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
      await click(button('この指示でターン開始')); await click(button('演出をスキップ'));
    }
    expect(window.location.hash).toBe('#arena');
    const details = document.querySelector<HTMLDetailsElement>('.resultDetails')!;
    await click(details.querySelector('summary')!);
    const resultLog = button('全ターンのログを見る'); await click(resultLog);
    expect(document.activeElement).toBe(document.querySelector('.logModal .close'));
    await escape(); expect(document.activeElement).toBe(resultLog);
    expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
  });
  it('yields to the leave confirmation on browser navigation and resumes on cancellation', async () => {
    await act(async () => root.render(<App />));
    await click(document.querySelector<HTMLButtonElement>('[aria-label="闘技場"]')!);
    await click(button('この編成で対戦する')); await click(button('ログ'));
    await act(async () => { window.location.hash = '#catalog'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(document.querySelector('.logModal')).toBeNull();
    expect(document.activeElement?.textContent).toBe('対戦を続ける');
    await escape();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.logModal .close'));
    await escape();
    expect(document.querySelector('.logModal')).toBeNull();
    expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
  });
});
