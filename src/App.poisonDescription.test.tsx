// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import MonsterDetails from './MonsterDetails';
import TacticsPanel from './TacticsPanel';
import * as engine from './engine';
import { POISON_TIMING_HINT, poisonSkillDetail, poisonSkillHint } from './poisonDescription';
import { applyBattleEvents, buildTimeline } from './playback';

let root: Root;
const team = [3, 4, 9, 10, 2];
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const poisonButton = () => document.querySelector<HTMLButtonElement>('.skillButtons .skill-shadow')!;
const mp = () => [...document.querySelectorAll('.commanderMp')].map(node => node.textContent);
const hp = () => [...document.querySelectorAll('.commanderHp')].map(node => node.textContent);
const enemyVitals = () => [...document.querySelectorAll('.enemyVital')].map(node => node.textContent);
const portraits = () => [...document.querySelectorAll('.commanderIcon')].map(node => node.innerHTML);
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
const poisonRow = (container: Element) => [...container.querySelectorAll('p, .skill')].find(node => node.querySelector('strong')?.textContent?.startsWith('毒霧'))!;

async function begin(scale?: number, currentMp?: number) {
  const start = engine.start;
  const setup = vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    const state = start(team, team, 38, scale === undefined ? {} : { poisonImpactScale: scale });
    state.allies[0].monster = { ...state.allies[0].monster, atk: 100 };
    state.allies[0].rally = 1;
    state.allies[0].rallyPercent = 10;
    if (currentMp !== undefined) state.allies[0].mp = currentMp;
    return state;
  });
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  await act(async () => root.render(<App />));
  await click(label('闘技場'));
  await click(button('この編成で対戦する'));
  return setup.mock.results[0].value as engine.State;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('poison copy at existing player-facing entry points', () => {
  it.each([1, 0.5, 0])('renders command and enemy detail from their actual units at scale %s', async scale => {
    const state = await begin(scale);
    const actor = state.allies[0], skill = actor.monster.skills[2]!;
    await click(button('とくぎ'));
    expect(poisonButton().textContent).toContain('MP 16');
    expect(poisonButton().textContent).toContain(poisonSkillHint(skill, actor));
    expect(poisonButton().title).toBe(poisonSkillDetail(skill, actor));
    expect(poisonButton().querySelector('small')!.textContent!.length).toBeLessThanOrEqual(68);
    expect(document.querySelectorAll('.skillButtons button')).toHaveLength(actor.monster.skills.length);
    const beforeMp = mp(), beforeHp = hp();
    await click(button('作戦'));
    const enemyRow = poisonRow(document.querySelector('.enemyIntel details')!);
    expect(enemyRow.textContent).toContain(poisonSkillDetail(state.enemies[0].monster.skills[2]!, state.enemies[0]));
    expect(document.querySelector('.tacticsModal')!.textContent).toContain(POISON_TIMING_HINT);
    expect(mp()).toEqual(beforeMp); expect(hp()).toEqual(beforeHp);
    await click(label('作戦情報を閉じる'));
    expect(poisonButton().title).toBe(poisonSkillDetail(skill, actor));
  });

  it('renders a default battle and roster profile from the engine default, without adding an override', async () => {
    const state = await begin();
    expect(state.allies[0]).not.toHaveProperty('poisonImpactScale');
    await click(button('とくぎ'));
    expect(poisonButton().title).toBe(poisonSkillDetail(state.allies[0].monster.skills[2]!, { ...state.allies[0], poisonImpactScale: engine.DEFAULT_POISON_IMPACT_SCALE }));
    await click(button('コマンドに戻る')); await click(button('詳細'));
    const profile = document.querySelector('.profileModal')!;
    expect(poisonRow(profile).textContent).toContain(poisonSkillDetail(engine.monsters[3].skills[2]!));
    expect(poisonRow(profile).textContent).toContain('MP 16 · 通常順 · 敵全体');
    expect(profile.querySelectorAll('.skill')).toHaveLength(3);
  });

  it.each([1, 0.5, 0])('keeps roster copy ready for an engine-selected default of %s', async scale => {
    // Exercise future global defaults without changing the production engine or adding a UI selector.
    const scaleFor = engine.poisonImpactScaleFor;
    vi.spyOn(engine, 'poisonImpactScaleFor').mockImplementation(unit => unit.poisonImpactScale === undefined ? scale : scaleFor(unit));
    await act(async () => root.render(<MonsterDetails id={3} onClose={() => {}} />));
    const row = poisonRow(document.querySelector('.profileModal')!);
    expect(row.textContent).toContain(poisonSkillDetail(engine.monsters[3].skills[2]!));
    expect(row.textContent).toContain(POISON_TIMING_HINT);
    expect(row.textContent!.includes('即時のHPダメージはありません')).toBe(scale === 0);
    expect(row.textContent!.includes('）の半分')).toBe(scale === 0.5);
    if (scale === 0) expect(row.textContent).not.toContain('威力12');
  });

  it('keeps mixed-scale enemy previews distinct and recomputes current attack on rerender', async () => {
    const state = engine.start([2], [3, 4, 10], 38);
    state.enemies.forEach((unit, index) => { unit.poisonImpactScale = [1, 0.5, 0][index]; });
    const render = async () => act(async () => root.render(<TacticsPanel battle={state} orders={{}} playing={false} rule="standard" onClose={() => {}} />));
    await render();
    const rows = [...document.querySelectorAll('.enemyIntel details')].map(poisonRow);
    state.enemies.forEach((unit, index) => expect(rows[index].textContent).toContain(poisonSkillDetail(unit.monster.skills.find(skill => skill.kind === 'poison')!, unit)));
    state.enemies[0].monster = { ...state.enemies[0].monster, atk: 100 };
    state.enemies[0].rally = 1; state.enemies[0].rallyPercent = 10;
    await render();
    expect(poisonRow(document.querySelector('.enemyIntel details')!).textContent).toContain('現在の基礎目安：約53.8');
  });
});

describe('poison copy preserves command and playback semantics', () => {
  it.each([1, 0.5, 0])('retains all-target selection, MP-at-cast, impact/ticks, and skip once at scale %s', async scale => {
    const advance = engine.advanceWithEvents;
    const resolve = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => advance(state, orders, { enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })) }));
    const state = await begin(scale), beforeMp = mp(), beforeHp = hp(), beforeEnemies = enemyVitals(), beforePortraits = portraits();
    await click(button('とくぎ')); await click(button('コマンドに戻る'));
    expect(mp()).toEqual(beforeMp); expect(resolve).not.toHaveBeenCalled();
    await click(button('とくぎ')); await click(poisonButton());
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(mp()).toEqual(beforeMp); expect(hp()).toEqual(beforeHp); expect(enemyVitals()).toEqual(beforeEnemies);
    // Clear the first order, then select it again: neither step pays MP or consumes poison.
    await click(button('全員おまかせ')); await click(button('とくぎ')); await click(poisonButton());
    expect(mp()).toEqual(beforeMp); expect(resolve).not.toHaveBeenCalled();
    for (const id of team.slice(1)) { await click(label(`${engine.monsters[id].name}の行動を選択`)); await click(button('ぼうぎょ')); }
    await click(button('この指示でターン開始'));
    const result = resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(resolve.mock.calls[0][1].find(order => order.key === 'a0')).toEqual({ key: 'a0', skill: 2, target: undefined });
    const timeline = buildTimeline(result.events);
    const cast = timeline.cues.find(cue => cue.cast?.actor === 'a0' && cue.impacts.length === 0)!;
    const impact = timeline.cues.find(cue => cue.impacts.some(event => event.kind === 'poison' && event.actor === 'a0'))!;
    expect(cast.cast).toMatchObject({ skill: '毒霧', scope: 'all', targets: state.enemies.map(unit => unit.key) });
    await tick(cast.at + 1);
    expect(mp()[0]).toBe(`MP ${state.allies[0].mp - 16}/${state.allies[0].monster.mp}`);
    expect(hp()).toEqual(beforeHp); expect(enemyVitals().some(text => text?.includes('毒:'))).toBe(false);
    await tick(impact.at - cast.at);
    expect(enemyVitals().every(text => text?.includes('毒:残3回'))).toBe(true);
    expect(impact.impacts.filter(event => event.kind === 'damage').length).toBe(scale === 0 ? 0 : 5);
    expect(portraits()).toEqual(beforePortraits);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('敵だけ');
    expect(result.events.filter(event => event.kind === 'resource' && event.actor === 'a0')).toHaveLength(1);
    expect(result.events.filter(event => event.kind === 'damage' && event.effect === 'poison')).toHaveLength(5);
    const projected = applyBattleEvents(state, result.events);
    expect(projected.allies).toEqual(result.state.allies); expect(projected.enemies).toEqual(result.state.enemies);
    await click(button('演出をスキップ'));
    const finalMp = mp(), finalHp = hp(), finalEnemies = enemyVitals();
    expect(finalMp).toEqual(result.state.allies.map(unit => `MP ${unit.mp}/${unit.monster.mp}`));
    expect(finalEnemies.every(text => text?.includes('毒:残2回'))).toBe(true);
    await tick(timeline.duration + 1);
    expect(mp()).toEqual(finalMp); expect(hp()).toEqual(finalHp); expect(enemyVitals()).toEqual(finalEnemies);
    expect(resolve).toHaveBeenCalledTimes(1); expect(portraits()).toEqual(beforePortraits);
  });

  it.each([15, 16])('keeps poison availability at the exact existing MP threshold %s', async currentMp => {
    await begin(0, currentMp); await click(button('とくぎ'));
    expect(poisonButton().disabled).toBe(currentMp < 16);
    expect(poisonButton().textContent).toContain('MP 16');
    expect(poisonButton().textContent!.includes('MP不足')).toBe(currentMp < 16);
    expect(poisonButton().textContent).toContain('即時HP減少なし');
  });
});
