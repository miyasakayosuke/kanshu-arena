// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';
import * as engine from './engine';
import {buildTimeline} from './playback';
import {FENRIR_ART_URL, FENRIR_PORTRAIT_URL} from './fenrirArt';

let root: Root;
const team = [12, 0, 2, 6, 10];
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const click = async (node: HTMLElement) => {expect(node).toBeTruthy(); await act(async () => node.click());};
const tick = async (ms: number) => {await act(async () => vi.advanceTimersByTime(ms));};
async function mount() {await act(async () => root.render(<App/>));}
async function begin() {await click(label('闘技場')); await click(button('この編成で対戦する'));}
async function finish(skip: boolean) {
  for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
    await click(button('この指示でターン開始'));
    if (skip) await click(button('演出をスキップ')); else await tick(22000);
  }
  expect(document.querySelector('.result')).toBeTruthy();
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({team, rule:'standard'}));
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => {await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers();});

describe('Fenrir family UI and battle loop', () => {
  it('shares original portraits, scoped recipients and truthful profile details', async () => {
    await mount();
    expect(document.querySelector<HTMLImageElement>('.teamUnit img')?.src).toBe(FENRIR_PORTRAIT_URL);
    await click(label('編成'));
    expect(document.querySelector('.familyRecipients')?.textContent).toBe('対象 3/5体：フェンリル・妖狐・バステト');
    await click(label('1枠・フェンリルを入れ替える'));
    await click(label('現在のフェンリルの詳細'));
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector<HTMLImageElement>('img')?.src).toBe(FENRIR_ART_URL);
    expect(profile.textContent).toContain('対象指定なし');
    expect(profile.textContent).toContain('守り中の初撃は半減');
    expect(profile.textContent).toContain('防御力・賢さ・属性相性は現在の戦闘では未導入');
    expect(profile.textContent).toContain('MP60で連牙は4回まで');
    await click(label('詳細を閉じる'));
    expect(JSON.parse(localStorage.getItem('kanshu-workshop-v1')!).team).toEqual(team);
  });

  it('filters beasts without treating birds or reptiles as eligible', async () => {
    await mount(); await click(label('編成')); await click(label('1枠・フェンリルを入れ替える'));
    await click(document.querySelector<HTMLElement>('.filterDisclosure summary')!);
    const select = document.querySelector<HTMLSelectElement>('[aria-label="系統で絞り込み"]')!;
    await act(async () => {select.value='beast'; select.dispatchEvent(new Event('change',{bubbles:true}));});
    const text = document.querySelector('.candidateList')!.textContent!;
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(6);
    for (const name of ['妖狐','バステト','セルキー','アヌビス','フェンリル','ラタトスク']) expect(text).toContain(name);
    for (const name of ['ガルーダ','ナーガ','烏天狗','ドリュアス']) expect(text).not.toContain(name);
    await click(label('絞り込みをリセット'));
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(engine.monsters.length);
  });

  it('commits a random barrage without target selection and spends MP only at its cast cue', async () => {
    const resolve = vi.spyOn(engine, 'advanceWithEvents');
    await mount(); await begin();
    const portrait = document.querySelector<HTMLImageElement>('.commanderIcon img')!.src;
    expect(document.querySelector('#party-status-a0')?.textContent).toContain('群気:残2T');
    expect(document.querySelector('#party-status-a3')?.textContent).toBe('');
    await click(button('とくぎ')); await click(button('破縛の連牙'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 60/60');
    expect(label('フェンリルの行動を選択').classList.contains('ordered')).toBe(true);
    await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const cues = buildTimeline(result.events).cues;
    const cast = cues.find(cue => cue.cast?.actor === 'a0' && !cue.impacts.length)!;
    expect(cast.cast?.scope).toBe('random');
    await tick(cast.at+1);
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 47/60');
    expect(document.querySelector('.battleMessage')?.textContent).toContain('ランダム5回');
    expect(document.querySelector<HTMLImageElement>('.commanderIcon img')?.src).toBe(portrait);
    await click(button('演出をスキップ'));
    expect(document.querySelector('#party-mp-a0')?.textContent).toBe('MP 47/60');
    expect(document.querySelector('#party-status-a0')?.textContent).toContain('群気:残1T');
  });

  it('keeps natural playback, skip, results, and exact rematch identical with rally and multihits', async () => {
    const resolve = vi.spyOn(engine, 'advanceWithEvents'); const setup = vi.spyOn(engine, 'start');
    await mount(); await begin(); await finish(true);
    const completed = resolve.mock.results.at(-1)!.value.state;
    expect(completed.history.some((turn: engine.BattleTurnRecord) => turn.events.some(event => event.scope === 'random'))).toBe(true);
    await click(button('同じ編成ですぐ再戦'));
    expect(setup.mock.results.at(-1)!.value.allies[0]).toMatchObject({hp:150,mp:60,rally:2});
    await finish(false);
    expect(resolve.mock.results.at(-1)!.value.state).toEqual(completed);
    expect(document.querySelector('[role=timer]')).toBeNull();
  });

  it('shows the free commands after MP exhaustion and preserves the 30 second deadline', async () => {
    const real = engine.start;
    vi.spyOn(engine, 'start').mockImplementation((...args) => {
      const state=real(...args);state.allies[0].mp=8;return state;
    });
    const resolve=vi.spyOn(engine,'advanceWithEvents');
    await mount();await begin();await click(button('とくぎ'));
    expect(button('破縛の連牙').disabled).toBe(true);
    expect(button('月下の一咬').disabled).toBe(true);
    await click(button('コマンドに戻る'));
    expect(button('たたかう').disabled).toBe(false);expect(button('ぼうぎょ').disabled).toBe(false);
    await tick(30000);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve.mock.results[0].value.events.filter((event: engine.BattleEvent) => event.kind==='cast'&&event.actor==='a0')[0]?.skill).toBe('通常攻撃');
  });
});
