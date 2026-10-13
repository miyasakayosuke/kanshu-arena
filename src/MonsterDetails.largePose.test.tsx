// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonsterDetails from './MonsterDetails';
import HomeIdleArt from './HomeIdleArt';
import CatalogArt from './CatalogArt';
import App from './App';
import { monsters } from './engine';
import { CHARACTER_ART } from './MonsterArt';
import * as idle from './homeIdleMotion';
import { MYTH_SCENES } from './mythVignettes';

// DOM/source/lifecycle contracts only. These tests do not establish native
// viewport clipping, actual SMIL cycles, frame rate, or reduced-motion pixels.
let root: Root, hidden: boolean, reduced: boolean, intersecting: boolean, media: MediaQueryList;
let observers: { callback: IntersectionObserverCallback; target?: Element; disconnected: boolean }[];
let frames: Map<number, FrameRequestCallback>, nextFrame: number;
const begin = vi.fn(), pause = vi.fn(), resume = vi.fn();
const methods = ['beginElement', 'pauseAnimations', 'unpauseAnimations'];
const prototype = (index: number) => index === 0 ? SVGElement.prototype : SVGSVGElement.prototype;
let original: (PropertyDescriptor | undefined)[];
const profile = () => document.querySelector<HTMLElement>('.profileModal')!;
const art = () => profile()?.querySelector<HTMLElement>('[data-detail-art]')!;
const svg = () => art()?.querySelector<SVGSVGElement>('svg')!;
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[data-detail-tab="${name}"]`)!;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const textButton = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === name)!;
const activeObservers = () => observers.filter(observer => !observer.disconnected);
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function select(name: string) { await click(tab(name)); }
async function settleMovieImport() { await act(async () => { await import('./components/MythVignette'); }); }
async function mount(id = 0) { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); await settleMovieImport(); }
async function key(value: string, target: EventTarget = document.activeElement!) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
  await act(async () => target.dispatchEvent(event)); return event;
}
async function visible(value: boolean) {
  const observer = activeObservers().find(observer => observer.target === art())!;
  await act(async () => observer.callback([{ target: observer.target, isIntersecting: value } as IntersectionObserverEntry], {} as IntersectionObserver));
}
async function visibility(value: boolean) { hidden = value; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); }
async function motion(value: boolean) { reduced = value; await act(async () => media.dispatchEvent(new Event('change'))); }
function source(id: number) { return new DOMParser().parseFromString(decodeURIComponent(CHARACTER_ART[id].artUrl.split(',')[1]), 'image/svg+xml').documentElement; }
function geometry(node: Element) {
  return [...node.querySelectorAll('path,ellipse,circle,rect,polygon,polyline,line')].map(shape => [shape.tagName,
    ...['d','cx','cy','rx','ry','r','x','y','width','height','points'].map(name => shape.getAttribute(name)),
  ]);
}
function assertLocalReferences(root: Element) {
  const ids = [...root.querySelectorAll('[id]')].map(node => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of [root, ...root.querySelectorAll('*')]) for (const attribute of [...node.attributes]) {
    for (const match of attribute.value.matchAll(/url\(#([^)]*)\)/g)) expect(ids).toContain(match[1]);
  }
}

beforeEach(() => {
  document.body.innerHTML = '<button id="opener">Open</button><div id="root"></div>'; document.body.style.overflow = 'auto';
  document.getElementById('opener')!.focus(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
  original = methods.map((name, index) => Object.getOwnPropertyDescriptor(prototype(index), name));
  methods.forEach((name, index) => Object.defineProperty(prototype(index), name, { configurable: true, value: [begin, pause, resume][index] }));
  [begin, pause, resume].forEach(mock => mock.mockClear());
  hidden = false; reduced = false; intersecting = true; observers = []; frames = new Map(); nextFrame = 0;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  media = new EventTarget() as MediaQueryList; Object.defineProperty(media, 'matches', { get: () => reduced });
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  vi.stubGlobal('IntersectionObserver', class {
    entry: (typeof observers)[number];
    constructor(callback: IntersectionObserverCallback) { this.entry = { callback, disconnected: false }; observers.push(this.entry); }
    observe(target: Element) { this.entry.target = target; this.entry.callback([{ target, isIntersecting: intersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() { this.entry.disconnected = true; }
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(async () => {
  await act(async () => root.unmount());
  methods.forEach((name, index) => { if (original[index]) Object.defineProperty(prototype(index), name, original[index]!); else Reflect.deleteProperty(prototype(index), name); });
  vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.style.overflow = '';
});

describe('large Pose uses only the existing original drawing and idle tracks', () => {
  it.each(monsters)('preserves $id / $name source geometry, viewBox, footprint and exact authored track count', async monster => {
    const bytes = CHARACTER_ART[monster.id].artUrl, original = source(monster.id);
    await mount(monster.id);
    expect(tab('appearance').getAttribute('aria-selected')).toBe('true');
    expect(art().classList.contains('heroIcon')).toBe(true); expect(art().closest('.profileAppearance')?.hasAttribute('hidden')).toBe(false);
    expect(art().dataset.detailArt).toBe(String(monster.id)); expect(art().dataset.detailMotion).toBe('running');
    expect(profile().querySelectorAll('[data-home-art]')).toHaveLength(1);
    expect(profile().querySelector('.profileReadingPreview')).toBeNull(); expect(art().querySelector('img')).toBeNull();
    expect(svg().getAttribute('viewBox')).toBe(original.getAttribute('viewBox'));
    expect(svg().getAttribute('preserveAspectRatio')).toBe(original.getAttribute('preserveAspectRatio'));
    expect(geometry(svg())).toEqual(geometry(original)); expect(CHARACTER_ART[monster.id].artUrl).toBe(bytes);
    const view = original.getAttribute('viewBox')!.split(/[ ,]+/).map(Number);
    const tracks = idle.homeIdleTracks(monster.id, view), expectedCount = monster.id === 0 ? 10 : monster.id === 12 ? 11 : 1;
    expect(tracks).toHaveLength(expectedCount); expect(svg().querySelectorAll('animateTransform')).toHaveLength(expectedCount);
    expect([...svg().querySelectorAll('[data-home-track]')].map(node => node.getAttribute('data-home-track')).sort()).toEqual(tracks.map(track => track.part).sort());
    expect(begin).toHaveBeenCalledTimes(expectedCount);
    expect([...svg().querySelectorAll('animateTransform')].every(node => node.getAttribute('begin') === 'indefinite')).toBe(true);
    if (monster.id !== 0 && monster.id !== 12) {
      expect(tracks[0].part).toBe('body');
      expect(tracks[0].pivot).toEqual([view[0] + view[2] / 2, view[1] + view[3] * (CHARACTER_ART[monster.id].footAnchor ?? .94)]);
      expect(svg().querySelector('[data-home-track="head"],[data-home-track="tail"]')).toBeNull();
    }
    assertLocalReferences(svg()); expect(activeObservers()).toHaveLength(1); expect(frames.size).toBe(0);
    expect(profile().getAttribute('aria-label')).toBe(`${monster.name}の詳細`);
    expect(svg().getAttribute('aria-hidden')).toBe('true'); expect(svg().getAttribute('focusable')).toBe('false');
    expect(art().querySelector('button,a,[tabindex],audio,video,canvas')).toBeNull();
    expect(profile().querySelector('.mythPlayer')).toBeNull();
  });

  it('mounts exactly one active detail presentation and keeps the same reading SVG across reading tabs', async () => {
    const parse = vi.spyOn(idle, 'homeIdleSvg'); await mount(); const appearance = svg(), initialIds = [...appearance.querySelectorAll('[id]')].map(node => node.id);
    await select('story'); const reading = svg();
    expect(reading).not.toBe(appearance); expect(appearance.isConnected).toBe(false); expect(art().className).toBe('profileReadingPreview');
    expect(profile().querySelector('.profileAppearance [data-home-art]')).toBeNull(); expect(activeObservers()).toHaveLength(1);
    expect(observers[0].disconnected).toBe(true); expect(pause.mock.contexts).toContain(appearance);
    const beforeParse = parse.mock.calls.length, beforeBegin = begin.mock.calls.length;
    await select('abilities'); await select('skills'); await select('story');
    expect(svg()).toBe(reading); expect(parse).toHaveBeenCalledTimes(beforeParse); expect(begin).toHaveBeenCalledTimes(beforeBegin);
    await select('appearance'); expect(svg()).not.toBe(reading); expect(reading.isConnected).toBe(false);
    expect(profile().querySelectorAll('[data-home-art]')).toHaveLength(1); expect(activeObservers()).toHaveLength(1);
    expect([...svg().querySelectorAll('[id]')].some(node => initialIds.includes(node.id))).toBe(false);
    expect(profile().querySelectorAll('[data-detail-art]')).toHaveLength(1); expect(begin).toHaveBeenCalledTimes(30);
    expect(document.activeElement).toBe(tab('appearance')); assertLocalReferences(svg());
  });

  it('disposes every prior observer and SVG through repeated close/reopen and monster changes', async () => {
    const seenIds = new Set<string>();
    for (const id of [0, 12, 1, 0]) {
      await mount(id); expect(activeObservers()).toHaveLength(1); const current = svg();
      for (const node of current.querySelectorAll('[id]')) { expect(seenIds.has(node.id)).toBe(false); seenIds.add(node.id); }
      await click(label('詳細を閉じる')); expect(current.isConnected).toBe(false); expect(activeObservers()).toHaveLength(0);
      const begins = begin.mock.calls.length, resumes = resume.mock.calls.length;
      await visibility(true); await visibility(false); expect(begin).toHaveBeenCalledTimes(begins); expect(resume).toHaveBeenCalledTimes(resumes);
      expect(document.activeElement?.id).toBe('opener');
    }
    expect(begin).toHaveBeenCalledTimes(32); expect(frames.size).toBe(0);
  });

  it('uses isolated IDs for simultaneous same-species instances without sharing paint references', async () => {
    await act(async () => root.render(<><HomeIdleArt id={0} running reduced={false} /><HomeIdleArt id={0} running reduced={false} /></>));
    const instances = [...document.querySelectorAll('svg[data-home-art]')]; expect(instances).toHaveLength(2);
    const ids = instances.flatMap(svg => [...svg.querySelectorAll('[id]')].map(node => node.id)); expect(new Set(ids).size).toBe(ids.length);
    instances.forEach(assertLocalReferences);
  });

  it('retains original catalog grid images without starting all 37 large idle instances', async () => {
    localStorage.clear(); window.history.replaceState(null, '', '#catalog'); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await act(async () => root.render(<App />));
    expect(document.querySelectorAll('.catalogCard')).toHaveLength(37); expect(document.querySelectorAll('.catalogCard img')).toHaveLength(37);
    expect(document.querySelector('.catalogGallery [data-home-art], .catalogGallery animateTransform')).toBeNull(); expect(begin).not.toHaveBeenCalled();
    await click(label('妖狐の詳細')); expect(profile().querySelectorAll('[data-home-art]')).toHaveLength(1); expect(begin).toHaveBeenCalledTimes(10);
    await click(label('詳細を閉じる')); expect(document.querySelector('[data-home-art]')).toBeNull(); expect(activeObservers()).toHaveLength(0);
  });
});

describe('large Pose visibility, fallback and native support policy', () => {
  it('pauses offscreen/background and resumes the same instance without restarting tracks', async () => {
    await mount(12); const original = svg(); begin.mockClear();
    await visible(false); expect(art().dataset.detailMotion).toBe('paused'); expect(pause.mock.contexts).toContain(original);
    await visible(true); expect(art().dataset.detailMotion).toBe('running'); expect(resume.mock.contexts).toContain(original);
    await visibility(true); expect(art().dataset.detailMotion).toBe('paused');
    await visibility(false); expect(art().dataset.detailMotion).toBe('running');
    expect(svg()).toBe(original); expect(begin).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });

  it('does not begin a newly mounted hidden/offscreen Pose until it is actually visible', async () => {
    hidden = true; intersecting = false; await mount(); expect(begin).not.toHaveBeenCalled(); expect(geometry(svg())).toEqual(geometry(source(0)));
    await visible(true); expect(begin).not.toHaveBeenCalled(); await visibility(false); expect(begin).toHaveBeenCalledTimes(10);
  });

  it('uses the complete neutral still for reduced motion and safely rebuilds native tracks on preference changes', async () => {
    reduced = true; await mount(12); expect(begin).not.toHaveBeenCalled(); expect(art().dataset.detailMotion).toBe('reduced');
    expect(svg().querySelector('animateTransform')).toBeNull(); expect(geometry(svg())).toEqual(geometry(source(12)));
    for (const track of svg().querySelectorAll('[data-home-track]')) expect(track.getAttribute('transform')).toMatch(/^(?:scale\(1 1\)|rotate\(0 )/);
    await motion(false); expect(begin).toHaveBeenCalledTimes(11); await motion(true); expect(svg().querySelector('animateTransform')).toBeNull();
    await motion(false); expect(begin).toHaveBeenCalledTimes(22); expect(activeObservers()).toHaveLength(1);
  });

  it.each(methods)('retains a visible neutral SVG when native %s is unavailable', async method => {
    Reflect.deleteProperty(prototype(methods.indexOf(method)), method);
    await mount(12); expect(geometry(svg())).toEqual(geometry(source(12))); expect(begin).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled(); expect(profile().querySelector('.catalogArtFallback')).toBeNull();
    expect([...svg().querySelectorAll('animateTransform')].every(node => node.getAttribute('begin') === 'indefinite')).toBe(true);
  });

  it('works without IntersectionObserver, and still respects page visibility', async () => {
    vi.stubGlobal('IntersectionObserver', undefined); await mount(); expect(begin).toHaveBeenCalledTimes(10);
    await visibility(true); expect(art().dataset.detailMotion).toBe('paused'); await visibility(false); expect(begin).toHaveBeenCalledTimes(10);
  });

  it('falls back to the unchanged catalog image and readable image-error state when bundled SVG construction fails', async () => {
    vi.spyOn(idle, 'homeIdleSvg').mockImplementation(() => { throw new Error('invalid bundled art'); });
    await mount(); const image = art().querySelector<HTMLImageElement>('img')!;
    expect(image.getAttribute('src')).toBe(CHARACTER_ART[0].artUrl); expect(image.alt).toBe(''); expect(image.getAttribute('draggable')).toBe('false');
    expect(begin).not.toHaveBeenCalled(); expect(art().querySelector('[data-home-art]')).toBeNull();
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(art().querySelector('.catalogArtFallback')?.getAttribute('aria-label')).toBe('妖狐の画像を表示できません');
    expect(profile().querySelector('.profileIdentity h2')?.textContent).toContain('妖狐'); expect(label('詳細を閉じる')).toBeTruthy();
    await click(label('詳細を閉じる')); expect(document.activeElement?.id).toBe('opener'); expect(activeObservers()).toHaveLength(0);
  });

  it('resets a failed image fallback when the selected monster changes', async () => {
    vi.spyOn(idle, 'homeIdleSvg').mockImplementation(() => { throw new Error('invalid bundled art'); });
    await mount(); await act(async () => art().querySelector('img')!.dispatchEvent(new Event('error')));
    await mount(1); expect(art().querySelector('img')?.getAttribute('src')).toBe(CHARACTER_ART[1].artUrl); expect(art().querySelector('.catalogArtFallback')).toBeNull();
    await select('story'); expect(art().getAttribute('aria-hidden')).toBe('true'); expect(art().querySelector('img')).not.toBeNull();
  });

  it('handles actual invalid source markup through its optional fallback without changing the shared art source', async () => {
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString').mockImplementationOnce(() => document.implementation.createDocument('', 'broken', null));
    await act(async () => root.render(<HomeIdleArt id={0} running={false} reduced fallback={<CatalogArt monster={monsters[0]} />} />));
    expect(document.querySelector('img')?.getAttribute('src')).toBe(CHARACTER_ART[0].artUrl); expect(parse).toHaveBeenCalledOnce();
  });
});

describe('large Pose browsing and nested movie lifecycle', () => {
  it.each(MYTH_SCENES)('keeps $name opt-in, pauses Pose behind its movie, and resumes the same tracks after closing', async scene => {
    const parse = vi.spyOn(idle, 'homeIdleSvg'); await mount(scene.id); const original = svg();
    expect(document.querySelector('.mythPlayer')).toBeNull(); expect(frames.size).toBe(0);
    const trigger = document.querySelector<HTMLButtonElement>('.mythPlay')!; expect(trigger.textContent).toContain(scene.title);
    const parseCount = parse.mock.calls.length, begins = begin.mock.calls.length;
    await click(trigger); expect(document.querySelector('.mythPlayer')).not.toBeNull(); expect(art().dataset.detailMotion).toBe('paused');
    expect(pause.mock.contexts).toContain(original); expect(frames.size).toBe(1);
    expect(document.getElementById('root')?.hasAttribute('inert')).toBe(true);
    await click(textButton('一時停止')); expect(frames.size).toBe(0); expect(art().dataset.detailMotion).toBe('paused');
    await click(textButton('続きから')); expect(frames.size).toBe(1); expect(art().dataset.detailMotion).toBe('paused');
    await click(label('物語を閉じて詳細に戻る'));
    expect(document.querySelector('.mythPlayer')).toBeNull(); expect(frames.size).toBe(0); expect(svg()).toBe(original);
    expect(art().dataset.detailMotion).toBe('running'); expect(begin).toHaveBeenCalledTimes(begins); expect(parse).toHaveBeenCalledTimes(parseCount);
    expect(document.activeElement).toBe(trigger); expect(document.getElementById('root')?.hasAttribute('inert')).toBe(false);
    expect(activeObservers()).toHaveLength(1);
  });

  it('lets Escape close only the top movie, then the profile, restoring focus and releasing all observers', async () => {
    const remove = vi.spyOn(document, 'removeEventListener'), mediaRemove = vi.spyOn(media, 'removeEventListener');
    await mount(12); const original = svg(), trigger = document.querySelector<HTMLButtonElement>('.mythPlay')!;
    await click(trigger); expect((await key('Escape', window)).defaultPrevented).toBe(true);
    expect(profile()).not.toBeNull(); expect(svg()).toBe(original); expect(art().dataset.detailMotion).toBe('running'); expect(document.activeElement).toBe(trigger);
    await key('Escape'); expect(profile()).toBeNull(); expect(document.activeElement?.id).toBe('opener'); expect(activeObservers()).toHaveLength(0);
    expect(document.body.style.overflow).toBe('auto'); expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(mediaRemove).toHaveBeenCalledWith('change', expect.any(Function)); expect(frames.size).toBe(0);
  });

  it('keeps Pose paused if the movie closes while the page is hidden, then resumes without restarting', async () => {
    await mount(12); const begins = begin.mock.calls.length, original = svg();
    await click(document.querySelector<HTMLButtonElement>('.mythPlay')!); await visibility(true); await key('Escape', window);
    expect(svg()).toBe(original); expect(art().dataset.detailMotion).toBe('paused'); expect(begin).toHaveBeenCalledTimes(begins);
    await visibility(false); expect(art().dataset.detailMotion).toBe('running'); expect(begin).toHaveBeenCalledTimes(begins);
  });

  it('keeps both Pose and opt-in movies static under reduced motion', async () => {
    reduced = true; await mount(12); await click(document.querySelector<HTMLButtonElement>('.mythPlay')!);
    expect(svg().querySelector('animateTransform')).toBeNull(); expect(art().dataset.detailMotion).toBe('reduced'); expect(frames.size).toBe(0);
    expect(textButton('次の場面')).toBeTruthy(); await key('Escape', window);
    expect(art().dataset.detailMotion).toBe('reduced'); expect(begin).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });

  it('keeps a replacement reading preview paused while the nested movie remains open', async () => {
    await mount(12); await click(document.querySelector<HTMLButtonElement>('.mythPlay')!);
    const previous = svg();
    // This programmatic tab change exercises suspension ownership even though
    // the real nested movie correctly makes the profile inert to user input.
    await act(async () => tab('story').click());
    expect(previous.isConnected).toBe(false); expect(art().className).toBe('profileReadingPreview');
    expect(art().dataset.detailMotion).toBe('paused'); expect(profile().querySelectorAll('[data-home-art]')).toHaveLength(1);
    const begins = begin.mock.calls.length;
    await key('Escape', window); expect(art().dataset.detailMotion).toBe('running'); expect(begin).toHaveBeenCalledTimes(begins + 11);
    expect(activeObservers()).toHaveLength(1); expect(document.querySelector('.mythPlayer')).toBeNull();
  });

  it('disposes a nested movie and prior species when browsing replaces its profile identity', async () => {
    await mount(12); const previous = svg(); await click(document.querySelector<HTMLButtonElement>('.mythPlay')!);
    await mount(0); expect(document.querySelector('.mythPlayer')).toBeNull(); expect(previous.isConnected).toBe(false);
    expect(art().dataset.detailArt).toBe('0'); expect(art().dataset.detailMotion).toBe('running'); expect(activeObservers()).toHaveLength(1);
    expect(frames.size).toBe(0); expect(document.getElementById('root')?.hasAttribute('inert')).toBe(false);
  });

  it('keeps the selected tab, boundaries, focus and exactly one art owner through forward/back species browsing', async () => {
    function Browse() { const [id, setId] = useState(0); return <MonsterDetails id={id} onClose={() => root.render(null)} navigation={{ ids: [0, 12, 5], onSelect: setId }} />; }
    await act(async () => root.render(<Browse />));
    const [previous, next] = [...document.querySelectorAll<HTMLButtonElement>('.profileBrowse button')];
    await click(previous); expect(previous.getAttribute('aria-disabled')).toBe('true'); expect(document.activeElement).toBe(previous); expect(art().dataset.detailArt).toBe('0');
    const old = svg(); await click(next); expect(old.isConnected).toBe(false); expect(art().dataset.detailArt).toBe('12'); expect(document.activeElement).toBe(next);
    await select('skills'); const reading = svg(); await click(next); expect(reading.isConnected).toBe(false); expect(art().dataset.detailArt).toBe('5');
    expect(tab('skills').getAttribute('aria-selected')).toBe('true'); expect(profile().querySelector('.profileAppearance [data-home-art]')).toBeNull();
    await click(next); expect(next.getAttribute('aria-disabled')).toBe('true'); expect(document.activeElement).toBe(next);
    await click(previous); expect(art().dataset.detailArt).toBe('12'); expect(activeObservers()).toHaveLength(1);
    expect(profile().querySelectorAll('[data-home-art]')).toHaveLength(1); assertLocalReferences(svg());
  });

  it('cleans up nested movie frames, idle observers and inert state on route departure', async () => {
    localStorage.clear(); window.history.replaceState(null, '', '#catalog'); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await act(async () => root.render(<App />)); await click(label('フェンリルの詳細')); await settleMovieImport();
    await click(document.querySelector<HTMLButtonElement>('.mythPlay')!); expect(frames.size).toBe(1);
    await act(async () => { window.history.pushState(null, '', '#team'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(profile()).toBeNull(); expect(document.querySelector('.mythPlayer')).toBeNull(); expect(frames.size).toBe(0); expect(activeObservers()).toHaveLength(0);
    expect(document.getElementById('root')?.hasAttribute('inert')).toBe(false); expect(document.body.style.overflow).toBe('auto');
  });
});
