// @vitest-environment happy-dom
import {describe, expect, it, vi} from 'vitest';
import {EXTRAORDINARY_ART} from './extraordinaryArt';
import {CHARACTER_ART, type CharacterArt} from './MonsterArt';

const parse = (source: string) => new DOMParser().parseFromString(source, 'image/svg+xml');
const art = EXTRAORDINARY_ART[36];
describe('original static Janus artwork', () => {
  it('adds one mixed-family core with an unchanged shared image contract', () => {
    expect(Object.keys(EXTRAORDINARY_ART)).toEqual(['36']);
    const compatible: CharacterArt = art;
    expect(compatible.spriteWidth).toBe(116);
  });
  it.each(['full', 'portrait'] as const)('%s is self-contained, deterministic vector artwork', kind => {
    const source = art[kind];
    const url = kind === 'full' ? art.artUrl : art.portraitUrl;
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url.slice(url.indexOf(',') + 1))).toBe(source);
    const doc = parse(source);
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.tagName).toBe('svg');
    expect(doc.querySelectorAll('path,circle,ellipse').length).toBeGreaterThan(30);
    expect(doc.querySelectorAll('image,text,script,animate,animateTransform,animateMotion,set,foreignObject,style,use,filter')).toHaveLength(0);
    expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\b(?:href|on\w+)\s*=|javascript:|data:/i);
    const ids = [...doc.querySelectorAll('[id]')].map(node => node.id);
    expect(ids).toEqual(['xj-stone', 'xj-band', 'xj-metal']);
    for (const reference of source.matchAll(/url\(#([\w-]+)\)/g)) expect(ids).toContain(reference[1]);
  });
  it('uses exactly the same body in a bounded portrait crop', () => {
    const full = parse(art.full).documentElement;
    const portrait = parse(art.portrait).documentElement;
    expect(full.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait.getAttribute('viewBox')).toBe('76 14 126 126');
    expect(portrait.innerHTML).toBe(full.innerHTML);
    expect(full.getAttribute('width')).toBe('280');
    expect(full.getAttribute('height')).toBe('210');
    expect(portrait.getAttribute('width')).toBe('140');
    expect(portrait.getAttribute('height')).toBe('140');
  });
  it('has independently constructed paths and no old gradient collisions', () => {
    const oldSources = Object.entries(CHARACTER_ART).filter(([id]) => Number(id) < 36).map(([, value]) => decodeURIComponent(value.artUrl.split(',')[1]));
    const geometry = (source: string) => [...parse(source).querySelectorAll('path')].map(node => node.getAttribute('d')).join('|');
    expect(oldSources.map(geometry)).not.toContain(geometry(art.full));
    for (const source of oldSources) expect(source).not.toMatch(/id="xj-/);
    expect(art.full).toContain('real empty center');
    expect(art.full).toContain('two outward-facing profiles');
    expect(art.full).toContain('unbranded open-bow key');
  });
  it('re-evaluates without randomness or animation', async () => {
    const before = JSON.stringify(EXTRAORDINARY_ART);
    vi.resetModules();
    expect(JSON.stringify((await import('./extraordinaryArt')).EXTRAORDINARY_ART)).toBe(before);
  });
});
