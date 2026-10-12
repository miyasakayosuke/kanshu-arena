// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MonsterDetails from './MonsterDetails';
import { monsters } from './engine';
import { monsterStory } from './monsterLore';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">開く</button><div id="root"></div>';
  document.getElementById('opener')!.focus();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });

const mount = async (id: number) => { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); };

describe('readable identity at every monster entry', () => {
  it.each(monsters)('shows $name flavour and origin before the battle rules without expanding stats', async monster => {
    await mount(monster.id);
    const story = monsterStory(monster.id);
    const section = document.querySelector('.profileStory')!;
    const background = document.querySelector<HTMLDetailsElement>('.profileBackground')!;
    expect(section.closest('details')).toBeNull();
    expect(background.open).toBe(false);
    expect(section.querySelector('.monsterLore')?.textContent).toBe(story.flavour);
    expect(section.querySelector('.monsterOrigin')?.textContent).toContain(story.origin);
    expect(section.textContent).toContain('ひとこと');
    expect(section.textContent).toContain('本作の創作');
    expect(section.textContent).toContain(story.gameOriginal ? 'ゲームオリジナル' : '伝承');
    expect(section.previousElementSibling?.className).toBe('profileHeading');
    expect(section.nextElementSibling?.className).toBe('roleBrief');
    expect(document.querySelectorAll('.monsterLore')).toHaveLength(1);
    expect(document.querySelectorAll('.monsterOrigin')).toHaveLength(1);
    expect(document.querySelectorAll('.skill')).toHaveLength(monster.skills.length);
    expect(document.querySelectorAll('.skillLore')).toHaveLength(monster.skills.length);
    const source = section.querySelector('a');
    if (story.gameOriginal) expect(source).toBeNull();
    else {
      expect(source?.getAttribute('href')).toBe(story.sourceUrl);
      expect(source?.getAttribute('target')).toBe('_blank');
      expect(source?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(source?.getAttribute('aria-label')).toContain(story.sourceTitle);
      expect(source?.getAttribute('aria-label')).toContain('新しいタブ');
    }
  });

  it('cycles through the movie trigger and reading controls without a historical source', async () => {
    await mount(24);
    const close = document.querySelector<HTMLButtonElement>('.profileHeader .close')!;
    expect(document.activeElement).toBe(close);
    await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(document.querySelector('.mythPlay'));
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(document.querySelector('.profileBackground > summary'));
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('opener'));
  });
});
