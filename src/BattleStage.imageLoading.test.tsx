// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BattleStage from './BattleStage';
import {CHARACTER_ART} from './MonsterArt';
import {start} from './engine';

let root: Root;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let images: ControlledImage[];
let assignments: string[];
let operations: string[];
let immediatelyLoaded: boolean;
let disconnect: ReturnType<typeof vi.fn>;
let removeMotionListener: ReturnType<typeof vi.fn>;
const context = {
  ...Object.fromEntries(['clearRect', 'setTransform', 'save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'fillRect', 'arc', 'roundRect', 'setLineDash'].map(name => [name, vi.fn()])),
  fillText: vi.fn(), strokeText: vi.fn(), drawImage: vi.fn(),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  createRadialGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  measureText: vi.fn(() => ({width: 90})),
};
class ControlledImage extends EventTarget {
  complete = false;
  naturalWidth = 0;
  private source = '';
  constructor() {super(); images.push(this);}
  get src() {return this.source;}
  set src(value: string) {
    this.source = value;
    assignments.push(value);
    operations.push('src');
    if (immediatelyLoaded) this.load();
  }
  load() {this.complete = true; this.naturalWidth = 280; this.dispatchEvent(new Event('load'));}
  fail() {this.complete = true; this.naturalWidth = 0; this.dispatchEvent(new Event('error'));}
}
const party = start([0, 2, 3, 4, 6], [1, 5, 8, 10, 11]);
const base = {allies: party.allies, enemies: party.enemies, effect: null, impact: null};
async function render(props: React.ComponentProps<typeof BattleStage> = base) {
  await act(async () => root.render(<BattleStage {...props}/>));
}
function frame(time: number) {
  const [id, callback] = frames.entries().next().value!;
  frames.delete(id);
  context.drawImage.mockClear();
  context.fillText.mockClear();
  callback(time);
}
const paintOrder = <T,>(items: T[]) => [1,3,0,2,4].map(index=>items[index]);
function drawnImages() {return context.drawImage.mock.calls.map(call => call[0]);}
function drawnGlyphs() {
  const icons = new Set([...party.allies, ...party.enemies].map(unit => unit.monster.icon));
  return context.fillText.mock.calls.map(call => call[0]).filter(text => icons.has(text));
}
async function unmount() {await act(async () => root.unmount());}
function newRoot() {root = createRoot(document.getElementById('image-loading-test')!);}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
  frames = new Map(); nextFrame = 0; images = []; assignments = []; operations = []; immediatelyLoaded = false;
  vi.stubGlobal('Image', ControlledImage);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    operations.push('rAF'); frames.set(++nextFrame, callback); return nextFrame;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  disconnect = vi.fn(); removeMotionListener = vi.fn();
  vi.stubGlobal('ResizeObserver', class {observe() {} disconnect = disconnect;});
  vi.spyOn(window, 'matchMedia').mockReturnValue({matches: false, addEventListener: vi.fn(), removeEventListener: removeMotionListener} as unknown as MediaQueryList);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({width: 720, height: 460, left: 0, top: 0} as DOMRect);
  document.body.innerHTML = '<div id="image-loading-test"></div>';
  newRoot();
});
afterEach(async () => {await unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe('mount-local enemy body image loading', () => {
  it('allocates and assigns exactly the five distinct enemy bodies before the first scheduled frame', async () => {
    expect(Object.keys(CHARACTER_ART)).toHaveLength(37);
    await render();
    expect(images).toHaveLength(5);
    expect(assignments).toEqual(base.enemies.map(unit => CHARACTER_ART[unit.monster.id].artUrl));
    expect(operations).toEqual(['src', 'src', 'src', 'src', 'src', 'rAF']);
    expect(frames.size).toBe(1);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it('shares a single body object among duplicate enemy IDs and never primes ally-only IDs', async () => {
    const enemies = base.enemies.map(unit => ({...unit, monster: base.enemies[0].monster}));
    await render({...base, enemies});
    expect(images).toHaveLength(1);
    expect(assignments).toEqual([CHARACTER_ART[enemies[0].monster.id].artUrl]);
    images[0].load(); frame(100);
    expect(drawnImages()).toEqual(Array(5).fill(images[0]));
  });

  it('still primes and draws defeated enemies because their bodies remain visible', async () => {
    immediatelyLoaded = true;
    await render({...base, enemies: base.enemies.map(unit => ({...unit, hp: 0}))});
    expect(images).toHaveLength(5);
    frame(100); frame(900);
    expect(drawnImages()).toEqual(paintOrder(images));
    expect(document.querySelectorAll('.enemyVital.fallen')).toHaveLength(5);
  });

  it('leaves loading and failed bodies on the existing glyph fallback without retrying or delaying other bodies', async () => {
    await render();
    frame(100);
    expect(drawnImages()).toEqual([]);
    expect(drawnGlyphs()).toEqual(paintOrder(base.enemies).map(unit => unit.monster.icon));
    images[0].load(); images[1].fail();
    images[2].naturalWidth = 280; // A known width alone does not mean the body is complete.
    expect(images[2].complete).toBe(false);
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length;
    expect(frames.size).toBe(1);
    frame(200);
    expect(drawnImages()).toEqual([images[0]]);
    expect(drawnGlyphs()).toEqual([base.enemies[1],base.enemies[3],base.enemies[2],base.enemies[4]].map(unit => unit.monster.icon));
    frame(300); frame(400);
    expect(images).toHaveLength(5); expect(assignments).toHaveLength(5);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled + 3);
  });

  it('draws synchronously available bodies in the first frame without waiting for every image', async () => {
    immediatelyLoaded = true;
    await render(); frame(100);
    expect(drawnImages()).toEqual(paintOrder(images));
    expect(drawnGlyphs()).toEqual([]);
    expect(images).toHaveLength(5); expect(assignments).toHaveLength(5);
  });

  it('reuses pending, failed, and loaded entries through HP, targeting, playback, and skip rerenders', async () => {
    await render(); images[0].load(); images[1].fail(); frame(100);
    const original = [...images];
    const props = {...base, enemies: base.enemies.map(unit => ({...unit, hp: unit.hp - 1, mp: unit.mp - 1, guard: true, poison: 2})), targetKeys: ['e0'], selectedTarget: 'e0', playbackRate: 2};
    await render(props);
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length;
    await render({...props, allies: base.allies.map(unit => ({...unit, hp: unit.hp - 1})), impacts: [], castEvent: null});
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    frame(200); frame(300);
    expect(images).toEqual(original); expect(assignments).toHaveLength(5);
    expect(cancelAnimationFrame).not.toHaveBeenCalled(); expect(disconnect).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
  });

  it('primes only same-mount cache misses from latest enemies and retains entries when an old enemy returns', async () => {
    await render(); images.forEach(image => image.load()); frame(100);
    const original = [...images];
    const replacement = start([0, 2, 3, 4, 6], [18, 5, 8, 10, 11]);
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length;
    await render({...base, enemies: replacement.enemies});
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    expect(images).toHaveLength(5); // The persistent renderer reads latest props at the next frame.
    frame(200);
    expect(images).toHaveLength(6);
    expect(assignments).toEqual([...base.enemies.map(unit => CHARACTER_ART[unit.monster.id].artUrl), CHARACTER_ART[18].artUrl]);
    expect(drawnImages()).toEqual([original[1],original[3],original[2],original[4]]);
    images[5].load(); frame(300);
    expect(drawnImages()).toEqual([original[1],original[3],images[5],original[2],original[4]]);
    await render(); frame(400);
    expect(drawnImages()).toEqual(paintOrder(original));
    await render({...base, enemies: replacement.enemies}); frame(500);
    expect(images).toHaveLength(6); expect(assignments).toHaveLength(6);
    expect(cancelAnimationFrame).not.toHaveBeenCalled(); expect(disconnect).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
  });

  it('does no body loading for an empty enemy list and can populate it without remounting', async () => {
    await render({...base, enemies: []}); frame(100);
    expect(images).toHaveLength(0); expect(assignments).toHaveLength(0);
    await render(); frame(200);
    expect(images).toHaveLength(5); expect(assignments).toHaveLength(5);
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps an unknown monster ID on its glyph fallback without allocating an invalid image', async () => {
    const unknown = {...base.enemies[0], monster: {...base.enemies[0].monster, id: 999, icon: '?'}};
    await render({...base, enemies: [unknown]});
    expect(images).toHaveLength(0); expect(assignments).toHaveLength(0);
    frame(100); frame(200);
    expect(context.fillText.mock.calls.map(call => call[0])).toContain('?');
    expect(drawnImages()).toEqual([]);
    await render({...base, enemies: [base.enemies[0]]}); frame(300);
    expect(images).toHaveLength(1); expect(assignments).toEqual([CHARACTER_ART[1].artUrl]);
  });

  it('ignores in-flight load/error events for replaced enemies and cancels all renderer work on unmount', async () => {
    const caption = vi.fn();
    await render({...base, onCompactCastCaption: caption});
    const old = [...images];
    const replacement = start([0, 2, 3, 4, 6], [18, 13, 14, 15, 16]);
    await render({...base, enemies: replacement.enemies, onCompactCastCaption: caption}); frame(100);
    const current = images.slice(5);
    expect(current).toHaveLength(5);
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length;
    const captionCalls = caption.mock.calls.length;
    old.forEach((image, index) => index % 2 ? image.fail() : image.load());
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    expect(caption).toHaveBeenCalledTimes(captionCalls);
    frame(200);
    expect(drawnImages()).toEqual([]);
    current.forEach(image => image.load()); frame(300);
    expect(drawnImages()).toEqual(current);
    await unmount();
    expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledOnce(); expect(removeMotionListener).toHaveBeenCalledOnce();
    const afterUnmount = vi.mocked(requestAnimationFrame).mock.calls.length;
    const finalCaptionCalls = caption.mock.calls.length;
    images.forEach(image => {image.load(); image.fail();});
    expect(requestAnimationFrame).toHaveBeenCalledTimes(afterUnmount);
    expect(caption).toHaveBeenCalledTimes(finalCaptionCalls);
    expect(assignments).toHaveLength(10);
    newRoot();
  });

  it('starts a fresh mount-local cache after remount and old image events cannot complete new images', async () => {
    await render(); const old = [...images];
    await unmount(); newRoot(); await render();
    expect(images).toHaveLength(10); expect(assignments).toHaveLength(10);
    expect(images.slice(5).some(image => old.includes(image))).toBe(false);
    old.forEach(image => image.load()); frame(100);
    expect(drawnImages()).toEqual([]);
    images.slice(5).forEach(image => image.load()); frame(200);
    expect(drawnImages()).toEqual(paintOrder(images.slice(5)));
    expect(frames.size).toBe(1);
  });

  it('keeps only one surviving frame chain through StrictMode setup/cleanup and ignores discarded images', async () => {
    await act(async () => root.render(<React.StrictMode><BattleStage {...base}/></React.StrictMode>));
    // Development StrictMode intentionally runs two effect setups with a cleanup between them.
    expect(images).toHaveLength(10); expect(assignments).toHaveLength(10);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrame).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledOnce();
    expect(removeMotionListener).toHaveBeenCalledOnce(); expect(frames.size).toBe(1);
    images.slice(0, 5).forEach(image => image.load()); frame(100);
    expect(drawnImages()).toEqual([]);
    images.slice(5).forEach(image => image.load()); frame(200);
    expect(drawnImages()).toEqual(paintOrder(images.slice(5)));
    await unmount();
    expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledTimes(2);
    expect(removeMotionListener).toHaveBeenCalledTimes(2);
    newRoot();
  });
});
