// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline } from './playback';

const defaultTeam = [0, 2, 3, 4, 6];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const actor = (index: number) => document.querySelectorAll<HTMLButtonElement>('.commander')[index];
const target = (index: number) => document.querySelectorAll<HTMLButtonElement>('.targetButtons button')[index];
const allyTarget = (index: number) => document.querySelector<HTMLButtonElement>(`.commander.allyRecipient[aria-label^="味方${index + 1} "]`)!;
const turnStart = () => document.querySelector<HTMLButtonElement>('.turnStart')!;
const summary = () => document.querySelector<HTMLElement>('.commandHeading .committedOrder');
const summaryText = () => summary()?.textContent?.replace(/\s+/g, ' ').trim();
const mp = () => [...document.querySelectorAll('.commanderMp')].map(node => node.textContent);
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
function expectSummary(skill: string, recipient: string, automatic = false) {
  expect(summary()).not.toBeNull();
  expect(summaryText()).toContain(`${skill} → ${recipient}`);
  if (automatic) expect(summaryText()).toContain('おまかせ');
  else expect(summaryText()).not.toContain('おまかせ');
  expect(document.querySelectorAll('.committedOrder')).toHaveLength(1);
  expect(summary()?.getAttribute('aria-hidden')).not.toBe('true');
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

describe('committed skill and target in the existing actor heading', () => {
  it('shows no proposed command before selection, then the stored special and original enemy slot on reselect', async () => {
    const { state, advance } = await begin({
      team: [29, 1, 8, 30, 31], enemies: [19, 20, 21, 22, 23],
      mutate: state => { state.enemies[0].hp = 0; },
    });
    expect(summary()).toBeNull();
    const beforeMp = mp();
    await chooseSpecial(0, '空勘の爪');
    expect(summary()).toBeNull();
    await click(target(1)); // Original enemy slot 3; defeated slot 1 is omitted by the picker.
    expect(actor(1).getAttribute('aria-pressed')).toBe('true');
    expect(summary()).toBeNull();
    await click(actor(0));
    expectSummary('空勘の爪', '敵3 ぬりかべ');
    expect(document.querySelector('.commandHeading')?.textContent).toContain('マモン');
    expect(document.querySelector('.commandHeading')?.textContent).not.toMatch(/HP|MP/);
    expect(document.querySelector('#party-hp-a0')?.textContent).toBe(`HP ${state.allies[0].hp}/${state.allies[0].monster.hp}`);
    expect(mp()).toEqual(beforeMp);
    await click(turnStart());
    expect(advance.mock.calls[0][1].find(order => order.key === 'a0')).toEqual({ key: 'a0', skill: 0, target: 'e2' });
    expect(summary()).toBeNull();
  });

  it.each([
    { team: defaultTeam, actor: 1, name: '生命の雫', recipient: 0, expected: '味方1 妖狐' },
    { team: [1, 2, 3, 4, 6], actor: 0, name: '守護の誓い', recipient: 1, expected: '味方2 バステト' },
    { team: defaultTeam, actor: 1, name: '清めの鈴', recipient: 2, expected: '味方3 ドリュアス' },
  ])('shows stored ally recipient for $name without a resource spend', async scenario => {
    const { advance } = await begin({ team: scenario.team });
    const beforeMp = mp();
    await chooseSpecial(scenario.actor, scenario.name); await click(allyTarget(scenario.recipient));
    await click(actor(scenario.actor)); expectSummary(scenario.name, scenario.expected);
    expect(mp()).toEqual(beforeMp); expect(advance).not.toHaveBeenCalled();
  });

  it('disambiguates the same creature name on opposing sides and does not reuse an enemy target after an ally command', async () => {
    const { advance } = await begin();
    await commitAttack(0, 1); await click(actor(0));
    expectSummary('通常攻撃', '敵2 バステト');
    await chooseSpecial(2, '生命の雫'); await click(allyTarget(1)); await click(actor(2));
    expectSummary('生命の雫', '味方2 バステト');
    await click(actor(0)); expectSummary('通常攻撃', '敵2 バステト');
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([
      { key: 'a0', skill: engine.BASIC_ATTACK, target: 'e1' },
      { key: 'a2', skill: 1, target: 'a1' },
    ]));
  });

  it.each([
    { team: defaultTeam, actor: 0, name: 'ぼうぎょ', expected: '自分' },
    { team: defaultTeam, actor: 1, name: '鉄壁の構え', expected: '自分' },
    { team: defaultTeam, actor: 0, name: '炎嵐', expected: '生存敵全体' },
    { team: defaultTeam, actor: 2, name: '毒霧', expected: '生存敵全体' },
    { team: [12, 2, 3, 4, 6], actor: 0, name: '破縛の連牙', expected: '生存敵からランダム' },
    { team: [24, 25, 26, 27, 28], actor: 0, name: '蓄え分け', expected: '生存味方の粘体系' },
    { team: [36, 12, 2, 30, 26], actor: 0, name: '境目の清め', expected: '生存味方全体' },
    { team: [36, 12, 2, 30, 26], actor: 0, name: '合流の扉', expected: '生存味方全体' },
  ])('shows the actual scope for $name without inventing a fixed target', async scenario => {
    const { state, advance } = await begin({ team: scenario.team, mutate: state => {
      state.allies[1].mp -= 8; state.allies[1].poison = 2;
    } });
    const beforeMp = mp(), beforeState = JSON.stringify(state);
    if (scenario.name === 'ぼうぎょ') { await click(actor(scenario.actor)); await click(command('ぼうぎょ')); }
    else await chooseSpecial(scenario.actor, scenario.name);
    expect(document.querySelector('.targetButtons')).toBeNull();
    await click(actor(scenario.actor)); expectSummary(scenario.name, scenario.expected);
    expect(summaryText()).not.toMatch(/(?:敵|味方)\d/);
    expect(mp()).toEqual(beforeMp); expect(JSON.stringify(state)).toBe(beforeState);
    await click(turnStart());
    const chosen = advance.mock.calls[0][1].find(order => order.key === `a${scenario.actor}`)!;
    expect(engine.battleSkill(state.allies[scenario.actor].monster, chosen.skill)?.name).toBe(scenario.name);
    expect(chosen.target).toBeUndefined();
  });

  it('keeps automatic intent undecided when a later manual command is chosen', async () => {
    const { state, advance } = await begin({ team: [14, 3, 6, 9, 10], enemies: [29, 1, 8, 30, 31] });
    const automatic = engine.automaticOrders(state, []).find(order => order.key === 'a1')!;
    expect(automatic).toEqual({key:'a1', skill:engine.AUTO});
    await click(actor(1)); await click(command('おまかせ'));
    await click(actor(1)); expect(summary()?.textContent).toBe(' / おまかせ · 行動時に判断');
    await chooseSpecial(3, '毒霧');
    const manual: engine.Order = { key: 'a3', skill: 2 };
    const recalculated = engine.automaticOrders(state, [manual]).find(order => order.key === 'a1')!;
    expect(recalculated).toEqual(automatic);
    await click(actor(1)); expect(summary()?.textContent).toBe(' / おまかせ · 行動時に判断');
    expect(actor(1).textContent).toContain('おまかせ ✓');
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([automatic, manual]));
    expect(summary()).toBeNull();
  });
});

describe('reviewing and replacing a committed command', () => {
  it.each(['back', 'escape', 'actor change'] as const)('retains the old skill, target and MP after replacement is cancelled by %s', async mode => {
    const { advance } = await begin();
    await chooseSpecial(0, '狐火'); await click(target(2)); await click(actor(0));
    expectSummary('狐火', '敵3 ドリュアス');
    const beforeMp = mp();
    await click(command('とくぎ')); expect(summary()).toBeNull();
    await click(special('疾風斬り')); expect(summary()).toBeNull();
    expect(turnStart().disabled).toBe(true);
    if (mode === 'actor change') { await click(actor(1)); await click(actor(0)); }
    else {
      if (mode === 'back') await click(button('特技に戻る')); else await escape();
      expect(document.querySelector('.skillButtons')).not.toBeNull();
      expect(summary()).toBeNull(); // The skill menu still represents a replacement flow.
      if (mode === 'back') await click(button('コマンドに戻る')); else await escape();
    }
    expectSummary('狐火', '敵3 ドリュアス');
    expect(mp()).toEqual(beforeMp); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(turnStart().disabled).toBe(false);
    await click(turnStart());
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1].find(order => order.key === 'a0')).toEqual({ key: 'a0', skill: 0, target: 'e2' });
  });

  it('updates the stored replacement once and removes its former automatic label', async () => {
    const { state, advance } = await begin();
    await click(command('おまかせ')); await click(actor(0));
    expect(summaryText()).toContain('おまかせ');
    const beforeMp = mp();
    await click(command('とくぎ')); await click(special('狐火'));
    const selected = target(3);
    await act(async () => { selected.click(); selected.click(); });
    await click(actor(0)); expectSummary('狐火', '敵4 バンシー');
    expect(mp()).toEqual(beforeMp); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    const start = turnStart(); await act(async () => { start.click(); start.click(); });
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1].find(order => order.key === 'a0')).toEqual({ key: 'a0', skill: 0, target: 'e3' });
    const result = advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(result.state.allies[0].mp).toBe(state.allies[0].mp - state.allies[0].monster.skills[0]!.mpCost + 2);
    expect(result.events.filter(event => event.kind === 'cast' && event.actor === 'a0')).toHaveLength(1);
  });

  it('preserves automatic order and label when an ordinary attack replacement is escaped', async () => {
    const { advance } = await begin();
    await click(command('おまかせ')); await click(actor(0));
    const storedText = summaryText(), beforeMp = mp();
    await click(command('たたかう')); expect(summary()).toBeNull();
    await escape();
    expect(summaryText()).toBe(storedText); expect(summaryText()).toContain('おまかせ');
    expect(mp()).toEqual(beforeMp); expect(advance).not.toHaveBeenCalled();
  });

  it('retains auto-advance and focuses turn start only after the final living actor commits', async () => {
    const { advance } = await begin({ mutate: state => { state.allies[4].hp = 0; } });
    for (let index = 0; index < 4; index++) {
      expect(actor(index).getAttribute('aria-pressed')).toBe('true');
      expect(summary()).toBeNull();
      await click(command('ぼうぎょ'));
      expect(document.activeElement === turnStart()).toBe(index === 3);
    }
    expectSummary('ぼうぎょ', '自分');
    expect(document.querySelector('.commandHeading')?.textContent).toContain('バンシー');
    expect(actor(4).disabled).toBe(true);
    await act(async () => actor(4).click());
    expectSummary('ぼうぎょ', '自分');
    expect(actor(3).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(4);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    expect(advance).not.toHaveBeenCalled();
  });

  it.each(['details', 'tactics', 'log', 'leave'] as const)('keeps the committed summary and resources when %s is opened and closed', async overlay => {
    const { advance } = await begin();
    await commitAttack(0, 1); await click(actor(0));
    const before = summaryText(), beforeMp = mp();
    const opener = overlay === 'details' ? button('詳細') : overlay === 'tactics' ? button('作戦') : overlay === 'log' ? button('ログ') : label('闘技場に戻る');
    await click(opener);
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).not.toBeNull();
    if (overlay === 'details') await click(label('詳細を閉じる'));
    else if (overlay === 'tactics') await click(label('作戦情報を閉じる'));
    else if (overlay === 'log') await escape(document.activeElement!);
    else await click(button('対戦を続ける'));
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull();
    expect(summaryText()).toBe(before); expect(mp()).toEqual(beforeMp);
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.activeElement).not.toBe(turnStart()); expect(advance).not.toHaveBeenCalled();
  });
});

describe('committed summaries across command deadlines and battle lifecycle', () => {
  it.each(['timeout', 'overdue repeated target'] as const)('executes the previous committed order when pending replacement reaches %s', async mode => {
    const { state, advance } = await begin();
    await commitAttack(0, 1); await chooseSpecial(0, '狐火');
    expect(summary()).toBeNull(); const beforeMp = mp();
    if (mode === 'timeout') await tick(30000);
    else {
      const pending = target(3);
      await act(async () => {
        vi.setSystemTime(Date.now() + 30001); pending.click(); pending.click(); window.dispatchEvent(new Event('focus'));
      });
    }
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.automaticOrders(state, [{ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e1' }]));
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
    expect(summary()).toBeNull(); expect(document.querySelector('.targetButtons')).toBeNull();
    expect(mp()).toEqual(beforeMp);
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(summary()).toBeNull(); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(actor(0)); expect(summary()).toBeNull();
    await tick(1000); expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['skip', 'natural'] as const)('hides summaries during playback and clears them at next turn after %s', async mode => {
    const { advance } = await begin();
    await defendAll(); expectSummary('ぼうぎょ', '自分');
    await click(turnStart()); expect(summary()).toBeNull();
    expect(document.querySelector('.commandHeading')).toBeNull();
    expect([...document.querySelectorAll<HTMLButtonElement>('.commander')].every(node => node.disabled)).toBe(true);
    if (mode === 'skip') await click(button('演出をスキップ'));
    else await tick(buildTimeline(advance.mock.results[0].value.events).duration);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('30');
    expect(summary()).toBeNull(); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    for (let index = 0; index < 5; index++) { await click(actor(index)); expect(summary()).toBeNull(); }
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('discards a reviewed command on abandon and starts a new battle with no stale order or target', async () => {
    const { setup, advance } = await begin();
    await commitAttack(0, 1); await click(actor(0)); expectSummary('通常攻撃', '敵2 バステト');
    await click(label('ホーム')); await click(button('中断して移動'));
    expect(window.location.hash).toBe('#home'); expect(summary()).toBeNull();
    await tick(60000); expect(advance).not.toHaveBeenCalled();
    await click(label('闘技場')); await click(button('この編成で対戦する'));
    expect(setup).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(summary()).toBeNull(); expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('30');
    await click(actor(0)); expect(summary()).toBeNull();
  });

  it.each(['skip', 'natural'] as const)('leaves no summary after automatic completed-match return via %s or next battle', async mode => {
    const { advance, setup } = await begin({ mutate: state => {
      for (const enemy of state.enemies) { enemy.hp = 1; enemy.poison = 1; }
    } });
    await defendAll(); expectSummary('ぼうぎょ', '自分');
    await click(turnStart()); expect(summary()).toBeNull();
    const result = advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(result.state.winner).toBe('win');
    if (mode === 'skip') await click(button('演出をスキップ'));
    else await tick(buildTimeline(result.events).duration);
    expect(window.location.hash).toBe('#arena');
    expect(document.querySelector('.arenaLobby .result')).not.toBeNull();
    expect(document.querySelector('.committedOrder, .commandHeading, .commandDock')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.arenaLobby h2.srOnly'));
    await tick(60000); expect(advance).toHaveBeenCalledTimes(1);
    await click(button('この編成で対戦する'));
    expect(setup).toHaveBeenCalledTimes(2);
    expect(summary()).toBeNull(); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });
});
