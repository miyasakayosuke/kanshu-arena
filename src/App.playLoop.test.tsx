// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { resultFacts, battleFactEvidenceLines } from './battleInsights';

let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function tick(milliseconds: number) { await act(async () => vi.advanceTimersByTime(milliseconds)); }
async function mount() { await act(async () => root.render(<App />)); }
async function openArena() { await click(label('闘技場')); }
async function begin() { await openArena(); await click(button('この編成で対戦する')); }
async function finish(skip = true) {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始'));
    if (skip) await click(button('演出をスキップ'));
    else await tick(20000);
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
const facts = () => [...document.querySelectorAll('.battleFindings>ul>li>p')].map(element => element.textContent);
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('build, battle, learn, rebuild loop', () => {
  it('renders only actual facts with inspectable full-turn evidence, identical after skip and natural replay', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await mount(); await begin(); await finish();
    const firstState = advance.mock.results.at(-1)!.value.state as engine.State;
    const firstFacts = facts();
    expect(firstFacts.length).toBeGreaterThanOrEqual(2); expect(firstFacts.length).toBeLessThanOrEqual(3);
    expect(firstFacts).toEqual(resultFacts(firstState).map(fact => fact.text));
    expect(document.querySelector('.battleStage')).toBeNull();
    expect(document.querySelector('[role=timer]')).toBeNull();
    const detail = document.querySelector<HTMLDetailsElement>('.battleFindings details')!;
    await click(detail.querySelector('summary')!);
    expect(detail.open).toBe(true);
    expect([...detail.querySelectorAll('li')].map(element => element.textContent)).toEqual(battleFactEvidenceLines(firstState, resultFacts(firstState)[0]));
    await click(button('全ターンのログを見る'));
    const ledger = document.querySelector<HTMLDetailsElement>('.historyLedger')!;
    await click(ledger.querySelector('summary')!);
    expect(ledger.querySelectorAll(':scope > details')).toHaveLength(firstState.history!.length);
    expect(ledger.textContent).toContain('確定した指示'); expect(ledger.textContent).toContain('実際の出来事');
    await click(label('戦闘ログを閉じる'));
    await click(button('同じ編成ですぐ再戦')); await finish(false);
    expect(facts()).toEqual(firstFacts);
    const replay = advance.mock.results.at(-1)!.value.state as engine.State;
    expect(replay).toEqual(firstState);
  });

  it('retains opponent, seed and rule through an atomic roster swap and resets the next battle', async () => {
    const start = vi.spyOn(engine, 'start'); const advance = vi.spyOn(engine, 'advanceWithEvents');
    await mount(); await begin(); const original = structuredClone(start.mock.calls[0]);
    await finish(); await click(button('編成を見直して再戦'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ'));
    await click(button('トロルに入れ替える'));
    expect(document.querySelector('.practiceNotice')).toBeTruthy();
    await openArena(); await click(button('この編成で同じ相手に再戦'));
    expect(start.mock.calls[1][0]).toEqual([1,2,3,4,6]);
    expect(start.mock.calls[1].slice(1)).toEqual(original.slice(1));
    expect(start.mock.results[1].value.history).toEqual([]);
    expect(document.querySelector('[role=timer]')?.textContent).toContain('30');
    const resolved = advance.mock.calls.length;
    await tick(1000); expect(advance.mock.calls).toHaveLength(resolved);
    expect([...document.querySelectorAll('.commanderMp')].map(element => element.textContent)).toEqual(start.mock.results[1].value.allies.map((unit: engine.Unit) => `MP ${unit.mp}/${unit.mp}`));
  });

  it('states when changing a rule cancels controlled retry', async () => {
    await mount(); await begin(); await finish(); await click(button('編成を見直して再戦'));
    const ruleDisclosure = document.querySelector<HTMLDetailsElement>('.ruleDisclosure')!;
    await click(ruleDisclosure.querySelector('summary')!); await click(button('軽量戦'));
    expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(document.querySelector('.teamNotice')?.textContent).toContain('同じ相手・同じシードの再戦を解除');
    await openArena(); expect(document.querySelector('.transitionNotice')?.textContent).toContain('再戦を解除');
  });

  it('also explains retry invalidation when a saved team loads another rule', async () => {
    localStorage.setItem('kanshu-team-slots-v1', JSON.stringify([{ team: [0,2,3,4,6], rule: 'light' }, null, null]));
    await mount(); await begin(); await finish(); await click(button('編成を見直して再戦'));
    const saved = document.querySelector<HTMLDetailsElement>('.savedTeams')!;
    await click(saved.querySelector('summary')!); await click(label('編成1を呼び出す'));
    expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(document.querySelector('.teamNotice')?.textContent).toContain('同じ相手・同じシードの再戦を解除');
    await openArena(); expect(document.querySelector('.transitionNotice')?.textContent).toContain('再戦を解除');
    expect(document.querySelector('.ruleTabs [aria-pressed=true]')?.textContent).toContain('軽量戦');
  });

  it('keeps every shared character profile read-only and preserves slot search and scroll on dismissal', async () => {
    await mount(); await click(label('妖狐の詳細'));
    expect(document.querySelector('.profileModal')?.textContent).toContain('閲覧のみ');
    expect(button('編成から外す')).toBeUndefined(); expect(button('リーダーにする')).toBeUndefined();
    await click(label('詳細を閉じる')); await click(label('編成'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ'));
    const list = document.querySelector<HTMLElement>('.candidateList')!; list.scrollTop = 135;
    const original = JSON.parse(localStorage.getItem('kanshu-team')!);
    await click(label('比較中のトロルの詳細'));
    expect(button('編成から外す')).toBeUndefined();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.querySelector('.candidatePanel')).toBeTruthy();
    expect(label('トロルを候補に選ぶ').getAttribute('aria-pressed')).toBe('true');
    expect(list.scrollTop).toBe(135);
    await click(button('キャンセル'));
    expect(JSON.parse(localStorage.getItem('kanshu-team')!)).toEqual(original);
    expect(document.querySelector('.candidatePanel')).toBeNull();
  });
});
