// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {DEMON_ART} from './demonArt';
import {DRAGON_ART} from './dragonArt';
import {MATERIAL_ART} from './materialArt';
import MonsterArt, {CHARACTER_ART, type CharacterArt} from './MonsterArt';
import {monsters} from './engine';

const entries = Object.entries(DEMON_ART);
const parse = (source: string) => new DOMParser().parseFromString(source, 'image/svg+xml');
const ids = (source: string) => [...parse(source).querySelectorAll('[id]')].map(node => node.id);
const geometry = (source: string) => [...parse(source).querySelectorAll('path')].map(node => node.getAttribute('d')).join('|');

describe('original demon SVG registry', () => {
  it('reserves exactly three new IDs and keeps sensible enemy sprite widths', () => {
    expect(entries.map(([id]) => Number(id))).toEqual([29, 30, 31]);
    expect(entries.map(([, art]) => art.spriteWidth)).toEqual([116, 110, 119]);
  });

  it.each(entries)('%s has valid deterministic data URLs and shared full/portrait geometry', (id, art) => {
    for (const [source, dataUrl, width, height] of [
      [art.full, art.artUrl, 280, 210],
      [art.portrait, art.portraitUrl, 140, 140],
    ] as const) {
      expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      expect(decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))).toBe(source);
      const doc = parse(source);
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.tagName).toBe('svg');
      expect(doc.documentElement.getAttribute('width')).toBe(String(width));
      expect(doc.documentElement.getAttribute('height')).toBe(String(height));
      expect(doc.querySelectorAll('path,circle,ellipse').length).toBeGreaterThan(18);
      expect(doc.querySelectorAll('image,text,script,animate,animateTransform,animateMotion,set,foreignObject,style,use')).toHaveLength(0);
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\b(?:href|on\w+)\s*=|javascript:|data:|<filter|<fe/i);
      const definedIds = ids(source);
      expect(definedIds.length).toBe(3);
      expect(new Set(definedIds).size).toBe(definedIds.length);
      const prefix = {29: 'dm-', 30: 'dk-', 31: 'de-'}[Number(id) as 29 | 30 | 31];
      for (const definedId of definedIds) expect(definedId.startsWith(prefix)).toBe(true);
      for (const reference of source.matchAll(/url\(#([\w-]+)\)/g)) expect(definedIds).toContain(reference[1]);
    }
    const full = parse(art.full).documentElement;
    const portrait = parse(art.portrait).documentElement;
    expect(full.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait.innerHTML).toBe(full.innerHTML);
    const [x, y, w, h] = portrait.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w).toBe(h);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(280);
    expect(y + h).toBeLessThanOrEqual(210);
    expect(portrait.getAttribute('viewBox')).not.toBe(full.getAttribute('viewBox'));
  });

  it('produces the exact same registry when the source module is evaluated again', async () => {
    const before = JSON.stringify(DEMON_ART);
    vi.resetModules();
    const fresh = await import('./demonArt');
    expect(JSON.stringify(fresh.DEMON_ART)).toBe(before);
  });

  it('uses unrelated path constructions and does not collide with existing gradient namespaces', () => {
    const previousSources = Object.entries(CHARACTER_ART).filter(([id]) => Number(id) < 29).map(([, art]) => decodeURIComponent(art.artUrl.split(',')[1]));
    const newGeometry = entries.map(([, art]) => geometry(art.full));
    expect(new Set(newGeometry).size).toBe(3);
    for (const paths of newGeometry) expect(previousSources.map(geometry)).not.toContain(paths);
    const newIds = entries.flatMap(([, art]) => ids(art.full));
    expect(new Set(newIds).size).toBe(newIds.length);
    const oldIds = previousSources.flatMap(ids);
    for (const id of newIds) expect(oldIds).not.toContain(id);
    expect(DEMON_ART[29].full).toContain('two open palms');
    expect(DEMON_ART[29].full).toContain('finite set of three loose tokens');
    expect(DEMON_ART[30].full).toContain('sweeping, oversized sleeve');
    expect(DEMON_ART[30].full).toContain('Bent wooden latch-lifter');
    expect(DEMON_ART[31].full).toContain('Exactly one visible bronze leg');
    expect(DEMON_ART[31].full).toContain('dissolves into mist');
  });

  it.each(entries)('%s satisfies the existing static image contract without requiring registration yet', (_id, art) => {
    const compatible: CharacterArt = art;
    const before = JSON.stringify(art);
    for (const portrait of [false, true]) {
      // Registration is a separate parent-owned change. Exercise the same HTML
      // image contract here without pretending MonsterArt already selects ID29–31.
      const source = portrait ? compatible.portraitUrl : compatible.artUrl;
      const markup = renderToStaticMarkup(<img className={`monsterArt ${portrait ? 'portraitArt' : ''}`} src={source} alt="" draggable={false}/>);
      const img = new DOMParser().parseFromString(markup, 'text/html').querySelector('img')!;
      expect(img.getAttribute('src')).toBe(source);
      expect(img.getAttribute('draggable')).toBe('false');
      expect(img.getAttribute('style')).toBeNull();
      expect(img.className).not.toMatch(/motion|animat/);
      expect(img.getAttribute('alt')).toBe('');
    }
    expect(JSON.stringify(art)).toBe(before);
  });

  it('can be merged without changing earlier SVG entries or old emoji fallbacks', () => {
    const combined: Readonly<Record<number, CharacterArt>> = {...CHARACTER_ART, ...DEMON_ART};
    for (const [id, art] of Object.entries(CHARACTER_ART)) {
      if (Number(id) < 29) expect(combined[Number(id)]).toBe(art);
    }
    for (const [id, art] of Object.entries({...DRAGON_ART, ...MATERIAL_ART})) expect(combined[Number(id)]).toBe(art);
    for (const monster of monsters.filter(monster => monster.id < 12)) {
      expect(renderToStaticMarkup(<MonsterArt monster={monster}/>)).toBe(monster.icon);
    }
    for (const [id, art] of entries) expect(combined[Number(id)]).toBe(art);
  });
});
