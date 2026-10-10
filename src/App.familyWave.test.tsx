// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline } from './playback';

let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
async function begin(team: number[]) {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  await act(async () => root.render(<App />)); await click(label('闘技場')); await click(button('この編成で対戦する'));
}
async function finish(skip: boolean) {
  for (let i = 0; i < 20 && !document.querySelector('.result'); i++) {
    await click(button('この指示でターン開始'));
    if (skip) await click(button('演出をスキップ')); else await tick(24000);
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('family-wave live battle UI', () => {
  it.each([[12,0,2,11,13], [12,0,2,6,13]])('shows actual signature hit count for %j without claiming squirrel dispel', async (...ids) => {
    const team = ids as number[];
    const resolve = vi.spyOn(engine, 'advanceWithEvents');
    await begin(team); await click(label('ラタトスクの行動を選択')); await click(button('とくぎ'));
    const skill = button('木の実の連弾');
    expect(skill.textContent).toContain(team.includes(11) ? 'ランダム4回' : 'ランダム3回');
    expect(skill.textContent).not.toContain('解除'); await click(skill);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('#party-mp-a4')?.textContent).toBe('MP 44/44');
    await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const cast = buildTimeline(result.events).cues.find(cue => cue.cast?.actor === 'a4' && !cue.impacts.length)!;
    await tick(cast.at + 1); expect(document.querySelector('#party-mp-a4')?.textContent).toBe('MP 34/44');
    await click(button('演出をスキップ'));
    expect(document.querySelector('#party-mp-a4')?.textContent).toBe('MP 34/44');
  });
  it('shows static nature ward, spends MP at cast, and restores HP/MP/ward for identical retry', async () => {
    const resolve = vi.spyOn(engine, 'advanceWithEvents'), setup = vi.spyOn(engine, 'start');
    await begin([14,3,6,9,10]);
    expect(document.querySelectorAll('.natureWarded')).toHaveLength(5);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('自然障壁:残2T');
    expect(document.querySelector('#party-hp-a0')?.textContent).toBe('HP 276/276');
    await finish(true); const completed = resolve.mock.results.at(-1)!.value.state;
    await click(button('同じ編成ですぐ再戦'));
    expect(setup.mock.results.at(-1)!.value.allies[0]).toMatchObject({ hp: 276, mp: 64, ward: 2 });
    expect(document.querySelectorAll('.natureWarded')).toHaveLength(5);
    await click(label('演出速度')); await finish(false);
    expect(resolve.mock.results.at(-1)!.value.state).toEqual(completed);
  });
});
