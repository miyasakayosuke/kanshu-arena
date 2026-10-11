// @vitest-environment happy-dom
import React, {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import App from './App';
import type {CompactCastCaption} from './BattleStage';
import * as engine from './engine';
import {buildTimeline} from './playback';

// App ownership/semantics only; real Canvas routing is tested in BattleStage.
// Keep the last caption on purpose to exercise the App's stale-event guard.
vi.mock('./BattleStage', () => ({default: (props: {
  castEvent?: engine.BattleEvent | null;
  onCompactCastCaption?: (caption: CompactCastCaption | null) => void;
}) => {
  useEffect(() => {
    if (props.castEvent) props.onCompactCastCaption?.({event: props.castEvent, lines: [props.castEvent.skill!, '味方 · ヤヌス', '生存する味方 · 5体へ今T守護']});
  }, [props.castEvent]);
  return <canvas />;
}}));
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (node: HTMLElement) => {expect(node).toBeTruthy(); await act(async () => node.click());};
const tick = async (ms: number) => {await act(async () => vi.advanceTimersByTime(ms));};
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
  document.body.innerHTML = '<div id="test-root"></div>';
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => {await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers();});

it('uses the existing caption, retains the original live announcement, and clears immediately on skip/new turn', async () => {
  const state = engine.start([36, 12, 2, 30, 26], [1, 5, 8, 10, 6], 4173);
  vi.spyOn(engine, 'start').mockReturnValueOnce(state);
  const original = engine.advanceWithEvents;
  const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation(current => original(current,
    current.allies.map((unit, index) => ({key: unit.key, skill: index ? engine.DEFEND : 1})),
    {enemyOrders: current.enemies.map(unit => ({key: unit.key, skill: engine.DEFEND}))},
  ));
  await act(async () => root.render(<App />));
  await click(document.querySelector('button[aria-label="闘技場"]')!);
  await click(button('この編成で対戦する'));
  await click(button('この指示でターン開始'));
  const timeline = buildTimeline(resolve.mock.results[0].value.events);
  const cue = timeline.cues.find(cue => cue.cast?.effect === 'responseGuard' && !cue.impacts.length)!;
  expect(cue).toBeTruthy();
  await tick(cue.at);
  const message = document.querySelector('.battleMessage')!;
  expect(document.querySelector('main')?.classList.contains('hasCompactCastCaption')).toBe(true);
  expect(message.querySelector('.battleCastCaption')?.textContent).toContain('合流の扉味方 · ヤヌス生存する味方 · 5体へ今T守護');
  expect(message.querySelector('.battleCastCaption')?.getAttribute('aria-hidden')).toBe('true');
  expect(message.querySelector('.castCaptionAnnouncement')?.textContent).toContain('合流の扉 · 生存する味方全員 5体');
  expect(message.getAttribute('aria-live')).toBe('polite');
  expect(message.querySelectorAll('[aria-live]')).toHaveLength(0);
  expect(message.querySelector('.battleCastCaption')?.textContent).toContain('/');
  await click(button('演出をスキップ'));
  expect(document.querySelector('.battleCastCaption')).toBeNull();
  expect(document.querySelector('main')?.classList.contains('hasCompactCastCaption')).toBe(false);
  await click(button('この指示でターン開始'));
  expect(document.querySelector('.battleCastCaption')).toBeNull();
  await tick(1);
  expect(document.querySelector('.battleMessage')?.textContent).not.toContain('合流の扉');
});
