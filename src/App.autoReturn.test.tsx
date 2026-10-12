// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as trials from './familyTrials';
import { buildTimeline } from './playback';
import { initialTeam, isValidTeam, resultSummary, rules, type RuleId, type TeamSlot } from './strategy';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const battleStarts = (spy: MockInstance<typeof engine.start>) => spy.mock.calls.flatMap((args, index) =>
  args[1].length ? [{ args, state: spy.mock.results[index].value as engine.State }] : []);
const workshopTeam = () => [...document.querySelectorAll('.builderSlots [data-monster-id]')].map(node => Number(node.getAttribute('data-monster-id')));
const savedTeams: TeamSlot[] = [
  { team: [0, 2, 3, 4, 6], rule: 'standard' },
  { team: [14, 3, 6, 9, 10], rule: 'light' },
  { team: [29, 1, 8, 30, 31], rule: 'standard' },
];
async function mount() { await act(async () => root.render(<App />)); }
async function begin() {
  if (window.location.hash !== '#arena') await click(label('闘技場'));
  await click(button('この編成で対戦する'));
}
async function finish() {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始')); await click(button('演出をスキップ'));
  }
  expect(window.location.hash).toBe('#arena');
  expect(document.querySelector('.arenaLobby .result')).toBeTruthy();
}
async function historyMove(direction: 'back' | 'forward') {
  await act(async () => { window.history[direction](); await Promise.resolve(); });
}
async function select(name: string, value: string) {
  const node = document.querySelector<HTMLSelectElement>(`select[aria-label="${name}"]`)!;
  await act(async () => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
}
// All outcomes use real engine poison/defeat events at the final timeline boundary.
// No mock winner is written into the UI before authoritative playback completes.
function terminalFixture(winner: 'win' | 'lose' | 'draw') {
  const realStart = engine.start, realAdvance = engine.advanceWithEvents;
  const setup = vi.spyOn(engine, 'start').mockImplementation((...args) => {
    const state = realStart(...args);
    if (!args[1].length) return state;
    const victims = winner === 'win' ? state.enemies : winner === 'lose' ? state.allies : [...state.allies, ...state.enemies];
    for (const unit of victims) { unit.hp = 1; unit.poison = 1; }
    return state;
  });
  const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation(state => realAdvance(state,
    state.allies.map(unit => ({ key: unit.key, skill: engine.DEFEND })),
    { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })) }));
  return { setup, resolve };
}
function expectQuietLobby() {
  expect(window.location.hash).toBe('#arena');
  expect(document.querySelector('.arenaLobby .result')).toBeTruthy();
  expect(document.querySelector('.battleMode, .battleStage, .playingPanel, [role="timer"], [role="alertdialog"]')).toBeNull();
  expect(document.querySelector('.rematchActions, .retryContract, .practiceNotice')).toBeNull();
  expect(button('同じ編成ですぐ再戦')).toBeUndefined();
  expect(button('編成を見直して再戦')).toBeUndefined();
  expect(button('この編成で対戦する').disabled).toBe(false);
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

describe('automatic arena return after authoritative match completion', () => {
  it.each((['win', 'lose', 'draw'] as const).flatMap(winner => ([1, 2, 'skip'] as const).map(mode => ({ winner, mode }))))
  ('returns $winner to reception only after final playback, mode=$mode', async ({ winner, mode }) => {
    const { setup, resolve } = terminalFixture(winner);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); await begin();
    if (mode === 2) await click(label('演出速度'));
    await click(button('この指示でターン開始'));
    const authoritative = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(authoritative.state.winner).toBe(winner);
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('.result')).toBeNull();
    const timeline = buildTimeline(authoritative.events);
    if (mode === 'skip') {
      const skip = button('演出をスキップ');
      await act(async () => { skip.click(); skip.click(); });
    } else {
      await tick(timeline.duration / mode - 1);
      expect(window.location.hash).toBe('#arena/battle');
      expect(document.querySelector('.playingPanel')).toBeTruthy();
      expect(document.querySelector('.result')).toBeNull();
      await tick(1);
    }
    expectQuietLobby();
    expect(document.activeElement).toBe(document.querySelector('.arenaLobby h2.srOnly'));
    expect(document.querySelector('.result h2')?.textContent).toContain(winner === 'win' ? 'VICTORY' : winner === 'lose' ? 'DEFEAT' : 'DRAW');
    const summary = resultSummary(authoritative.state);
    expect(document.querySelector('.resultMetrics')?.textContent).toBe(`${summary.turns}ターン · 残りHP 味方 ${summary.allyHpPercent}% / 敵 ${summary.enemyHpPercent}%`);
    expect(document.querySelector<HTMLDetailsElement>('.resultDetails')?.open).toBe(false);
    expect(document.body.textContent).toContain('第2戦');
    await tick(timeline.duration + 120000);
    await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expectQuietLobby();
    expect(battleStarts(setup)).toHaveLength(1);
    expect(resolve).toHaveBeenCalledTimes(1); expect(draw).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('第2戦');
  });

  it('replaces the battle history entry and never resurrects or restarts it on Back/Forward', async () => {
    const { setup, resolve } = terminalFixture('win');
    const push = vi.spyOn(window.history, 'pushState'), replace = vi.spyOn(window.history, 'replaceState');
    await mount(); await begin();
    const pushes = push.mock.calls.length;
    await finish(); expectQuietLobby();
    expect(push).toHaveBeenCalledTimes(pushes);
    expect(replace.mock.calls.at(-1)?.[2]).toBe('#arena');
    await historyMove('back'); expect(window.location.hash).toBe('#arena');
    await historyMove('back'); expect(window.location.hash).toBe('#home');
    await historyMove('forward'); expect(window.location.hash).toBe('#arena');
    await historyMove('forward'); expectQuietLobby();
    await tick(120000);
    expect(battleStarts(setup)).toHaveLength(1); expect(resolve).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('第2戦');
  });

  it.each(['skip', 'natural'] as const)('clears a pending leave dialog when the final turn finishes by %s', async mode => {
    const { setup, resolve } = terminalFixture('win');
    await mount(); await begin(); await click(button('この指示でターン開始'));
    await click(label('ホーム'));
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    if (mode === 'skip') await click(button('演出をスキップ'));
    else await tick(buildTimeline(resolve.mock.results[0].value.events).duration);
    expectQuietLobby(); expect(battleStarts(setup)).toHaveLength(1);
    await tick(60000); expectQuietLobby();
  });

  it.each(['arena', 'newer-home'] as const)('honors %s after terminal playback finishes during queued history restoration', async destination => {
    const nativeReplace = window.history.replaceState.bind(window.history);
    const entries: { state: unknown; hash: string }[] = [{ state: null, hash: '#home' }];
    let position = 0;
    const traversals: number[] = [];
    vi.spyOn(window.history, 'replaceState').mockImplementation((state, _, url) => {
      entries[position] = { state, hash: String(url) }; nativeReplace(state, '', url);
    });
    vi.spyOn(window.history, 'pushState').mockImplementation((state, _, url) => {
      entries.splice(position + 1); entries.push({ state, hash: String(url) }); position++;
      nativeReplace(state, '', url);
    });
    vi.spyOn(window.history, 'go').mockImplementation(delta => { traversals.push(delta ?? 0); });
    const traverseOne = () => {
      const target = position + traversals.shift()!;
      if (target < 0 || target >= entries.length) return;
      position = target; const entry = entries[position];
      nativeReplace(entry.state, '', entry.hash);
      window.dispatchEvent(new PopStateEvent('popstate', { state: entry.state }));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    const { setup, resolve } = terminalFixture('win');
    await mount(); await begin(); await click(button('この指示でターン開始'));
    window.history.go(-1); await act(async () => traverseOne());
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    await click(button('対戦を続ける'));
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    await click(button('演出をスキップ'));
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 50);
    if (destination === 'newer-home') {
      const home = label('ホーム');
      expect(home).toBeTruthy();
      // Keep navigation and the stale callback in one React batch: the callback
      // runs before effect cleanup, so playbackId must protect the newer route.
      await act(async () => {
        traverseOne();
        home.click();
        vi.advanceTimersByTime(50);
      });
      expect(window.location.hash).toBe('#home');
      expect(document.querySelector('[aria-label="ゲームホーム"]')).toBeTruthy();
      expect(document.querySelector('.battleMode, .result, [role="timer"]')).toBeNull();
      await tick(120000); expect(window.location.hash).toBe('#home');
    } else {
      await act(async () => traverseOne()); await tick(100);
      expectQuietLobby();
      expect(document.body.textContent).toContain('第2戦');
    }
    expect(battleStarts(setup)).toHaveLength(1); expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('abandons interrupted terminal playback without recording a result or firing old return timers', async () => {
    const { setup, resolve } = terminalFixture('lose');
    await mount(); await begin(); await click(button('この指示でターン開始')); await tick(100);
    expect(resolve.mock.results[0].value.state.winner).toBe('lose');
    await click(label('ホーム')); await click(button('中断して移動'));
    expect(window.location.hash).toBe('#home');
    await tick(120000); expect(window.location.hash).toBe('#home');
    expect(document.querySelector('.result')).toBeNull();
    await click(label('闘技場'));
    expect(document.body.textContent).toContain('第1戦'); expect(document.querySelector('.result')).toBeNull();
    vi.mocked(Math.random).mockReturnValue(2 / 0x100000000); await begin();
    expect(battleStarts(setup)[1].args[2]).toBe(2);
    await tick(1000); expect(document.querySelector('.playingPanel')).toBeNull();
    expect(resolve).toHaveBeenCalledTimes(1);
    await finish(); expect(document.body.textContent).toContain('第2戦');
  });

  it('preserves the chosen saved team, all three slots and catalog filters across automatic return', async () => {
    localStorage.setItem('kanshu-team-workshop-v2', JSON.stringify({ version: 2, teams: savedTeams, selected: 0, draft: null, previous: null }));
    terminalFixture('win');
    await mount(); await click(label('編成')); await click(label('チーム2を選ぶ'));
    const selectedWorkshop = localStorage.getItem('kanshu-team-workshop-v2');
    await click(label('図鑑'));
    const search = document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, '竜');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await select('並べ替え', 'speed'); await click(document.querySelector('.filterDisclosure > summary')!);
    await select('系統で絞り込み', 'dragon'); await select('リーダー効果で絞り込み', 'atk'); await select('コストで絞り込み', '3');
    const list = document.querySelector<HTMLElement>('[aria-label="図鑑一覧"]')!;
    await act(async () => { list.scrollTop = 121; list.dispatchEvent(new Event('scroll')); });
    const names = [...list.querySelectorAll('.rosterText strong')].map(node => node.textContent);
    await begin(); await finish();
    expect(localStorage.getItem('kanshu-team-workshop-v2')).toBe(selectedWorkshop);
    expect([...document.querySelectorAll('.arenaLobby .teamUnit')].map(node => Number(node.getAttribute('data-monster-id')))).toEqual(savedTeams[1].team);
    expect(document.querySelector('.ruleTabs [aria-pressed="true"]')?.textContent).toContain('軽量戦');
    await click(label('編成')); expect(label('チーム2を選ぶ').getAttribute('aria-pressed')).toBe('true');
    expect(workshopTeam()).toEqual(savedTeams[1].team);
    await click(label('図鑑'));
    expect(document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!.value).toBe('竜');
    for (const [name, value] of [['並べ替え', 'speed'], ['系統で絞り込み', 'dragon'], ['リーダー効果で絞り込み', 'atk'], ['コストで絞り込み', '3']]) {
      expect(document.querySelector<HTMLSelectElement>(`[aria-label="${name}"]`)!.value).toBe(value);
    }
    expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')!.open).toBe(true);
    const restored = document.querySelector<HTMLElement>('[aria-label="図鑑一覧"]')!;
    expect(restored.scrollTop).toBe(121);
    expect([...restored.querySelectorAll('.rosterText strong')].map(node => node.textContent)).toEqual(names);
    expect(localStorage.getItem('kanshu-team-workshop-v2')).toBe(selectedWorkshop);
  });

  it.each<RuleId>(['standard', 'light'])('starts the edited party under %s with a new draw and fully reset resources', async rule => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: initialTeam, rule }));
    localStorage.setItem('kanshu-team-slots-v1', JSON.stringify(savedTeams));
    const setup = vi.spyOn(engine, 'start'), draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); await begin(); await finish(); await click(label('編成'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ'));
    const replace = document.querySelector<HTMLButtonElement>('.confirmReplacement')!;
    await act(async () => { replace.click(); replace.click(); });
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    const edited = [2, 1, 3, 4, 6];
    expect(workshopTeam()).toEqual(edited); expect(isValidTeam(edited, rules[rule].budget)).toBe(true);
    const saved = localStorage.getItem('kanshu-team-workshop-v2');
    await click(label('闘技場')); vi.mocked(Math.random).mockReturnValue(2 / 0x100000000);
    const next = button('この編成で対戦する'); await act(async () => { next.click(); next.click(); });
    const started = battleStarts(setup);
    expect(started).toHaveLength(2); expect(started[1].args[0]).toEqual(edited); expect(started[1].args[2]).toBe(2);
    expect(started[1].args[1]).toEqual(draw.mock.results[1].value.enemy); expect(draw).toHaveBeenCalledTimes(2);
    expect(started[1].state.turn).toBe(1); expect(started[1].state.history).toEqual([]); expect(started[1].state.winner).toBeNull();
    for (const unit of [...started[1].state.allies, ...started[1].state.enemies]) {
      expect(unit.hp).toBe(unit.monster.hp); expect(unit.mp).toBe(unit.monster.mp);
    }
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('30');
    expect(localStorage.getItem('kanshu-team-workshop-v2')).toBe(saved);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(savedTeams));
  });

  it('rejects over-budget and duplicate replacements after a result without changing the party', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: initialTeam, rule: 'light' }));
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); await begin(); await finish(); await click(label('編成'));
    await click(label('5枠・ガルーダを入れ替える'));
    const overBudget = label('フェンリルを候補に選ぶ');
    expect(overBudget.disabled).toBe(true);
    expect(document.getElementById(overBudget.getAttribute('aria-describedby')!)?.textContent).toContain('COST 2超過');
    await click(overBudget); const duplicate = label('妖狐を候補に選ぶ'); expect(duplicate.disabled).toBe(true); await click(duplicate);
    expect(document.querySelector('.confirmReplacement')).toBeNull(); expect(workshopTeam()).toEqual(initialTeam);
    await click(button('キャンセル')); await click(label('闘技場'));
    expect(draw).toHaveBeenCalledTimes(1); await begin(); expect(draw).toHaveBeenCalledTimes(2);
  });
});
