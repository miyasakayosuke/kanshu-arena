// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';

const defaultTeam = [0, 2, 3, 4, 6];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const actors = () => [...document.querySelectorAll<HTMLButtonElement>('.commander')];
const actor = (slot: number) => actors()[slot];
const recipients = () => [...document.querySelectorAll<HTMLButtonElement>('.commander.allyRecipient')];
const turnStart = () => document.querySelector<HTMLButtonElement>('.turnStart')!;
const summary = () => document.querySelector('.committedOrder')?.textContent;
const resources = () => [...document.querySelectorAll('.commanderHp,.commanderMp,.commanderStatus')].map(node => node.textContent);
const saved = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!).sort().map(key => [key, localStorage.getItem(key)]));
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function tick(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }
async function key(type: 'keydown' | 'keyup', value: string, repeat = false, target: EventTarget = document.activeElement ?? window) {
  const event = new KeyboardEvent(type, { key: value, repeat, bubbles: true, cancelable: true });
  await act(async () => target.dispatchEvent(event));
  return event;
}
async function escape() { await key('keydown', 'Escape', false, window); }
async function chooseSpecial(slot: number, skill: string) {
  await click(actor(slot)); await click(button('とくぎ')); await click(button(skill));
}
async function defend(slots: number[]) {
  for (const slot of slots) { await click(actor(slot)); await click(button('ぼうぎょ')); }
}
async function begin(options: { team?: number[]; mutate?: (state: engine.State) => void } = {}) {
  const team = options.team ?? defaultTeam;
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule: 'standard' }));
  const start = engine.start, resolve = engine.advanceWithEvents;
  let state!: engine.State;
  vi.spyOn(engine, 'start').mockImplementationOnce(() => {
    state = start(team, [1, 5, 8, 10, 6], 20261013, { leaders: true }); options.mutate?.(state); return state;
  });
  const advance = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((state, orders) => resolve(state, orders, {
    enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })),
  }));
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
  return { state, advance };
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('direct single-ally skill recipients', () => {
  it.each([
    { skill: '生命の雫', caster: 1, skillIndex: 1, target: 2, team: defaultTeam },
    { skill: '清めの鈴', caster: 1, skillIndex: 3, target: 0, team: defaultTeam },
    { skill: '守護の誓い', caster: 0, skillIndex: 3, target: 4, team: [1, 2, 3, 4, 6] },
  ])('reuses all five portraits and their vitals for $skill, committing the caster instead of switching actors', async scenario => {
    const { state, advance } = await begin({ team: scenario.team, mutate: state => { state.allies[0].poison = 2; state.allies[2].guard = true; state.allies[4].ward = 2; } });
    const originalButtons = actors(), originalResources = resources(), beforeState = JSON.stringify(state), beforeSave = saved();
    const portraits = originalButtons.map(node => node.querySelector('.commanderIcon'));
    await chooseSpecial(scenario.caster, scenario.skill);
    expect(actors()).toEqual(originalButtons);
    expect(recipients()).toEqual(originalButtons);
    expect(actors().map(node => node.querySelector('.commanderIcon'))).toEqual(portraits);
    expect(document.querySelector('.targetButtons,.allyTargets,.skillButtons,.commandButtons')).toBeNull();
    expect(document.querySelectorAll('.battleStage .battleTarget,.enemyInspect')).toHaveLength(0);
    expect(document.querySelectorAll('.commanderHp')).toHaveLength(5);
    expect(document.querySelectorAll('.commanderMp')).toHaveLength(5);
    expect(document.querySelector('.commandHeading')?.textContent).toContain(`${state.allies[scenario.caster].monster.name}：${scenario.skill}`);
    expect(document.querySelector('.battleMessage')?.textContent).toContain(`${scenario.skill}：下の味方を選択`);
    for (const [slot, node] of recipients().entries()) {
      expect(node.getAttribute('aria-label')).toBe(`味方${slot + 1} ${state.allies[slot].monster.name}を${scenario.skill}の対象に選択`);
      expect(node.getAttribute('aria-pressed')).toBeNull();
      expect(node.querySelector('i')?.textContent).toContain('対象に選択');
      const descriptionIds = node.getAttribute('aria-describedby')!.split(' ');
      expect(descriptionIds).toEqual([`party-hp-a${slot}`, `party-mp-a${slot}`, `party-status-a${slot}`, `party-command-a${slot}`]);
      expect(descriptionIds.every(id => document.getElementById(id))).toBe(true);
    }
    expect(actor(0).querySelector('.commanderStatus')?.textContent).toContain('毒:残2回');
    expect(actor(2).querySelector('.commanderStatus')?.textContent).toContain('守り:今T');
    expect(actor(4).querySelector('.commanderStatus')?.textContent).toContain('自然障壁:残2T');
    expect(recipients().every(node => !node.disabled)).toBe(true);
    expect(turnStart().disabled).toBe(true);
    expect(document.activeElement).toBe(button('特技に戻る'));
    expect(resources()).toEqual(originalResources); expect(JSON.stringify(state)).toBe(beforeState); expect(saved()).toEqual(beforeSave);
    await click(actor(scenario.target));
    expect(recipients()).toHaveLength(0);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(actor(scenario.caster).classList.contains('ordered')).toBe(true);
    expect(document.activeElement).toBe(actor(scenario.caster === 0 ? 1 : 0));
    expect(resources()).toEqual(originalResources); expect(advance).not.toHaveBeenCalled();
    await click(turnStart());
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toContainEqual({ key: `a${scenario.caster}`, skill: scenario.skillIndex, target: `a${scenario.target}` });
  });

  it.each(['生命の雫', '清めの鈴', '守護の誓い'])('allows full-HP self targeting for %s without choosing it automatically', async skill => {
    const caster = skill === '守護の誓い' ? 0 : 1;
    const { state, advance } = await begin({ team: [1, 2, 3, 4, 6] });
    await chooseSpecial(caster, skill);
    expect(actor(caster).disabled).toBe(false);
    expect(actor(caster).querySelector('.commanderHp')?.textContent).toBe(`HP ${state.allies[caster].monster.hp}/${state.allies[caster].monster.hp}`);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(actor(caster)); await click(actor(caster));
    expect(summary()).toContain(`${skill} → 味方${caster + 1} ${state.allies[caster].monster.name}`);
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toContainEqual({ key: `a${caster}`, skill: skill === '生命の雫' ? 1 : 3, target: `a${caster}` });
  });

  it('lets the last surviving healer in original slot 3 target itself and then focus turn start', async () => {
    const { advance } = await begin({ mutate: state => state.allies.forEach((unit, slot) => { if (slot !== 2) unit.hp = 0; }) });
    await chooseSpecial(2, '生命の雫');
    expect(recipients()).toEqual([actor(2)]);
    expect(actor(2).getAttribute('aria-label')).toBe('味方3 ドリュアスを生命の雫の対象に選択');
    await click(actor(2));
    expect(document.activeElement).toBe(turnStart()); expect(advance).not.toHaveBeenCalled();
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toEqual([{ key: 'a2', skill: 1, target: 'a2' }]);
  });

  it('keeps defeated original slots visible and disabled without renumbering living recipients', async () => {
    const { advance } = await begin({ mutate: state => { state.allies[0].hp = 0; state.allies[3].hp = 0; } });
    await chooseSpecial(1, '生命の雫');
    expect(actors()).toHaveLength(5); expect(recipients()).toHaveLength(3);
    expect(recipients().map(node => node.getAttribute('aria-label'))).toEqual([
      '味方2 バステトを生命の雫の対象に選択', '味方3 ドリュアスを生命の雫の対象に選択', '味方5 ガルーダを生命の雫の対象に選択',
    ]);
    for (const slot of [0, 3]) {
      expect(actor(slot).disabled).toBe(true); expect(actor(slot).classList.contains('allyRecipient')).toBe(false);
      expect(actor(slot).textContent).toContain('戦闘不能');
      await act(async () => actor(slot).click());
    }
    expect(recipients()).toHaveLength(3); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(actor(4)); await click(turnStart());
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a4' });
    expect(advance.mock.calls[0][1].some(order => ['a0', 'a3'].includes(order.key))).toBe(false);
  });
});

describe('cancelling a direct ally recipient', () => {
  it.each(['unselected', 'manual', 'automatic'] as const)('preserves %s orders, resources, save, and deadline with Back and Escape', async previous => {
    const { state, advance } = await begin();
    await defend([4]);
    let oldOrder: engine.Order | undefined;
    if (previous === 'manual') {
      await chooseSpecial(1, '生命の雫'); await click(actor(2)); oldOrder = { key: 'a1', skill: 1, target: 'a2' };
    } else if (previous === 'automatic') {
      oldOrder = engine.automaticOrders(state, [{ key: 'a4', skill: engine.DEFEND }]).find(order => order.key === 'a1');
      await click(actor(1)); await click(button('おまかせ'));
    }
    const beforeResources = resources(), beforeSave = saved();
    await tick(5000);
    for (const route of ['back', 'escape'] as const) {
      await chooseSpecial(1, '清めの鈴');
      if (route === 'back') await click(button('特技に戻る')); else await escape();
      expect(recipients()).toHaveLength(0); expect(document.querySelector('.skillButtons')).not.toBeNull();
      expect(document.activeElement).toBe(button('清めの鈴'));
      expect(document.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('残り25秒');
      expect(resources()).toEqual(beforeResources); expect(saved()).toEqual(beforeSave);
      expect(actor(1).querySelector('i')?.textContent).toBe(previous === 'automatic' ? 'おまかせ ✓' : previous === 'manual' ? '指示済 ✓' : '未選択');
      await click(button('コマンドに戻る'));
      if (previous === 'manual') expect(summary()).toContain('生命の雫 → 味方3 ドリュアス');
      if (previous === 'automatic') expect(summary()).toContain('おまかせ');
      if (previous === 'unselected') expect(summary()).toBeUndefined();
    }
    expect(advance).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(previous === 'unselected' ? 1 : 2);
    await click(turnStart());
    expect(advance.mock.calls[0][1]).toEqual(engine.automaticOrders(state, [{ key: 'a4', skill: engine.DEFEND }, ...(oldOrder ? [oldOrder] : [])]));
  });

  it.each(['back', 'escape'] as const)('invalidates a queued recipient click when %s cancels it in the same batch', async route => {
    const { state, advance } = await begin();
    await chooseSpecial(1, '生命の雫');
    const stale = actor(2), back = button('特技に戻る');
    await act(async () => {
      if (route === 'back') back.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      stale.click();
    });
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.skillButtons')).not.toBeNull();
    expect(document.activeElement).toBe(button('生命の雫'));
    await click(turnStart()); expect(advance.mock.calls[0][1]).toEqual(engine.automaticOrders(state));
  });
});

describe('direct ally keyboard, repeat, timeout, and navigation safety', () => {
  it.each(['Enter', ' '])('does not accept a held %s activation when entering recipient mode', async activation => {
    const { advance } = await begin();
    await click(actor(1)); await click(button('とくぎ'));
    const skill = button('生命の雫'); skill.focus();
    await key('keydown', activation);
    await act(async () => skill.click());
    expect(document.activeElement).toBe(button('特技に戻る'));
    expect((await key('keydown', activation, true)).defaultPrevented).toBe(true);
    await act(async () => { button('特技に戻る').click(); actor(2).click(); });
    expect(recipients()).toHaveLength(5); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect((await key('keyup', activation)).defaultPrevented).toBe(true);
    await click(actor(2));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(document.activeElement).toBe(actor(0)); expect(advance).not.toHaveBeenCalled();
  });

  it('commits only once on duplicate recipient clicks and ignores the second native double-click after focus moves', async () => {
    const { advance } = await begin();
    await chooseSpecial(1, '生命の雫'); const recipient = actor(2);
    await act(async () => { recipient.click(); recipient.click(); });
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(actor(0).getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(actor(0));
    await act(async () => recipient.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 })));
    expect(actor(0).getAttribute('aria-pressed')).toBe('true');
    await click(turnStart());
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1].filter(order => order.key === 'a1')).toEqual([{ key: 'a1', skill: 1, target: 'a2' }]);
  });

  it('focuses turn start after the last ally-target order without executing or accepting repeated Enter/Space', async () => {
    const { advance } = await begin(); await defend([0, 2, 3, 4]);
    await chooseSpecial(1, '生命の雫'); expect(turnStart().disabled).toBe(true);
    await click(actor(1));
    expect(document.activeElement).toBe(turnStart()); expect(turnStart().disabled).toBe(false);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    for (const activation of ['Enter', ' ']) {
      expect((await key('keydown', activation, true)).defaultPrevented).toBe(true);
      await key('keyup', activation);
    }
    expect(advance).not.toHaveBeenCalled(); await click(turnStart()); expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['timeout', 'overdue click', 'background resume'] as const)('uses the saved manual order and automatic completion on %s without consuming a pending heal', async route => {
    const { state, advance } = await begin(); await defend([1, 4]); await chooseSpecial(1, '生命の雫');
    const recipient = actor(2);
    if (route === 'timeout') await tick(30000);
    else {
      vi.setSystemTime(Date.now() + 30001);
      if (route === 'overdue click') await click(recipient);
      else await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    }
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.automaticOrders(state, [{ key: 'a1', skill: engine.DEFEND }, { key: 'a4', skill: engine.DEFEND }]));
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
    expect(recipients()).toHaveLength(0); expect(actors().every(node => node.disabled)).toBe(true);
    await act(async () => recipient.click()); expect(advance).toHaveBeenCalledTimes(1);
    await click(button('演出をスキップ')); expect(recipients()).toHaveLength(0);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('#party-mp-a1')?.textContent).toBe(`MP ${state.allies[1].mp}/${state.allies[1].monster.mp}`);
  });

  it.each(['log', 'tactics', 'navigation'] as const)('blocks recipient clicks behind %s and preserves the pending skill after dismissal', async overlay => {
    const { advance } = await begin(); await chooseSpecial(1, '生命の雫'); const recipient = actor(2);
    await click(overlay === 'navigation' ? label('闘技場に戻る') : button(overlay === 'log' ? 'ログ' : '作戦'));
    expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).not.toBeNull();
    await act(async () => recipient.click());
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0); expect(advance).not.toHaveBeenCalled();
    // Tactics keeps its existing global Escape behavior, which also cancels a pending command.
    // Its explicit close button resumes the pending target; log/navigation Escape close only the dialog.
    if (overlay === 'tactics') await click(label('作戦情報を閉じる')); else await escape();
    expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).toBeNull();
    expect(recipients()).toHaveLength(5); expect(turnStart().disabled).toBe(true);
    await click(recipient); await click(turnStart());
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a2' });
  });

  it.each(['navigation', 'tactics', 'log'] as const)('rejects a queued recipient click when %s starts in the same batch', async overlay => {
    const { advance } = await begin(); await chooseSpecial(1, '生命の雫');
    const recipient = actor(2), opener = overlay === 'navigation' ? label('闘技場に戻る') : button(overlay === 'tactics' ? '作戦' : 'ログ');
    await act(async () => { opener.click(); recipient.click(); });
    expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(advance).not.toHaveBeenCalled();
    await click(overlay === 'navigation' ? button('対戦を続ける') : label(overlay === 'tactics' ? '作戦情報を閉じる' : '戦闘ログを閉じる'));
    expect(recipients()).toHaveLength(5);
    await click(recipient); await click(turnStart());
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a2' });
  });

  it.each(['commit', 'cancel'] as const)('does not move focus behind tactics opened in the same %s batch', async route => {
    const { advance } = await begin(); await chooseSpecial(1, '生命の雫');
    const recipient = actor(2), back = button('特技に戻る'), tactics = button('作戦');
    recipient.focus();
    await act(async () => { (route === 'commit' ? recipient : back).click(); tactics.click(); });
    expect(document.querySelector('.tacticsModal')).not.toBeNull();
    expect(document.activeElement).not.toBe(actor(0));
    expect(document.activeElement).not.toBe(button('生命の雫'));
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(route === 'commit' ? 1 : 0);
    await click(label('作戦情報を閉じる'));
    expect(document.activeElement).not.toBe(actor(0));
    expect(document.activeElement).not.toBe(button('生命の雫'));
    expect(advance).not.toHaveBeenCalled();
    if (route === 'cancel') { expect(document.querySelector('.skillButtons')).not.toBeNull(); await click(button('コマンドに戻る')); }
    await click(turnStart());
    if (route === 'commit') expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a2' });
  });

  it('discards direct targeting when navigation is confirmed and starts a clean next battle', async () => {
    const { advance } = await begin(); await chooseSpecial(1, '生命の雫'); const stale = actor(2);
    await click(label('闘技場に戻る'));
    await act(async () => { button('中断して移動').click(); stale.click(); }); await tick(40000);
    expect(window.location.hash).toBe('#arena'); expect(advance).not.toHaveBeenCalled(); expect(recipients()).toHaveLength(0);
    await click(button('この編成で対戦する'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(recipients()).toHaveLength(0); expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(turnStart().disabled).toBe(false); expect(actor(0).getAttribute('aria-pressed')).toBe('true');
  });
});
