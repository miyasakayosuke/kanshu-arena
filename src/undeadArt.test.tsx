// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {UNDEAD_ART} from './undeadArt';
import {CHARACTER_ART, type CharacterArt} from './MonsterArt';

const entries = Object.entries(UNDEAD_ART);
const parse = (source: string) => new DOMParser().parseFromString(source, 'image/svg+xml');
const definitions = (source: string) => [...parse(source).querySelectorAll('[id]')].map(node => node.id);
const geometry = (source: string) => [...parse(source).querySelectorAll('path')].map(node => node.getAttribute('d')).join('|');
const decode = (dataUrl: string) => decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1));

describe('original undead static SVG registry', () => {
  it('reserves exactly four IDs and bounded enemy sprite widths', () => {
    expect(entries.map(([id]) => Number(id))).toEqual([32, 33, 34, 35]);
    expect(entries.map(([, art]) => art.spriteWidth)).toEqual([120, 116, 116, 112]);
    for (const [, art] of entries) {
      expect(art.spriteWidth).toBeGreaterThanOrEqual(100);
      expect(art.spriteWidth).toBeLessThanOrEqual(128);
    }
  });

  it.each(entries)('%s contains only valid self-contained static SVG and resolved local paint IDs', (id, art) => {
    for (const [source, dataUrl, width, height] of [
      [art.full, art.artUrl, 280, 210],
      [art.portrait, art.portraitUrl, 140, 140],
    ] as const) {
      expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      expect(decode(dataUrl)).toBe(source);
      const doc = parse(source);
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.tagName).toBe('svg');
      expect(doc.documentElement.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
      expect(doc.documentElement.getAttribute('width')).toBe(String(width));
      expect(doc.documentElement.getAttribute('height')).toBe(String(height));
      expect(doc.querySelectorAll('path').length).toBeGreaterThanOrEqual(25);
      const allowed = new Set(['svg', 'defs', 'linearGradient', 'stop', 'path', 'ellipse']);
      for (const node of doc.querySelectorAll('*')) {
        expect(allowed.has(node.tagName)).toBe(true);
        for (const attribute of node.attributes) {
          expect(attribute.name).not.toMatch(/^(?:on|href|xlink|class|style|font)/i);
          expect(attribute.value).not.toMatch(/(?:NaN|Infinity|undefined|javascript:)/);
        }
      }
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\b(?:href|on\w+)\s*=|javascript:|data:|<filter|<fe|<script|<foreignObject|<image|<text|<animate|<use\b/i);
      const ids = definitions(source);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(ids.length);
      const prefix = {32: 'ud-', 33: 'uh-', 34: 'uj-', 35: 'uv-'}[Number(id) as 32 | 33 | 34 | 35];
      for (const localId of ids) expect(localId.startsWith(prefix)).toBe(true);
      for (const reference of source.matchAll(/url\(#([\w-]+)\)/g)) expect(ids).toContain(reference[1]);
    }
  });

  it.each(entries)('%s reuses byte-identical figure paths in a distinct, bounded square portrait crop', (_id, art) => {
    const full = parse(art.full).documentElement;
    const portrait = parse(art.portrait).documentElement;
    expect(full.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait.innerHTML).toBe(full.innerHTML);
    expect(geometry(art.full)).toBe(geometry(art.portrait));
    const crop = portrait.getAttribute('viewBox')!.split(' ').map(Number);
    expect(crop).toHaveLength(4);
    const [x, y, w, h] = crop;
    for (const number of crop) expect(Number.isFinite(number)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(w).toBeGreaterThan(0);
    expect(w).toBe(h);
    expect(x + w).toBeLessThanOrEqual(280);
    expect(y + h).toBeLessThanOrEqual(210);
    expect(portrait.getAttribute('viewBox')).not.toBe(full.getAttribute('viewBox'));
    expect(art.portraitUrl).not.toBe(art.artUrl);
  });

  it('uses distinct figure constructions, portrait compositions, palettes, and gradient namespaces', () => {
    const previousSources = Object.entries(CHARACTER_ART).filter(([id]) => Number(id) < 32).map(([, art]) => decode(art.artUrl));
    const newGeometry = entries.map(([, art]) => geometry(art.full));
    expect(new Set(newGeometry).size).toBe(4);
    expect(new Set(entries.map(([, art]) => art.portraitUrl)).size).toBe(4);
    expect(new Set(entries.map(([, art]) => parse(art.portrait).documentElement.getAttribute('viewBox'))).size).toBe(4);
    expect(new Set(entries.map(([, art]) => parse(art.full).querySelector('stop')!.getAttribute('stop-color'))).size).toBe(4);
    for (const paths of newGeometry) expect(previousSources.map(geometry)).not.toContain(paths);
    const newIds = entries.flatMap(([, art]) => definitions(art.full));
    expect(new Set(newIds).size).toBe(newIds.length);
    const previousIds = previousSources.flatMap(definitions);
    for (const id of newIds) expect(previousIds).not.toContain(id);
  });

  it('keeps the source deterministic across module reevaluation', async () => {
    const before = JSON.stringify(UNDEAD_ART);
    vi.resetModules();
    const fresh = await import('./undeadArt');
    expect(JSON.stringify(fresh.UNDEAD_ART)).toBe(before);
  });

  it.each(entries)('%s satisfies the existing static image contract before or after parent registration', (_id, art) => {
    const compatible: CharacterArt = art;
    const before = JSON.stringify(art);
    for (const portrait of [false, true]) {
      const source = portrait ? compatible.portraitUrl : compatible.artUrl;
      const markup = renderToStaticMarkup(<img className={`monsterArt ${portrait ? 'portraitArt' : ''}`} src={source} alt="" draggable={false}/>);
      const img = new DOMParser().parseFromString(markup, 'text/html').querySelector('img')!;
      expect(img.getAttribute('src')).toBe(source);
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('draggable')).toBe('false');
      expect(img.getAttribute('style')).toBeNull();
      expect(img.className).not.toMatch(/motion|animat/);
    }
    expect(JSON.stringify(art)).toBe(before);
  });

  it('can be registered without replacing any earlier character entry', () => {
    const combined: Readonly<Record<number, CharacterArt>> = {...CHARACTER_ART, ...UNDEAD_ART};
    for (const [id, art] of Object.entries(CHARACTER_ART)) {
      if (Number(id) < 32) expect(combined[Number(id)]).toBe(art);
    }
    for (const [id, art] of entries) expect(combined[Number(id)]).toBe(art);
  });
});
