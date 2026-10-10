// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {monsters} from './engine';
import MonsterArt from './MonsterArt';
import {GENBU_ART_URL, GENBU_PORTRAIT_SVG, GENBU_PORTRAIT_URL, GENBU_SVG, RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_SVG, RATATOSKR_PORTRAIT_URL, RATATOSKR_SVG} from './familyArt';
import {FENRIR_ART_URL, FENRIR_PORTRAIT_URL} from './fenrirArt';

describe('original family character art', () => {
  it.each([
    ['Ratatoskr', RATATOSKR_SVG, RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_SVG, RATATOSKR_PORTRAIT_URL],
    ['Genbu', GENBU_SVG, GENBU_ART_URL, GENBU_PORTRAIT_SVG, GENBU_PORTRAIT_URL],
  ])('keeps %s self-contained, transparent and static in full and portrait crops', (_name, full, fullUrl, portrait, portraitUrl) => {
    for (const [source, url] of [[full, fullUrl], [portrait, portraitUrl]]) {
      expect(decodeURIComponent(url.split(',')[1])).toBe(source);
      const document = new DOMParser().parseFromString(source, 'image/svg+xml');
      expect(document.querySelector('parsererror')).toBeNull();
      expect(document.querySelectorAll('path').length).toBeGreaterThan(30);
      expect(document.querySelectorAll('image, text, script, animate, animateTransform, set, foreignObject')).toHaveLength(0);
      const ids = new Set([...document.querySelectorAll('[id]')].map(node => node.id));
      for (const ref of source.matchAll(/url\(#([\w-]+)\)/g)) expect(ids.has(ref[1])).toBe(true);
    }
    expect(new DOMParser().parseFromString(full, 'image/svg+xml').documentElement.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait).not.toBe(full);
  });

  it.each([
    [12, FENRIR_ART_URL, FENRIR_PORTRAIT_URL],
    [13, RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_URL],
    [14, GENBU_ART_URL, GENBU_PORTRAIT_URL],
  ])('reuses character %i art as a static dock portrait and full profile', (id, full, portrait) => {
    const monster = monsters.find(monster => monster.id === id)!;
    for (const isPortrait of [false, true]) {
      const html = renderToStaticMarkup(<MonsterArt monster={monster} portrait={isPortrait}/>);
      const node = new DOMParser().parseFromString(html, 'text/html').querySelector('img')!;
      expect(node.getAttribute('src')).toBe(isPortrait ? portrait : full);
      expect(node.getAttribute('draggable')).toBe('false');
      expect(node.getAttribute('style')).toBeNull();
      expect(node.getAttribute('class')).not.toMatch(/motion|animat/);
    }
  });

  it('preserves every earlier emoji character fallback', () => {
    for (const monster of monsters.filter(monster => monster.id < 12)) expect(renderToStaticMarkup(<MonsterArt monster={monster}/>)).toBe(monster.icon);
  });
});
