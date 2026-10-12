// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BattleStage from './BattleStage';
import {CHARACTER_ART} from './MonsterArt';
import {start,type BattleEvent} from './engine';
import {compileFenrirLayers} from './storybookFenrirRig';

let root: Root;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let images: ControlledImage[];
let assignments: string[];
let operations: string[];
let immediatelyLoaded: boolean;
let disconnect: ReturnType<typeof vi.fn>;
let removeMotionListener: ReturnType<typeof vi.fn>;
const alphaStack:number[]=[];
const context = {
  globalAlpha:1,
  ...Object.fromEntries(['clearRect', 'setTransform', 'save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'fillRect', 'arc', 'roundRect', 'setLineDash'].map(name => [name, vi.fn()])),
  save:vi.fn(), restore:vi.fn(), scale:vi.fn(), rotate:vi.fn(),
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
function drawnImages() {return context.drawImage.mock.calls.map(call => call[0]);}
function drawnGlyphs() {
  const icons = new Set([...party.allies, ...party.enemies].map(unit => unit.monster.icon));
  return context.fillText.mock.calls.map(call => call[0]).filter(text => icons.has(text));
}
async function unmount() {await act(async () => root.unmount());}
function newRoot() {root = createRoot(document.getElementById('image-loading-test')!);}

beforeEach(() => {
  vi.clearAllMocks();
  alphaStack.length=0;context.globalAlpha=1;context.save.mockImplementation(()=>{alphaStack.push(context.globalAlpha);});context.restore.mockImplementation(()=>{context.globalAlpha=alphaStack.pop()??1;});
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


const fenrirParty=start([1,2,3,4,6],[12,5,8,10,11]);
const fenrirBase={allies:fenrirParty.allies,enemies:fenrirParty.enemies,effect:null,impact:null};
const fenrirImages=()=>images.filter(image=>image.src.includes('fenrir-layer'));
describe('actual battle Canvas Fenrir integration',()=>{
 it('renders independent parts for five identical enemies with one shared cached rig',async()=>{
  const enemies=fenrirBase.enemies.map(unit=>({...unit,monster:fenrirBase.enemies[0].monster}));
  await render({...fenrirBase,enemies});
  const count=compileFenrirLayers().length;
  expect(fenrirImages()).toHaveLength(count);expect(images).toHaveLength(count+1);
  images.forEach(image=>image.load());frame(100);
  expect(drawnImages()).toHaveLength(count*5);
  expect(drawnImages().every(image=>fenrirImages().includes(image))).toBe(true);
  expect(drawnGlyphs()).toHaveLength(0);
  const original=[...images];for(let i=1;i<120;i++)frame(100+i*16);
  expect(images).toEqual(original);expect(assignments).toHaveLength(count+1);
  expect(frames.size).toBe(1);
 });
 it('keeps a loaded body while any rig part is delayed or failed',async()=>{
  await render(fenrirBase);images.slice(0,5).forEach(image=>image.load());
  const parts=fenrirImages();parts.slice(1).forEach(image=>image.load());frame(100);
  expect(drawnImages()).toEqual([images[1],images[3],images[0],images[2],images[4]]);
  parts[0].fail();frame(200);frame(300);expect(drawnImages()).toEqual([images[1],images[3],images[0],images[2],images[4]]);
  expect(fenrirImages()).toHaveLength(compileFenrirLayers().length);
 });
 it.each(['pending','failed'])('uses a fully ready rig even when its static fallback is %s',async status=>{
  await render(fenrirBase);if(status==='failed')images[0].fail();
  images.slice(1).forEach(image=>image.load());frame(100);
  expect(drawnImages()).not.toContain(images[0]);
  expect(drawnImages().filter(image=>fenrirImages().includes(image))).toHaveLength(compileFenrirLayers().length);
  expect(context.fillText.mock.calls.map(call=>call[0])).not.toContain(fenrirBase.enemies[0].monster.icon);
 });
 it('switches atomically to the ready rig and preserves the other four exact images',async()=>{
  await render(fenrirBase);images.forEach(image=>image.load());frame(100);
  // Rear static units draw first, then the front Fenrir rig, then the other front units.
  expect(drawnImages().slice(0,2)).toEqual([images[1],images[3]]);
  expect(drawnImages().slice(-2)).toEqual([images[2],images[4]]);
  const articulated=drawnImages().slice(2,-2);
  expect(articulated).toHaveLength(compileFenrirLayers().length);
  expect(articulated.every(image=>fenrirImages().includes(image))).toBe(true);
  expect(drawnImages()).not.toContain(images[0]);
  const allocations=images.length;await render({...fenrirBase,playbackRate:4});frame(400);
  expect(images).toHaveLength(allocations);
 });
 it('holds the collapsed corpse after impacts expire and resets on same-key rematch',async()=>{
  await render(fenrirBase);images.forEach(image=>image.load());frame(100);
  const dead={...fenrirBase,enemies:fenrirBase.enemies.map((unit,i)=>i===0?{...unit,hp:0}:unit)};
  const death:BattleEvent={kind:'defeat',target:'e0',hp:0};
  await render({...dead,impact:death});frame(200);frame(1100);
  context.scale.mockClear();context.rotate.mockClear();frame(2000);
  expect(context.scale.mock.calls).toContainEqual([1,.8]);
  const scales=context.scale.mock.calls.filter(args=>args[0]===1&&args[1]===.8);expect(scales.length).toBeGreaterThan(0);
  frame(7000);expect(context.scale.mock.calls.filter(args=>args[0]===1&&args[1]===.8).length).toBe(scales.length*2);
  await render({...fenrirBase,castEvent:null});context.scale.mockClear();frame(7100);
  expect(context.scale.mock.calls).not.toContainEqual([1,.8]);
  expect(fenrirImages()).toHaveLength(compileFenrirLayers().length);
 });
 it('honors live reduced motion without resetting the renderer or reloading assets',async()=>{
  await render({...fenrirBase,enemies:[fenrirBase.enemies[0]]});images.forEach(image=>image.load());frame(100);
  const media=vi.mocked(window.matchMedia).mock.results[0].value as {matches:boolean;addEventListener:ReturnType<typeof vi.fn>};
  media.matches=true;media.addEventListener.mock.calls[0][1]();
  context.rotate.mockClear();context.scale.mockClear();frame(350);
  const rotations=context.rotate.mock.calls.map(args=>args[0]);
  expect(rotations.every(value=>value===0)).toBe(true);
  context.rotate.mockClear();frame(1350);expect(context.rotate.mock.calls.map(args=>args[0])).toEqual(rotations);
  expect(cancelAnimationFrame).not.toHaveBeenCalled();expect(fenrirImages()).toHaveLength(compileFenrirLayers().length);
 });
 it('ignores old loaded parts after cleanup and builds a fresh mount-local cache',async()=>{
  await render(fenrirBase);const old=[...images];const count=images.length;
  await unmount();newRoot();await render(fenrirBase);old.forEach(image=>image.load());frame(100);
  expect(drawnImages()).toHaveLength(0);
  images.slice(count).forEach(image=>image.load());frame(200);expect(drawnImages().length).toBeGreaterThan(10);
  expect(frames.size).toBe(1);
 });
});
