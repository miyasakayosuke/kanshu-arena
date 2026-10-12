// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

const team = [14, 3, 6, 9, 10];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const click = async (element: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => element.click()); };
const choosePoison = async (name: string) => {
  await click(label(`${name}の行動を選択`));
  await click(button('とくぎ'));
  await click(button('毒霧'));
};
async function begin(mutate?: (state: engine.State) => void) {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  const start = engine.start;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    const state = start(team, [29, 1, 8, 30, 31], 42, { leaders: true });
    mutate?.(state); return state;
  });
  const advance = vi.spyOn(engine, 'advanceWithEvents');
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
  return { setup, advance };
}
const preview = () => [...document.querySelectorAll('.initiativeList li')].map(element => element.textContent!);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('confirmed orders throughout the command UI', () => {
  it('previews only the confirmed poison and completes the same orders on manual start', async () => {
    const { advance } = await begin();
    await choosePoison('烏天狗');
    await click(button('作戦'));
    expect(preview().filter(line => line.includes('毒霧'))).toHaveLength(1);
    expect(preview().find(line => line.includes('烏天狗'))).toContain('毒霧');
    await click(label('作戦情報を閉じる'));
    await click(button('この指示でターン開始'));
    const result = advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(result.events.filter(event => event.kind === 'cast' && event.effect === 'poison' && event.actor?.startsWith('a'))).toHaveLength(1);
  });
});

const fixedPoison = (state: engine.State, index: number): engine.Order => ({key: `a${index}`, skill: state.allies[index].monster.skills.findIndex(skill => skill.kind === 'poison')});
const individualAuto = () => document.querySelector<HTMLButtonElement>('.commandButtons button:last-child')!;
async function checkPreview(state: engine.State, fixed: engine.Order[]) {
  await click(button('作戦'));
  const lines = preview();
  for (const order of engine.completeOrders(state, fixed)) {
    const unit = state.allies.find(unit => unit.key === order.key)!;
    expect(lines.find(line => line.includes(unit.monster.name))).toContain(`${engine.battleSkill(unit.monster, order.skill)!.name} ·`);
  }
  await click(label('作戦情報を閉じる'));
}

describe('shared completion, replacement and interrupted input', () => {
  it.each(['manual', 'timeout'] as const)('uses the previewed completed orders on %s, with confirmed poison preserved', async route => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('烏天狗');
    const fixed = [fixedPoison(state, 3)], expected = engine.completeOrders(state, fixed);
    const before = JSON.stringify(state);
    await checkPreview(state, fixed);
    expect(JSON.stringify(state)).toBe(before);
    if (route === 'timeout') await act(async () => vi.advanceTimersByTime(30000));
    else await click(button('この指示でターン開始'));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(expected);
    expect(document.querySelector('.playingPanel')?.textContent).toContain(route === 'timeout' ? '時間切れ' : '行動中');
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(advance).toHaveBeenCalledTimes(1);
    const result = advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    await checkPreview(result.state, []);
  });
  it('individual auto respects a confirmed later poisoner and keeps preview/execution consistent', async () => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('烏天狗');
    const fixed = [fixedPoison(state, 3)];
    const selected = engine.completeOrders(state, fixed).find(order => order.key === 'a1')!;
    expect(engine.battleSkill(state.allies[1].monster, selected.skill)?.kind).not.toBe('poison');
    await click(label('ドリュアスの行動を選択')); await click(individualAuto());
    fixed.push(selected);
    expect(label('ドリュアスの行動を選択').textContent).toContain('おまかせ ✓');
    await checkPreview(state, fixed);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, fixed));
  });
  it.each(['attack', 'poison'] as const)('individual auto replaces its own previous %s instead of treating it as fixed', async previous => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    const name = previous === 'attack' ? 'ドリュアス' : '烏天狗';
    const index = previous === 'attack' ? 1 : 3;
    if (previous === 'poison') await choosePoison(name);
    else {
      await click(label(`${name}の行動を選択`)); await click(button('たたかう')); await click(label('マモンを対象に選択'));
    }
    await click(label(`${name}の行動を選択`)); await click(individualAuto());
    const expected = engine.autoOrders(state).find(order => order.key === `a${index}`)!;
    await checkPreview(state, [expected]);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1].find(order => order.key === expected.key)).toEqual(expected);
  });
  it('a committed individual-auto poison remains fixed when a second poison is explicitly chosen', async () => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await click(label('ドリュアスの行動を選択')); await click(individualAuto());
    await choosePoison('烏天狗');
    await click(button('作戦'));
    expect(preview().filter(line => line.includes('毒霧'))).toHaveLength(2);
    await click(label('作戦情報を閉じる')); await click(button('この指示でターン開始'));
    const chosen = advance.mock.calls[0][1];
    expect(chosen.find(order => order.key === 'a1')?.skill).toBe(fixedPoison(state, 1).skill);
    expect(chosen.find(order => order.key === 'a3')?.skill).toBe(fixedPoison(state, 3).skill);
  });
  it('replacing the first poison with an attack clears its reservation for the remaining automatic allies', async () => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('ドリュアス');
    await click(label('ドリュアスの行動を選択')); await click(button('たたかう')); await click(label('マモンを対象に選択'));
    const fixed = [{key: 'a1', skill: engine.BASIC_ATTACK, target: 'e0'}];
    await checkPreview(state, fixed);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, fixed));
    expect(advance.mock.calls[0][1].find(order => order.key === 'a3')?.skill).toBe(fixedPoison(state, 3).skill);
  });
  it('reset clears both poison reservation and automatic labels, returning to the original full-auto plan', async () => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('烏天狗');
    await click(label('ドリュアスの行動を選択')); await click(individualAuto());
    await click(button('全員おまかせ'));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await checkPreview(state, []);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(engine.autoOrders(state));
  });
  it.each(['back', 'escape', 'timeout'] as const)('unfinished single-target poison creates no reservation on %s', async route => {
    const { setup, advance } = await begin(state => {
      const unit = state.allies[3];
      unit.monster = {...unit.monster, skills: unit.monster.skills.map(skill => skill.kind === 'poison' ? {...skill, all: false} : skill) as unknown as typeof unit.monster.skills};
    });
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('烏天狗');
    expect(document.querySelector('.targetButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await checkPreview(state, []);
    if (route === 'timeout') await act(async () => vi.advanceTimersByTime(30000));
    else {
      if (route === 'back') await click(button('特技に戻る'));
      else await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})));
      expect(document.querySelector('.targetButtons')).toBeNull();
      await click(button('この指示でターン開始'));
    }
    expect(advance.mock.calls[0][1]).toEqual(engine.autoOrders(state));
  });
  it('the deadline and repeated start clicks resolve the same confirmed commands exactly once', async () => {
    const { setup, advance } = await begin();
    const state = setup.mock.results[0].value as engine.State;
    await choosePoison('烏天狗');
    const start = button('この指示でターン開始');
    await act(async () => {
      vi.setSystemTime(Date.now() + 30001);
      start.click(); start.click();
      window.dispatchEvent(new Event('focus'));
    });
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.completeOrders(state, [fixedPoison(state, 3)]));
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
  });
});
