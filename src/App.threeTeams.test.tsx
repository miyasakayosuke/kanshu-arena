// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { initialTeam } from './strategy';
import { TEAM_WORKSHOP_KEY, loadTeamWorkshop, updateCurrentTeam } from './teamWorkshop';
let root: Root;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const text = (value: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === value)!;
const slots = () => [...document.querySelectorAll<HTMLElement>('.builderSlots .teamUnit')].map(node => node.dataset.monsterId ? Number(node.dataset.monsterId) : null);
const book = () => JSON.parse(localStorage.getItem(TEAM_WORKSHOP_KEY)!);
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function mount() { await act(async () => root.render(<App />)); }
async function reload() { await act(async () => root.unmount()); root = createRoot(document.getElementById('root')!); await mount(); }
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#team'); document.body.innerHTML = '<div id="root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); root = createRoot(document.getElementById('root')!); });
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
describe('three-team editor integration', () => {
  it('opens with three clear tabs, five slots and no launch promotions or save/call stack', async () => {
    await mount();
    expect(document.querySelectorAll('.teamTabs button')).toHaveLength(3); expect(slots()).toEqual(initialTeam);
    expect(document.querySelector('.newDragon, .arrivalDisclosure, .recommendedTeams, .savedTeams')).toBeNull();
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.querySelector<HTMLDetailsElement>('.teamEffects')!.open).toBe(false);
    expect(document.querySelector('.teamSaveState')!.textContent).toBe('変更は自動保存');
  });
  it('keeps empty and partially built teams through switching and reload, and closes uncommitted previews', async () => {
    await mount(); await click(label('チーム2を選ぶ')); expect(slots()).toEqual([null, null, null, null, null]);
    await click(label('1枠・空き枠に追加')); expect(document.querySelector<HTMLElement>('.teamOverview')!.hidden).toBe(true);
    await click(label('フェンリルを候補に選ぶ')); await click(text('フェンリルを編成に加える'));
    expect(slots()).toEqual([12, null, null, null, null]);
    await click(label('1枠・フェンリルを入れ替える')); await click(label('妖狐を候補に選ぶ')); await click(text('キャンセル'));
    await click(label('チーム1を選ぶ')); expect(slots()).toEqual(initialTeam);
    await click(label('チーム2を選ぶ')); expect(slots()[0]).toBe(12);
    await reload(); expect(slots()[0]).toBe(12); expect(book().selected).toBe(1);
    await click(label('チーム3を選ぶ')); expect(slots().every(id => id === null)).toBe(true);
    await click(label('闘技場')); expect(text('この編成で対戦する →').disabled).toBe(true);
  });
  it('preserves a fourth legacy active party and all three saved indices until explicit replacement', async () => {
    const saved = [{ team: [2,0,3,4,6], rule: 'light' }, { team: [1,2,3,4,6], rule: 'standard' }, { team: [3,2,0,4,6], rule: 'light' }];
    localStorage.setItem('kanshu-team-slots-v1', JSON.stringify(saved));
    localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: initialTeam, rule: 'standard' }));
    await mount(); expect(slots()).toEqual(initialTeam); expect(book().selected).toBeNull();
    expect(document.querySelector('.previousDraftNotice')!.textContent).toContain('一時編成を使用中');
    await click(label('チーム2を選ぶ')); expect(slots()).toEqual(saved[1].team);
    await click(text('前回の一時編成に戻す')); expect(slots()).toEqual(initialTeam);
    await click(text('チーム2に上書き')); expect(document.querySelector('.draftConfirmation')!.textContent).toContain('チーム2');
    await click(text('やめる')); expect(book().teams).toEqual(saved);
    await click(label('1枠・妖狐を入れ替える')); await click(label('セルキーを候補に選ぶ')); await click(text('セルキーに入れ替える'));
    const editedDraft = [7,2,3,4,6];
    await click(label('チーム3を選ぶ')); await click(text('前回の一時編成に戻す')); expect(slots()).toEqual(editedDraft);
    expect(book().previous.team).toEqual(initialTeam);
    await click(text('チーム2に上書き')); await click(text('置き換える'));
    expect(book().teams[1].team).toEqual(editedDraft); expect(book().teams[0]).toEqual(saved[0]); expect(book().teams[2]).toEqual(saved[2]);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(saved));
    await reload(); await click(text('移行前の編成に戻す')); expect(slots()).toEqual(initialTeam);
  });
  it('uses the selected team on the home pasture and in actual battle, with its leader order', async () => {
    const chosen = [12,0,2,6,10]; localStorage.setItem('kanshu-team-slots-v1', JSON.stringify([null, { team: chosen, rule: 'standard' }, null]));
    const start = vi.spyOn(engine, 'start'); await mount(); await click(label('チーム2を選ぶ'));
    await click(label('ホーム')); expect([...document.querySelectorAll('.pastureMonster')].map(node => Number(node.getAttribute('data-monster-id')))).toEqual(chosen);
    await click(label('闘技場')); await click(text('この編成で対戦する →'));
    expect(start.mock.calls.filter(call => call[1].length).at(-1)?.[0]).toEqual(chosen);
  });
  it('reorders adjacent members and removes one without corrupting other teams', async () => {
    await mount(); await click(label('2枠・バステトを入れ替える')); await click(text('後ろへ →'));
    expect(slots()).toEqual([0,3,2,4,6]);
    await click(label('3枠・バステトを入れ替える')); await click(text('編成から外す'));
    expect(slots()).toEqual([0,3,4,6,null]); expect(book().teams[1].team).toEqual([]);
    await reload(); expect(slots()).toEqual([0,3,4,6,null]);
  });
  it('keeps edits usable when storage is blocked and discloses the persistence failure', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await mount(); expect(document.querySelector('.teamSaveState')!.textContent).toContain('保存できません');
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    await click(label('チーム2を選ぶ')); await click(label('チーム1を選ぶ')); expect(slots()[0]).toBe(2);
  });
  it('restores slot focus only after the overview has been revealed', async () => {
    await mount(); const slot = label('2枠・バステトを入れ替える');
    await click(slot); const visibleAtFocus: boolean[] = [];
    const original = slot.focus.bind(slot);
    vi.spyOn(slot, 'focus').mockImplementation(options => { visibleAtFocus.push(!document.querySelector<HTMLElement>('.teamOverview')!.hidden); original(options); });
    await click(text('キャンセル'));
    expect(visibleAtFocus).toEqual([true]); expect(document.activeElement).toBe(slot);
  });
  it('does not replace a session-only edit with a remote storage event after a save failure', async () => {
    await mount(); const remote = book();
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await click(label('2枠・バステトを入れ替える')); await click(label('バステトをリーダーにする'));
    expect(write).toHaveBeenCalled(); expect(slots()[0]).toBe(2);
    write.mockRestore(); localStorage.setItem(TEAM_WORKSHOP_KEY, JSON.stringify(remote));
    await act(async () => window.dispatchEvent(new StorageEvent('storage', {key: TEAM_WORKSHOP_KEY, newValue: JSON.stringify(remote)})));
    expect(slots()[0]).toBe(2); expect(document.querySelector('.teamSaveState')!.textContent).toContain('保存できません');
    await click(label('ホーム')); await click(label('編成')); expect(slots()[0]).toBe(2);
  });
  it('keeps battle allies fixed during remote updates and catches up after leaving the battle', async () => {
    await mount(); const remote = updateCurrentTeam(loadTeamWorkshop(localStorage), {team:[1,2,3,4,6]});
    await click(label('闘技場')); await click(text('この編成で対戦する →'));
    const allies = [...document.querySelectorAll('.commander')].map(node => node.getAttribute('aria-label'));
    localStorage.setItem(TEAM_WORKSHOP_KEY, JSON.stringify(remote));
    await act(async () => window.dispatchEvent(new StorageEvent('storage', {key: TEAM_WORKSHOP_KEY, newValue: JSON.stringify(remote)})));
    expect([...document.querySelectorAll('.commander')].map(node => node.getAttribute('aria-label'))).toEqual(allies);
    await click(label('闘技場に戻る')); await click(text('中断して移動')); await click(label('編成'));
    expect(slots()).toEqual([1,2,3,4,6]);
  });
  it('synchronizes valid remote changes and closes a stale picker while ignoring malformed events', async () => {
    await mount(); await click(label('1枠・妖狐を入れ替える')); await click(label('セルキーを候補に選ぶ'));
    const remote = updateCurrentTeam(loadTeamWorkshop(localStorage), { team: [1,2,3,4,6] });
    localStorage.setItem(TEAM_WORKSHOP_KEY, JSON.stringify(remote));
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: TEAM_WORKSHOP_KEY, newValue: JSON.stringify(remote) })));
    expect(slots()).toEqual([1,2,3,4,6]); expect(document.querySelector('.candidatePanel')).toBeNull();
    localStorage.setItem(TEAM_WORKSHOP_KEY, '{');
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: TEAM_WORKSHOP_KEY, newValue: '{' })));
    expect(slots()).toEqual([1,2,3,4,6]);
  });
});
