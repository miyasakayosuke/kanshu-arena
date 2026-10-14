// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AwakeningPreview from './AwakeningPreview';
import MonsterDetails from '../MonsterDetails';
import { monsters } from '../engine';
import { awakeningStat } from './domain';
let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">Open</button><div id="root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.getElementById('opener')!.focus();
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
const click = async (label: string) => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(n => n.textContent === label)!; expect(button).toBeTruthy(); await act(async () => button.click()); };
const mount = async (id = 0) => { await act(async () => root.render(<AwakeningPreview base={monsters[id]} />)); };
const result = () => document.querySelector('.awakeningResult')!.textContent!;
describe('read-only awakening calculator', () => {
  it.each(monsters)('preserves $name stage zero and shows approved stage 4 and 99 values', async monster => {
    const before = JSON.stringify(monster);
    await mount(monster.id);
    expect(document.querySelector('details')!.open).toBe(false);
    for (const level of [0, 4, 99]) {
      await click(`覚醒${level}`);
      expect(result()).toContain(`覚醒${level}の試算`);
      for (const key of ['hp', 'atk'] as const) expect(result()).toContain(`${monster[key]} → ${awakeningStat(monster[key], level)}`);
    }
    expect(document.body.textContent).toContain(`MP ${monster.mp}・素早さ ${monster.speed}は変わりません`);
    expect(JSON.stringify(monster)).toBe(before);
  });
  it('steps every stage, bounds repeated clicks, and keeps plateau explanations honest', async () => {
    await act(async () => root.render(<AwakeningPreview base={{hp:100, atk:100, mp:10, speed:20}} />));
    await click('−1'); expect(result()).toContain('覚醒0の試算');
    for (let n = 1; n <= 99; n++) { await click('＋1'); expect(result()).toContain(`覚醒${n}の試算`); expect(result()).toContain(`100 → ${awakeningStat(100,n)}`); }
    await click('＋1'); expect(result()).toContain('覚醒99の試算'); expect(result()).toContain('最大段階');
    await click('覚醒4'); expect(result()).toContain('HPは覚醒20で104');
    await click('＋1'); expect(result()).toContain('100 → 103'); expect(result()).toContain('HPは覚醒20で104');
    await click('−1'); expect(result()).toContain('覚醒4の試算');
  });
  it('has an associated bounded keyboard-native range control and live result', async () => {
    await mount();
    const input = document.querySelector('input')!;
    expect(input.type).toBe('range'); expect(input.min).toBe('0'); expect(input.max).toBe('99'); expect(input.step).toBe('1');
    expect(document.querySelector('label')!.htmlFor).toBe(input.id);
    expect(document.getElementById(input.getAttribute('aria-describedby')!)!.getAttribute('aria-live')).toBe('polite');
  });
  it('never reads or writes storage, grants currency, or changes roster through repeated use', async () => {
    const localGet = vi.spyOn(Storage.prototype,'getItem'); const localSet = vi.spyOn(Storage.prototype,'setItem');
    const snapshot = JSON.stringify(monsters);
    await mount(); for (const label of ['覚醒99','覚醒4','＋1','−1','覚醒0']) await click(label);
    expect(localGet).not.toHaveBeenCalled(); expect(localSet).not.toHaveBeenCalled(); expect(JSON.stringify(monsters)).toBe(snapshot);
    expect(document.body.textContent).toContain('所持状況・保存データ・戦闘には反映されません');
  });
  it('resets between monsters and close/reopen, retaining existing detail navigation and dismissal', async () => {
    const close = vi.fn(() => root.render(null));
    const show = async (id: number) => { await act(async () => root.render(<MonsterDetails id={id} onClose={close} initialTab="abilities" />)); };
    await show(0); await click('覚醒99'); await show(1); expect(result()).toContain('覚醒0の試算');
    expect(document.querySelector('details')!.open).toBe(false);
    await act(async () => document.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})));
    expect(close).toHaveBeenCalledOnce(); expect(document.activeElement!.id).toBe('opener');
    await show(0); expect(result()).toContain('覚醒0の試算');
  });
  it('is absent from enemy battle inspection so command timers and actual combat stats stay unambiguous', async () => {
    await act(async () => root.render(<MonsterDetails id={0} onClose={() => {}} initialTab="abilities" battleContext={{label:'敵1', seconds:12}} />));
    expect(document.querySelector('.awakeningPreview')).toBeNull(); expect(document.querySelector('[role=timer]')!.textContent).toContain('12');
  });
});
