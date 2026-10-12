import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { monsters } from './engine';
import { monsterStories, monsterStory } from './monsterLore';
import { monsterLore } from './strategy';

const originalIds = [24, 25, 26, 27, 28];

describe('complete, separately attributed monster identity text', () => {
  it('covers the exact current 37 IDs and names, without changing the roster', () => {
    expect(monsterStories).toHaveLength(37);
    expect(monsterStories.map(({ id, name }) => ({ id, name }))).toEqual(monsters.map(({ id, name }) => ({ id, name })));
    expect(new Set(monsterStories.map(story => story.flavour)).size).toBe(37);
    expect(new Set(monsterStories.map(story => story.origin)).size).toBe(37);
  });

  it.each(monsters)('separates original flavour from the origin of $id: $name', monster => {
    const story = monsterStory(monster.id);
    expect(monsterLore(monster.id)).toBe(story.flavour);
    expect(story.flavour.length).toBeGreaterThan(10);
    expect(story.flavour.length).toBeLessThan(90);
    expect(story.origin.length).toBeGreaterThan(10);
    expect(story.origin.length).toBeLessThan(120);
    expect(story.flavour).not.toBe(story.origin);
    expect(story.gameOriginal).toBe(originalIds.includes(monster.id));
    if (story.gameOriginal) {
      expect(story.origin).toMatch(/本作|ゲーム/);
      expect(story.sourceUrl).toBeNull();
      expect(story.sourceTitle).toBeNull();
    } else {
      expect(new URL(story.sourceUrl!).protocol).toBe('https:');
      expect(story.sourceTitle!.length).toBeGreaterThan(2);
    }
  });

  it('keeps the shipped text and exact source links traceable to the provenance record', () => {
    const provenance = JSON.parse(readFileSync(new URL('../docs/monster-lore-sources.json', import.meta.url), 'utf8'));
    expect(provenance.entries).toHaveLength(37);
    for (const story of monsterStories) {
      const recorded = provenance.entries.find((entry: { id: number }) => entry.id === story.id);
      expect(recorded).toMatchObject(story);
      expect(recorded.support.length).toBeGreaterThan(5);
      expect(recorded).toHaveProperty('uncertainty');
    }
  });

  it('retains a safe fallback for unknown IDs', () => {
    expect(monsterLore(-1)).toBe('まだ物語の記されていない幻獣。');
    expect(monsterStory(999).sourceUrl).toBeNull();
  });
});
