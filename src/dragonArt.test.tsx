// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {DRAGON_ART} from './dragonArt';
import MonsterArt, {CHARACTER_ART} from './MonsterArt';
import {monsters} from './engine';

const entries = Object.entries(DRAGON_ART);
describe('independently authored dragon artwork', () => {
  it.each(entries)('keeps dragon %s full body and portrait self-contained and static', (_id, art) => {
    for (const [source, url, width] of [[art.full,art.artUrl,280],[art.portrait,art.portraitUrl,140]] as const) {
      expect(decodeURIComponent(url.split(',')[1])).toBe(source);
      const parsed = new DOMParser().parseFromString(source,'image/svg+xml');
      expect(parsed.querySelector('parsererror')).toBeNull();
      expect(parsed.documentElement.getAttribute('width')).toBe(String(width));
      expect(parsed.querySelectorAll('path').length).toBeGreaterThan(20);
      expect(parsed.querySelectorAll('image, text, script, animate, animateTransform, set, foreignObject')).toHaveLength(0);
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\bhref\s*=/);
      const ids = [...parsed.querySelectorAll('[id]')].map(element => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const ref of source.matchAll(/url\(#([\w-]+)\)/g)) expect(ids).toContain(ref[1]);
      // Transparent corners remain possible: no background rectangle or external card.
      expect(parsed.querySelectorAll('rect')).toHaveLength(0);
    }
    const full = new DOMParser().parseFromString(art.full,'image/svg+xml');
    const portrait = new DOMParser().parseFromString(art.portrait,'image/svg+xml');
    expect(full.documentElement.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait.documentElement.getAttribute('viewBox')).not.toBe('0 0 280 210');
    expect(portrait.documentElement.innerHTML).toBe(full.documentElement.innerHTML);
  });

  it.each(entries)('shares dragon %s between a static allied portrait and canvas registry', (id, art) => {
    const monster = monsters.find(monster => monster.id === Number(id))!;
    expect(CHARACTER_ART[monster.id]).toBe(art);
    for (const portrait of [false,true]) {
      const html = renderToStaticMarkup(<MonsterArt monster={monster} portrait={portrait}/>);
      const node = new DOMParser().parseFromString(html,'text/html').querySelector('img')!;
      expect(node.getAttribute('src')).toBe(portrait ? art.portraitUrl : art.artUrl);
      expect(node.getAttribute('draggable')).toBe('false');
      expect(node.getAttribute('style')).toBeNull();
      expect(node.getAttribute('class')).not.toMatch(/motion|animat/);
    }
  });

  it('has four different path sets and exclusive gradient namespaces, not palette swaps', () => {
    const shapes = entries.map(([, art]) => [...new DOMParser().parseFromString(art.full,'image/svg+xml').querySelectorAll('path')].map(path => path.getAttribute('d')).join('|'));
    expect(new Set(shapes).size).toBe(4);
    const ids = entries.flatMap(([, art]) => [...new DOMParser().parseFromString(art.full,'image/svg+xml').querySelectorAll('[id]')].map(node => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(DRAGON_ART[15].full).toContain('Five unlit storm chambers');
    expect(DRAGON_ART[16].full).toContain('only two limbs');
    expect(DRAGON_ART[17].full).toContain('each end is a head');
    expect(DRAGON_ART[18].full).toContain('open water droplet');
  });

  it('preserves all earlier sprite dimensions and emoji fallbacks', () => {
    expect([12,13,14].map(id => CHARACTER_ART[id].spriteWidth)).toEqual([110,99,121]);
    for (const monster of monsters.filter(monster => monster.id < 12)) expect(renderToStaticMarkup(<MonsterArt monster={monster}/>)).toBe(monster.icon);
  });
});
