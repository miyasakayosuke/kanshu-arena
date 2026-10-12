// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { CHARACTER_ART } from './MonsterArt';
import { monsters } from './engine';
let root: Root;
const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const click = async (node: HTMLElement) => { await act(async () => node.click()); };
beforeEach(() => {
  localStorage.clear(); window.history.replaceState(null, '', '#catalog');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
const mount = async () => { await act(async () => root.render(<App />)); };
describe('art-first catalog without invented collection economy', () => {
  it('starts with collapsed filters and 37 large full-body single-action cards', async () => {
    await mount();
    expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')?.open).toBe(false);
    expect(document.querySelector('.catalogScreen .intro')).toBeNull();
    expect(document.querySelector('.catalogScreen h2')?.className).toBe('catalogAccessibleTitle');
    expect(document.querySelector('.catalogCount')?.textContent).toBe('37 / 37体');
    expect(document.querySelector('.resetFilters')).toBeNull();
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(37);
    for (const monster of monsters) {
      const opener = button(`${monster.name}の詳細`);
      const card = opener.closest('.catalogCard')!;
      expect(card.querySelectorAll('button')).toHaveLength(1);
      expect(card.querySelector('img')?.getAttribute('src')).toBe(CHARACTER_ART[monster.id].artUrl);
      expect(card.querySelector('.portraitArt')).toBeNull();
      expect(card.querySelector('strong')?.textContent).toBe(monster.name);
      expect(card.getAttribute('data-family')).toBe(monster.family);
      expect(card.textContent).not.toMatch(/HP|MP|レア|SSR|未所持|獲得率|コスト/);
    }
    expect(document.querySelector('.catalogScreen .hint')).toBeNull();
  });
  it('opens full-art details from every card while preserving the party and card focus', async () => {
    await mount();
    const saved = localStorage.getItem('kanshu-workshop-v1');
    const list = document.querySelector<HTMLElement>('.catalogGallery')!;
    list.scrollTop = 173;
    for (const monster of monsters) {
      const opener = button(`${monster.name}の詳細`); opener.focus();
      await click(opener);
      expect(document.querySelector('.profileArtFirst .heroIcon img')?.getAttribute('src')).toBe(CHARACTER_ART[monster.id].artUrl);
      expect(document.querySelector('.profileIdentity h2')?.textContent).toContain(monster.name);
      expect(document.querySelectorAll('.profileModal .skill')).toHaveLength(monster.skills.length);
      await click(button('詳細を閉じる'));
      expect(document.activeElement).toBe(opener);
      expect(list.scrollTop).toBe(173);
    }
    expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
  });
  it('summarizes selected filters while collapsed and clears empty results without losing access', async () => {
    await mount(); await click(document.querySelector('.filterDisclosure > summary')!);
    const select = document.querySelector<HTMLSelectElement>('[aria-label="系統で絞り込み"]')!;
    await act(async () => { select.value = 'dragon'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(document.querySelector('.filterDisclosure > summary')!);
    expect(document.querySelector('.catalogApplied')?.textContent).toContain('竜系');
    expect(document.querySelector('.catalogCount')?.textContent).toBe('5 / 37体');
    const input = document.querySelector<HTMLInputElement>('[aria-label="検索"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'no matching creature'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(0);
    expect(document.querySelector('.emptySearch')).toBeTruthy();
    await click(button('絞り込みをリセット'));
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(37);
    expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')?.open).toBe(false);
  });
  it('retains readable names and working detail actions when a body image fails', async () => {
    await mount();
    const opener = button('妖狐の詳細');
    await act(async () => opener.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(opener.querySelector('img')).toBeNull();
    expect(opener.querySelector('.catalogArtFallback')?.textContent).toContain('画像を表示できません');
    expect(opener.querySelector('strong')?.textContent).toBe('妖狐');
    opener.focus(); await click(opener);
    await act(async () => document.querySelector('.heroIcon img')!.dispatchEvent(new Event('error')));
    expect(document.querySelector('.heroIcon .catalogArtFallback')?.getAttribute('aria-label')).toContain('妖狐');
    expect(document.querySelectorAll('.profileModal .skill')).toHaveLength(monsters[0].skills.length);
    await click(button('詳細を閉じる'));
    expect(document.activeElement).toBe(opener);
    await click(button('トロルの詳細'));
    expect(document.querySelector('.heroIcon img')?.getAttribute('src')).toBe(CHARACTER_ART[1].artUrl);
  });
  it('keeps team replacement cards in their compact stats-first layout', async () => {
    await mount(); await click(button('編成')); await click(button('2枠・バステトを入れ替える'));
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(0);
    expect(document.querySelector('.candidateCard .portraitArt')).toBeTruthy();
    expect(document.querySelector('.candidateCard')?.textContent).toContain('HP');
    expect(document.querySelector('.candidateSelect')).toBeTruthy();
  });
});
