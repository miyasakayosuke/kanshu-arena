// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as trials from './familyTrials';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const battleStarts = (spy: MockInstance<typeof engine.start>) => spy.mock.calls.flatMap((args, index) =>
  args[1].length ? [{ args, state: spy.mock.results[index].value as engine.State }] : []);
async function mount() { await act(async () => root.render(<App />)); }
async function arena() { await click(label('闘技場')); }
async function begin() { await arena(); await click(button('この編成で対戦する')); }
async function finish() {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始')); await click(button('演出をスキップ'));
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
// Navigation uses Math.random for history keys too; keep this seed stable until
// the test changes it, and count only calls to the encounter draw below.
function seededDraws(seed: number) {
  return vi.spyOn(Math, 'random').mockReturnValue(seed / 0x100000000);
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('random pure-family encounter lifecycle', () => {
  it.each([
    { seed: 0, family: 'beast' }, { seed: 2, family: 'nature' },
    { seed: 7, family: 'dragon' }, { seed: 4, family: 'material' },
    { seed: 1, family: 'slime' }, { seed: 3, family: 'demon' }, { seed: 8, family: 'undead' },
  ])('draws a legal first $family encounter from fresh seed $seed', async ({ seed, family }) => {
    seededDraws(seed);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await begin();
    const [first] = battleStarts(setup);
    const encounter = draw.mock.results[0].value;
    expect(encounter.family).toBe(family);
    expect(first.args).toEqual([[0, 2, 3, 4, 6], encounter.enemy, seed, { leaders: true }]);
    expect(first.state.seed).toBe(seed);
    expect(first.state.enemies.map(unit => unit.monster.id)).toEqual(encounter.enemy);
    expect(first.args[1]).not.toEqual([1, 5, 8, 10, 6]);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('does not draw on navigation and locks double-start before sampling randomness', async () => {
    seededDraws(42);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await arena(); await click(label('ホーム')); await arena();
    expect(draw).not.toHaveBeenCalled();
    const start = button('この編成で対戦する');
    await act(async () => { start.click(); start.click(); });
    expect(draw).toHaveBeenCalledTimes(1);
    expect(battleStarts(setup)).toHaveLength(1);
    expect(battleStarts(setup)[0].state.seed).toBe(42);
  });

  it('reuses enemy, seed and rule on immediate retry and after rebuilding without drawing again', async () => {
    seededDraws(1);
    const setup = vi.spyOn(engine, 'start');
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); await begin();
    const original = structuredClone(battleStarts(setup)[0]);
    await finish(); await click(button('同じ編成ですぐ再戦'));
    expect(battleStarts(setup)[1]).toEqual(original);
    await finish(); await click(button('編成を見直して再戦'));
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    await arena(); await click(button('この編成で同じ相手に再戦'));
    const rebuilt = battleStarts(setup)[2];
    expect(rebuilt.args[0]).toEqual([2, 0, 3, 4, 6]);
    expect(rebuilt.args.slice(1)).toEqual(original.args.slice(1));
    expect(rebuilt.state.enemies).toEqual(original.state.enemies);
    expect(rebuilt.state.seed).toBe(original.state.seed);
    expect(rebuilt.state.history).toEqual([]);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('draws anew after a finished ordinary battle and after an interrupted battle', async () => {
    const random = seededDraws(1);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await begin(); await finish();
    await click(button('闘技場に戻る → 次の相手'));
    random.mockReturnValue(2 / 0x100000000); await click(button('この編成で対戦する'));
    await click(label('闘技場に戻る')); await click(button('中断して移動'));
    random.mockReturnValue(3 / 0x100000000); await click(button('この編成で対戦する'));
    expect(battleStarts(setup).map(({ args }) => args[2])).toEqual([1, 2, 3]);
    expect(battleStarts(setup).map(({ args }) => args[1])).toEqual(draw.mock.results.map(result => result.value.enemy));
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it('draws a fresh legal nature encounter when a rule change cancels controlled practice', async () => {
    const random = seededDraws(1);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await begin(); await finish(); await click(button('編成を見直して再戦'));
    await click(button('軽量戦')); random.mockReturnValue(2 / 0x100000000); await begin();
    expect(battleStarts(setup)[1].args.slice(1)).toEqual([[14, 3, 6, 9, 10], 2, { leaders: true }]);
    expect(document.querySelector('.practiceNotice')).toBeNull();
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('draws again when the user explicitly leaves same-encounter practice', async () => {
    const random = seededDraws(1);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await begin(); await finish(); await click(button('編成を見直して再戦'));
    await click(button('通常の対戦へ')); random.mockReturnValue(2 / 0x100000000); await begin();
    expect(battleStarts(setup)[1].args[2]).toBe(2);
    expect(battleStarts(setup)[1].args[1]).toEqual(draw.mock.results[1].value.enemy);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('does not sample for an over-budget team', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [15, 5, 16, 17, 18], rule: 'light' }));
    seededDraws(1);
    const draw = vi.spyOn(trials, 'familyEncounterForSeed');
    const setup = vi.spyOn(engine, 'start');
    await mount(); await arena();
    const start = button('この編成で対戦する');
    expect(start.disabled).toBe(true); await click(start);
    expect(battleStarts(setup)).toHaveLength(0); expect(draw).not.toHaveBeenCalled();
  });
});
