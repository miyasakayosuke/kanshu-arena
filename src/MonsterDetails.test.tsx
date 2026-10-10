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
async function mount(id = 0) { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); }
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

describe('family monster profiles', () => {
  it('explains Ratatoskr target-free three or four hits and its opening-party condition', async () => {
    await mount(13);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')!.textContent).toBe('獣系');
    expect(profile.textContent).toContain('敵ランダム3回（対象指定なし）');
    expect(profile.textContent).toContain('開戦時の5体すべてが獣系なら+1回（合計4回）');
    expect(profile.textContent).toContain('戦闘不能でも条件は変わらない');
    expect(profile.querySelector('.leaderBanner')!.textContent).toContain('味方全員の素早さ +8%');
    expect(profile.querySelectorAll('.skill')).toHaveLength(2);
    expect(profile.textContent).toContain('先制攻撃');
    expect(profile.textContent).not.toContain('未知の役割');
  });

  it('explains Genbu eligibility, duration, strongest-only defense, poison bypass and removal timing', async () => {
    await mount(14);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')!.textContent).toBe('自然系');
    for (const phrase of ['自然系だけ 最大HP +15%', '先頭以外でも', '自然障壁を2ターン', '直接ダメージを10%軽減', '強い軽減だけ', '毒の継続ダメージは軽減しません', '破城の拳・冥府の断罪は命中前', '破縛の連牙は各命中後', '解除後の再付与はなく']) {
      expect(profile.textContent).toContain(phrase);
    }
    expect(profile.querySelectorAll('.skill')).toHaveLength(3);
    expect(profile.textContent).toContain('MP 22 · アンカー · 敵全体');
    expect(profile.textContent).toContain('MP 20 · 通常順 · 味方1体を回復 · 回復70');
    expect(profile.textContent).not.toContain('未知の役割');
    expect(document.activeElement).toBe(closeButton());
    await tab(true);
    expect(document.activeElement).toBe(returnButton());
  });

  it('keeps pre-hit breakers distinct from Fenrir post-hit removal', async () => {
    await mount(8);
    expect(document.querySelector('.profileModal')!.textContent).toContain('命中前に防御・守護・自然障壁を解除して攻撃');
    await act(async () => root.render(<MonsterDetails id={12} onClose={() => root.render(null)} />));
    expect(document.querySelector('.profileModal')!.textContent).toContain('各命中の後に守り（防御・守護）・群気・自然障壁を解除');
    expect(document.querySelector('.profileModal')!.textContent).toContain('自然障壁だけなら10%軽減');
  });
});
