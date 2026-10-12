// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import App from './App';
import * as engine from './engine';
import { buildTimeline } from './playback';
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const card = (key: string) => document.querySelector(`#party-hp-${key}`)!.parentElement!;
const stateLabel = (key: string) => card(key).querySelector('i')!.textContent;
async function begin() { await act(async () => root.render(<App />)); await click(label('闘技場')); await click(button('この編成で対戦する')); }
function fixture() {
  const originalStart = engine.start, originalAdvance = engine.advanceWithEvents;
  vi.spyOn(engine, 'start').mockImplementation((team, enemy, seed, options) => {
    const state = originalStart(team, enemy.length ? [1, 5, 8, 10, 6] : enemy, seed, options);
    if (enemy.length) for (const unit of [...state.allies, ...state.enemies]) { unit.hp -= 60; unit.poison = 1; }
    return state;
  });
  return vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state) => originalAdvance(state,
    state.allies.filter(unit => unit.hp > 0).map(unit => ({ key: unit.key, skill: engine.DEFEND })),
    { enemyOrders: state.enemies.filter(unit => unit.hp > 0).map(unit => ({ key: unit.key, skill: engine.DEFEND })) }));
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [19,20,21,22,23], rule: 'standard' }));
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  document.body.innerHTML = '<div id="test-root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('completed command portrait state', () => {
  it.each([1, 2])('tracks real command boundaries at %sx and keeps passive repair completed', async speed => {
    const advance = fixture(); await begin();
    if (speed === 2) await click(label('演出速度'));
    await click(button('この指示でターン開始'));
    const timeline = buildTimeline(advance.mock.results[0].value.events);
    let elapsed = 0;
    for (const command of timeline.commands) {
      await tick(command.start / speed + 1 - elapsed); elapsed = command.start / speed + 1;
      for (const key of ['a0','a1','a2','a3','a4']) {
        const prior = timeline.commands.some(item => item.actor === key && item.end <= command.start);
        expect(stateLabel(key)).toBe(command.actor === key ? '行動中' : prior ? '行動済' : '待機');
        expect(card(key).classList.contains('actionCompleted')).toBe(prior && command.actor !== key);
      }
    }
    const passive = timeline.cues.find(cue => cue.passive && !cue.impacts.length)!;
    await tick(passive.at / speed + 1 - elapsed);
    expect(document.querySelectorAll('.commander.actionCompleted')).toHaveLength(5);
    expect(document.querySelectorAll('.commander.acting')).toHaveLength(0);
    expect(stateLabel('a0')).toBe('行動済');
    await tick((timeline.duration - passive.at) / speed);
    expect(document.querySelectorAll('.actionCompleted,.commander.acting')).toHaveLength(0);
    expect(stateLabel('a0')).toBe('未選択');
    await click(button('この指示でターン開始')); await tick(1);
    expect(document.querySelectorAll('.actionCompleted')).toHaveLength(0);
  });
  it('clears completion on skip and confirmed navigation without stale callbacks', async () => {
    const advance = fixture(); await begin(); await click(button('この指示でターン開始'));
    const timeline = buildTimeline(advance.mock.results[0].value.events);
    const firstAlly = timeline.commands.find(command => command.actor.startsWith('a'))!;
    await tick(firstAlly.end + 1); expect(card(firstAlly.actor).classList.contains('actionCompleted')).toBe(true);
    await click(button('演出をスキップ'));
    expect(document.querySelectorAll('.actionCompleted,.commander.acting')).toHaveLength(0);
    await tick(1000); expect(stateLabel(firstAlly.actor)).toBe('未選択');
    await click(button('この指示でターン開始')); await tick(firstAlly.end + 1);
    await click(label('ホーム')); await click(button('中断して移動'));
    await tick(timeline.duration + 1);
    expect(document.querySelector('.commandDock')).toBeNull();
    await click(label('闘技場')); await click(button('この編成で対戦する'));
    expect(document.querySelectorAll('.actionCompleted,.commander.acting')).toHaveLength(0);
  });
  it('keeps a unit defeated before its queued action out of completed/current state', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents').mockImplementation(state => ({
      state: { ...state, turn: state.turn + 1, allies: state.allies.map(unit => unit.key === 'a1' ? { ...unit, hp: 0 } : unit) },
      events: [
        { kind: 'cast', actor: 'e0', skill: '攻撃', target: 'a1' },
        { kind: 'damage', actor: 'e0', target: 'a1', amount: 999, hp: 0 },
        { kind: 'defeat', actor: 'e0', target: 'a1', hp: 0 },
        { kind: 'cast', actor: 'a0', skill: 'ぼうぎょ', target: 'a0' },
        { kind: 'guard', actor: 'a0', target: 'a0' },
      ],
    }));
    await begin(); await click(button('この指示でターン開始')); await tick(3001);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(stateLabel('a1')).toBe('戦闘不能');
    expect(card('a1').classList.contains('actionCompleted')).toBe(false);
    expect(card('a1').classList.contains('acting')).toBe(false);
    expect(stateLabel('a0')).toBe('行動済');
    expect(card('a0').getAttribute('aria-describedby')).toContain('party-command-a0');
  });
  it('starts a rematch without completed portraits or old replay timers', async () => {
    fixture(); await begin();
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
      await click(button('この指示でターン開始')); await tick(1501);
      await click(button('演出をスキップ'));
    }
    expect(document.querySelector('.result')).toBeTruthy();
    await click(button('同じ編成ですぐ再戦'));
    expect(document.querySelectorAll('.actionCompleted,.commander.acting')).toHaveLength(0);
    await tick(1000);
    expect(stateLabel('a0')).toBe('未選択');
  });
  it('keeps portrait dimming static, including reduced-motion users', () => {
    const css = readFileSync('src/style.css', 'utf8');
    expect(css).toContain('.commander.actionCompleted .commanderIcon{opacity:.58}');
    expect(css).toContain('.commanderIcon{animation:none;transform:none}');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
