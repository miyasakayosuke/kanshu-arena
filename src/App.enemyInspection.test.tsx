// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

const defaultTeam = [0, 2, 3, 4, 6];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const actor = (index: number) => document.querySelectorAll<HTMLButtonElement>('.commander')[index];
const target = (index: number) => document.querySelectorAll<HTMLButtonElement>('.targetButtons button')[index];
const turnStart = () => document.querySelector<HTMLButtonElement>('.turnStart')!;
const summary = () => document.querySelector<HTMLElement>('.commandHeading .committedOrder');
const summaryText = () => summary()?.textContent?.replace(/\s+/g, ' ').trim();
const command = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('.commandButtons button')].find(node => node.querySelector('strong')?.textContent === text)!;
const special = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('.skillButtons button')].find(node => node.querySelector('strong')?.textContent === text)!;
async function click(node: HTMLElement) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function tick(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }
async function escape(target: EventTarget = window) {
  await act(async () => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
}
async function chooseSpecial(index: number, name: string) {
  await click(actor(index)); await click(command('とくぎ')); await click(special(name));
}
async function commitAttack(index = 0, recipient = 0) {
  await click(actor(index)); await click(command('たたかう')); await click(target(recipient));
}
async function defendAll() {
  for (let index = 0; index < 5; index++) {
    if (actor(index).disabled) continue;
    await click(actor(index)); await click(command('ぼうぎょ'));
  }
}
async function begin(options: {
  team?: number[];
  enemies?: number[];
  mutate?: (state: engine.State) => void;
} = {}) {
  const team = options.team ?? defaultTeam;
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  const realStart = engine.start, realAdvance = engine.advanceWithEvents;
  let state!: engine.State;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    state = realStart(team, options.enemies ?? defaultTeam, 42013, { leaders: true });
    options.mutate?.(state); return state;
  });
  // Resolve real commands and real events, while keeping opponents defensive so
  // lifecycle assertions do not depend on a particular automatic enemy choice.
  const advance = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => realAdvance(state, orders, {
    enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })),
  }));
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
  return { state, setup, advance };
}

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

const inspect = (key = 'e0') => document.querySelector<HTMLButtonElement>(`[data-inspect-enemy="${key}"]`)!;
const dialog = () => document.querySelector<HTMLElement>('.profileModal');
const selectedTab = () => dialog()?.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
const resources = () => [...document.querySelectorAll('.enemyVital, .commander')].map(node => node.textContent);

describe('enemy-card read-only skill inspection', () => {
  it('uses original slots and unit keys for duplicate and defeated enemies and opens shared skills detail', async () => {
    const { state, advance } = await begin({ enemies: [0, 0, 2, 0, 6], mutate: state => { state.enemies[1].hp = 0; } });
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(5);
    for (const index of [0, 1, 3]) {
      const opener = inspect(`e${index}`);
      expect(opener.getAttribute('aria-label')).toContain(`敵${index + 1} 妖狐の特技を確認`);
      await click(opener);
      expect(dialog()?.getAttribute('aria-label')).toContain(`敵${index + 1} 妖狐`);
      expect(selectedTab()).toBe('特技');
      expect(dialog()?.textContent).toContain(state.enemies[index].monster.skills[0]!.name);
      expect(dialog()?.querySelector('.profileBattleContext')?.textContent).toContain('残り 30 秒');
      if (index === 1) expect(dialog()?.getAttribute('aria-label')).toContain('戦闘不能');
      await click(label('詳細を閉じる'));
      expect(document.activeElement).toBe(opener);
    }
    expect(advance).not.toHaveBeenCalled();
    await click(button('詳細'));
    expect(selectedTab()).toBe('姿');
    expect(dialog()?.querySelector('.profileBattleContext')).toBeNull();
  });

  it('keeps manual and stored automatic orders, selected actor, submenu and all resources unchanged', async () => {
    const { state, advance } = await begin();
    await commitAttack(0, 2);
    await click(actor(1)); await click(command('おまかせ'));
    const automatic = engine.completeOrders(state, [{ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e2' }]).find(order => order.key === 'a1')!;
    await click(actor(0));
    const manualSummary = summaryText();
    await click(command('とくぎ'));
    const skills = document.querySelector('.skillButtons')?.textContent;
    const before = resources(), beforeState = JSON.stringify(state);
    await click(inspect('e3'));
    await click(dialog()!.querySelector<HTMLButtonElement>('[data-detail-tab="abilities"]')!);
    await escape(document.activeElement!);
    expect(dialog()).toBeNull();
    expect(document.querySelector('.skillButtons')?.textContent).toBe(skills);
    expect(actor(0).getAttribute('aria-pressed')).toBe('true');
    expect(resources()).toEqual(before); expect(JSON.stringify(state)).toBe(beforeState);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(2);
    expect(actor(1).textContent).toContain('おまかせ ✓');
    await click(button('コマンドに戻る')); expect(summaryText()).toBe(manualSummary);
    await click(actor(1)); const autoSummary = summaryText();
    await click(inspect('e2')); expect(selectedTab()).toBe('特技'); await escape();
    expect(summaryText()).toBe(autoSummary);
    expect(advance).not.toHaveBeenCalled();
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([{ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e2' }, automatic]));
  });

  it.each([
    { kind: 'ordinary attack', team: defaultTeam, actor: 0, name: 'たたかう', ally: false },
    { kind: 'special attack', team: defaultTeam, actor: 0, name: '狐火', ally: false },
    { kind: 'healing', team: defaultTeam, actor: 1, name: '生命の雫', ally: true },
    { kind: 'protect', team: [1, 2, 3, 4, 6], actor: 0, name: '守護の誓い', ally: true },
  ])('removes every inspection control during pending $kind and restores them on cancel', async scenario => {
    const { state, advance } = await begin({ team: scenario.team, mutate: state => { state.enemies[0].hp = 0; } });
    const beforeState = JSON.stringify(state);
    if (scenario.name === 'たたかう') { await click(actor(scenario.actor)); await click(command(scenario.name)); }
    else await chooseSpecial(scenario.actor, scenario.name);
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(0);
    expect(document.querySelectorAll('.enemyVital .battleTarget')).toHaveLength(scenario.ally ? 0 : 4);
    expect(document.querySelector('.targetButtons')).not.toBeNull();
    expect(turnStart().disabled).toBe(true);
    await click(document.querySelector<HTMLElement>('.enemyVital.fallen')!);
    expect(dialog()).toBeNull(); expect(advance).not.toHaveBeenCalled();
    await escape();
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(5);
    expect(turnStart().disabled).toBe(false);
    await click(inspect('e0')); expect(dialog()?.getAttribute('aria-label')).toContain('戦闘不能');
    await escape(document.activeElement!);
    expect(JSON.stringify(state)).toBe(beforeState); expect(advance).not.toHaveBeenCalled();
  });

  it('contains keyboard focus and lets Escape close only inspection before cancelling the underlying submenu', async () => {
    await begin(); await click(command('とくぎ'));
    const opener = inspect('e2'); await click(opener);
    const close = label('詳細を閉じる'); expect(document.activeElement).toBe(close);
    for (let index = 0; index < 18; index++) {
      await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, shiftKey: index > 9 })));
      expect(dialog()?.contains(document.activeElement)).toBe(true);
    }
    await escape(document.activeElement!);
    expect(dialog()).toBeNull(); expect(document.activeElement).toBe(opener);
    expect(document.querySelector('.skillButtons')).not.toBeNull();
    await escape(); expect(document.querySelector('.skillButtons')).toBeNull();
  });
});

describe('inspection deadline and lifecycle boundaries', () => {
  it.each(['timer', 'queued click'] as const)('executes saved commands once at expiry through %s and removes inspection until playback ends', async mode => {
    const { state, advance } = await begin();
    await commitAttack(0, 1); await click(actor(0));
    const opener = inspect('e0');
    if (mode === 'timer') {
      await click(opener); await tick(29000);
      expect(dialog()?.querySelector('[role="timer"]')?.textContent).toContain('残り 1 秒');
      expect(advance).not.toHaveBeenCalled(); await tick(1000);
    } else {
      await act(async () => {
        vi.setSystemTime(Date.now() + 30001); opener.click(); opener.click(); window.dispatchEvent(new Event('focus'));
      });
    }
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [{ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e1' }]));
    expect(dialog()).toBeNull(); expect(document.querySelectorAll('.enemyInspect')).toHaveLength(0);
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
    if (mode === 'timer') expect(document.activeElement).toBe(document.querySelector('main.battle'));
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(5);
    expect(dialog()).toBeNull(); expect(summary()).toBeNull();
    await click(inspect('e4')); expect(selectedTab()).toBe('特技'); await escape();
    await tick(1000); expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['navigation', 'history'] as const)('clears inspection for $mode confirmation, cancellation, abandonment and a new match', async mode => {
    const { setup, advance } = await begin();
    await click(inspect('e3'));
    if (mode === 'navigation') await click(label('ホーム'));
    else await act(async () => {
      window.history.replaceState(null, '', '#home'); window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(dialog()).toBeNull(); expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(0);
    await click(button('対戦を続ける'));
    expect(window.location.hash).toBe('#arena/battle');
    expect(dialog()).toBeNull(); expect(document.querySelectorAll('.enemyInspect')).toHaveLength(5);
    await click(inspect('e1')); await click(label('ホーム')); await click(button('中断して移動'));
    expect(window.location.hash).toBe('#home'); expect(dialog()).toBeNull();
    await tick(60000); expect(advance).not.toHaveBeenCalled();
    await click(label('闘技場')); await click(button('この編成で対戦する'));
    expect(setup).toHaveBeenCalledTimes(2); expect(dialog()).toBeNull();
    expect(document.querySelectorAll('.enemyInspect')).toHaveLength(5);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    await click(inspect('e0')); expect(dialog()?.getAttribute('aria-label')).toContain('敵1');
  });

  it('does not retain inspection through a completed match or a new match', async () => {
    const { advance, setup } = await begin({ mutate: state => {
      for (const enemy of state.enemies) { enemy.hp = 1; enemy.poison = 1; }
    } });
    await defendAll(); await click(inspect('e4')); await tick(30000);
    expect(advance).toHaveBeenCalledTimes(1); expect(dialog()).toBeNull();
    expect(advance.mock.results[0].value.state.winner).toBe('win');
    await click(button('演出をスキップ'));
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.arenaLobby .result')).not.toBeNull();
    expect(document.querySelector('.enemyInspect, .profileModal')).toBeNull();
    await tick(60000); expect(advance).toHaveBeenCalledTimes(1);
    await click(button('この編成で対戦する'));
    expect(setup).toHaveBeenCalledTimes(2); expect(dialog()).toBeNull();
    await click(inspect('e4')); expect(selectedTab()).toBe('特技');
  });
});
