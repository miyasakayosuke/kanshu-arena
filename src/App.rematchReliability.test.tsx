// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as trials from './familyTrials';
import { initialTeam, isValidTeam, rules, type RuleId, type TeamSlot } from './strategy';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const battleStarts = (spy: MockInstance<typeof engine.start>) => spy.mock.calls.flatMap((args, index) =>
  args[1].length ? [{ args, state: spy.mock.results[index].value as engine.State }] : []);
const workshopTeam = () => [...document.querySelectorAll('.builderSlots [data-monster-id]')].map(node => Number(node.getAttribute('data-monster-id')));
const savedTeams: TeamSlot[] = [
  { team: [0, 2, 3, 4, 6], rule: 'standard' },
  { team: [14, 3, 6, 9, 10], rule: 'light' },
  { team: [29, 1, 8, 30, 31], rule: 'standard' },
];
const slotsKey = 'kanshu-team-slots-v1';
async function historyMove(direction: 'back' | 'forward') {
  await act(async () => { window.history[direction](); await Promise.resolve(); });
}
async function mountAndBegin() {
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
}
async function finish() {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始')); await click(button('演出をスキップ'));
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
async function retry() {
  await click(label('闘技場')); await click(button('この編成で同じ相手に再戦'));
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('controlled rematch reliability', () => {
  it('does not leave a stale practice request after repeated rebuild clicks', async () => {
    const setup = vi.spyOn(engine, 'start');
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mountAndBegin(); await finish();
    const rebuild = button('編成を見直して再戦');
    await act(async () => { rebuild.click(); rebuild.click(); });
    expect(window.location.hash).toBe('#team');
    await retry();
    expect(battleStarts(setup)[1].args).toEqual(battleStarts(setup)[0].args);
    await finish(); await click(button('闘技場に戻る → 次の相手'));
    expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(document.body.textContent).toContain('第2戦');
    vi.mocked(Math.random).mockReturnValue(2 / 0x100000000);
    await click(button('この編成で対戦する'));
    expect(battleStarts(setup)[2].args[2]).toBe(2);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it.each<RuleId>(['standard', 'light'])('retries an explicitly edited own party under %s with unchanged enemy, seed, options and three saved slots', async rule => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: initialTeam, rule }));
    const saved = JSON.stringify(savedTeams);
    localStorage.setItem(slotsKey, saved);
    const setup = vi.spyOn(engine, 'start');
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mountAndBegin();
    const original = structuredClone(battleStarts(setup)[0]);
    await finish();
    const spent = advance.mock.results.at(-1)!.value.state as engine.State;
    expect([...spent.allies, ...spent.enemies].some(unit => unit.hp < unit.monster.hp)).toBe(true);
    expect([...spent.allies, ...spent.enemies].some(unit => unit.mp < unit.monster.mp)).toBe(true);
    await click(button('編成を見直して再戦'));
    await click(label('1枠・妖狐を入れ替える'));
    await click(label('トロルを候補に選ぶ'));
    const replace = document.querySelector<HTMLButtonElement>('.confirmReplacement')!;
    await act(async () => { replace.click(); replace.click(); });
    expect(workshopTeam()).toEqual([1, 2, 3, 4, 6]);
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    const edited = [2, 1, 3, 4, 6];
    expect(workshopTeam()).toEqual(edited);
    expect(isValidTeam(edited, rules[rule].budget)).toBe(true);
    expect(localStorage.getItem(slotsKey)).toBe(saved);
    await click(label('闘技場'));
    expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain(rules[rule].name);
    const begin = button('この編成で同じ相手に再戦');
    await act(async () => { begin.click(); begin.click(); });
    const rebuilt = battleStarts(setup)[1];
    expect(battleStarts(setup)).toHaveLength(2);
    expect(rebuilt.args[0]).toEqual(edited);
    expect(rebuilt.args[0]).not.toEqual(original.args[0]);
    expect(rebuilt.args.slice(1)).toEqual(original.args.slice(1));
    expect(rebuilt.state.enemies).toEqual(original.state.enemies);
    expect(rebuilt.state.seed).toBe(original.state.seed);
    expect(rebuilt.state.turn).toBe(1);
    expect(rebuilt.state.history).toEqual([]);
    expect(rebuilt.state.winner).toBeNull();
    for (const unit of [...rebuilt.state.allies, ...rebuilt.state.enemies]) {
      expect(unit.hp).toBe(unit.monster.hp);
      expect(unit.mp).toBe(unit.monster.mp);
    }
    expect(draw).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(slotsKey)).toBe(saved);
    await finish(); await click(button('編成を見直して再戦'));
    const currentTeams = JSON.parse(localStorage.getItem('kanshu-team-workshop-v2')!).teams as TeamSlot[];
    expect(currentTeams).toEqual(rule === 'standard' ? [{ team: edited, rule: 'standard' }, savedTeams[1], savedTeams[2]] : savedTeams);
    for (const [index, slot] of currentTeams.entries()) {
      expect(label(`チーム${index + 1}を選ぶ`).disabled).toBe(false);
      await click(label(`チーム${index + 1}を選ぶ`));
      expect(workshopTeam()).toEqual(slot.team);
      expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain(rules[slot.rule].name);
    }
    expect(localStorage.getItem(slotsKey)).toBe(saved);
  });

  it('preserves the held encounter and party through preview cancel, browser Back/Forward and interrupted-exit cancellation', async () => {
    const setup = vi.spyOn(engine, 'start');
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    localStorage.setItem(slotsKey, JSON.stringify(savedTeams));
    await mountAndBegin(); await finish(); await click(button('編成を見直して再戦'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ'));
    await click(button('キャンセル'));
    expect(workshopTeam()).toEqual(initialTeam);
    await click(label('闘技場'));
    await historyMove('back');
    expect(window.location.hash).toBe('#team');
    expect(workshopTeam()).toEqual(initialTeam);
    await historyMove('forward');
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.practiceNotice')).toBeTruthy();
    await click(label('編成'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    await retry();
    expect(battleStarts(setup)[1].args).toEqual(battleStarts(setup)[0].args);
    await historyMove('back');
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    await click(button('対戦を続ける'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(battleStarts(setup)).toHaveLength(2);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(slotsKey)).toBe(JSON.stringify(savedTeams));
  });

  it('rejects over-budget and duplicate replacements without losing the held light-rule encounter', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: initialTeam, rule: 'light' }));
    const setup = vi.spyOn(engine, 'start');
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mountAndBegin(); await finish(); await click(button('編成を見直して再戦'));
    await click(label('5枠・ガルーダを入れ替える'));
    const overBudget = label('フェンリルを候補に選ぶ');
    expect(overBudget.disabled).toBe(true);
    expect(document.getElementById(overBudget.getAttribute('aria-describedby')!)?.textContent).toContain('COST 2超過');
    await click(overBudget);
    const duplicate = label('妖狐を候補に選ぶ');
    expect(duplicate.disabled).toBe(true);
    await click(duplicate);
    expect(document.querySelector('.confirmReplacement')).toBeNull();
    expect(workshopTeam()).toEqual(initialTeam);
    await click(button('キャンセル')); await retry();
    expect(battleStarts(setup)[1].args).toEqual(battleStarts(setup)[0].args);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('does not carry repeated rebuild intent into a confirmed interruption of the retry', async () => {
    const setup = vi.spyOn(engine, 'start');
    await mountAndBegin(); await finish();
    const rebuild = button('編成を見直して再戦');
    await act(async () => { rebuild.click(); rebuild.click(); });
    await retry();
    await click(label('闘技場に戻る')); await click(button('中断して移動'));
    expect(document.querySelector('.practiceNotice')).toBeNull();
    vi.mocked(Math.random).mockReturnValue(2 / 0x100000000);
    await click(button('この編成で対戦する'));
    expect(battleStarts(setup)[2].args[2]).toBe(2);
  });

  it.each(['rebuild-first', 'retry-first'])('consumes a mixed same-render result action once: %s', async order => {
    const setup = vi.spyOn(engine, 'start');
    await mountAndBegin(); await finish();
    const rebuild = button('編成を見直して再戦');
    const immediate = button('同じ編成ですぐ再戦');
    await act(async () => { if (order === 'rebuild-first') { rebuild.click(); immediate.click(); } else { immediate.click(); rebuild.click(); } });
    if (order === 'rebuild-first') {
      expect(window.location.hash).toBe('#team');
      expect(battleStarts(setup)).toHaveLength(1);
      await retry();
    } else {
      expect(window.location.hash).toBe('#arena/battle');
      expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    }
    expect(battleStarts(setup)).toHaveLength(2);
    await finish(); await click(button('編成を見直して再戦'));
    expect(window.location.hash).toBe('#team');
  });
  it.each(['rebuild', 'rematch'])('allows %s after a rebuild is declined during queued history restoration', async action => {
    const nativeReplace = window.history.replaceState.bind(window.history);
    const entries: { state: unknown; hash: string }[] = [{state:null, hash:'#home'}];
    let position = 0;
    const traversals: number[] = [];
    vi.spyOn(window.history, 'replaceState').mockImplementation((state, _, url) => {
      entries[position] = {state, hash:String(url)}; nativeReplace(state, '', url);
    });
    vi.spyOn(window.history, 'pushState').mockImplementation((state, _, url) => {
      entries.splice(position + 1); entries.push({state, hash:String(url)}); position++;
      nativeReplace(state, '', url);
    });
    vi.spyOn(window.history, 'go').mockImplementation(delta => { traversals.push(delta ?? 0); });
    const traverseOne = () => {
      const target = position + traversals.shift()!;
      if (target < 0 || target >= entries.length) return;
      position = target; const entry = entries[position];
      nativeReplace(entry.state, '', entry.hash);
      window.dispatchEvent(new PopStateEvent('popstate', {state:entry.state}));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    const setup = vi.spyOn(engine, 'start');
    await mountAndBegin();
    for (let turn=0; turn<20; turn++) {
      await click(button('この指示でターン開始'));
      if (advance.mock.results.at(-1)!.value.state.winner) break;
      await click(button('演出をスキップ'));
    }
    expect(advance.mock.results.at(-1)!.value.state.winner).toBeTruthy();
    window.history.go(-1); await act(async () => traverseOne());
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    await click(button('対戦を続ける'));
    await click(button('演出をスキップ'));
    expect(document.querySelector('.result')).toBeTruthy();
    await click(button('編成を見直して再戦'));
    expect(document.querySelector('.result')).toBeTruthy();
    await act(async () => traverseOne());
    expect(window.location.hash).toBe('#arena/battle');
    if (action === 'rebuild') {
      await click(button('編成を見直して再戦'));
      expect(window.location.hash).toBe('#team');
      await retry();
    } else {
      await click(button('同じ編成ですぐ再戦'));
      expect(window.location.hash).toBe('#arena/battle');
    }
    expect(battleStarts(setup)).toHaveLength(2);
    expect(battleStarts(setup)[1].args).toEqual(battleStarts(setup)[0].args);
    await finish(); await click(button('闘技場に戻る → 次の相手'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(document.body.textContent).toContain('第2戦');
  });
});
