// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import * as stage from './BattleStage';
import { applyBattleEvents, buildTimeline, CAST_IMPACT_MS } from './playback';

let root: Root;
const pure = [19, 20, 21, 22, 23];
const mixed = [19, 20, 21, 6, 2];
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(name))!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const hp = () => [...document.querySelectorAll('.commanderHp')].map(node => node.textContent);
const mp = () => [...document.querySelectorAll('.commanderMp')].map(node => node.textContent);
const portraits = () => [...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(node => ({ src: node.src, style: node.getAttribute('style'), className: node.className }));
async function mount(team = pure, rule = 'standard') {
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule }));
  await act(async () => root.render(<App />));
}
async function begin(team = pure) { await mount(team); await click(label('闘技場')); await click(button('この編成で対戦する')); }
async function defendAll(team = pure) {
  for (const id of team) { await click(label(`${engine.monsters[id].name}の行動を選択`)); await click(button('ぼうぎょ')); }
}
// Use real engine events with controlled enemy orders, so the UI's turn-end contract
// cannot pass through a hand-authored fake healing event.
function repairFixture(mutate?: (state: engine.State) => void) {
  const originalStart = engine.start, originalAdvance = engine.advanceWithEvents;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
    const state = originalStart(...args);
    for (const unit of [...state.allies, ...state.enemies]) { unit.hp -= 60; unit.poison = 1; }
    mutate?.(state);
    return state;
  });
  const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => originalAdvance(state, orders, {
    enemyOrders: state.enemies.filter(unit => unit.hp > 0).map(unit => ({ key: unit.key, skill: engine.DEFEND })),
  }));
  return { setup, resolve };
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('material repair live battle UI', () => {
  it.each([1, 2])('plays repair after every poison tick at %sx, with unique visual ticks and no extra order or MP spend', async speed => {
    const { setup, resolve } = repairFixture();
    const renderStage = vi.spyOn(stage, 'default');
    await begin();
    expect(document.querySelector('header')?.textContent).toContain('PLAYTEST 0.13');
    expect(document.querySelector('#party-status-a0')?.textContent).toContain('修復:待機');
    const beforePortraits = portraits(), beforeMp = mp();
    expect(beforePortraits).toHaveLength(5);
    for (const portrait of beforePortraits) { expect(portrait.style).toBeNull(); expect(portrait.className).not.toMatch(/motion|animat/); }
    expect([...document.querySelectorAll('.battleStage .enemyVital strong')].map(node => node.textContent)).toEqual(setup.mock.results[0].value.enemies.map((unit: engine.Unit) => unit.monster.name));
    expect(document.querySelectorAll('.battleStage .commanderIcon')).toHaveLength(0);
    expect(document.querySelector('.battleCanvas')?.getAttribute('aria-label')).toContain('敵だけが表示される戦闘フィールド');
    expect(document.querySelectorAll('.commandButtons button')).toHaveLength(4);
    if (speed === 2) await click(label('演出速度'));
    await defendAll(); await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events);
    const passive = timeline.cues.find(cue => cue.passive && !cue.impacts.length)!;
    const impact = timeline.cues.find(cue => cue.passive && cue.impacts.length)!;
    const casts = timeline.cues.filter(cue => cue.cast && !cue.impacts.length);
    expect(result.events.filter(event => event.kind === 'cast')).toHaveLength(10);
    expect(casts).toHaveLength(11);
    expect(passive.at).toBeGreaterThan(Math.max(...timeline.cues.filter(cue => cue.impacts.some(event => event.effect === 'poison')).map(cue => cue.at)));
    let elapsed = 0;
    const visualTicks: number[] = [];
    for (const [index, cue] of casts.entries()) {
      await tick(cue.at / speed + 1 - elapsed);
      elapsed = cue.at / speed + 1;
      const props = renderStage.mock.calls.at(-1)![0];
      visualTicks.push(props.effect!.tick);
      expect(document.querySelector('.battleMessage')?.textContent).toContain(cue.passive ? '特性 · 一度だけ' : `${index + 1} / 10`);
      expect(document.querySelector('.battleMessage')?.textContent).not.toContain('11 / 10');
      expect(portraits()).toEqual(beforePortraits);
    }
    expect(new Set(visualTicks).size).toBe(11);
    expect(document.querySelector('.battleMessage')?.textContent).toContain('炉心の修復 · 生存する物質系 5体');
    expect(document.querySelector('#party-status-a0')?.textContent).not.toContain('修復:待機');
    const atPassiveStart = timeline.cues.filter(cue => cue.at <= passive.at).reduce((state, cue) => applyBattleEvents(state, [...(cue.updates ?? []), ...cue.impacts]), setup.mock.results[0].value as engine.State);
    expect(hp()).toEqual(atPassiveStart.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    const beforeRepair = hp();
    expect(mp()).toEqual(beforeMp);
    expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(5);
    await tick(CAST_IMPACT_MS / speed - 2);
    expect(hp()).toEqual(beforeRepair);
    await tick(1);
    expect(hp()).toEqual(result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    expect(mp()).toEqual(beforeMp);
    expect(document.querySelectorAll('.partyImpact.heal')).toHaveLength(5);
    expect(portraits()).toEqual(beforePortraits);
    expect(impact.at - passive.at).toBe(CAST_IMPACT_MS);
    await click(button('演出をスキップ'));
    expect(hp()).toEqual(result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    await click(button('作戦'));
    expect(document.querySelector('.materialTactics')?.textContent).toContain('発動済み、または解除済み');
    expect(document.querySelectorAll('.initiativeList li')).toHaveLength(5);
  });

  it('repairs only surviving material allies, never revives, and keeps fixed eligibility after a companion falls', async () => {
    const { resolve } = repairFixture(state => { state.allies[1].hp = 1; });
    await begin(mixed); await defendAll(mixed); await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events), impact = timeline.cues.find(cue => cue.passive && cue.impacts.length)!;
    expect(impact.cast?.targets).toEqual(['a0', 'a2']);
    await tick(impact.at + 1);
    expect(document.querySelector('#party-hp-a1')?.textContent).toBe(`HP 0/${result.state.allies[1].monster.hp}`);
    expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(2);
    expect(document.querySelector('.battleMessage')?.textContent).toContain('生存する物質系 2体');
    expect(document.querySelector('.battleMessage')?.textContent).not.toContain('味方全体');
    expect([...document.querySelectorAll('.commander .partyImpact.heal')].map(node => node.parentElement?.getAttribute('aria-label'))).toEqual(['タロスの行動を選択', 'ぬりかべの行動を選択']);
    expect(hp()).toEqual(result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    await click(button('演出をスキップ'));
    await defendAll([19, 21, 6, 2]); await click(button('この指示でターン開始'));
    expect(buildTimeline(resolve.mock.results[1].value.events).cues.some(cue => cue.passive)).toBe(false);
  });

  it.each([
    { team: mixed, text: '修復待ち・1T末の毒後', ready: true },
    { team: [19, 20, 13, 6, 2], text: '条件未成立', ready: false },
    { team: [20, 21, 22, 6, 2], text: '中核なし', ready: false },
  ])('explains readiness without confusing ineligible with spent for $team', async ({ team, text, ready }) => {
    await begin(team);
    expect(document.querySelector('#party-status-a0')?.textContent.includes('修復:待機')).toBe(ready);
    await click(button('作戦'));
    expect(document.querySelector('.materialTactics')?.textContent).toContain(text);
    const tactics = document.querySelector('.tacticsModal')!.textContent!;
    for (const phrase of ['両軍の毒ダメージ後', '一度だけ', '各最大HPの14%', 'MP・行動を使わず', '戦闘不能の仲間は戻りません', '通常の防御解除は命中前', 'フェンリルは命中後']) expect(tactics).toContain(phrase);
    expect(document.querySelectorAll('.initiativeList li')).toHaveLength(5);
    await tick(6000);
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('24');
    await click(label('作戦情報を閉じる'));
    for (const id of team) {
      await click(label(`${engine.monsters[id].name}の行動を選択`));
      expect(document.querySelectorAll('.commandButtons button')).toHaveLength(4);
      await click(button('とくぎ'));
      expect(document.querySelectorAll('.skillButtons button')).toHaveLength(engine.monsters[id].skills.length);
      expect(document.querySelectorAll('.skillButtons button').length).toBeLessThanOrEqual(4);
      expect(document.querySelector('.skillButtons')?.textContent).not.toContain('炉心の修復');
      await click(button('コマンドに戻る'));
    }
  });

  it.each(['before-passive', 'before-impact'])('skips %s into exactly the same final HP, MP and readiness without stale timers', async phase => {
    const { resolve } = repairFixture();
    await begin(); await defendAll(); await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events), passive = timeline.cues.find(cue => cue.passive && !cue.impacts.length)!;
    if (phase === 'before-impact') await tick(passive.at + 1);
    await click(button('演出をスキップ'));
    const finalHp = result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`);
    const finalMp = result.state.allies.map(unit => `MP ${unit.mp}/${unit.monster.mp}`);
    expect(hp()).toEqual(finalHp); expect(mp()).toEqual(finalMp);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('修復:終了');
    await tick(timeline.duration + 1);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(hp()).toEqual(finalHp); expect(mp()).toEqual(finalMp);
    expect(document.querySelector('.playingPanel')).toBeNull();
  });

  it('shows a poisoned core as defeated and never starts the repair when poison kills it first', async () => {
    const { resolve } = repairFixture(state => { state.allies[0].hp = 1; });
    await begin(); await defendAll(); await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events);
    expect(timeline.cues.some(cue => cue.passive)).toBe(false);
    await tick(timeline.duration + 1);
    expect(document.querySelector('#party-hp-a0')?.textContent).toBe(`HP 0/${result.state.allies[0].monster.hp}`);
    expect(label('タロスの行動を選択').classList.contains('fallen')).toBe(true);
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('');
    expect(document.querySelectorAll('.partyImpact.heal')).toHaveLength(0);
    await click(button('作戦'));
    expect(document.querySelector('.materialTactics')?.textContent).toContain('中核が戦闘不能・発動なし');
  });

  it.each([8, 12])('clears visible readiness at the real strip cue from attacker %s, with no later repair animation', async attacker => {
    const originalStart = engine.start, originalAdvance = engine.advanceWithEvents;
    vi.spyOn(engine, 'start').mockImplementationOnce((team, _enemies, seed, options) => {
      const state = originalStart(team, [attacker], seed, options);
      state.allies.slice(1).forEach(unit => { unit.hp = 0; });
      return state;
    });
    const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => originalAdvance(state, orders, {
      enemyOrders: [{ key: 'e0', skill: attacker === 8 ? 3 : 0, target: 'a0' }],
    }));
    await begin(); await click(button('ぼうぎょ')); await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    const timeline = buildTimeline(result.events);
    const strip = timeline.cues.find(cue => [...(cue.updates ?? []), ...cue.impacts].some(event => event.kind === 'break' && event.repairReady === false))!;
    expect(strip).toBeTruthy(); expect(timeline.cues.some(cue => cue.passive)).toBe(false);
    await tick(strip.at - 1);
    expect(document.querySelector('#party-status-a0')?.textContent).toContain('修復:待機');
    await tick(1);
    expect(document.querySelector('#party-status-a0')?.textContent).toContain('修復:終了');
    await tick(timeline.duration - strip.at + 1);
    expect(hp()).toEqual(result.state.allies.map(unit => `HP ${unit.hp}/${unit.monster.hp}`));
    expect(document.querySelector('.battleMessage')?.textContent).not.toContain('炉心の修復');
    await click(button('作戦'));
    expect(document.querySelector('.materialTactics')?.textContent).toContain('発動済み、または解除済み');
  });

  it('preserves legacy IDs and permits COST17 materials only in standard while COST15 mixed remains light-legal', async () => {
    localStorage.setItem('kanshu-team', JSON.stringify([5, 1, 4, 8, 6]));
    await act(async () => root.render(<App />)); await click(label('編成'));
    expect([...document.querySelectorAll('.builderSlots .teamUnit')].map(node => Number(node.getAttribute('data-monster-id')))).toEqual([5, 1, 4, 8, 6]);
    for (const team of [pure, mixed]) {
      await act(async () => root.unmount()); root = createRoot(document.getElementById('test-root')!);
      await mount(team, 'light'); await click(label('闘技場'));
      expect(button('この編成で対戦する').disabled).toBe(team === pure);
      if (team === pure) { await click(button('標準戦')); expect(button('この編成で対戦する').disabled).toBe(false); }
    }
  });

  it('retries the same battle with full HP, MP and repair readiness and agrees for normal,2x and skipped playback', async () => {
    const setup = vi.spyOn(engine, 'start'), resolve = vi.spyOn(engine, 'advanceWithEvents');
    await begin();
    const opening = structuredClone(setup.mock.results[0].value) as engine.State;
    const outcomes: engine.State[] = [];
    for (const mode of ['skip', 'normal', 'double']) {
      if (mode !== 'skip') {
        await click(button('同じ編成ですぐ再戦'));
        expect(setup.mock.calls.at(-1)).toEqual(setup.mock.calls[0]);
        expect(setup.mock.results.at(-1)!.value).toEqual(opening);
        expect(hp()).toEqual(opening.allies.map(unit => `HP ${unit.monster.hp}/${unit.monster.hp}`));
        expect(mp()).toEqual(opening.allies.map(unit => `MP ${unit.monster.mp}/${unit.monster.mp}`));
        expect(document.querySelector('#party-status-a0')?.textContent).toBe('修復:待機');
      }
      if (mode === 'double') await click(label('演出速度'));
      for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
        await click(button('この指示でターン開始'));
        if (mode === 'skip') await click(button('演出をスキップ'));
        else await tick(buildTimeline(resolve.mock.results.at(-1)!.value.events).duration / (mode === 'double' ? 2 : 1) + 1);
      }
      expect(document.querySelector('.result')).toBeTruthy();
      outcomes.push(resolve.mock.results.at(-1)!.value.state);
    }
    expect(outcomes[1]).toEqual(outcomes[0]); expect(outcomes[2]).toEqual(outcomes[0]);
  });
});
