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
type Matrix = [number, number, number, number, number, number];
let glyphs: {text: string; matrix: Matrix; font: string}[];
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
  glyphs = [];
  callback(time);
}
function labels() {return context.fillText.mock.calls.map(call => call[0]);}
function teamTransforms(enemy = false) {
  return glyphs.filter(glyph => glyph.font.startsWith(enemy ? '57px ' : '40px ')).map(glyph => glyph.matrix);
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
  nextFrame = 0;
  frames = new Map();
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {frames.set(++nextFrame, callback); return nextFrame;}));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  observerDisconnect = vi.fn();
  // Track the complete canvas matrix, including saved camera transforms. A
  // translate-only spy would miss zoom or shake inherited from a parent layer.
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const multiply = ([a, b, c, d, e, f]: Matrix) => {
    const [pa, pb, pc, pd, pe, pf] = matrix;
    matrix = [pa * a + pc * b, pb * a + pd * b, pa * c + pc * d, pb * c + pd * d, pa * e + pc * f + pe, pb * e + pd * f + pf];
  };
  const ctx = context as unknown as CanvasRenderingContext2D;
  vi.mocked(ctx.setTransform).mockImplementation((...values: unknown[]) => {matrix = values as Matrix;});
  vi.mocked(ctx.save).mockImplementation(() => {stack.push([...matrix]);});
  vi.mocked(ctx.restore).mockImplementation(() => {matrix = stack.pop()!;});
  vi.mocked(ctx.translate).mockImplementation((x, y) => multiply([1, 0, 0, 1, x, y]));
  vi.mocked(ctx.scale).mockImplementation((x, y) => multiply([x, 0, 0, y, 0, 0]));
  vi.mocked(ctx.rotate).mockImplementation(angle => multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]));
  context.fillText.mockImplementation((text: string) => {
    if (ctx.font.includes('Apple Color Emoji')) glyphs.push({text, matrix: [...matrix], font: ctx.font});
  });
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
  it.each([720, 360])('keeps ally icons stationary at width %i while enemies idle', async width => {
    vi.mocked(HTMLCanvasElement.prototype.getBoundingClientRect).mockReturnValue({width, height: 460, left: 0, top: 0} as DOMRect);
    await render({...base, activeActorKey: 'a0', targetKeys: ['a0'], selectedTarget: 'a0'});
    frame(100);
    const allies = teamTransforms();
    const enemies = teamTransforms(true);
    expect(allies).toHaveLength(5);
    expect(enemies).toHaveLength(5);
    frame(600);
    expect(teamTransforms()).toEqual(allies);
    expect(teamTransforms(true)).not.toEqual(enemies);
  });

  it.each([
    ['slash', '通常攻撃'],
    ['wind', '疾風斬り'],
    ['fire', '狐火'],
  ])('keeps allied %s casts fixed through the enemy camera zoom', async (type, skill) => {
    await render(base);
    frame(100);
    const allies = teamTransforms();
    const enemies = teamTransforms(true);
    const event: BattleEvent = {...cast, skill};
    await render({...base, effect: {text: skill, type, tick: 1}, impact: event});
    frame(200);
    frame(800);
    expect(teamTransforms()).toEqual(allies);
    expect(teamTransforms(true)[0][0]).toBeGreaterThan(enemies[0][0]);
    expect(labels()).toContain(skill);
    frame(1450);
    expect(teamTransforms()).toEqual(allies);
  });

  it('preserves enemy lunges and recoil while ally icons stay fixed during camera shake', async () => {
    await render(base);
    frame(100);
    const allies = teamTransforms();
    const attack: BattleEvent = {kind: 'cast', actor: 'e0', target: 'a0', skill: '通常攻撃', effect: 'hit'};
    await render({...base, effect: {text: '通常攻撃', type: 'slash', tick: 1}, impact: attack});
    frame(200);
    frame(800);
    expect(teamTransforms()).toEqual(allies);
    expect(teamTransforms(true)[0][1]).not.toBe(0); // The attacking enemy still tilts.
    expect(teamTransforms(true)[1][1]).toBe(0);

    const damage: BattleEvent = {kind: 'damage', actor: 'e0', target: 'a0', amount: 33, hp: 117};
    await render({...base, allies: base.allies.map(unit => unit.key === 'a0' ? {...unit, hp: 117} : unit), impact: damage});
    frame(1500);
    const enemiesBeforeShake = teamTransforms(true);
    frame(1545);
    expect(teamTransforms()).toEqual(allies);
    expect(teamTransforms(true)[1][4]).not.toBe(enemiesBeforeShake[1][4]);
    expect(labels()).toContain('33');
    expect(document.querySelector('[aria-live]')?.textContent).toContain('妖狐 ダメージ 33');

    const enemyHit: BattleEvent = {kind: 'damage', actor: 'a0', target: 'e0', amount: 44, hp: 206};
    await render({...base, impact: enemyHit});
    frame(1800);
    const enemyGap = teamTransforms(true)[0][4] - teamTransforms(true)[1][4];
    frame(1845);
    expect(teamTransforms(true)[0][4] - teamTransforms(true)[1][4]).not.toBe(enemyGap);
    expect(teamTransforms()).toEqual(allies);
    expect(labels()).toContain('44');
  });

  it('keeps defeated ally icons in place and preserves status, HP, and healing targets', async () => {
    const select = vi.fn();
    await render(base);
    frame(100);
    const allies = teamTransforms();
    const defeat: BattleEvent = {kind: 'defeat', actor: 'e0', target: 'a0'};
    const units = base.allies.map(unit => unit.key === 'a0' ? {...unit, hp: 0} : unit.key === 'a1' ? {...unit, hp: 105, guard: true, poison: 2} : unit);
    await render({...base, allies: units, impact: defeat, targetKeys: ['a0', 'a1'], selectedTarget: 'a1', onSelectTarget: select});
    for (const time of [200, 475, 900, 1300]) {
      frame(time);
      expect(teamTransforms()).toEqual(allies);
    }
    expect(labels()).toContain('•');
    expect((context as unknown as CanvasRenderingContext2D).roundRect).toHaveBeenCalledWith(189, 377, 66, 6, 3);
    const target = document.querySelector<HTMLButtonElement>('.battleTarget')!;
    expect(document.querySelectorAll('.battleTarget')).toHaveLength(1);
    expect(target.dataset.target).toBe('a1');
    expect(target.getAttribute('aria-label')).toContain('バステトを対象にする HP 105/170');
    expect(target.getAttribute('aria-pressed')).toBe('true');
    target.click();
    expect(select).toHaveBeenCalledWith('a1');
    const heal: BattleEvent = {kind: 'heal', actor: 'a2', target: 'a1', amount: 65, hp: 170};
    await render({...base, allies: units, impact: heal});
    frame(1400);
    frame(1600);
    expect(teamTransforms()).toEqual(allies);
    expect(labels()).toContain('+65');
  });

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
