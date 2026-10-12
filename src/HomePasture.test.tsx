// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePasture, { pastureSlot } from './HomePasture';
import HomeScreen from './HomeScreen';
import { CHARACTER_ART } from './MonsterArt';
import { monsters } from './engine';
import { enemyFormation } from './enemyFormation';
import { PASTURE_ART_URL } from './pastureScene';

let root: Root;
beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(document.getElementById('root')!); });
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
const slots = () => [...document.querySelectorAll<HTMLElement>('.pastureMonster')];

describe('selected-party pasture', () => {
  it('renders exactly the selected identities in their original order, as full-body original art', async () => {
    const team = [12, 0, 14, 3, 16];
    const focus = vi.fn();
    await act(async () => root.render(<HomePasture team={team} onFocus={focus} />));
    expect(slots().map(slot => Number(slot.dataset.monsterId))).toEqual(team);
    expect(slots().map(slot => Number(slot.dataset.partySlot))).toEqual([0, 1, 2, 3, 4]);
    expect(slots().map(slot => slot.style.zIndex)).toEqual(['2', '1', '2', '1', '2']);
    for (const [index, body] of slots().entries()) {
      const button = document.querySelectorAll<HTMLButtonElement>('.pastureDetails')[index];
      expect(button.getAttribute('aria-label')).toBe(`${monsters[team[index]].name}の詳細`);
      expect(body.querySelector('img')?.getAttribute('src')).toBe(CHARACTER_ART[team[index]].artUrl);
      expect(body.querySelector('img')?.classList.contains('portraitArt')).toBe(false);
      await act(async () => button.click());
      expect(focus).toHaveBeenLastCalledWith(team[index]);
    }
    expect(document.querySelector('canvas')).toBeNull();
    expect(document.querySelector('.pastureLandscape')?.getAttribute('src')).toBe(PASTURE_ART_URL);
  });

  it('immediately follows changed party props without retaining old identities or filling empty slots', async () => {
    const onFocus = vi.fn();
    await act(async () => root.render(<HomePasture team={[0, 2, 3, 4, 6]} onFocus={onFocus} />));
    await act(async () => root.render(<HomePasture team={[14, 12]} onFocus={onFocus} />));
    expect(slots().map(slot => Number(slot.dataset.monsterId))).toEqual([14, 12]);
    expect([...document.querySelectorAll('.pastureEmpty')].map(node => node.getAttribute('aria-label'))).toEqual(['3枠・空き', '4枠・空き', '5枠・空き']);
    expect(document.querySelector('.homePasture')?.getAttribute('aria-label')).toBe('現在のパーティ 2/5体');
    await act(async () => root.render(<HomePasture team={[]} onFocus={onFocus} />));
    expect(slots()).toHaveLength(0); expect(document.querySelectorAll('.pastureEmpty')).toHaveLength(5);
  });

  it('removes the home headline and promotional copy while keeping credits and actual names', async () => {
    await act(async () => root.render(<HomeScreen team={[0, 2, 3, 4, 6]} rule="standard" onFocus={vi.fn()} />));
    expect(document.querySelector('.homeHero')).toBeNull();
    expect(document.querySelector('.gameHome h2')).toBeNull();
    expect(document.querySelector('.gameHome')?.textContent).not.toMatch(/BUILD|次の一手|5体を組む|対戦で確かめる|出場できます/);
    expect(document.querySelector('.homeCredits a')?.getAttribute('href')).toContain('credits.html');
  });

  it('uses arena front/back geometry and contains all 37 original bodies in every slot', () => {
    for (const monster of monsters) for (let index = 0; index < 5; index++) {
      const actual = pastureSlot(index, monster.id), arena = enemyFormation(index, 5, 1, CHARACTER_ART[monster.id]);
      const grow = arena.depth ? 1.12 : 1.19;
      expect(actual.width).toBe(arena.width * grow); expect(actual.height).toBe(arena.height * grow);
      expect(actual.width / actual.height).toBeCloseTo(arena.width / arena.height);
      expect(actual.foot.x).toBe(140 + index * 110); expect(actual.foot.y).toBe(arena.foot.y + 76);
      expect(actual.depth).toBe(index % 2 ? 0 : 1);
      expect(actual.foot.x - actual.width / 2).toBeGreaterThanOrEqual(0);
      expect(actual.foot.x + actual.width / 2).toBeLessThanOrEqual(720);
      expect(actual.top).toBeGreaterThan(0); expect(actual.top + actual.height).toBeLessThan(540);
    }
  });
  it('contains every scaled body and nonoverlapping 44px target across short and tall mobile scenes', () => {
    // Content-box dimensions follow the CSS, excluding the two one-pixel borders.
    // Includes 802×360 / safe-area landscape and 500–599px landscape width;
    // minimum scene height wins when a nonzero bottom safe area reduces space.
    for (const [width, height] of [[300, 282], [374, 456], [374, 694], [616, 750], [466, 260], [474, 260], [300, 258]]) {
      const targetRects: { x: number; y: number }[] = [];
      for (let index = 0; index < 5; index++) {
        const sample = pastureSlot(index, 0), footY = height * (sample.depth ? .68 : .49);
        targetRects.push({ x: sample.foot.x * width / 720 - 22, y: footY + 4 });
        for (const monster of monsters) {
          const slot = pastureSlot(index, monster.id), scale = width / 720;
          const top = footY - (slot.foot.y - slot.top) * scale;
          expect(top).toBeGreaterThanOrEqual(0);
          expect(top + slot.height * scale).toBeLessThanOrEqual(height);
          expect(slot.foot.x * scale - slot.width * scale / 2).toBeGreaterThanOrEqual(0);
          expect(slot.foot.x * scale + slot.width * scale / 2).toBeLessThanOrEqual(width);
        }
      }
      for (const [i, rect] of targetRects.entries()) {
        expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + 44).toBeLessThanOrEqual(width);
        expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.y + 44).toBeLessThanOrEqual(height);
        for (const other of targetRects.slice(i + 1)) expect(Math.abs(rect.x - other.x) >= 44 || Math.abs(rect.y - other.y) >= 44).toBe(true);
      }
    }
  });

});
