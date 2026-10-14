// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { FakeTransactionalStorage } from './awakening/fakeStorage';
import { AwakeningStorage } from './awakening/storage';
import { rosterIds, trialRules } from './awakening/playSession';
import { createProgress } from './awakening/domain';
import * as engine from './engine';
let driver: FakeTransactionalStorage;
vi.mock('./awakening/indexedDbStorage', () => ({ IndexedDbTransactionalStorage: class {
  transaction(change: Parameters<FakeTransactionalStorage['transaction']>[0]) { return driver.transaction(change); }
} }));
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text))!;
const nav = (label: string) => document.querySelector<HTMLButtonElement>(`.mainNav button[aria-label="${label}"]`)!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => { element.click(); }); }
async function mount() { await act(async () => { root.render(<App />); }); }
beforeEach(() => {
  driver = new FakeTransactionalStorage(); vi.stubGlobal('indexedDB', {}); vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  localStorage.clear(); window.history.replaceState(null, '', '#home'); document.body.innerHTML = '<div id="root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('saves one actual completed match reward through skip and reload without changing saved teams', async () => {
  const spy = vi.spyOn(engine, 'advanceWithEvents'); await mount(); const teams = localStorage.getItem('kanshu-team-workshop-v2');
  await click(nav('闘技場')); await click(button('この編成で対戦する'));
  for (let n = 0; n < 20 && !document.querySelector('.result'); n++) { await click(button('この指示でターン開始')); await click(button('演出をスキップ')); }
  expect(document.querySelector('.result')).toBeTruthy(); const terminal = spy.mock.results.at(-1)!.value.state;
  const stored = await new AwakeningStorage(driver, rosterIds, trialRules).load(); expect(stored.status).toBe('ready');
  if (stored.status !== 'ready') throw Error('missing'); expect(stored.snapshot.progress.common).toBe(terminal.winner === 'win' ? 5 : 1);
  expect(stored.snapshot.progress.activeBattle).toBeNull(); expect(localStorage.getItem('kanshu-team-workshop-v2')).toBe(teams);
  const bytes = driver.inspect(); await act(async () => root.unmount()); root = createRoot(document.getElementById('root')!); await mount(); expect(driver.inspect()).toEqual(bytes);
});
it('rapid confirmations spend once and preserve a stale quote after another writer', async () => {
  const progress = createProgress(rosterIds, trialRules); progress.common = 30;
  driver = new FakeTransactionalStorage({ legacyRaw: JSON.stringify(progress) }); await mount();
  await click(button('1段階の覚醒を確認')); const confirm = button('素材を消費して覚醒する');
  await act(async () => { confirm.click(); confirm.click(); });
  const storage = new AwakeningStorage(driver, rosterIds, trialRules); let result = await storage.load(); if (result.status !== 'ready') throw Error('missing');
  expect(result.snapshot.progress.common).toBe(20); expect(result.snapshot.progress.monsters['0'].level).toBe(1);
  await click(button('1段階の覚醒を確認')); await storage.dispatch(result.snapshot.token, { kind: 'upgrade', speciesId: '0', expectedLevel: 1 });
  await click(button('素材を消費して覚醒する')); result = await storage.load(); if (result.status !== 'ready') throw Error('missing');
  expect(result.snapshot.progress.common).toBe(10); expect(result.snapshot.progress.monsters['0'].level).toBe(2); expect(document.body.textContent).toContain('保存を完了できませんでした');
});
it('leaving unfinished combat grants zero and a reload never silently abandons another tab', async () => {
  await mount(); await click(nav('闘技場')); await click(button('この編成で対戦する'));
  const active = driver.inspect(); await act(async () => root.unmount()); root = createRoot(document.getElementById('root')!); await mount();
  expect(driver.inspect()).toEqual(active); expect(document.body.textContent).toContain('未終了の対戦が保存されています');
  await click(button('未終了の対戦を整理する')); await click(button('報酬なしで終了する'));
  const result = await new AwakeningStorage(driver, rosterIds, trialRules).load(); if (result.status !== 'ready') throw Error('missing'); expect(result.snapshot.progress.common).toBe(0); expect(result.snapshot.progress.activeBattle).toBeNull();
});

it('cancels a delayed start after navigation away and back, without reviving an old intent', async () => {
  await mount(); await click(nav('闘技場'));
  let release!: () => void;
  const original = driver.transaction.bind(driver);
  vi.spyOn(driver, 'transaction').mockImplementationOnce(change => new Promise<void>(resolve => { release = resolve; }).then(() => original(change)));
  await click(button('この編成で対戦する'));
  await click(nav('ホーム')); await click(nav('闘技場'));
  await act(async () => { release(); });
  expect(window.location.hash).toBe('#arena'); expect(document.querySelector('.battleMode')).toBeNull();
  const result = await new AwakeningStorage(driver, rosterIds, trialRules).load();
  if (result.status !== 'ready') throw Error('missing');
  expect(result.snapshot.progress.activeBattle).toBeNull(); expect(result.snapshot.progress.common).toBe(0);
  expect(result.snapshot.progress.receipt?.outcome).toBe('abandoned');
});
it('does not retarget an interrupted-match confirmation after another tab starts a newer match', async () => {
  const storage = new AwakeningStorage(driver, rosterIds, trialRules);
  const first = await storage.initialize();
  const context = { initialStateJson: '{}', mode: 'standard', teamId: 'party', statRuleVersion: first.progress.statRuleVersion };
  const active = await storage.dispatch(first.token, { kind: 'begin', context });
  await mount(); await click(button('未終了の対戦を整理する'));
  const finished = await storage.dispatch(active.snapshot.token, { kind: 'settle', sequence: 1, completion: { kind: 'abandoned' } });
  const next = await storage.dispatch(finished.snapshot.token, { kind: 'begin', context });
  await click(button('報酬なしで終了する'));
  const after = await storage.load(); if (after.status !== 'ready') throw Error('missing');
  expect(after.snapshot.token).toBe(next.snapshot.token); expect(after.snapshot.progress.activeBattle?.sequence).toBe(2);
  await click(button('未終了の対戦を整理する')); await click(button('保存を再確認'));
  expect(button('報酬なしで終了する')).toBeUndefined();
});
