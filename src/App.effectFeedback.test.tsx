// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline, effectType } from './playback';

// DOM/state assertions only: Canvas is intentionally unavailable, so these tests
// do not establish final pixels, animation appearance, or browser rendering.
let root: Root;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const hp = () => [...document.querySelectorAll('.commanderHp')].map(node => node.textContent);

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

async function beginPoison(alive = 5, speed = 1) {
  // Real engine output with explicit fixture orders, not the old damaging-poison
  // mock. Keep all other actors defending so status application is unambiguous.
  const state = engine.start([0, 2, 3, 4, 6], [3, 1, 5, 8, 10], 20261011);
  state.allies.forEach((unit, index) => { if (index >= alive) unit.hp = 0; });
  vi.spyOn(engine, 'start').mockReturnValueOnce(state);
  const advance = engine.advanceWithEvents;
  const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation(current => advance(
    current,
    current.allies.map(unit => ({ key: unit.key, skill: engine.DEFEND })),
    { enemyOrders: current.enemies.map((unit, index) => ({ key: unit.key, skill: index === 0 ? 2 : engine.DEFEND })) },
  ));
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
  if (speed === 2) await click(label('演出速度'));
  await click(button('この指示でターン開始'));
  const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
  const timeline = buildTimeline(result.events);
  const cast = timeline.cues.find(cue => cue.cast?.effect === 'poison' && !cue.impacts.length)!;
  const application = timeline.cues.find(cue => cue.cast?.effect === 'poison' && cue.impacts.length)!;
  const periodic = timeline.cues.find(cue => cue.cast === null && cue.impacts.some(event => event.effect === 'poison'))!;
  expect(cast.cast).toMatchObject({ scope: 'all', targets: state.allies.slice(0, alive).map(unit => unit.key) });
  expect(application.impacts.map(event => event.kind)).toEqual(Array(alive).fill('poison'));
  expect(application.at - cast.at).toBe(800);
  return { state, result, timeline, cast, application, periodic, resolve };
}

describe('status-only incoming area feedback', () => {
  it.each([{ alive: 5, speed: 1 }, { alive: 5, speed: 2 }, { alive: 1, speed: 1 }, { alive: 1, speed: 2 }])(
    'releases on status application with $alive living targets at ×$speed', async ({ alive, speed }) => {
      const { state, result, timeline, cast, application, periodic } = await beginPoison(alive, speed);
      await tick(cast.at / speed);
      expect(document.querySelector('.partyArea.charging')).toBeTruthy();
      expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(alive);
      const before = hp();
      await tick((application.at - cast.at) / speed - 1);
      expect(document.querySelector('.partyArea.landed')).toBeNull();
      expect(hp()).toEqual(before);
      expect(document.querySelector('#party-status-a0')?.textContent).not.toContain('毒');
      await tick(1);
      expect(document.querySelector('.partyArea.landed')).toBeTruthy();
      expect(document.querySelector('.partyArea.charging')).toBeNull();
      expect(document.querySelector<HTMLElement>('.partySweep')?.style.animationDuration).toBe(`${650 / speed}ms`);
      expect(hp()).toEqual(before);
      expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
      expect(document.querySelector('#party-status-a0')?.textContent).toContain('毒:残3回');
      expect(document.querySelector('.battleMessage')?.textContent).toContain(`味方全体 ${alive}体`);
      await tick((periodic.at - application.at) / speed);
      expect(document.querySelector('.partyArea')).toBeNull();
      expect(document.querySelectorAll('.partyImpact.damage')).toHaveLength(alive);
      expect(document.querySelector('.battleMessage')?.textContent).toContain('毒のダメージ');
      expect(document.querySelector('#party-status-a0')?.textContent).toContain('毒:残2回');
      expect(result.state.allies[0].hp).toBe(state.allies[0].hp - Math.floor(state.allies[0].monster.hp * .06));
      await tick((timeline.duration - periodic.at) / speed);
      expect(document.querySelector('.partySweep')).toBeNull();
      expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
      expect(hp()).toEqual(result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    },
  );

  it.each(['charging', 'landed'] as const)('clears a skipped %s sweep and starts the next cast cleanly', async phase => {
    const { cast, application, resolve } = await beginPoison();
    await tick(phase === 'charging' ? cast.at : application.at);
    expect(document.querySelector(`.partyArea.${phase}`)).toBeTruthy();
    await click(button('演出をスキップ'));
    expect(document.querySelector('.partyArea')).toBeNull();
    expect(document.querySelector('.partySweep')).toBeNull();
    await click(button('この指示でターン開始'));
    const next = buildTimeline(resolve.mock.results[1].value.events);
    const nextCast = next.cues.find(cue => cue.cast?.effect === 'poison' && !cue.impacts.length)!;
    const nextApplication = next.cues.find(cue => cue.cast?.effect === 'poison' && cue.impacts.length)!;
    await tick(nextCast.at);
    expect(document.querySelector('.partyArea.charging')).toBeTruthy();
    expect(document.querySelector('.partyArea.landed')).toBeNull();
    await tick(nextApplication.at - nextCast.at);
    expect(document.querySelector('.partyArea.landed')).toBeTruthy();
  });
});

describe('Zilant command effect', () => {
  it('uses the water class for 翠雲の息 while retaining single-target selection and MP cost', async () => {
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: [18, 0, 2, 3, 6], rule: 'standard' }));
    await act(async () => root.render(<App />));
    await click(label('闘技場')); await click(button('この編成で対戦する')); await click(button('とくぎ'));
    const skill = button('翠雲の息');
    expect(skill.classList.contains('skill-water')).toBe(true);
    expect(skill.classList.contains('skill-slash')).toBe(false);
    expect(skill.textContent).toContain('MP 12');
    expect(skill.textContent).toContain('単体');
    const before = document.querySelector('#party-mp-a0')?.textContent;
    await click(skill);
    expect(document.querySelectorAll('.targetButtons button')).toHaveLength(5);
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe(before);
    await click(button('特技に戻る'));
    expect(button('翠雲の息').classList.contains('skill-water')).toBe(true);
  });

  it('maps only the named breath to water without reclassifying unrelated breath or overriding support kinds', () => {
    expect(effectType('翠雲の息', 'hit')).toBe('water');
    expect(effectType('翠雲の息', 'guard')).toBe('guard');
    expect(effectType('渇天の息', 'hit')).toBe('slash');
    expect(effectType('嵐の息吹', 'hit')).toBe('wind');
    expect(effectType('通常攻撃', 'hit')).toBe('slash');
    expect(effectType('毒霧', 'poison')).toBe('shadow');
  });
});
