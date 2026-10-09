// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
let root: Root;
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const targets = () => [...document.querySelectorAll<HTMLButtonElement>('.targetButtons button')];
const target = (name: string) => document.querySelector<HTMLButtonElement>(`.targetButtons button[aria-label="${name}を対象に選択"]`)!;
const activeCommander = () => document.querySelector('.commander.active')?.getAttribute('aria-label');
async function click(el: HTMLElement) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function chooseSkill(name: string) { if (!document.querySelector('.skillButtons')) await click(button('とくぎ')); await click(button(name)); }
async function mount() { await act(async () => root.render(<App />)); }
async function openTeam() { if (window.location.hash !== '#team') await click(label('編成')); }
async function openArena() { if (window.location.hash !== '#arena') await click(label('闘技場')); }
async function startBattle() { await openArena(); await click(button('この編成で対戦する')); }
async function leaveBattle() { await click(label('闘技場に戻る')); await click(button('中断して移動')); }
async function enterBattle() { await mount(); await startBattle(); }
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
describe('complete playtest flow', () => {
  it('rejects a corrupted save and allows a valid party to enter battle', async () => {
    localStorage.setItem('kanshu-team', '[99,99,99,99,99]');
    await mount();
    expect(document.querySelectorAll('.teamUnit')).toHaveLength(5);
    await startBattle();
    expect(document.querySelector('.battleMode')).toBeTruthy();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });
  it('replaces skills with enemy targets, advances to the next ally, and resets all orders next turn', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const skillRegion = document.querySelector('.commandButtons')?.parentElement;
    await chooseSkill('狐火');
    expect(button('対象を選んでください').disabled).toBe(true);
    expect(document.querySelector('.skillButtons')).toBeNull();
    expect(document.querySelector('.targetButtons')?.parentElement).toBe(skillRegion);
    expect(targets().map(b => b.getAttribute('aria-label'))).toEqual(
      ['トロル', 'ケツァルコアトル', 'イフリート', 'ナーガ', 'ガルーダ'].map(name => `${name}を対象に選択`),
    );
    expect(targets().every(b => !b.disabled)).toBe(true);
    await click(button('対象を選んでください'));
    expect(advance).not.toHaveBeenCalled();
    await click(target('トロル'));
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e0' });
    await click(button('演出をスキップ'));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelector('.turnStart')).toBeTruthy();
    expect(document.querySelectorAll('.commander:not([disabled])').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect([...document.querySelectorAll('.commander:not([disabled]) i')].every(el => el.textContent === '未選択')).toBe(true);
  });
  it('keeps HP unchanged during the windup and updates only at impact', async () => {
    await mount(); await startBattle();
    const bars = () => [...document.querySelectorAll('.hpBar b')].map(b => b.getAttribute('style'));
    const before = bars();
    await click(button('この指示でターン開始'));
    await act(async () => vi.advanceTimersByTime(790));
    expect(bars()).toEqual(before);
    await act(async () => vi.advanceTimersByTime(25));
    // The first action may hit enemies. The visible cast cue must remain present.
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    await act(async () => vi.runAllTimers());
    expect(document.querySelector('.playingPanel')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
  });
  it('ignores repeated start clicks and can interrupt then start a clean battle', async () => {
    await mount(); await startBattle();
    const start = button('この指示でターン開始');
    await act(async () => { start.click(); start.click(); });
    await leaveBattle();
    await startBattle();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('.playingPanel')).toBeNull();
  });
  it('reaches a result, opens and closes the log, and can play the next opponent', async () => {
    await mount(); await startBattle();
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
      await click(button('この指示でターン開始'));
      await click(button('演出をスキップ'));
    }
    expect(document.querySelector('.result')).toBeTruthy();
    await click(button('ログ')); expect(document.querySelector('.logModal')).toBeTruthy();
    const played = [...(document.querySelector('.log')?.textContent ?? '').matchAll(/── TURN (\d+) ──/g)];
    expect(document.querySelector('.battleTop')?.textContent).toContain(`TURN ${played.at(-1)![1]}`);
    await click(label('戦闘ログを閉じる'));
    await click(button('闘技場に戻る → 次の相手')); expect(document.querySelector('footer')?.textContent).toContain('第2戦');
    await startBattle();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });
  it('filters candidates and atomically replaces a member without an incomplete party', async () => {
    await mount(); await openTeam(); await click(label('1枠・妖狐を入れ替える'));
    await click(button('アンカー'));
    expect(document.querySelectorAll('.rosterItem')).toHaveLength(3);
    await click(label('トロルを候補に選ぶ'));
    expect(JSON.parse(localStorage.getItem('kanshu-team')!)).toEqual([0,2,3,4,6]);
    await click(button('トロルに入れ替える'));
    expect(JSON.parse(localStorage.getItem('kanshu-team')!)).toEqual([1,2,3,4,6]);
    await openArena(); expect(button('この編成で対戦する').disabled).toBe(false);
    await act(async () => root.unmount()); root = createRoot(document.getElementById('test-root')!);
    await mount(); expect(JSON.parse(localStorage.getItem('kanshu-team')!)).toEqual([1,2,3,4,6]);
  });
});

describe('command and target controls', () => {
  it('offers only allied targets for healing and records the selected ally', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(label('バステトの行動を選択'));
    await chooseSkill('生命の雫');
    expect(document.querySelector('.skillButtons')).toBeNull();
    expect(targets().map(b => b.getAttribute('aria-label'))).toEqual(
      ['妖狐', 'バステト', 'ドリュアス', 'バンシー', 'ガルーダ'].map(name => `${name}を対象に選択`),
    );
    expect(target('トロル')).toBeNull();
    await click(target('ドリュアス'));
    expect(activeCommander()).toContain('妖狐');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: 1, target: 'a2' });
  });

  it('commits all-target attacks, guard, and poison without entering target selection', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    for (const [skill, nextActor, ready] of [
      ['炎嵐', 'バステト', 1],
      ['鉄壁の構え', 'ドリュアス', 2],
      ['毒霧', 'バンシー', 3],
    ] as const) {
      await chooseSkill(skill);
      expect(document.querySelector('.targetButtons')).toBeNull();
      expect(document.querySelector('.commandButtons')).toBeTruthy();
      expect(activeCommander()).toContain(nextActor);
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(ready);
      expect(button('この指示でターン開始').disabled).toBe(false);
    }
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(expect.arrayContaining([
      { key: 'a0', skill: 2, target: undefined },
      { key: 'a1', skill: 2, target: undefined },
      { key: 'a2', skill: 2, target: undefined },
    ]));
  });

  it('resets partial orders and pending targets to automatic orders for every living ally', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const automatic = engine.autoOrders(engine.start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 20261008));
    expect(button('全員おまかせ').disabled).toBe(false);
    await chooseSkill('炎嵐');
    await chooseSkill('鉄壁の構え');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(2);
    await chooseSkill('生命の雫');
    expect(targets()).toHaveLength(5);
    const reset = button('全員おまかせ');
    expect(reset.disabled).toBe(false);
    await act(async () => { reset.click(); reset.click(); });
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    expect(document.querySelector('.skillButtons .chosen')).toBeNull();
    expect(activeCommander()).toContain('妖狐');
    expect(button('この指示でターン開始').disabled).toBe(false);
    expect([...document.querySelectorAll('.commander i')].every(el => el.textContent === '未選択')).toBe(true);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toEqual(automatic);
  });

  it('keeps the automatic reset visible but disabled throughout playback', async () => {
    await enterBattle();
    await click(button('この指示でターン開始'));
    const reset = button('全員おまかせ');
    expect(reset).toBeTruthy();
    expect(reset.disabled).toBe(true);
    await click(reset);
    expect(document.querySelector('.playingPanel')).toBeTruthy();
    expect(document.querySelectorAll('.commander:not([disabled])')).toHaveLength(0);
    await click(button('演出をスキップ'));
    expect(button('全員おまかせ').disabled).toBe(false);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
  });

  it('returns to skills without erasing an existing order or committing a replacement', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await chooseSkill('狐火');
    await click(target('トロル'));
    await click(label('妖狐の行動を選択'));
    await chooseSkill('疾風斬り');
    const back = button('特技に戻る');
    expect(back.closest('.commandHeading')).toBeTruthy();
    await click(back);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons .chosen')?.textContent).toContain('狐火');
    expect(activeCommander()).toContain('妖狐');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    expect(button('この指示でターン開始').disabled).toBe(false);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e0' });
  });

  it('cancels pending targets with Escape or an actor change without creating orders', async () => {
    await enterBattle();
    await chooseSkill('狐火');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(button('この指示でターン開始').disabled).toBe(false);
    await chooseSkill('疾風斬り');
    await click(label('バステトの行動を選択'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await chooseSkill('生命の雫');
    expect(target('妖狐')).toBeTruthy();
    expect(target('トロル')).toBeNull();
    await click(button('特技に戻る'));
    expect(button('この指示でターン開始').disabled).toBe(false);
  });

  it('handles repeated target clicks and repeated order edits without ordering another actor', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await chooseSkill('狐火');
    const firstTarget = target('トロル');
    await act(async () => { firstTarget.click(); firstTarget.click(); });
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    for (const name of ['ナーガ', 'イフリート']) {
      await click(label('妖狐の行動を選択'));
      await chooseSkill('疾風斬り');
      await click(button('特技に戻る'));
      await chooseSkill('狐火');
      await click(target(name));
      expect(activeCommander()).toContain('バステト');
      expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
      expect(document.querySelector('.targetButtons')).toBeNull();
    }
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 0, target: 'e2' });
  });

  it('excludes defeated units from targets and resets to the first living actor', async () => {
    const start = engine.start;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args);
      state.allies[0].hp = 0;
      state.enemies[0].hp = 0;
      return state;
    });
    await enterBattle();
    expect(label('妖狐の行動を選択').disabled).toBe(true);
    expect(activeCommander()).toContain('バステト');
    await chooseSkill('爪撃');
    expect(targets()).toHaveLength(4);
    expect(target('トロル')).toBeNull();
    await click(button('特技に戻る'));
    await chooseSkill('生命の雫');
    expect(targets()).toHaveLength(4);
    expect(target('妖狐')).toBeNull();
    await click(target('バステト'));
    expect(activeCommander()).toContain('ドリュアス');
    await chooseSkill('樹海の槍');
    await click(button('全員おまかせ'));
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(button('この指示でターン開始').disabled).toBe(false);
  });

  it('clears pending selection when leaving and restarting a battle', async () => {
    await enterBattle();
    await chooseSkill('炎嵐');
    await chooseSkill('生命の雫');
    await leaveBattle();
    await startBattle();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(activeCommander()).toContain('妖狐');
    expect(button('この指示でターン開始').disabled).toBe(false);
    expect(button('全員おまかせ').disabled).toBe(false);
  });
});

describe('four-command actor menu', () => {
  const actorAuto = () => document.querySelector<HTMLButtonElement>('.commandButtons button:last-child')!;

  it('starts with four separate commands and opens only the learned specials', async () => {
    await enterBattle();
    expect([...document.querySelectorAll('.commandButtons strong')].map(el => el.textContent)).toEqual(['たたかう', 'ぼうぎょ', 'とくぎ', 'おまかせ']);
    expect(document.querySelector('.skillButtons')).toBeNull();
    expect(button('とくぎ').textContent).toContain('3 / 4 習得');
    await click(button('とくぎ'));
    expect(document.querySelectorAll('.skillButtons button')).toHaveLength(3);
    expect(document.querySelector('.commandHeading')?.textContent).toContain('とくぎ 3/4');
    await click(button('コマンドに戻る'));
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
  });

  it('targets basic attacks at enemies and returns directly to commands on Back', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('たたかう'));
    expect(targets()).toHaveLength(5);
    expect(document.querySelector('.commandHeading')?.textContent).toContain('通常攻撃');
    expect(target('妖狐')).toBeNull();
    expect(button('対象を選んでください').disabled).toBe(true);
    await click(button('コマンドに戻る'));
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(button('たたかう'));
    await click(target('ケツァルコアトル'));
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelector('.commandButtons')).toBeTruthy();
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e1' });
  });

  it('defends without a target even for a monster without a learned guard skill', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('ぼうぎょ'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
    await click(label('妖狐の行動を選択'));
    expect(document.querySelector('.commandButtons .chosen')?.textContent).toContain('ぼうぎょ');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: engine.DEFEND, target: undefined });
  });

  it('replaces just one manual order with automatic, advances, and resets next turn', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const automatic = engine.autoOrders(engine.start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 20261008));
    await click(button('ぼうぎょ'));
    await click(button('ぼうぎょ'));
    await click(label('妖狐の行動を選択'));
    await chooseSkill('狐火');
    await click(button('特技に戻る'));
    await click(button('コマンドに戻る'));
    const auto = actorAuto();
    await act(async () => { auto.click(); auto.click(); });
    expect(activeCommander()).toContain('ドリュアス');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(2);
    expect(label('妖狐の行動を選択').textContent).toContain('おまかせ ✓');
    expect(label('バステトの行動を選択').textContent).toContain('指示済 ✓');
    await click(label('妖狐の行動を選択'));
    expect(document.querySelector('.commandButtons .chosen')?.textContent).toContain('おまかせ');
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual(automatic[0]);
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a1', skill: engine.DEFEND, target: undefined });
    await click(button('演出をスキップ'));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.commandButtons .chosen')).toBeNull();
    expect([...document.querySelectorAll('.commander:not([disabled]) i')].every(el => el.textContent === '未選択')).toBe(true);
  });

  it('lets manual commands replace automatic choices and whole-party auto clear both', async () => {
    await enterBattle();
    await click(actorAuto());
    expect(activeCommander()).toContain('バステト');
    await click(label('妖狐の行動を選択'));
    await click(button('ぼうぎょ'));
    expect(label('妖狐の行動を選択').textContent).toContain('指示済 ✓');
    await click(actorAuto());
    await click(button('たたかう'));
    await click(button('全員おまかせ'));
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(activeCommander()).toContain('妖狐');
    expect(document.querySelector('.commandButtons .chosen')).toBeNull();
  });

  it('renders and commits a fourth learned special without counting attack or defend', async () => {
    const start = engine.start;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args);
      state.allies[0].monster = { ...state.allies[0].monster, skills: [
        state.allies[0].monster.skills[0]!, state.allies[0].monster.skills[1]!, state.allies[0].monster.skills[2]!,
        { name: '第四の特技', power: 40, priority: 0, kind: 'hit', mpCost: 8 },
      ] };
      return state;
    });
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    expect(button('とくぎ').textContent).toContain('4 / 4 習得');
    await click(button('とくぎ'));
    expect(document.querySelectorAll('.skillButtons button')).toHaveLength(4);
    expect(document.querySelector('.skillButtons')?.textContent).not.toContain('通常攻撃');
    await click(button('第四の特技'));
    await click(target('ナーガ'));
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({ key: 'a0', skill: 3, target: 'e3' });
  });

  it('backs out one level at a time with Escape and keeps the saved order', async () => {
    await enterBattle();
    await click(button('ぼうぎょ'));
    await click(label('妖狐の行動を選択'));
    await chooseSkill('狐火');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('.commandButtons .chosen')?.textContent).toContain('ぼうぎょ');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
  });
});

describe('MP-aware commands', () => {
  const mp = (name: string) => label(`${name}の行動を選択`).querySelector('.commanderMp')?.textContent;

  it('shows current and maximum MP and keeps unaffordable specials unavailable without blocking free commands', async () => {
    const start = engine.start;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args);
      state.allies[0].mp = 0;
      return state;
    });
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    expect(document.querySelectorAll('.commanderMp')).toHaveLength(5);
    expect(mp('妖狐')).toBe(`MP 0/${engine.monsters[0].mp}`);
    expect(mp('バステト')).toBe(`MP ${engine.monsters[2].mp}/${engine.monsters[2].mp}`);
    expect(label('妖狐の行動を選択').getAttribute('aria-describedby')).toContain('party-mp-a0');
    await click(button('とくぎ'));
    const specials = [...document.querySelectorAll<HTMLButtonElement>('.skillButtons button')];
    expect(specials).toHaveLength(3);
    expect(specials.every(skill => skill.disabled && skill.textContent?.includes('MP不足'))).toBe(true);
    await click(specials[0]);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await click(button('コマンドに戻る'));
    expect(button('たたかう').disabled).toBe(false);
    expect(button('ぼうぎょ').disabled).toBe(false);
    await click(button('たたかう'));
    await click(target('トロル'));
    await click(label('妖狐の行動を選択'));
    await click(button('ぼうぎょ'));
    expect(mp('妖狐')).toBe(`MP 0/${engine.monsters[0].mp}`);
    await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({key: 'a0', skill: engine.DEFEND, target: undefined});
  });

  it('allows an exact-cost special and does not spend MP while selecting, canceling, or confirming its target', async () => {
    const start = engine.start;
    const cost = engine.monsters[0].skills[0]!.mpCost;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args);
      state.allies[0].mp = cost;
      return state;
    });
    await enterBattle();
    const before = `MP ${cost}/${engine.monsters[0].mp}`;
    await click(button('とくぎ'));
    expect(button('狐火').disabled).toBe(false);
    expect(button('狐火').querySelector('.skillMp')?.textContent).toBe(`MP ${cost}`);
    await click(button('狐火'));
    expect(mp('妖狐')).toBe(before);
    await click(button('特技に戻る'));
    expect(mp('妖狐')).toBe(before);
    await click(button('狐火'));
    await click(target('トロル'));
    expect(mp('妖狐')).toBe(before);
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
  });

  it.each(['natural', 'skip'] as const)('retains the engine MP result after %s playback', async mode => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await chooseSkill('狐火');
    await click(target('トロル'));
    await click(button('この指示でターン開始'));
    const expected: engine.State = advance.mock.results[0].value.state;
    expect(expected.allies[0].mp).toBe(engine.monsters[0].mp - engine.monsters[0].skills[0]!.mpCost);
    if (mode === 'skip') await click(button('演出をスキップ'));
    else await act(async () => vi.runAllTimers());
    for (const unit of expected.allies) {
      expect(mp(unit.monster.name)).toBe(`MP ${unit.mp}/${unit.monster.mp}`);
    }
    expect(document.querySelector('.playingPanel')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
  });
});


describe('30-second command deadline', () => {
  const timer = () => document.querySelector('[role="timer"]');
  const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
  const initialState = () => engine.start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6], 20261008);

  it('starts at 30 seconds only in battle and expires into one automatic turn', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await mount();
    expect(timer()).toBeNull();
    await tick(60000);
    expect(advance).not.toHaveBeenCalled();
    await startBattle();
    expect(timer()?.textContent).toContain('30');
    expect(timer()?.closest('.battleTop')).toBeTruthy();
    expect(document.querySelector('.commandDock [role="timer"]')).toBeNull();
    await tick(29000);
    expect(timer()?.getAttribute('aria-label')).toContain('残り1秒');
    expect(document.querySelector('.commandClock.urgent')).toBeTruthy();
    expect(advance).not.toHaveBeenCalled();
    await tick(1000);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.autoOrders(initialState()));
    expect(timer()).toBeNull();
    expect(document.querySelector('.playingPanel')?.textContent).toContain('時間切れ');
  });

  it('keeps confirmed orders and fills missing orders while a target is pending', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('ぼうぎょ'));
    await chooseSkill('生命の雫');
    expect(targets()).toHaveLength(5);
    await tick(30000);
    const automatic = engine.autoOrders(initialState());
    expect(advance.mock.calls[0][1]).toEqual([
      { key: 'a0', skill: engine.DEFEND, target: undefined }, ...automatic.slice(1),
    ]);
    expect(document.querySelector('.targetButtons')).toBeNull();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('does not replace a confirmed order with its unfinished edit at timeout', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('たたかう'));
    await click(target('ナーガ'));
    await click(label('妖狐の行動を選択'));
    await chooseSkill('狐火');
    await tick(30000);
    expect(advance.mock.calls[0][1][0]).toEqual({ key: 'a0', skill: engine.BASIC_ATTACK, target: 'e3' });
  });

  it('continues the same deadline through menus, actor changes, speed, auto, details, and logs', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await tick(5000);
    await chooseSkill('狐火');
    await click(button('特技に戻る'));
    await click(button('コマンドに戻る'));
    await click(label('バステトの行動を選択'));
    await click(label('演出速度'));
    await click(button('全員おまかせ'));
    await click(button('詳細'));
    await tick(5000);
    await click(label('詳細を閉じる'));
    await click(button('ログ'));
    expect(timer()?.getAttribute('aria-label')).toContain('残り20秒');
    await tick(20000);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.logModal')).toBeNull();
  });

  it('uses the original deadline on background visibility and focus resume', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await tick(5000);
    // Move wall time without running any timer callbacks, as with a suspended tab.
    vi.setSystemTime(Date.now() + 60000);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(advance).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.playingPanel')).toBeTruthy();
  });

  it('rejects a late command when the timer callback has not run yet', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await chooseSkill('狐火');
    vi.setSystemTime(Date.now() + 30001);
    await click(target('ナーガ'));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance.mock.calls[0][1]).toEqual(engine.autoOrders(initialState()));
  });

  it.each(['manual-first', 'timeout-first'])('resolves a manual/timeout race once: %s', async order => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    const startButton = button('この指示でターン開始');
    await tick(29800);
    await act(async () => {
      if (order === 'manual-first') startButton.click();
      vi.advanceTimersByTime(200);
      if (order === 'timeout-first') startButton.click();
      window.dispatchEvent(new Event('focus'));
    });
    expect(advance).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.playingPanel')).toBeTruthy();
  });

  it('does not count during playback and gives the next turn a fresh 30 seconds', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await tick(29000);
    await click(button('この指示でターン開始'));
    expect(timer()).toBeNull();
    await tick(1000);
    expect(advance).toHaveBeenCalledTimes(1);
    await click(button('演出をスキップ'));
    expect(timer()?.textContent).toContain('30');
    await tick(29800);
    expect(advance).toHaveBeenCalledTimes(1);
    await tick(200);
    expect(advance).toHaveBeenCalledTimes(2);
    expect(advance.mock.calls[1][0].turn).toBe(2);
  });

  it('resets after natural playback without retaining previous confirmed orders', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await click(button('ぼうぎょ'));
    await tick(30000);
    await act(async () => vi.runAllTimers());
    expect(timer()?.textContent).toContain('30');
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('cancels the old deadline on interrupt and restarts with a full new deadline', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    await tick(28000);
    await leaveBattle();
    await tick(60000);
    expect(advance).not.toHaveBeenCalled();
    expect(timer()).toBeNull();
    await startBattle();
    await tick(29800);
    expect(advance).not.toHaveBeenCalled();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
    await tick(200);
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('stops on the result screen and releases command callbacks on unmount', async () => {
    const advance = vi.spyOn(engine, 'advanceWithEvents');
    await enterBattle();
    for (let turn = 0; turn < 20 && !document.querySelector('.result'); turn++) {
      await click(button('この指示でターン開始'));
      await click(button('演出をスキップ'));
    }
    expect(document.querySelector('.result')).toBeTruthy();
    expect(timer()).toBeNull();
    const count = advance.mock.calls.length;
    await tick(60000);
    expect(advance).toHaveBeenCalledTimes(count);
    await click(button('闘技場に戻る → 次の相手'));
    await startBattle();
    await act(async () => root.unmount());
    await tick(60000);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(advance).toHaveBeenCalledTimes(count);
    root = createRoot(document.getElementById('test-root')!);
  });
});

describe('bottom-only allied battle feedback', () => {
  const hp = (name: string) => label(`${name}の行動を選択`).querySelector('.commanderHp')?.textContent;
  it('shows party HP below the enemy-only arena and keeps healing selection exclusively in the bottom panel', async () => {
    await enterBattle();
    expect(document.querySelectorAll('.commanderHp')).toHaveLength(5);
    expect(hp('妖狐')).toBe('HP 150/150');
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('敵だけ');
    await click(label('バステトの行動を選択'));
    await chooseSkill('生命の雫');
    expect(targets()).toHaveLength(5);
    expect(document.querySelectorAll('.battleStage .battleTarget')).toHaveLength(0);
    expect(document.querySelector('.allyTargets')?.closest('.commandDock')).toBeTruthy();
    await click(button('特技に戻る'));
    expect(document.querySelector('.skillButtons')).toBeTruthy();
    await chooseSkill('生命の雫');
    await click(target('妖狐'));
    expect(document.querySelectorAll('.commander.ordered')).toHaveLength(1);
  });

  it.each(['natural', 'skip'] as const)('updates area hits and poison counts at their impacts, then clears feedback on %s playback', async mode => {
    vi.spyOn(engine, 'advanceWithEvents').mockImplementationOnce(state => ({
      state: {...state, turn: 2, allies: state.allies.map((unit, i) => ({...unit, hp: i === 0 ? 0 : unit.hp - 33 - Math.floor(unit.monster.hp * .06), poison: i === 0 ? 0 : 2}))},
      events: [
        {kind: 'cast', actor: 'e3', skill: '毒霧', effect: 'poison'},
        ...state.allies.flatMap((unit, i): engine.BattleEvent[] => [
          {kind: 'damage', actor: 'e3', target: unit.key, amount: i === 0 ? 150 : 33, hp: i === 0 ? 0 : unit.hp - 33},
          ...(i === 0 ? [{kind: 'defeat' as const, target: unit.key, hp: 0, guard: false, poison: 0}] : [{kind: 'poison' as const, actor: 'e3', target: unit.key, poison: 3}]),
        ]),
        {kind: 'phase', phase: 'turn-end'},
        ...state.allies.slice(1).map((unit): engine.BattleEvent => ({kind: 'damage', target: unit.key, amount: Math.floor(unit.monster.hp * .06), hp: unit.hp - 33 - Math.floor(unit.monster.hp * .06), poison: 2, effect: 'poison', phase: 'turn-end'})),
      ],
    }));
    await enterBattle();
    await click(button('この指示でターン開始'));
    await act(async () => vi.advanceTimersByTime(799));
    expect(hp('妖狐')).toBe('HP 150/150');
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
    expect(document.querySelector('.partyArea.charging')).toBeTruthy();
    expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(5);
    expect(document.querySelectorAll('.partySweep')).toHaveLength(1);
    expect(document.querySelector('.battleMessage')?.textContent).toContain('味方全体 5体');
    await act(async () => vi.advanceTimersByTime(1));
    expect(hp('妖狐')).toBe('HP 0/150');
    expect(hp('バステト')).toBe('HP 137/170');
    expect(document.querySelectorAll('.partyImpact.damage')).toHaveLength(5);
    expect(document.querySelector('.partyArea.landed')).toBeTruthy();
    expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(5);
    expect(label('妖狐の行動を選択').textContent).toContain('戦闘不能');
    expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('毒:残3回');
    expect(document.querySelector('.battleStage .partyImpact')).toBeNull();
    if (mode === 'skip') await click(button('演出をスキップ'));
    else {
      await act(async () => vi.advanceTimersByTime(939));
      expect(hp('バステト')).toBe('HP 137/170');
      expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('毒:残3回');
      await act(async () => vi.advanceTimersByTime(1));
      expect(hp('バステト')).toBe('HP 127/170');
      expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('毒:残2回');
      await act(async () => vi.advanceTimersByTime(860));
    }
    expect(document.querySelectorAll('.partyImpact')).toHaveLength(0);
    expect(label('妖狐の行動を選択').disabled).toBe(true);
    expect(activeCommander()).toContain('バステト');
    expect(document.querySelector('.partyArea')).toBeNull();
    expect(document.querySelector('.partySweep')).toBeNull();
    expect(hp('バステト')).toBe('HP 127/170');
    expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('毒:残2回');
    expect(document.querySelector('[role="timer"]')?.textContent).toContain('30');
  });

  it('shows allied casting, guard, and positive healing on the fixed bottom icons', async () => {
    const start = engine.start;
    const healingCost = engine.monsters[3].skills[1]!.mpCost;
    const mp = () => label('ドリュアスの行動を選択').querySelector('.commanderMp')?.textContent;
    vi.spyOn(engine, 'start').mockImplementationOnce((...args) => {
      const state = start(...args); state.allies[0].hp = 50; return state;
    });
    vi.spyOn(engine, 'advanceWithEvents').mockImplementationOnce(state => ({
      state: {...state, turn: 2, allies: state.allies.map((unit, i) => ({...unit, hp: i === 0 ? 115 : unit.hp, mp: i === 2 ? unit.mp - healingCost : unit.mp, guard: false}))},
      events: [
        {kind: 'cast', actor: 'a1', skill: 'ぼうぎょ', effect: 'guard'},
        {kind: 'guard', actor: 'a1', target: 'a1', guard: true},
        {kind: 'cast', actor: 'a2', target: 'a0', skill: '生命の雫', effect: 'heal'},
        {kind: 'resource', actor: 'a2', target: 'a2', mp: state.allies[2].mp - healingCost, amount: healingCost, effect: 'mp'},
        {kind: 'heal', actor: 'a2', target: 'a0', amount: 65, hp: 115},
        {kind: 'phase', phase: 'turn-end'},
        {kind: 'expire', target: 'a1', guard: false, effect: 'guard', phase: 'turn-end'},
      ],
    }));
    await enterBattle();
    await click(button('この指示でターン開始'));
    await act(async () => vi.advanceTimersByTime(1));
    expect(label('バステトの行動を選択').classList.contains('acting')).toBe(true);
    expect(mp()).toBe(`MP ${engine.monsters[3].mp}/${engine.monsters[3].mp}`);
    await act(async () => vi.advanceTimersByTime(799));
    expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('守り:今T');
    await act(async () => vi.advanceTimersByTime(700));
    expect(label('ドリュアスの行動を選択').classList.contains('acting')).toBe(true);
    expect(mp()).toBe(`MP ${engine.monsters[3].mp - healingCost}/${engine.monsters[3].mp}`);
    expect(hp('妖狐')).toBe('HP 50/150');
    expect(document.querySelector('.partyImpact')).toBeNull();
    await act(async () => vi.advanceTimersByTime(800));
    expect(hp('妖狐')).toBe('HP 115/150');
    expect(label('妖狐の行動を選択').querySelector('.partyImpact.heal')?.textContent).toBe('+65');
    await act(async () => vi.advanceTimersByTime(700));
    expect(label('バステトの行動を選択').querySelector('.commanderStatus')?.textContent).toBe('');
    expect(document.querySelector('.battleMessage')?.textContent).not.toContain('毒のダメージ');
    await act(async () => vi.advanceTimersByTime(150));
    expect(document.querySelector('.partyImpact')).toBeNull();
    expect(document.querySelector('.acting')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    expect(mp()).toBe(`MP ${engine.monsters[3].mp - healingCost}/${engine.monsters[3].mp}`);
  });
});

describe('phase-synchronized static bottom feedback', () => {
  it.each([1, 2])('starts recovery and damage together at %ix, then clears on skip', async speed => {
    vi.spyOn(engine, 'advanceWithEvents').mockImplementationOnce(state => ({
      state:{...state,turn:2,enemies:state.enemies.map((unit,i)=>i===0?{...unit,hp:unit.hp-33}:unit)},
      events:[{kind:'cast',actor:'a0',target:'e0',targets:['e0'],scope:'single',skill:'通常攻撃',effect:'hit'},
        {kind:'damage',actor:'a0',target:'e0',amount:33,hp:state.enemies[0].hp-33}],
    }));
    await enterBattle();
    if(speed===2) await click(label('演出速度'));
    await click(button('この指示でターン開始'));
    await act(async()=>vi.advanceTimersByTime(1));
    const actor=()=>label('妖狐の行動を選択');
    expect(actor().className).toContain('acting preparing');
    const glyph=actor().querySelector('.commanderIcon');
    const row=document.querySelector<HTMLElement>('.commanderRow')!;
    expect(row.style.getPropertyValue('--hp-duration')).toBe(`${180/speed}ms`);
    await act(async()=>vi.advanceTimersByTime(800/speed-2));
    expect(actor().classList.contains('recovering')).toBe(false);
    await act(async()=>vi.advanceTimersByTime(1));
    expect(actor().classList.contains('recovering')).toBe(true);
    expect(actor().classList.contains('preparing')).toBe(false);
    expect(actor().querySelector('.commanderIcon')).toBe(glyph);
    expect(glyph?.getAttribute('style')).toBeNull();
    await click(button('演出をスキップ'));
    expect(document.querySelector('.acting')).toBeNull();
    expect(document.querySelector('.partyImpact')).toBeNull();
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
  });
});
