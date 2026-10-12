// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MonsterDetails from './MonsterDetails';
import { monsters } from './engine';
import { monsterStory } from './monsterLore';
import { skillLore } from './strategy';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">開く</button><div id="root"></div>';
  document.getElementById('opener')!.focus();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });

const mount = async (id: number) => { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); };

describe('complete stories in a dedicated reading group', () => {
  it.each(monsters)('preserves $name flavour, origin, source and every skill story', async monster => {
    await mount(monster.id);
    const story = monsterStory(monster.id);
    expect(document.querySelector('.profileAppearance')?.hasAttribute('hidden')).toBe(false);
    await act(async () => document.querySelector<HTMLButtonElement>('[data-detail-tab=story]')!.click());
    const section = document.querySelector('.profileStory')!;
    expect(section.closest('[hidden]')).toBeNull();
    expect(section.querySelector('.monsterLore')?.textContent).toBe(story.flavour);
    expect(section.querySelector('.monsterOrigin')?.textContent).toBe(story.origin);
    expect(section.textContent).toContain('ひとこと');
    expect(section.textContent).toContain('本作の創作');
    expect(section.textContent).toContain(story.gameOriginal ? 'ゲームオリジナル' : '伝承');
    expect(document.querySelectorAll('.monsterLore')).toHaveLength(1);
    expect(document.querySelectorAll('.monsterOrigin')).toHaveLength(1);
    expect(document.querySelectorAll('.skill')).toHaveLength(monster.skills.length);
    expect([...document.querySelectorAll('.skillLore')].map(node => node.textContent)).toEqual(monster.skills.map(skill => skillLore(skill.name)));
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

  it('includes the movie trigger only in the visible art group, without autoplay', async () => {
    await mount(24);
    // Dynamic import completion is asynchronous; it must not move focus.
    for (let attempt = 0; attempt < 20 && !document.querySelector('.mythPlay'); attempt++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    const close = document.querySelector<HTMLButtonElement>('.profileHeader .close')!;
    expect(document.activeElement).toBe(close);
    expect(document.querySelector('.mythPlayer')).toBeNull();
    const key = async (key: string) => { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))); };
    await key('Tab'); expect(document.activeElement?.getAttribute('role')).toBe('tab');
    await key('Tab'); expect(document.activeElement?.getAttribute('role')).toBe('tabpanel');
    await key('Tab'); expect(document.activeElement).toBe(document.querySelector('.mythPlay'));
    await key('Escape');
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('opener'));
  });
});
