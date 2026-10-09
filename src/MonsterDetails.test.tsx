// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonsterDetails from './MonsterDetails';

let root: Root;
let opener: HTMLButtonElement;
const closeButton = () => document.querySelector<HTMLButtonElement>('.profileModal .close')!;
const summary = () => document.querySelector<HTMLElement>('.profileBackground > summary')!;
const returnButton = () => document.querySelector<HTMLButtonElement>('.closeProfile')!;
async function mount() { await act(async () => root.render(<MonsterDetails id={0} onClose={() => root.render(null)} />)); }
async function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  await act(async () => document.activeElement!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
}

beforeEach(() => {
  document.body.innerHTML = '<button id="opener">詳細を開く</button><div id="test-root"></div><button>背景の操作</button>';
  document.body.style.overflow = 'auto';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  opener = document.getElementById('opener') as HTMLButtonElement;
  opener.focus();
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('read-only monster profile keyboard focus', () => {
  it('cycles Tab and Shift+Tab through Close, the disclosure summary, and Return', async () => {
    await mount();
    expect(document.activeElement).toBe(closeButton());
    await tab(); expect(document.activeElement).toBe(summary());
    await tab(); expect(document.activeElement).toBe(returnButton());
    await tab(); expect(document.activeElement).toBe(closeButton());
    await tab(true); expect(document.activeElement).toBe(returnButton());
    await tab(true); expect(document.activeElement).toBe(summary());
    await tab(true); expect(document.activeElement).toBe(closeButton());
  });

  it('includes disclosure descendants only while open, retaining the closed summary', async () => {
    await mount();
    const details = document.querySelector<HTMLDetailsElement>('.profileBackground')!;
    const inside = document.createElement('button');
    inside.textContent = '展開後の操作';
    details.append(inside);
    summary().focus();
    await tab(); expect(document.activeElement).toBe(returnButton());
    await act(async () => summary().click());
    expect(details.open).toBe(true);
    summary().focus();
    await tab(); expect(document.activeElement).toBe(inside);
    await tab(); expect(document.activeElement).toBe(returnButton());
    await tab(true); expect(document.activeElement).toBe(inside);
    await act(async () => summary().click());
    expect(details.open).toBe(false);
    returnButton().focus();
    await tab(true); expect(document.activeElement).toBe(summary());
  });

  it('restores the opener and its prior body scrolling when closed', async () => {
    await mount();
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () => returnButton().click());
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('auto');
  });
});
