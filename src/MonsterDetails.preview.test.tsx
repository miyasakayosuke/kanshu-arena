// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonsterDetails from './MonsterDetails';
import { monsters } from './engine';

let root: Root, hidden = false;
let media: MediaQueryList, mediaChange: (() => void) | undefined;
const begin = vi.fn(), pause = vi.fn(), resume = vi.fn(), disconnect = vi.fn();
let observerCallback: IntersectionObserverCallback;
let original: (PropertyDescriptor | undefined)[];
const methods = ['beginElement', 'pauseAnimations', 'unpauseAnimations'];
const prototype = (index: number) => index === 0 ? SVGElement.prototype : SVGSVGElement.prototype;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">Open</button><div id="root"></div>';
  document.getElementById('opener')!.focus();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
  original = methods.map((name, index) => Object.getOwnPropertyDescriptor(prototype(index), name));
  methods.forEach((name, index) => Object.defineProperty(prototype(index), name, { configurable: true, value: [begin, pause, resume][index] }));
  [begin, pause, resume, disconnect].forEach(mock => mock.mockClear());
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  media = { matches: false, addEventListener: vi.fn((_event, listener) => { mediaChange = listener as () => void; }), removeEventListener: vi.fn() } as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observerCallback = callback; }
    observe(target: Element) { observerCallback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect = disconnect;
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  methods.forEach((name, index) => { if (original[index]) Object.defineProperty(prototype(index), name, original[index]!); else Reflect.deleteProperty(prototype(index), name); });
  vi.restoreAllMocks(); vi.unstubAllGlobals(); mediaChange = undefined;
});
const select = async (tab: string) => { await act(async () => document.querySelector<HTMLButtonElement>(`[data-detail-tab=${tab}]`)!.click()); };
const mount = async (id = 0) => { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); };
const preview = () => document.querySelector<HTMLElement>('.profileReadingPreview')!;

describe('detail reading creature preview', () => {
  it('keeps a single noninteractive illustration outside the reader, with no idle instance on appearance', async () => {
    await mount();
    expect(preview()).toBeNull(); expect(begin).not.toHaveBeenCalled();
    await select('story');
    expect(preview().parentElement?.className).toBe('profileHeader');
    expect(preview().closest('.profileBody')).toBeNull();
    expect(preview().getAttribute('aria-hidden')).toBe('true');
    expect(preview().querySelector('button, a, [tabindex]')).toBeNull();
    expect(document.querySelectorAll('[data-home-art]')).toHaveLength(1);
    const svg = preview().querySelector('svg');
    expect(begin).toHaveBeenCalledTimes(10);
    await select('abilities'); await select('skills');
    expect(preview().querySelector('svg')).toBe(svg); expect(begin).toHaveBeenCalledTimes(10);
    pause.mockClear(); await select('appearance');
    expect(preview()).toBeNull(); expect(pause).toHaveBeenCalled(); expect(disconnect).toHaveBeenCalledOnce();
    expect(document.querySelector('.profileAppearance .heroIcon .monsterArt')).not.toBeNull();
  });
  it('keeps all 37 names and original art synchronized when browsing, and retains the reading tab', async () => {
    function Browse() {
      const [id, setId] = useState(0);
      return <MonsterDetails id={id} onClose={() => root.render(null)} navigation={{ ids: monsters.map(monster => monster.id), onSelect: setId }} />;
    }
    await act(async () => root.render(<Browse />));
    await select('skills');
    for (let id = 0; id < monsters.length; id++) {
      expect(document.querySelector('.profileHeader strong')?.textContent).toContain(monsters[id].name);
      expect(document.querySelector('.profileTabs [aria-selected=true]')?.getAttribute('data-detail-tab')).toBe('skills');
      expect(preview().dataset.detailArt).toBe(String(id));
      expect(preview().querySelector('svg')?.getAttribute('data-home-art')).toBe(String(id));
      expect(document.querySelectorAll('[data-home-art]')).toHaveLength(1);
      expect(document.querySelector('.detailSkillPicker [aria-pressed=true]')?.textContent).toBe(monsters[id].skills[0]!.name);
      if (id < monsters.length - 1) await act(async () => (document.querySelectorAll('.profileBrowse button')[1] as HTMLButtonElement).click());
    }
  });
  it('pauses in background/offscreen, restores without restart, and removes animation tracks for reduced motion', async () => {
    await mount(12); await select('story');
    expect(begin).toHaveBeenCalledTimes(11);
    const svg = preview().querySelector('svg');
    hidden = true; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(preview().dataset.detailMotion).toBe('paused'); expect(pause).toHaveBeenCalled();
    hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(preview().dataset.detailMotion).toBe('running'); expect(begin).toHaveBeenCalledTimes(11);
    await act(async () => observerCallback([{ target: preview(), isIntersecting: false } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(preview().dataset.detailMotion).toBe('paused'); expect(preview().querySelector('svg')).toBe(svg);
    Object.defineProperty(media, 'matches', { configurable: true, value: true });
    await act(async () => mediaChange?.());
    expect(preview().dataset.detailMotion).toBe('reduced'); expect(preview().querySelector('animateTransform')).toBeNull();
    const remove = vi.spyOn(document, 'removeEventListener');
    await act(async () => document.querySelector<HTMLButtonElement>('.profileHeader .close')!.click());
    expect(disconnect).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(document.activeElement?.id).toBe('opener');
  });
  it('starts with a complete static drawing for reduced motion or missing native animation support', async () => {
    Object.defineProperty(media, 'matches', { configurable: true, value: true });
    await mount(0); await select('story');
    expect(preview().querySelectorAll('path').length).toBeGreaterThan(0);
    expect(preview().querySelector('animateTransform')).toBeNull(); expect(begin).not.toHaveBeenCalled();
    await select('appearance');
    Object.defineProperty(media, 'matches', { configurable: true, value: false });
    Reflect.deleteProperty(SVGSVGElement.prototype, 'pauseAnimations');
    await select('story');
    expect(preview().querySelectorAll('path').length).toBeGreaterThan(0);
    expect(begin).not.toHaveBeenCalled();
  });
});
