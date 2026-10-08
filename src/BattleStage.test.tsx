// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BattleStage from './BattleStage';
import {start, type BattleEvent} from './engine';

let root: Root;
let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let resize: () => void;
let observerDisconnect: ReturnType<typeof vi.fn>;
const context = {
  ...Object.fromEntries(['clearRect', 'setTransform', 'save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'fillRect', 'arc', 'roundRect', 'setLineDash'].map(name => [name, vi.fn()])),
  fillText: vi.fn(), strokeText: vi.fn(), scale: vi.fn(),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  createRadialGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  measureText: vi.fn(() => ({width: 90})),
};
const party = start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6]);
const cast: BattleEvent = {kind: 'cast', actor: 'a0', target: 'e0', skill: '狐火', effect: 'hit'};
const effect = {text: '狐火', type: 'fire', tick: 1};
const base = {allies: party.allies, enemies: party.enemies, effect: null, impact: null};
async function render(props: React.ComponentProps<typeof BattleStage>) {
  await act(async () => root.render(<BattleStage {...props}/>));
}
function frame(time: number) {
  const [id, callback] = frames.entries().next().value!;
  frames.delete(id);
  context.fillText.mockClear();
  callback(time);
}
function labels() {return context.fillText.mock.calls.map(call => call[0]);}
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
  nextFrame = 0;
  frames = new Map();
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {frames.set(++nextFrame, callback); return nextFrame;}));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  observerDisconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) {resize = callback;}
    observe() {}
    disconnect = observerDisconnect;
  });
  vi.spyOn(window, 'matchMedia').mockReturnValue({matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()} as unknown as MediaQueryList);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({width: 720, height: 460, left: 0, top: 0} as DOMRect);
  document.body.innerHTML = '<div id="stage-test"></div>';
  root = createRoot(document.getElementById('stage-test')!);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('battle presentation', () => {
  it('paints every monster with an opaque brush rather than inherited arena transparency', async () => {
    const painted: {text: string; fill: unknown}[] = [];
    context.fillText.mockImplementation((text: string) => { painted.push({text, fill: (context as unknown as CanvasRenderingContext2D).fillStyle}); });
    await render(base);
    frame(100);
    for (const unit of [...party.allies, ...party.enemies]) {
      expect(painted.filter(item => item.text === unit.monster.icon).every(item => item.fill === '#ffffff')).toBe(true);
    }
    context.fillText.mockReset();
  });

  it('keeps one animation clock across HP and target-selection rerenders', async () => {
    await render({...base, effect, impact: cast, impacts: []});
    frame(100);
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length;
    await render({...base, allies: base.allies.map(unit => ({...unit, hp: unit.hp - 5})), effect, impact: cast, impacts: [], targetKeys: ['e0']});
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
    frame(1501);
    expect(labels()).not.toContain('狐火');
  });

  it('lands every area impact together and does not replay events on array rerenders', async () => {
    await render({...base, effect, impact: cast, impacts: []});
    frame(100);
    expect(labels()).not.toContain('33');
    const hits: BattleEvent[] = [
      {kind: 'damage', actor: 'a0', target: 'e0', amount: 33, hp: 217},
      {kind: 'damage', actor: 'a0', target: 'e1', amount: 44, hp: 156},
      {kind: 'damage', actor: 'a0', target: 'e2', amount: 55, hp: 132},
    ];
    await render({...base, effect, impact: hits[0], impacts: hits});
    frame(900);
    expect(labels()).toEqual(expect.arrayContaining(['33', '44', '55']));
    await render({...base, effect, impact: hits[0], impacts: [...hits]});
    frame(1100);
    frame(1901);
    expect(labels()).not.toContain('33');
    expect(labels()).not.toContain('44');
  });

  it('shows healing as positive recovery, and clears lingering effects on skip', async () => {
    const heal: BattleEvent = {kind: 'heal', actor: 'a1', target: 'a0', amount: 65, hp: 150};
    await render({...base, effect: {text: '生命の雫', type: 'water', tick: 2}, impact: heal, impacts: [heal]});
    frame(100);
    expect(labels()).toContain('+65');
    expect(labels()).not.toContain('HIT!');
    await render({...base, impacts: []});
    frame(120);
    expect(labels()).not.toContain('+65');
  });

  it('exposes only living eligible icon targets with accessible names and touch sizes', async () => {
    const select = vi.fn();
    await render({...base, enemies: base.enemies.map(unit => unit.key === 'e1' ? {...unit, hp: 0} : unit), targetKeys: ['e0', 'e1'], selectedTarget: 'e0', onSelectTarget: select});
    const targets = document.querySelectorAll<HTMLButtonElement>('.battleTarget');
    expect(targets).toHaveLength(1);
    expect(targets[0].getAttribute('aria-label')).toContain('トロルを対象にする');
    expect(targets[0].getAttribute('aria-pressed')).toBe('true');
    expect(targets[0].style.minWidth).toBe('44px');
    expect(targets[0].textContent).toBe('');
    targets[0].click();
    expect(select).toHaveBeenCalledWith('e0');
  });

  it('preserves glyph proportions as a tall mobile stage resizes', async () => {
    await render(base);
    vi.mocked(HTMLCanvasElement.prototype.getBoundingClientRect).mockReturnValue({width: 360, height: 460, left: 0, top: 0} as DOMRect);
    resize();
    frame(100);
    expect(context.scale).toHaveBeenCalledWith(1, .5);
    vi.mocked(HTMLCanvasElement.prototype.getBoundingClientRect).mockReturnValue({width: 720, height: 460, left: 0, top: 0} as DOMRect);
    resize();
    frame(200);
    expect(context.scale).toHaveBeenCalledWith(1, 1);
  });

  it('scales the cast clock with playback speed and releases observers on unmount', async () => {
    await render({...base, effect, impact: cast, playbackRate: 2});
    frame(100);
    frame(801);
    expect(labels()).not.toContain('狐火');
    await act(async () => root.unmount());
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(observerDisconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    root = createRoot(document.getElementById('stage-test')!);
  });
});
