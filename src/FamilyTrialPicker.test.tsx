// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FamilyTrialPicker, { type FamilyTrialPickerPreset } from './FamilyTrialPicker';
import * as engine from './engine';
import { FAMILY_DEFINITIONS, type Family } from './families';
import { CHARACTER_ART } from './MonsterArt';
import { initialTeam, recommendedTeams, type RuleId } from './strategy';

// Fixtures are the existing, leader-first recommendation teams. This presentation
// component deliberately does not import the separately owned preset module.
const families: Family[] = ['beast', 'nature', 'dragon', 'material', 'slime', 'demon', 'undead', 'extraordinary'];
const indices = [0, 1, 2, 4, 6, 8, 10, 12];
const presets: readonly FamilyTrialPickerPreset[] = Object.freeze(indices.map((index, familyIndex) => Object.freeze({
  ...recommendedTeams[index], id: families[familyIndex], family: families[familyIndex],
  kind: familyIndex === 7 ? 'mixed' as const : 'pure' as const,
  team: Object.freeze([...recommendedTeams[index].team]),
})));
const css = readFileSync('src/familyTrialPicker.css', 'utf8');
const saved = [{ team: [14, 3, 6, 9, 10], rule: 'light' }, null, null];
let root: Root;
let onChoose: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;
const dialog = () => document.querySelector<HTMLDivElement>('[role="dialog"]')!;
const cards = () => [...document.querySelectorAll<HTMLElement>('.familyTrialCard')];
const close = () => document.querySelector<HTMLButtonElement>('.familyTrialClose')!;
const cancel = () => document.querySelector<HTMLButtonElement>('.familyTrialCancel')!;
const entry = () => document.getElementById('entry')!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function key(element: HTMLElement, value: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
  await act(async () => element.dispatchEvent(event));
  return event;
}
function Harness({ rule = 'standard' }: { rule?: RuleId }) {
  const [open, setOpen] = useState(false);
  return <>
    <button id="entry" onClick={() => setOpen(true)}>系統パーティを試す</button>
    <button id="outside">別の操作</button>
    <output data-testid="active-team">{initialTeam.join(',')}</output>
    {open && <FamilyTrialPicker presets={presets} rule={rule} onChoose={preset => { onChoose(preset); setOpen(false); }} onClose={() => { onClose(); setOpen(false); }} />}
  </>;
}
async function mount(rule: RuleId = 'standard') {
  await act(async () => root.render(<Harness rule={rule} />));
  entry().focus();
  await click(entry());
}
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  document.body.style.overflow = 'auto';
  localStorage.clear();
  localStorage.setItem('kanshu-team-slots-v1', JSON.stringify(saved));
  onChoose = vi.fn(); onClose = vi.fn();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });

describe('family trial picker', () => {
  it('shows seven pure parties and Janus mixed in clearly separate named sections', async () => {
    await mount();
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog().getAttribute('aria-labelledby')!)?.textContent).toBe('系統パーティを試す');
    const sections = [...dialog().querySelectorAll('section')];
    expect(sections).toHaveLength(2);
    expect(sections[0].querySelectorAll('.familyTrialCard')).toHaveLength(7);
    expect(sections[0].textContent).toContain('純系統のパーティ');
    expect(sections[1].querySelectorAll('.familyTrialCard')).toHaveLength(1);
    expect(sections[1].textContent).toContain('ヤヌスの混成パーティ');
    expect(sections[1].querySelector('[data-kind="pure"]')).toBeNull();
    expect(cards()).toHaveLength(8);
    for (const [index, card] of cards().entries()) {
      const preset = presets[index];
      expect(card.querySelector('h4')?.textContent).toBe(preset.name);
      expect(card.querySelector('.familyTrialFamily')?.textContent).toContain(FAMILY_DEFINITIONS[preset.family].label);
      expect(card.querySelector('.familyTrialCost')?.textContent).toContain(`COST ${engine.cost([...preset.team])}`);
      expect(card.querySelector('.familyTrialNote')?.textContent).toBe(preset.note);
      const members = [...card.querySelectorAll('.familyTrialMembers li')];
      expect(members).toHaveLength(5);
      expect(members.map(member => member.textContent)).toEqual(preset.team.map((id, slot) => `${slot === 0 ? 'リーダー ' : ''}${engine.monsters[id].name}`));
      expect(card.querySelectorAll('button')).toHaveLength(1);
      const portrait = card.querySelector('img')!;
      expect(portrait.getAttribute('src')).toBe(CHARACTER_ART[preset.team[0]].portraitUrl);
      expect(portrait.getAttribute('alt')).toBe('');
      expect(portrait.closest('[aria-hidden="true"]')).toBeTruthy();
    }
  });

  it('puts replacement, saved-slot protection and practice exit in the dialog description', async () => {
    await mount();
    const described = dialog().getAttribute('aria-describedby')!.split(' ').map(id => document.getElementById(id)!.textContent).join(' ');
    expect(described).toContain('現在の編成を入れ替え');
    expect(described).toContain('保存した3枠は上書きしません');
    expect(described).toContain('新しいパーティを選んだ時点でその練習を終了');
    expect(described).toContain('対戦はまだ始まりません');
    expect(described).toContain('対戦開始時に、標準戦は7つの純系統から相手を抽選します');
    expect(described).toContain('軽量戦の純系統5体の相手は自然系のみ');
    expect(described).not.toContain('相手が待つ');
  });

  it('does not choose, start a battle or touch the current team or saved slots while previewing', async () => {
    const start = vi.spyOn(engine, 'start');
    await mount();
    await click(cards()[0].querySelector('h4')!);
    await click(cards()[7].querySelector('img')!);
    expect(onChoose).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="active-team"]')?.textContent).toBe(initialTeam.join(','));
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(saved));
    expect(Object.isFrozen(presets[0].team)).toBe(true);
  });

  it.each(['close', 'cancel', 'escape', 'backdrop'])('%s dismisses without selecting and restores entry focus', async method => {
    await mount();
    if (method === 'close') await click(close());
    if (method === 'cancel') await click(cancel());
    if (method === 'escape') {
      const event = await key(cards()[4].querySelector('button')!, 'Escape');
      expect(event.defaultPrevented).toBe(true);
    }
    if (method === 'backdrop') await click(document.querySelector<HTMLElement>('.familyTrialOverlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(entry());
    expect(document.body.style.overflow).toBe('auto');
    expect(document.querySelector('[data-testid="active-team"]')?.textContent).toBe(initialTeam.join(','));
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(saved));
  });

  it('focuses close on entry, traps both tab boundaries and redirects outside focus', async () => {
    await mount();
    expect(document.activeElement).toBe(close());
    expect(close().getAttribute('aria-label')).toBe('編成を変えずに閉じる');
    expect(document.body.style.overflow).toBe('hidden');
    expect((await key(close(), 'Tab', true)).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancel());
    expect((await key(cancel(), 'Tab')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close());
    document.getElementById('outside')!.focus();
    expect(document.activeElement).toBe(close());
    const middle = cards()[3].querySelector('button')!;
    middle.focus();
    expect((await key(middle, 'Tab')).defaultPrevented).toBe(false);
    expect((await key(middle, 'Enter')).defaultPrevented).toBe(false);
  });

  it('cleans up focus containment on dismissal and resets focus on reopening', async () => {
    await mount(); await click(cancel());
    const outside = document.getElementById('outside')!;
    outside.focus(); expect(document.activeElement).toBe(outside);
    entry().focus(); await click(entry());
    expect(document.activeElement).toBe(close());
    await click(close());
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('names each standard action uniquely and passes the exact selected preset once', async () => {
    await mount();
    const buttons = cards().map(card => card.querySelector('button')!);
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(presets.map(preset => `${preset.name}：この編成で受付へ`));
    const selected = buttons[2];
    await act(async () => { selected.click(); selected.click(); });
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(presets[2]);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(saved));
  });

  it('explicitly announces standard COST17 switching on every over-budget light action', async () => {
    await mount('light');
    expect(dialog().querySelector('.familyTrialCurrentRule')?.textContent).toBe('現在：軽量戦 COST15');
    for (const [index, card] of cards().entries()) {
      const button = card.querySelector('button')!;
      const preset = presets[index];
      if (preset.family === 'nature') {
        expect(button.textContent).toBe('軽量戦 COST15のまま受付へ');
        expect(button.getAttribute('aria-label')).toBe(`${preset.name}：軽量戦 COST15のまま受付へ`);
        expect(card.textContent).toContain('COST 15');
        expect(card.textContent).not.toContain('切り替え');
      } else {
        expect(button.textContent).toBe('標準戦 COST17に切り替えて受付へ');
        expect(button.getAttribute('aria-label')).toBe(`${preset.name}：標準戦 COST17に切り替えて受付へ`);
        expect(card.textContent).toContain('COST 17');
      }
    }
  });

  it('keeps nature selectable in light and delegates the transition rather than mutating storage', async () => {
    await mount('light');
    await click(cards()[1].querySelector('button')!);
    expect(onChoose).toHaveBeenCalledWith(presets[1]);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBe(JSON.stringify(saved));
  });

  it.each(presets.map((preset, index) => ({ preset, index })))('chooses the $preset.family card without changing its leader or member order', async ({ preset, index }) => {
    await mount();
    await click(cards()[index].querySelector('button')!);
    expect(onChoose).toHaveBeenCalledExactlyOnceWith(preset);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores entry focus after Strict Mode setup and cleanup are replayed', async () => {
    await act(async () => root.render(<React.StrictMode><Harness /></React.StrictMode>));
    entry().focus(); await click(entry());
    expect(document.activeElement).toBe(close());
    await key(close(), 'Escape');
    expect(document.activeElement).toBe(entry());
    expect(document.body.style.overflow).toBe('auto');
  });

  it('handles a repeated close without also selecting a stale preset', async () => {
    await mount();
    const oldClose = close();
    const oldChoose = cards()[0].querySelector('button')!;
    await act(async () => { oldClose.click(); oldClose.click(); oldChoose.click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('keeps narrow cards wrapping and the close header outside the short-screen scroller', async () => {
    await mount();
    const scroll = dialog().querySelector('.familyTrialScroll')!;
    expect(scroll.contains(close())).toBe(false);
    expect(scroll.contains(cancel())).toBe(true);
    expect(css).toContain('max-height: calc(100dvh - 16px)');
    expect(css).toContain('min-height: 0');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('white-space: normal');
    expect(css).not.toContain('text-overflow');
  });
});
