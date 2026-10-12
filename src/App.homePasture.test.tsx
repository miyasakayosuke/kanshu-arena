// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as trials from './familyTrials';

let root: Root;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const textButton = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const shown = () => [...document.querySelectorAll<HTMLElement>('.pastureMonster')].map(node => Number(node.dataset.monsterId));
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const mount = async () => { await act(async () => root.render(<App />)); };
const history = async (direction: 'back' | 'forward') => { await act(async () => { window.history[direction](); await Promise.resolve(); }); };
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  document.body.innerHTML = '<div id="root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('home pasture uses the workshop source of truth', () => {
  it('loads persisted selections and opens/closes details without starting timers, battle, or a random opponent', async () => {
    const team = [14, 3, 6, 9, 10];
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'light' }));
    const start = vi.spyOn(engine, 'start'), advance = vi.spyOn(engine, 'advanceWithEvents'), draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); expect(shown()).toEqual(team);
    expect([...document.querySelectorAll('.mainNav button')].map(node => node.getAttribute('aria-label'))).toEqual(['ホーム', '図鑑', '編成', '闘技場']);
    const trigger = label('玄武の詳細'); trigger.focus(); await click(trigger);
    expect(document.querySelector('.profileModal')).toBeTruthy(); await click(label('詳細を閉じる'));
    expect(document.activeElement).toBe(trigger); expect(shown()).toEqual(team);
    await act(async () => vi.advanceTimersByTime(120000));
    expect(start).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled();
    expect(document.querySelector('canvas, [role="timer"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('kanshu-workshop-v1')!).team).toEqual(team);
  });

  it('reflects replacements, leader swaps, saved-party loads, navigation, and reloads', async () => {
    const savedTeam = [14, 3, 6, 9, 10];
    localStorage.setItem('kanshu-team-slots-v1', JSON.stringify([{ team: savedTeam, rule: 'light' }, null, null]));
    await mount(); await click(label('編成'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ')); await click(document.querySelector('.confirmReplacement')!);
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    await click(label('ホーム')); expect(shown()).toEqual([2, 1, 3, 4, 6]);
    await history('back'); expect(window.location.hash).toBe('#team'); await history('forward'); expect(shown()).toEqual([2, 1, 3, 4, 6]);
    await click(label('編成')); await click(document.querySelector('.savedTeams > summary')!); await click(label('編成1を呼び出す'));
    await click(label('ホーム')); expect(shown()).toEqual(savedTeam);
    await act(async () => root.unmount()); root = createRoot(document.getElementById('root')!); await mount(); expect(shown()).toEqual(savedTeam);
  });

  it('shows rebuilt rematch selections while preserving the held enemy and seed', async () => {
    const start = vi.spyOn(engine, 'start'), draw = vi.spyOn(trials, 'familyEncounterForSeed');
    await mount(); await click(label('闘技場')); await click(textButton('この編成で対戦する'));
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) { await click(textButton('この指示でターン開始')); await click(textButton('演出をスキップ')); }
    expect(document.querySelector('.result')).toBeTruthy(); await click(textButton('編成を見直して再戦'));
    await click(label('1枠・妖狐を入れ替える')); await click(label('トロルを候補に選ぶ')); await click(document.querySelector('.confirmReplacement')!);
    await click(label('ホーム')); expect(shown()).toEqual([1, 2, 3, 4, 6]);
    await act(async () => vi.advanceTimersByTime(60000));
    expect(document.querySelector('[role="timer"]')).toBeNull();
    await click(label('闘技場')); expect(document.querySelector('.practiceNotice')).toBeTruthy(); await click(textButton('この編成で同じ相手に再戦'));
    const battles = start.mock.calls.filter(([, enemies]) => enemies.length > 0);
    expect(battles).toHaveLength(2); expect(battles[1][0]).toEqual([1, 2, 3, 4, 6]); expect(battles[1].slice(1)).toEqual(battles[0].slice(1)); expect(draw).toHaveBeenCalledOnce();
  });
});
