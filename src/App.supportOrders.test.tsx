// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

const team = [2, 20, 0, 6, 11];
const attack: engine.Order = { key: 'a0', skill: engine.BASIC_ATTACK, target: 'e0' };
const cleanse: engine.Order = { key: 'a1', skill: 1, target: 'a2' };
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const click = async (element: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => element.click()); };
const individualAuto = () => document.querySelector<HTMLButtonElement>('.commandButtons button:last-child')!;
const preview = () => [...document.querySelectorAll('.initiativeList li')].map(element => element.textContent!);

async function begin() {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  const start = engine.start;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    const state = start(team, [29, 1, 8, 30, 31], 42, { leaders: true });
    state.allies[2].hp = 1;
    state.allies[2].poison = 3;
    return state;
  });
  const resolve = engine.advanceWithEvents;
  // Keep the injured ally alive long enough to observe the chosen support cast.
  const advance = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => resolve(state, orders, {
    enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })),
  }));
  await act(async () => root.render(<App />));
  await click(label('闘技場'));
  await click(button('この編成で対戦する'));
  return { state: setup.mock.results[0].value as engine.State, advance };
}

async function chooseAttack() {
  await click(label('バステトの行動を選択'));
  await click(button('たたかう'));
  await click(label('マモンを対象に選択'));
}

async function chooseSupport(name: string, skill: string) {
  await click(label(`${name}の行動を選択`));
  await click(button('とくぎ'));
  await click(button(skill));
}

async function checkPreview(state: engine.State, fixed: engine.Order[]) {
  const before = JSON.stringify(state);
  await click(button('作戦'));
  const lines = preview();
  for (const order of engine.completeOrders(state, fixed)) {
    const unit = state.allies.find(unit => unit.key === order.key)!;
    expect(lines.find(line => line.includes(unit.monster.name))).toContain(`${engine.battleSkill(unit.monster, order.skill)!.name} ·`);
  }
  expect(JSON.stringify(state)).toBe(before);
  await click(label('作戦情報を閉じる'));
  return lines;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('confirmed commands reserve only support they will actually perform', () => {
  it.each(['manual', 'timeout'] as const)('previews and executes the needed automatic cleanse on %s start', async route => {
    const { state, advance } = await begin();
    await chooseAttack();
    const lines = await checkPreview(state, [attack]);
    expect(lines.find(line => line.includes('バステト'))).toContain('通常攻撃 ·');
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    if (route === 'timeout') await act(async () => vi.advanceTimersByTime(30000));
    else await click(button('この指示でターン開始'));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [attack]));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([attack, cleanse]));
    const result = advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'cleanse', actor: 'a1', target: 'a2' }));
    expect(result.state.allies[2].poison).toBe(0);
    expect(result.state.allies[2].hp).toBeGreaterThan(1);
    expect(document.querySelector('.playingPanel')?.textContent).toContain(route === 'timeout' ? '時間切れ' : '行動中');
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    const nextLines = await checkPreview(result.state, []);
    expect(nextLines.find(line => line.includes('唐傘おばけ'))).not.toContain('傘下の清め ·');
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('individual auto commits the same cleanse shown by the preview after a fixed attack', async () => {
    const { state, advance } = await begin();
    await chooseAttack();
    await click(label('唐傘おばけの行動を選択'));
    await click(individualAuto());
    expect(label('唐傘おばけの行動を選択').textContent).toContain('おまかせ ✓');
    const lines = await checkPreview(state, [attack, cleanse]);
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [attack, cleanse]));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([attack, cleanse]));
  });

  it.each(['manual', 'individual auto'] as const)('replacing the %s cleanse with an attack releases its reservation', async previous => {
    const { state, advance } = await begin();
    if (previous === 'manual') {
      await chooseSupport('バステト', '清めの鈴');
      await click(label('妖狐を対象に選択'));
    } else {
      await click(label('バステトの行動を選択'));
      await click(individualAuto());
    }
    const before = await checkPreview(state, [{ key: 'a0', skill: 3, target: 'a2' }]);
    expect(before.find(line => line.includes('バステト'))).toContain('清めの鈴 ·');
    expect(before.find(line => line.includes('唐傘おばけ'))).not.toContain('傘下の清め ·');
    await chooseAttack();
    expect(label('バステトの行動を選択').textContent).toContain('指示済 ✓');
    expect(label('バステトの行動を選択').textContent).not.toContain('おまかせ ✓');
    const after = await checkPreview(state, [attack]);
    expect(after.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [attack]));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([attack, cleanse]));
  });

  it('a confirmed heal leaves the poisoned target available for the next automatic cleanser', async () => {
    const { state, advance } = await begin();
    await chooseSupport('バステト', '生命の雫');
    await click(label('妖狐を対象に選択'));
    const heal: engine.Order = { key: 'a0', skill: 1, target: 'a2' };
    const lines = await checkPreview(state, [heal]);
    expect(lines.find(line => line.includes('バステト'))).toContain('生命の雫 ·');
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([heal, cleanse]));
  });

  it('a later confirmed cleanse does not reserve support ahead of its party slot', async () => {
    const { state, advance } = await begin();
    await chooseSupport('唐傘おばけ', '傘下の清め');
    await click(label('妖狐を対象に選択'));
    const lines = await checkPreview(state, [cleanse]);
    expect(lines.find(line => line.includes('バステト'))).toContain('清めの鈴 ·');
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([
      { key: 'a0', skill: 3, target: 'a2' }, cleanse,
    ]));
  });

  it('reset discards confirmed support and automatic labels and rebuilds the original automatic plan', async () => {
    const { state, advance } = await begin();
    await chooseAttack();
    await click(label('唐傘おばけの行動を選択'));
    await click(individualAuto());
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(2);
    await click(button('全員おまかせ'));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(label('唐傘おばけの行動を選択').textContent).toContain('未選択');
    const lines = await checkPreview(state, []);
    expect(lines.find(line => line.includes('バステト'))).toContain('清めの鈴 ·');
    expect(lines.find(line => line.includes('唐傘おばけ'))).not.toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.autoOrders(state));
  });

  it.each(['back', 'escape', 'actor change', 'timeout'] as const)('an unfinished replacement target creates no support reservation on %s', async route => {
    const { state, advance } = await begin();
    await chooseAttack();
    await chooseSupport('バステト', '清めの鈴');
    expect(document.querySelector('.targetButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(button('対象を選んでください').disabled).toBe(true);
    const lines = await checkPreview(state, [attack]);
    expect(lines.find(line => line.includes('バステト'))).toContain('通常攻撃 ·');
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    if (route === 'timeout') await act(async () => vi.advanceTimersByTime(30000));
    else {
      if (route === 'back') await click(button('特技に戻る'));
      else if (route === 'escape') await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
      else await click(label('ガルーダの行動を選択'));
      expect(document.querySelector('.targetButtons')).toBeNull();
      await click(button('この指示でターン開始'));
    }
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [attack]));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([attack, cleanse]));
  });

  it('canceling battle navigation preserves the fixed attack and the needed automatic cleanse', async () => {
    const { state, advance } = await begin();
    await chooseAttack();
    await click(label('闘技場に戻る'));
    expect(document.querySelector('[role="alertdialog"][aria-label="対戦を中断しますか"]')).toBeTruthy();
    await click(button('対戦を続ける'));
    expect(document.querySelector('[role="alertdialog"][aria-label="対戦を中断しますか"]')).toBeNull();
    expect(window.location.hash).toBe('#arena/battle');
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(label('バステトの行動を選択').textContent).toContain('指示済 ✓');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    const lines = await checkPreview(state, [attack]);
    expect(lines.find(line => line.includes('唐傘おばけ'))).toContain('傘下の清め ·');
    await click(button('この指示でターン開始'));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][0]).toBe(state);
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([attack, cleanse]));
  });
});
