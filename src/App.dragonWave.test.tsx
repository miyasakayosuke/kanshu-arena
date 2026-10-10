// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline } from './playback';

let root: Root;
const pure = [15, 5, 16, 17, 18];
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
async function mount(team = pure, rule = 'standard') {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule }));
  await act(async () => root.render(<App />));
}
async function begin(team = pure) { await mount(team); await click(label('闘技場')); await click(button('この編成で対戦する')); }
async function special(id: number, index: number, target?: string) {
  await click(label(`${engine.monsters[id].name}の行動を選択`));
  await click(button('とくぎ'));
  await click(button(engine.monsters[id].skills[index]!.name));
  if (target) await click(label(`${target}を対象に選択`));
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

describe('dragon wave battle UI', () => {
  it('charges once after a whole two-hit cast, debits MP and all charge at the finisher cast, and keeps ally portraits static', async () => {
    const resolve = vi.spyOn(engine, 'advanceWithEvents');
    await begin();
    expect(document.querySelector('header')?.textContent).toContain('PLAYTEST 0.13');
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:0/5');
    const portrait = document.querySelector<HTMLImageElement>('.commanderIcon img')?.src;
    await click(button('とくぎ'));
    expect(button('渇天の息').textContent).toContain('固定基礎10（現在の竜気0）');
    expect(button('渇天の息').title).toContain('乱数±10%');
    await click(button('渇天の息'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 62/62');
    await special(5, 0, 'トロル'); await special(16, 0, 'トロル'); await special(17, 0); await special(18, 0, 'トロル');
    expect(document.querySelector('#party-mp-a3')?.textContent).toBe('MP 50/50');
    await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events);
    const twinCast = timeline.cues.find(cue => cue.cast?.actor === 'a3' && !cue.impacts.length)!;
    const twinHits = timeline.cues.filter(cue => cue.cast?.actor === 'a3' && cue.impacts.some(event => event.kind === 'damage'));
    const gain = timeline.cues.find(cue => cue.updates?.some(event => event.effect === 'dragon-charge-gain' && event.actor === 'a3'))!;
    const finisher = timeline.cues.find(cue => cue.cast?.actor === 'a0' && !cue.impacts.length)!;
    expect(twinHits).toHaveLength(2);
    expect(gain.at).toBe(twinHits[1].at);
    await tick(twinCast.at + 1);
    expect(document.querySelector('#party-mp-a3')?.textContent).toBe('MP 38/50');
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:0/5');
    await tick(twinHits[0].at - twinCast.at);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:0/5');
    await tick(gain.at - twinHits[0].at);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:1/5');
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 62/62');
    await tick(finisher.at - gain.at);
    expect(finisher.cast?.dragonChargeSpent).toBeGreaterThan(0);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:0/5');
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 34/62');
    expect(document.querySelector<HTMLImageElement>('.commanderIcon img')?.src).toBe(portrait);
    await click(button('演出をスキップ'));
    expect(document.querySelector('#party-status-a0')?.textContent).toBe(engine.effectStatus(result.state.allies[0]));
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe(`MP ${result.state.allies[0].mp}/62`);
  });

  it.each([
    { team: [15, 16, 18, 2, 6], text: '有効 · 0/5', enabled: true },
    { team: [15, 16, 13, 2, 6], text: '条件未成立・蓄積なし', enabled: false },
  ])('shows qualified versus disabled charge without confusing zero with missing: $team', async ({ team, text, enabled }) => {
    await begin(team);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe(enabled ? '竜気:0/5' : '');
    await click(button('作戦'));
    const tactics = document.querySelector('.tacticsModal')!;
    expect(tactics.textContent).toContain(text);
    for (const phrase of ['連撃も1回分', '発動時に全消費', '通常の防御解除を命中前', '命中後に解除', '嵐の息吹は従来どおり攻撃力']) expect(tactics.textContent).toContain(phrase);
    await tick(6000);
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('24');
    await click(label('作戦情報を閉じる'));
    await click(button('とくぎ'));
    if (!enabled) expect(button('渇天の息').textContent).toContain('竜気条件未成立');
    await click(button('コマンドに戻る'));
    expect(document.querySelectorAll('.commandButtons button')).toHaveLength(4);
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 62/62');
  });

  it('keeps old save IDs intact and blocks cost17 dragons in light before a standard start', async () => {
    localStorage.setItem('kanshu-team', JSON.stringify([5, 1, 4, 8, 6]));
    await act(async () => root.render(<App />));
    await click(label('編成'));
    expect([...document.querySelectorAll('.builderSlots .teamUnit')].map(node => Number(node.getAttribute('data-monster-id')))).toEqual([5, 1, 4, 8, 6]);
    await act(async () => root.unmount()); root = createRoot(document.getElementById('test-root')!);
    await mount(pure, 'light'); await click(label('闘技場'));
    expect(button('この編成で対戦する').disabled).toBe(true);
    await click(button('標準戦'));
    expect(button('この編成で対戦する').disabled).toBe(false);
    await click(button('この編成で対戦する'));
    expect(document.querySelectorAll('.commander')).toHaveLength(5);
  });

  it('restores full HP, MP and zero charge on the exact same retry, with natural and skipped playback equal', async () => {
    const setup = vi.spyOn(engine, 'start'), resolve = vi.spyOn(engine, 'advanceWithEvents');
    await begin(); await finish(true);
    const completed = resolve.mock.results.at(-1)!.value.state;
    await click(button('同じ編成ですぐ再戦'));
    expect(setup.mock.calls.at(-1)).toEqual(setup.mock.calls[0]);
    expect(setup.mock.results.at(-1)!.value.allies[0]).toMatchObject({ hp: 242, mp: 62, dragonCharge: 0 });
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('竜気:0/5');
    expect(document.querySelector('#party-hp-a0')?.textContent).toBe('HP 242/242');
    await click(label('演出速度')); await finish(false);
    expect(resolve.mock.results.at(-1)!.value.state).toEqual(completed);
  });
});
