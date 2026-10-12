// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import HomePasture from './HomePasture';
import { CHARACTER_ART } from './MonsterArt';
import { homeIdleSvg, homeIdleTracks, sampleHomeIdleTrack } from './homeIdleMotion';

let root: Root, observerCallback: IntersectionObserverCallback, intersecting: boolean, hidden: boolean;
let media: MediaQueryList, mediaChange: (() => void) | undefined;
const begin = vi.fn(), end = vi.fn(), pause = vi.fn(), resume = vi.fn(), seek = vi.fn(), disconnect = vi.fn();
const methods = ['beginElement', 'endElement', 'pauseAnimations', 'unpauseAnimations', 'setCurrentTime'];
let originalMethods: (PropertyDescriptor | undefined)[];
const prototypeFor = (index: number) => index < 2 ? SVGElement.prototype : SVGSVGElement.prototype;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(document.getElementById('root')!);
  originalMethods = methods.map((name, i) => Object.getOwnPropertyDescriptor(prototypeFor(i), name));
  methods.forEach((name, i) => Object.defineProperty(prototypeFor(i), name, { configurable: true, value: [begin, end, pause, resume, seek][i] }));
  [begin, end, pause, resume, seek, disconnect].forEach(mock => mock.mockClear());
  hidden = false; intersecting = true;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  media = { matches: false, addEventListener: vi.fn((_event, listener) => { mediaChange = listener as () => void; }), removeEventListener: vi.fn() } as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observerCallback = callback; }
    observe(target: Element) { observerCallback([{ target, isIntersecting: intersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect = disconnect;
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  methods.forEach((name, i) => { if (originalMethods[i]) Object.defineProperty(prototypeFor(i), name, originalMethods[i]!); else Reflect.deleteProperty(prototypeFor(i), name); });
  vi.restoreAllMocks(); vi.unstubAllGlobals(); mediaChange = undefined;
});
const render = async (team = [0, 12, 14, 27, 35]) => { await act(async () => root.render(<HomePasture team={team} onFocus={vi.fn()} />)); };
const visibility = async (visible: boolean) => { await act(async () => observerCallback([{ target: document.querySelector('.homePasture')!, isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver)); };
const reduced = async (value: boolean) => { Object.defineProperty(media, 'matches', { configurable: true, value }); await act(async () => mediaChange?.()); };

describe('home-only native idle animation', () => {
  it('renders original full-body SVG immediately, and animates actual Yoko and Fenrir parts', async () => {
    await render();
    expect(document.querySelectorAll('[data-home-art]')).toHaveLength(5);
    expect(document.querySelectorAll('[data-home-art="0"] animateTransform')).toHaveLength(10);
    expect(document.querySelectorAll('[data-home-art="12"] animateTransform')).toHaveLength(11);
    expect(document.querySelectorAll('[data-home-art="14"] animateTransform')).toHaveLength(1);
    expect(begin).toHaveBeenCalledTimes(24);
    expect(document.querySelector('.homePasture')?.getAttribute('data-home-motion')).toBe('running');
    expect(document.querySelector('canvas, .homeIdleArt img')).toBeNull();
    expect([...document.querySelectorAll('animateTransform')].every(node => node.getAttribute('begin') === 'indefinite')).toBe(true);
    expect([...document.querySelectorAll('.pastureDetails')].every(node => !node.querySelector('animateTransform'))).toBe(true);
  });
  it('pauses offscreen/hidden and resumes without restarting or allocating new SVGs', async () => {
    await render(); const first = document.querySelector('[data-home-art]'); begin.mockClear(); resume.mockClear(); pause.mockClear();
    await visibility(false); expect(pause).toHaveBeenCalledTimes(5); expect(resume).not.toHaveBeenCalled();
    await visibility(true); expect(resume).toHaveBeenCalledTimes(5); expect(begin).not.toHaveBeenCalled();
    hidden = true; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(document.querySelector('.homePasture')?.getAttribute('data-home-motion')).toBe('paused');
    hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(begin).not.toHaveBeenCalled();
    expect(document.querySelector('[data-home-art]')).toBe(first);
  });
  it('starts completely static under reduced motion, then safely responds to preference changes', async () => {
    Object.defineProperty(media, 'matches', { configurable: true, value: true });
    await render(); expect(begin).not.toHaveBeenCalled(); expect(resume).not.toHaveBeenCalled(); expect(document.querySelector('.homePasture')?.getAttribute('data-home-motion')).toBe('reduced');
    await reduced(false); expect(begin).toHaveBeenCalledTimes(24);
    await reduced(true); expect(document.querySelector('animateTransform')).toBeNull();
    for (const node of [...document.querySelectorAll('[data-home-track]')]) expect(node.getAttribute('transform')).toMatch(/^(?:scale\(1 1\)|rotate\(0 )/);
    await reduced(false); expect(begin).toHaveBeenCalledTimes(48);
  });
  it('does not start offscreen or hidden, disconnects observers, and pauses every removed creature', async () => {
    hidden = true; intersecting = false; await render(); expect(begin).not.toHaveBeenCalled();
    await visibility(true); expect(begin).not.toHaveBeenCalled();
    hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(begin).toHaveBeenCalledTimes(24);
    pause.mockClear(); await render([3, 2]); expect(pause.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect([...document.querySelectorAll('[data-home-art]')].map(node => node.getAttribute('data-home-art'))).toEqual(['3', '2']);
    const remove = vi.spyOn(document, 'removeEventListener'); await act(async () => root.unmount()); root = createRoot(document.getElementById('root')!);
    expect(disconnect).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function)); expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
  it('retains every original path and unique local paint references for all 37 identities', () => {
    for (let id = 0; id < 37; id++) {
      const original = new DOMParser().parseFromString(decodeURIComponent(CHARACTER_ART[id].artUrl.split(',')[1]), 'image/svg+xml');
      const animated = new DOMParser().parseFromString(homeIdleSvg(id, 'test'), 'image/svg+xml');
      expect([...animated.querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual([...original.querySelectorAll('path')].map(path => path.getAttribute('d')));
      expect(animated.documentElement.getAttribute('viewBox')).toBe(original.documentElement.getAttribute('viewBox'));
      const paintOrder = (doc: Document) => [...doc.querySelectorAll('path, ellipse, circle, rect, polygon, polyline, line')].map(node => [node.tagName, ...['d', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'points'].map(attr => node.getAttribute(attr))]);
      expect(paintOrder(animated)).toEqual(paintOrder(original));
      expect(animated.querySelectorAll('animateTransform').length).toBeGreaterThan(0);
      for (const node of [...animated.querySelectorAll('*')]) for (const attr of [...node.attributes]) for (const match of attr.value.matchAll(/url\(#([^)]*)\)/g)) expect(animated.getElementById(match[1])).not.toBeNull();
      const second = homeIdleSvg(id, 'second'); for (const node of [...animated.querySelectorAll('[id]')]) expect(second).not.toContain(`id="${node.id}"`);
      for (const shadow of [...animated.documentElement.children].filter(node => node.tagName === 'ellipse')) expect(shadow.closest('[data-home-track]')).toBeNull();
    }
  });
  it('has deterministic bounded native tracks and no home JS frame loop, image cache, timer, audio, or battle dependencies', () => {
    const files = ['HomeIdleArt.tsx', 'homeIdleMotion.ts', 'HomePasture.tsx'];
    const sources = files.map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
    expect(sources).not.toMatch(/requestAnimationFrame|setInterval|setTimeout|new Image|new Audio|BattleStage|start\(|advanceWithEvents|familyEncounterForSeed/);
    expect(sources).not.toMatch(/from ['"].*(?:BattleMotion|battleMotion|playback)['"]/);
    for (let id = 0; id < 37; id++) for (const track of homeIdleTracks(id, [0, 0, 280, 210])) {
      expect(sampleHomeIdleTrack(track, 0)).toEqual(track.values[0]);
      expect(sampleHomeIdleTrack(track, track.duration)).toEqual(track.values[0]);
      for (let t = 0; t < track.duration; t += 50) expect(sampleHomeIdleTrack(track, t).every(Number.isFinite)).toBe(true);
    }
  });
});
