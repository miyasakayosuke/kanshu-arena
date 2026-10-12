// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HomeScreen, { ArenaLobby } from './HomeScreen';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });
const base = { team: [0, 2, 3, 4, 6], rule: 'standard' as const, onFocus: vi.fn(), onTeam: vi.fn(), practice: false };
it('keeps the unique family trial entry without duplicating the footer destinations', async () => {
  const onFamilyTrial = vi.fn();
  await act(async () => root.render(<HomeScreen {...base} onFamilyTrial={onFamilyTrial} />));
  const trial = document.querySelector<HTMLButtonElement>('button[aria-label="系統パーティを試す"]')!;
  expect(trial.textContent).toContain('保存枠はそのまま');
  await act(async () => trial.click());
  expect(onFamilyTrial).toHaveBeenCalledOnce();
  expect(document.querySelectorAll('.partySummary [data-monster-id]')).toHaveLength(5);
  expect([...document.querySelectorAll('.homeDestinations button')].map(button => button.textContent)).toHaveLength(1);
  expect(document.querySelector('.arenaGate')).toBeNull();
  expect(document.querySelector('.gameHome')?.textContent).not.toMatch(/闘技場へ|編成へ/);
  expect(document.querySelector('a[href$="credits.html"]')).toBeTruthy();
});
it.each([
  ['standard', false, '7系統の純5体からランダム'],
  ['light', false, '自然系のみ'],
  ['standard', true, '同じ相手との再戦'],
] as const)('describes the actual %s opponent pool, practice=%s', async (rule, practice, expected) => {
  const onFamilyTrial = vi.fn();
  await act(async () => root.render(<ArenaLobby {...base} rule={rule} practice={practice} round={0} notice="" onRule={vi.fn()} onLeavePractice={vi.fn()} onFamilyTrial={onFamilyTrial} />));
  expect(document.querySelector('.ruleHint')?.textContent).toContain(expected);
  if (rule === 'light') {
    expect(document.querySelector('.ruleHint')?.textContent).toContain('ほかの系統とは標準戦');
    expect(document.querySelector('.ruleHint')?.textContent).not.toContain('ランダム');
  }
  await act(async () => document.querySelector<HTMLButtonElement>('.familyTrialGate')!.click());
  expect(onFamilyTrial).toHaveBeenCalledOnce();
});
