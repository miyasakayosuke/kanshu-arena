// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import BattleResult from './BattleResult';
import { start } from './engine';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function mount() { await act(async () => root.render(<App />)); }
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

describe('functional tab copy without decorative title bands', () => {
  it('keeps app identity accessible while every non-battle tab opens without the brand header', async () => {
    await mount();
    for (const name of ['ホーム', '図鑑', '編成', '闘技場']) {
      await click(label(name));
      expect(document.querySelector('.app > header')).toBeNull();
      expect(document.querySelector('.app > h1.srOnly')?.textContent).toBe('環獣のアリーナ');
      expect(document.querySelector('.brandMark, .previewBadge')).toBeNull();
      expect(document.body.textContent).not.toContain('KANSHU ARENA · PLAYTEST');
      expect(document.querySelector('.mainNav [aria-current="page"]')?.getAttribute('aria-label')).toBe(name);
    }
    await click(label('図鑑'));
    expect(document.activeElement).toBe(document.querySelector('.catalogAccessibleTitle'));
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(37);
  });

  it('removes workshop slogans while preserving slot context, selection focus, details, and cancellation', async () => {
    await mount(); await click(label('編成'));
    expect(document.querySelector('main[aria-label="編成"] h2')?.textContent).toBe('チーム編成');
    expect(document.querySelector('.teamBuilder .intro, .teamBuilder .eyebrow')).toBeNull();
    expect(document.querySelector('.teamBuilder')?.textContent).not.toMatch(/変えたい枠を選んで|先頭がリーダー。枠を選ぶ|四系統を集め、|毒を残して待つか|相手の次の一手を、/);
    expect(document.querySelector('.partyCard')?.textContent).toContain('COST 15/17');
    const saved = localStorage.getItem('kanshu-workshop-v1');
    const slot = label('2枠・バステトを入れ替える');
    await click(slot);
    expect(document.querySelector('#candidate-heading')?.textContent).toBe('2枠の入れ替え');
    expect(document.activeElement).toBe(document.querySelector('#candidate-heading'));
    expect(document.querySelector('.candidatePanel .eyebrow')).toBeNull();
    await click(label('トロルを候補に選ぶ'));
    expect(document.querySelector('.confirmReplacement')).toBeTruthy();
    expect(document.querySelector('.candidatePanel')?.textContent).toContain('リーダー補正前');
    await click(label('比較中のトロルの詳細'));
    expect(document.querySelector('.profileModal')).toBeTruthy();
    await click(label('詳細を閉じる'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.activeElement).toBe(slot);
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
  });

  it('keeps incomplete-team feedback after the editor title is removed', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [1,2,3,4], rule: 'standard' }));
    await mount(); await click(label('編成'));
    expect(document.querySelector('.partyCard')?.textContent).toContain('あと1体を追加してください');
    await click(label('闘技場'));
    expect(button('この編成で対戦する').disabled).toBe(true);
    expect(document.querySelector('.entryStatus')?.textContent).toContain('あと1体必要');
  });

  it('keeps battle navigation, clock, HP/MP and leave confirmation with only the functional header action', async () => {
    await mount(); await click(label('闘技場')); await click(button('この編成で対戦する'));
    expect(document.querySelectorAll('.battleNavigation button')).toHaveLength(1);
    expect(document.querySelector('.battleNavigation .brandMark, .battleNavigation h1')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('残り30秒');
    expect(document.querySelectorAll('.commanderHp')).toHaveLength(5);
    expect(document.querySelectorAll('.commanderMp')).toHaveLength(5);
    await click(button('作戦'));
    expect(document.querySelector('.tacticsModal .eyebrow')).toBeNull();
    expect(document.querySelector('.tacticsModal')?.textContent).toContain('確認中も入力時間は進みます');
    await click(label('作戦情報を閉じる'));
    await click(label('ホーム'));
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    await click(button('対戦を続ける'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('.battleNavigation')).toBeTruthy();
  });

  it.each(['win', 'lose', 'draw'] as const)('keeps compact %s metrics and expandable records without terminal choices', async winner => {
    const battle = { ...start([1,2,3,4,6], [1,2,3,4,6]), winner };
    await act(async () => root.render(<BattleResult battle={battle} onLog={() => {}} />));
    expect(document.querySelector('.result h2')?.textContent).toContain(winner === 'win' ? 'VICTORY' : winner === 'lose' ? 'DEFEAT' : 'DRAW');
    expect(document.querySelector('.result .eyebrow, .resultPrompt')).toBeNull();
    expect(document.querySelector('.resultMetrics')).toBeTruthy();
    expect(document.querySelector<HTMLDetailsElement>('.resultDetails')?.open).toBe(false);
    expect(document.querySelector('.retryContract, .rematchActions')).toBeNull();
    expect(document.querySelectorAll('.result button')).toHaveLength(1);
  });
});
