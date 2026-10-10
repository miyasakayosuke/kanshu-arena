// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BattleStage from './BattleStage';
import * as areaEffects from './areaEffects';
import * as battleMotion from './battleMotion';
import {GENBU_ART_URL, RATATOSKR_ART_URL} from './familyArt';
import {start, type BattleEvent} from './engine';

let root: Root;
let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let resize: () => void;
let observerDisconnect: ReturnType<typeof vi.fn>;
type Matrix = [number, number, number, number, number, number];
let sprites: Matrix[];
let glyphs: {text: string; matrix: Matrix; font: string}[];
const context = {
  ...Object.fromEntries(['clearRect', 'setTransform', 'save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'fillRect', 'arc', 'roundRect', 'setLineDash'].map(name => [name, vi.fn()])),
  fillText: vi.fn(), strokeText: vi.fn(), scale: vi.fn(), drawImage: vi.fn(),
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
  glyphs = []; sprites = [];
  callback(time);
}
function labels() {return context.fillText.mock.calls.map(call => call[0]);}
function teamTransforms(enemy = false) {
  return glyphs.filter(glyph => glyph.font.startsWith(enemy ? '57px ' : '40px ')).map(glyph => glyph.matrix);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(areaEffects, 'drawAreaEffect');
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
  context.drawImage.mockImplementation(() => {sprites.push([...matrix]);});
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
  it.each([720, 360])('draws only enemies at width %i while they idle', async width => {
    vi.mocked(HTMLCanvasElement.prototype.getBoundingClientRect).mockReturnValue({width, height: 460, left: 0, top: 0} as DOMRect);
    await render({...base, targetKeys: ['a0'], selectedTarget: 'a0'});
    frame(100);
    const enemies = teamTransforms(true);
    expect(glyphs.map(glyph => glyph.text)).toEqual(party.enemies.map(unit => unit.monster.icon));
    expect(teamTransforms()).toHaveLength(0);
    expect(enemies).toHaveLength(5);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('敵だけ');
    frame(600);
    expect(glyphs).toHaveLength(5);
    expect(teamTransforms(true)).not.toEqual(enemies);
  });

  it.each([
    ['slash', '通常攻撃'],
    ['wind', '疾風斬り'],
    ['fire', '狐火'],
  ])('keeps allied %s casts offscreen while preserving enemy camera zoom', async (type, skill) => {
    await render(base);
    frame(100);
    const enemies = teamTransforms(true);
    const event: BattleEvent = {...cast, skill};
    await render({...base, effect: {text: skill, type, tick: 1}, impact: event});
    frame(200);
    frame(800);
    expect(glyphs.map(glyph => glyph.text)).toEqual(party.enemies.map(unit => unit.monster.icon));
    expect(teamTransforms()).toHaveLength(0);
    expect(teamTransforms(true)[0][0]).toBeGreaterThan(enemies[0][0]);
    expect(labels()).toContain(skill);
    frame(1450);
    expect(glyphs).toHaveLength(5);
  });

  it('preserves enemy lunges and recoil without drawing allied damage in the arena', async () => {
    await render(base);
    frame(100);
    const attack: BattleEvent = {kind: 'cast', actor: 'e0', target: 'a0', skill: '通常攻撃', effect: 'hit'};
    await render({...base, effect: {text: '通常攻撃', type: 'slash', tick: 1}, impact: attack});
    frame(200);
    frame(800);
    expect(glyphs).toHaveLength(5);
    expect(teamTransforms(true)[0][1]).not.toBe(0);
    expect(teamTransforms(true)[1][1]).toBe(0);
    const damage: BattleEvent = {kind: 'damage', actor: 'e0', target: 'a0', amount: 33, hp: 117};
    await render({...base, allies: base.allies.map(unit => unit.key === 'a0' ? {...unit, hp: 117} : unit), impact: damage});
    frame(1500);
    expect(labels()).not.toContain('33');
    expect(document.querySelector('[aria-live]')?.textContent).toContain('妖狐 ダメージ 33');
    const enemyHit: BattleEvent = {kind: 'damage', actor: 'a0', target: 'e0', amount: 44, hp: 206};
    await render({...base, impact: enemyHit});
    frame(1800);
    const enemyGap = teamTransforms(true)[0][4] - teamTransforms(true)[1][4];
    frame(1845);
    expect(teamTransforms(true)[0][4] - teamTransforms(true)[1][4]).not.toBe(enemyGap);
    expect(glyphs).toHaveLength(5);
    expect(labels()).toContain('44');
  });

  it.each(['damage', 'heal', 'guard', 'poison', 'defeat'] as const)('keeps allied %s feedback and healing hit targets outside the arena', async kind => {
    const select = vi.fn();
    const event: BattleEvent = {
      kind, actor: 'a2', target: 'a1', amount: 65, hp: kind === 'defeat' ? 0 : 105,
      ...(kind === 'guard' ? {guard: true} : {}),
      ...(kind === 'poison' ? {poison: 2} : {}),
    };
    const units = base.allies.map(unit => unit.key === 'a0' ? {...unit, hp: 0} : unit.key === 'a1' ? {...unit, hp: 105, guard: true, poison: 2} : unit);
    await render({...base, allies: units, impact: event, impacts: [event], targetKeys: ['a0', 'a1'], selectedTarget: 'a1', onSelectTarget: select});
    for (const time of [200, 475, 900, 1300]) {
      frame(time);
      expect(glyphs.map(glyph => glyph.text)).toEqual(party.enemies.map(unit => unit.monster.icon));
      expect(labels()).not.toContain('+65');
      expect(labels()).not.toContain('65');
      expect(labels()).not.toContain('•');
    }
    expect(document.querySelectorAll('.battleTarget')).toHaveLength(0);
    document.querySelector('canvas')!.dispatchEvent(new MouseEvent('click', {clientX: 222, clientY: 331, bubbles: true}));
    expect(select).not.toHaveBeenCalled();
  });

  it('paints every monster with an opaque brush rather than inherited arena transparency', async () => {
    const painted: {text: string; fill: unknown}[] = [];
    context.fillText.mockImplementation((text: string) => { painted.push({text, fill: (context as unknown as CanvasRenderingContext2D).fillStyle}); });
    await render(base);
    frame(100);
    for (const unit of party.enemies) {
      expect(painted.some(item => item.text === unit.monster.icon)).toBe(true);
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
    expect(labels()).toContain('狐火'); // Delayed impact keeps its cast context.
    const hit: BattleEvent = {kind:'damage', actor:'a0', target:'e0', amount:33, hp:217};
    await render({...base, effect, castEvent:cast, impact:hit, impacts:[hit]});
    frame(1600); frame(2300);
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
    const heal: BattleEvent = {kind: 'heal', actor: 'e1', target: 'e0', amount: 65, hp: 150};
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
    expect(targets[0].getAttribute('aria-label')).toContain(`MP ${party.enemies[0].mp}/${party.enemies[0].monster.mp}`);
    expect(targets[0].getAttribute('aria-pressed')).toBe('true');
    expect(targets[0].style.minWidth).toBe('44px');
    expect(targets[0].textContent).toBe('');
    targets[0].click();
    expect(select).toHaveBeenCalledWith('e0');
  });

  it('shows current and maximum enemy MP alongside their remaining effect timing', async () => {
    const enemies = base.enemies.map((unit, index) => index === 0 ? {...unit, mp: 7, guard: true, poison: 2} : unit);
    await render({...base, enemies});
    expect(document.querySelectorAll('.enemyMp')).toHaveLength(5);
    expect(document.querySelector('.enemyMp')?.textContent).toBe(`MP 7/${enemies[0].monster.mp}`);
    const first = document.querySelector('.enemyVital');
    expect(first?.getAttribute('aria-label')).toContain(`MP 7/${enemies[0].monster.mp}`);
    expect(first?.querySelector('em')?.textContent).toContain('今T');
    expect(first?.querySelector('em')?.textContent).toContain('残2回');
  });

  it('selects an enemy by its centered canvas position and ignores empty foreground', async () => {
    const select = vi.fn();
    await render({...base, targetKeys: ['e0'], onSelectTarget: select});
    const canvas = document.querySelector('canvas')!;
    canvas.dispatchEvent(new MouseEvent('click', {clientX: 84, clientY: 216, bubbles: true}));
    expect(select).toHaveBeenCalledExactlyOnceWith('e0');
    canvas.dispatchEvent(new MouseEvent('click', {clientX: 84, clientY: 336, bubbles: true}));
    expect(select).toHaveBeenCalledTimes(1);
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
    const hit: BattleEvent = {kind:'damage', actor:'a0', target:'e0', amount:33, hp:217};
    await render({...base, effect, castEvent:cast, impact:hit, impacts:[hit], playbackRate:2});
    frame(500); frame(821);
    expect(labels()).not.toContain('狐火');
    await act(async () => root.unmount());
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(observerDisconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    root = createRoot(document.getElementById('stage-test')!);
  });
});


describe('scope-correct battlefield effects', () => {
  it.each(['fire', 'wind', 'shadow'])('draws one shared %s field for every enemy rather than a single destination', async type => {
    const event: BattleEvent = {...cast, scope: 'all', targets: party.enemies.map(u => u.key), target: undefined};
    await render({...base, effect: {...effect, type}, impact:event});
    frame(100); frame(700);
    const args = vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1];
    expect(args.targets.map(p => p.x)).toEqual([84,222,360,498,636]);
    expect(args.incoming).toBe(false); expect(args.impacted).toBe(false);
    expect(labels()).toContain('敵全体 · 5体');
    expect(glyphs).toHaveLength(5);
  });
  it('keeps ordinary single-target casts out of the area renderer', async () => {
    await render({...base,effect,impact:{...cast,scope:'single',targets:['e2'],target:'e2'}});
    frame(100); frame(700);
    expect(areaEffects.drawAreaEffect).not.toHaveBeenCalled();
    expect(labels()).not.toContain('敵全体 · 5体');
  });
  it('retains area scope with one survivor and includes a lethal target at impact', async () => {
    const enemies = base.enemies.map((u,i) => ({...u,hp:i===3?20:0}));
    await render({...base,enemies,effect,impact:{...cast,scope:'all',targets:['e3'],target:undefined}});
    frame(100); frame(700);
    expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1].targets).toEqual([{x:498,y:224}]);
    expect(labels()).toContain('敵全体 · 1体');
    const hit:BattleEvent={kind:'damage',actor:'a0',target:'e3',amount:20,hp:0};
    await render({...base,enemies:enemies.map(u=>({...u,hp:0})),effect,impact:hit,impacts:[hit]});
    frame(900);
    expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1].targets).toHaveLength(1);
    expect(labels()).toContain('20');
  });
  it('directs enemy area effects to the lower edge while leaving only enemies on the battlefield', async () => {
    await render({...base,effect,impact:{kind:'cast',actor:'e1',scope:'all',targets:party.allies.map(u=>u.key),skill:'嵐の息吹',effect:'hit'}});
    frame(100); frame(700);
    const args=vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1];
    expect(args.incoming).toBe(true); expect(args.targets).toEqual([]);
    expect(labels()).toContain('味方全体 · 5体');
    expect(glyphs.map(g=>g.text)).toEqual(party.enemies.map(u=>u.monster.icon));
  });
  it('restarts release timing at a delayed impact and clears every field on skip', async () => {
    await render({...base,effect,impact:{...cast,scope:'all',targets:['e0','e1'],target:undefined}});
    frame(100); frame(1700);
    expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1].impacted).toBe(false);
    const hit:BattleEvent={kind:'damage',actor:'a0',target:'e0',amount:35,hp:215};
    await render({...base,effect,impact:hit,impacts:[hit]}); frame(2000);
    expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1]).toMatchObject({age:800,impacted:true});
    frame(2150); expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1].age).toBe(950);
    const calls=vi.mocked(areaEffects.drawAreaEffect).mock.calls.length;
    await render({...base,impacts:[]}); frame(2200);
    expect(areaEffects.drawAreaEffect).toHaveBeenCalledTimes(calls);
  });
});


describe('frame-delayed motion lifecycle', () => {
  it.each([1, 2])('retains fire area identity when a frame misses the entire cast at %ix', async playbackRate => {
    const areaCast: BattleEvent = {...cast, scope:'all', targets:['e0','e1'], target:undefined};
    await render({...base, effect, castEvent:areaCast, impact:areaCast, impacts:[], playbackRate});
    const hit: BattleEvent = {kind:'damage', actor:'a0', target:'e0', amount:33, hp:217};
    await render({...base, effect, castEvent:areaCast, impact:hit, impacts:[hit], playbackRate});
    frame(900);
    expect(labels()).toContain('狐火');
    expect(labels()).toContain('味方 · 妖狐');
    expect(labels()).toContain('33');
    expect(vi.mocked(areaEffects.drawAreaEffect).mock.calls.at(-1)![1]).toMatchObject({type:'fire', impacted:true, age:800});
  });
  it('honors a skipped render even when a new cast arrives before the next frame', async () => {
    const hit: BattleEvent = {kind:'damage', actor:'a0', target:'e0', amount:33, hp:217};
    await render({...base, effect, impact:hit, impacts:[hit]}); frame(100);
    expect(labels()).toContain('33');
    await render({...base, impacts:[]});
    const nextCast: BattleEvent = {...cast, actor:'a1', skill:'次の攻撃'};
    await render({...base, effect:{...effect,text:'次の攻撃',tick:2}, castEvent:nextCast, impact:nextCast, impacts:[]});
    frame(150); frame(250);
    expect(labels()).not.toContain('33');
    expect(labels()).toContain('次の攻撃');
  });
  it('clears the previous cast before a castless poison tick', async () => {
    await render({...base, effect, castEvent:cast, impact:cast, impacts:[]}); frame(100);
    const poison: BattleEvent = {kind:'damage', target:'e0', effect:'poison', amount:9, hp:208};
    await render({...base, effect:{text:'毒のダメージ',type:'shadow',tick:2}, castEvent:null, impact:poison, impacts:[poison]}); frame(1000);
    expect(labels()).not.toContain('狐火');
    expect(labels()).toContain('9');
  });
});

describe('motion accessibility and delayed recovery', () => {
  it.each([1,2])('waits for a delayed enemy strike at %ix and returns home afterward', async playbackRate => {
    const enemyCast: BattleEvent = {kind:'cast',actor:'e0',target:'a0',targets:['a0'],scope:'single',skill:'通常攻撃',effect:'hit'};
    await render({...base,effect:{text:'通常攻撃',type:'slash',tick:1},castEvent:enemyCast,impact:enemyCast,playbackRate}); frame(100);
    frame(100+1800/playbackRate);
    expect(teamTransforms(true)[0][1]).not.toBe(0);
    const hit:BattleEvent={kind:'damage',actor:'e0',target:'a0',amount:33,hp:117};
    await render({...base,effect:{text:'通常攻撃',type:'slash',tick:1},castEvent:enemyCast,impact:hit,impacts:[hit],playbackRate});
    frame(100+2000/playbackRate);
    expect(teamTransforms(true)[0][1]).not.toBe(0);
    frame(100+2600/playbackRate);
    expect(teamTransforms(true)[0][1]).toBe(0);
    expect(teamTransforms(true)[0][0]).toBe(1);
  });
  it('reacts to a live reduced-motion preference without restarting the renderer', async () => {
    const media={matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()};
    vi.mocked(window.matchMedia).mockReturnValue(media as unknown as MediaQueryList);
    const enemyCast: BattleEvent={kind:'cast',actor:'e0',target:'a0',skill:'通常攻撃',effect:'hit'};
    await render({...base,effect:{text:'通常攻撃',type:'slash',tick:1},castEvent:enemyCast,impact:enemyCast}); frame(100); frame(800);
    expect(teamTransforms(true)[0][1]).not.toBe(0);
    media.matches=true; media.addEventListener.mock.calls[0][1](); frame(850);
    expect(teamTransforms(true)[0][1]).toBe(0);
    expect(teamTransforms(true)[0][0]).toBe(1);
    expect(labels()).toContain('通常攻撃');
    expect(labels()).toContain('敵 · トロル');
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });
});


describe('reduced-motion effect cleanup', () => {
  it('keeps defeat particles stationary when motion is reduced', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const defeat:BattleEvent={kind:'defeat',target:'e0',hp:0};
    await render({...base,enemies:base.enemies.map((unit,i)=>i===0?{...unit,hp:0}:unit),impact:defeat,impacts:[defeat]});
    vi.mocked((context as unknown as CanvasRenderingContext2D).ellipse).mockClear(); frame(100);
    const particles=()=>vi.mocked((context as unknown as CanvasRenderingContext2D).ellipse).mock.calls.filter(args=>args[2]===2&&args[3]===2);
    const initial=particles(); expect(initial).toHaveLength(8);
    vi.mocked((context as unknown as CanvasRenderingContext2D).ellipse).mockClear(); frame(400);
    expect(particles()).toEqual(initial);
  });
  it('fades the static offensive accent away during reduced-motion recovery', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const hit:BattleEvent={kind:'damage',actor:'a0',target:'e0',hp:217};
    await render({...base,effect,impact:hit,impacts:[hit]}); frame(100);
    const ctx=context as unknown as CanvasRenderingContext2D;
    expect(ctx.globalAlpha).toBeGreaterThan(0);
    frame(790);
    expect(ctx.globalAlpha).toBe(0);
  });
});


describe('original wolf enemy asset and random-hit presentation', () => {
  it('renders the full-body asset and keeps its pounce active until the last actual hit', async () => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const state=start([0,2,3,4,6],[12,0,2,6,10],42,{leaders:true});
    const barrage:BattleEvent={kind:'cast',actor:'e0',scope:'random',skill:'破縛の連牙',effect:'hit',hits:5,targets:['a0'],hitTargets:['a0','a0','a0','a0','a0']};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:'破縛の連牙',type:'slash',tick:1},impact:barrage,castEvent:barrage};
    await render(props);frame(100);
    expect(context.drawImage).toHaveBeenCalled();expect(sprites).toHaveLength(1);
    expect(glyphs.map(value=>value.text)).toEqual(state.enemies.slice(1).map(unit=>unit.monster.icon));
    const idle=sprites[0];frame(440);expect(sprites[0]).not.toEqual(idle);
    frame(899);const released=sprites[0];
    for(let index=0;index<5;index++) {
      const hit:BattleEvent={kind:'damage',actor:'e0',target:'a0',hitIndex:index,amount:20,hp:130-index*20};
      await render({...props,impact:hit,impacts:[hit]});frame(900+index*180);
      expect(labels()).toContain(`ランダム5回 · ${index+1}/5撃`);
    }
    frame(1710);expect(sprites[0]).not.toEqual(idle);
    // A delayed final hit starts recovery at its observed time, not from a stale timer.
    frame(2320);expect(sprites[0]).not.toEqual(released);
    expect(labels()).not.toContain('破縛の連牙');
  });

  it('draws strip fragments only for actual break events, including reduced motion', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const barrage:BattleEvent={kind:'cast',actor:'a0',scope:'random',skill:'破縛の連牙',effect:'hit',hits:5,targets:['e0'],hitTargets:['e0','e0','e0','e0','e0']};
    const props={...base,effect:{text:'破縛の連牙',type:'slash',tick:1},impact:barrage,castEvent:barrage};
    await render(props);frame(100);expect(labels()).not.toContain('群気解除');
    const strip:BattleEvent={kind:'break',actor:'a0',target:'e0',hitIndex:0,rally:0,guard:false,removed:['rally']};
    await render({...props,impact:strip,impacts:[strip]});frame(900);
    expect(labels()).toContain('群気解除');expect(labels()).not.toContain('群気・守り解除');
    await render({...base,castEvent:null,impacts:[]});frame(910);
    expect(labels()).not.toContain('群気解除');
  });
});

describe('new family art and enemy-only signature effects', () => {
  it('loads both original sprites without drawing an ally or changing the wolf dimensions', async () => {
    vi.stubGlobal('Image', class {src=''; complete=true; naturalWidth=280;});
    const state = start([13,14,0,2,6], [12,13,14,0,2]);
    await render({allies:state.allies,enemies:state.enemies,effect:null,impact:null}); frame(100);
    expect(sprites).toHaveLength(3);
    const images = context.drawImage.mock.calls as unknown as [HTMLImageElement, number, number, number, number][];
    expect(images.some(([image]) => image.src === RATATOSKR_ART_URL)).toBe(true);
    expect(images.some(([image]) => image.src === GENBU_ART_URL)).toBe(true);
    expect(images.map(([,x,y,w,h]) => [x,y,w,h])).toEqual([[-55,-47,110,82.5],[-49.5,-38.75,99,74.25],[-60.5,-55.25,121,90.75]]);
    expect(glyphs.map(glyph => glyph.text)).toEqual(state.enemies.slice(3).map(unit => unit.monster.icon));
    expect(teamTransforms()).toHaveLength(0);
  });

  it.each([3,4])('uses the squirrel hop and exact %i-shot count instead of Fenrir choreography', async hits => {
    vi.stubGlobal('Image', class {src=''; complete=true; naturalWidth=280;});
    const squirrel = vi.spyOn(battleMotion, 'sampleRatatoskrMotion');
    const wolf = vi.spyOn(battleMotion, 'sampleFenrirMotion');
    const state = start([0,2,3,4,6], [13,0,2,6,10]);
    const event: BattleEvent = {kind:'cast',actor:'e0',scope:'random',skill:'木の実の連弾',effect:'hit',hits,targets:['a0'],hitTargets:Array(hits).fill('a0')};
    const props = {allies:state.allies,enemies:state.enemies,effect:{text:'木の実の連弾',type:'wind',tick:1},castEvent:event,impact:event};
    await render(props); frame(100); frame(510);
    expect(squirrel).toHaveBeenLastCalledWith(410,hits,false);
    expect(wolf).not.toHaveBeenCalled();
    expect(sprites[0][1]).not.toBe(0);
    expect(teamTransforms()).toHaveLength(0);
    for (let index=0; index<hits; index++) {
      const damage: BattleEvent = {kind:'damage',actor:'e0',target:'a0',hitIndex:index,amount:15,hp:135-index*15};
      await render({...props,impact:damage,impacts:[damage]}); frame(900+index*180);
      expect(labels()).toContain(`ランダム${hits}回 · ${index+1}/${hits}撃`);
      expect(labels()).not.toContain('15');
    }
    frame(900+(hits-1)*180+700);
    expect(labels()).not.toContain('木の実の連弾');
  });

  it.each([3,4])('draws one small acorn per shot in the authoritative %i-target sequence', async hits => {
    const hitTargets = ['e0','e1','e0','e2'].slice(0,hits);
    const event: BattleEvent = {kind:'cast',actor:'a0',scope:'random',skill:'木の実の連弾',effect:'hit',hits,targets:[...new Set(hitTargets)],hitTargets};
    const props = {...base,effect:{text:'木の実の連弾',type:'wind',tick:1},castEvent:event,impact:event};
    const ctx = context as unknown as CanvasRenderingContext2D;
    await render(props); frame(100);
    for (let index=0; index<hits; index++) {
      vi.mocked(ctx.ellipse).mockClear(); vi.mocked(ctx.translate).mockClear();
      frame(800+index*180);
      expect(vi.mocked(ctx.ellipse).mock.calls.filter(args=>args[2]===4.5&&args[3]===6)).toHaveLength(1);
      const targetIndex = Number(hitTargets[index].slice(1));
      const shake = index ? battleMotion.sampleHitMotion(80).shake : 0;
      const targetX = 360 + ((84+targetIndex*138)-360)*1.004 + shake;
      const targetY = 246 + ((232-Math.abs(targetIndex-2)*8)-246)*1.004 + shake*.4;
      const progress = 70/170;
      const x = 354+(targetX-354)*progress;
      const y = 521+(targetY-521)*progress-Math.sin(progress*Math.PI)*20;
      expect(vi.mocked(ctx.translate).mock.calls.some(([tx,ty])=>Math.abs(tx-x)<.001&&Math.abs(ty-y)<.001)).toBe(true);
      const damage: BattleEvent = {kind:'damage',actor:'a0',target:hitTargets[index],hitIndex:index,amount:15,hp:135-index*15};
      await render({...props,impact:damage,impacts:[damage]}); frame(900+index*180);
    }
    vi.mocked(ctx.ellipse).mockClear(); frame(900+(hits-1)*180+200);
    expect(vi.mocked(ctx.ellipse).mock.calls.filter(args=>args[2]===4.5&&args[3]===6)).toHaveLength(0);
  });

  it('keeps Genbu planted and its water/stone rise behind the actual delayed area impact', async () => {
    vi.stubGlobal('Image', class {src=''; complete=true; naturalWidth=280;});
    const shell = vi.spyOn(battleMotion, 'sampleGenbuMotion');
    const state = start([0,2,3,4,6], [14,0,2,6,10]);
    const event: BattleEvent = {kind:'cast',actor:'e0',scope:'all',skill:'海山の轟き',effect:'hit',targets:state.allies.map(unit=>unit.key)};
    const props = {allies:state.allies,enemies:state.enemies,effect:{text:'海山の轟き',type:'water',tick:1},castEvent:event,impact:event};
    await render(props); frame(100); frame(2400);
    expect(shell).toHaveBeenLastCalledWith(799,false);
    expect(sprites[0][1]).toBe(0);
    expect(labels()).toContain('味方全体 · 5体');
    expect(areaEffects.drawAreaEffect).not.toHaveBeenCalled();
    const ring = () => vi.mocked((context as unknown as CanvasRenderingContext2D).ellipse).mock.calls.filter(args=>args[2]===304);
    expect(ring().at(-1)?.[1]).toBe(504); // The water ring has not risen early.
    const damage: BattleEvent = {kind:'damage',actor:'e0',target:'a0',amount:30,hp:120};
    await render({...props,impact:damage,impacts:[damage]}); frame(2500); frame(2640);
    expect(ring().at(-1)?.[1]).toBe(436);
    expect(teamTransforms()).toHaveLength(0);
    await render({allies:state.allies,enemies:state.enemies,effect:null,impact:null,castEvent:null,impacts:[]}); frame(2650);
    expect(labels()).not.toContain('海山の轟き');
  });

  it.each(['木の実の連弾','海山の轟き'])('keeps %s body and camera stationary for reduced motion', async skill => {
    vi.stubGlobal('Image', class {src=''; complete=true; naturalWidth=280;});
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const isSeed = skill==='木の実の連弾';
    const state = start([0,2,3,4,6], [isSeed?13:14,0,2,6,10]);
    const event: BattleEvent = {kind:'cast',actor:'e0',scope:isSeed?'random':'all',skill,effect:'hit',targets:['a0'],...(isSeed?{hits:3,hitTargets:['a0','a0','a0']}:{})};
    const props = {allies:state.allies,enemies:state.enemies,effect:{text:skill,type:'water',tick:1},castEvent:event,impact:event};
    await render(props); frame(100); const startTransform = sprites[0]; frame(799);
    expect(sprites[0]).toEqual(startTransform);
    const damage: BattleEvent = {kind:'damage',actor:'e0',target:'a0',amount:15,hp:135,...(isSeed?{hitIndex:0}:{})};
    await render({...props,impact:damage,impacts:[damage]}); frame(900); frame(1030);
    expect(sprites[0]).toEqual(startTransform);
    expect(labels()).toContain(skill);
  });

  it('shows a jade ward only while active and uses the truthful nature-ward break label', async () => {
    const fills: unknown[] = [];
    const fill = vi.mocked((context as unknown as CanvasRenderingContext2D).fill);
    fill.mockImplementation(()=>{fills.push((context as unknown as CanvasRenderingContext2D).fillStyle);});
    const enemies = base.enemies.map((unit,index)=>index===0?{...unit,ward:2}:unit);
    await render({...base,enemies}); frame(100);
    expect(fills.filter(fill=>fill==='#73d0ad24')).toHaveLength(2);
    fills.length=0;
    const broken: BattleEvent = {kind:'break',actor:'a0',target:'e0',ward:0,removed:['ward']};
    await render({...base,impact:broken,impacts:[broken]}); frame(900);
    expect(fills).not.toContain('#73d0ad24');
    expect(labels()).toContain('自然障壁解除');
    expect(labels()).not.toContain('守り解除');
    fill.mockReset();
  });
});

describe('dragon art and authoritative storm choreography', () => {
  it('loads all four full bodies through the shared registry and never draws allied portraits', async () => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const {DRAGON_ART} = await import('./dragonArt');
    const state = start([15,16,17,18,5],[15,16,17,18,5]);
    await render({allies:state.allies,enemies:state.enemies,effect:null,impact:null}); frame(100);
    expect(sprites).toHaveLength(4);
    const images = context.drawImage.mock.calls as unknown as [HTMLImageElement,number,number,number,number][];
    expect(images.map(([image])=>image.src)).toEqual(Object.values(DRAGON_ART).map(art=>art.artUrl));
    expect(images.map(([,x,y,w,h])=>[x,y,w,h])).toEqual([127,118,125,116].map(w=>[-w/2,35.5-w*.75,w,w*.75]));
    expect(glyphs.map(glyph=>glyph.text)).toEqual([state.enemies[4].monster.icon]);
    expect(teamTransforms()).toHaveLength(0);
  });

  it('lights only the enabled core storm chambers, including empty and removed charge', async () => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const fills: unknown[] = [];
    const ctx = context as unknown as CanvasRenderingContext2D;
    vi.mocked(ctx.fill).mockImplementation(()=>{fills.push(ctx.fillStyle);});
    const state = start([0,2,3,4,6],[15,16,17,18,5]);
    const props = {allies:state.allies,enemies:state.enemies.map((unit,index)=>({...unit,dragonCharge:index===0?3:5})),effect:null,impact:null};
    await render(props);frame(100);
    expect(fills.filter(fill=>fill==='#f2d3a3')).toHaveLength(3);
    fills.length=0;
    await render({...props,enemies:props.enemies.map(unit=>({...unit,dragonCharge:0}))});frame(200);
    expect(fills).not.toContain('#f2d3a3');
    const inactive = start([0,2,3,4,6],[15,16,0,2,6]);
    fills.length=0;
    await render({allies:inactive.allies,enemies:inactive.enemies,effect:null,impact:null});frame(300);
    expect(fills).not.toContain('#f2d3a3');
    vi.mocked(ctx.fill).mockReset();
  });

  it.each([0,5])('holds a %i-charge breath until the delayed area hit, then reads retained cast metadata', async spent => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const storm = vi.spyOn(battleMotion,'sampleVritraMotion');
    const wolf = vi.spyOn(battleMotion,'sampleFenrirMotion');
    const shell = vi.spyOn(battleMotion,'sampleGenbuMotion');
    const state = start([15,16,17,18,5],[0,2,3,4,6]);
    const event: BattleEvent = {kind:'cast',actor:'a0',scope:'all',targets:state.enemies.map(unit=>unit.key),skill:'渇天の息',effect:'hit',dragonChargeSpent:spent};
    const props = {allies:state.allies.map(unit=>({...unit,dragonCharge:0})),enemies:state.enemies,effect:{text:'渇天の息',type:'wind',tick:1},castEvent:event,impact:event};
    await render(props);frame(100);frame(2400);
    expect(storm).toHaveBeenLastCalledWith(799,spent,false);
    expect((context as unknown as CanvasRenderingContext2D).quadraticCurveTo).not.toHaveBeenCalled();
    expect(labels()).toContain(`竜気 ${spent} 消費 · 息を圧縮`);
    expect(areaEffects.drawAreaEffect).not.toHaveBeenCalled();expect(wolf).not.toHaveBeenCalled();expect(shell).not.toHaveBeenCalled();
    const hits: BattleEvent[] = state.enemies.map((unit,index)=>({kind:'damage',actor:'a0',target:unit.key,amount:20+index,hp:unit.hp-20-index}));
    await render({...props,impact:hits[0],impacts:hits});frame(2500);frame(2620);
    expect(storm).toHaveBeenLastCalledWith(920,spent,false);
    expect((context as unknown as CanvasRenderingContext2D).quadraticCurveTo).toHaveBeenCalled();
    expect(labels()).toEqual(expect.arrayContaining(['20','21','22','23','24',`竜気 ${spent} 消費 · 嵐を放出`]));
    expect(teamTransforms()).toHaveLength(0);
    frame(3200);expect(labels()).not.toContain('渇天の息');
  });

  it('does not expose a charge counter when the starting dragon threshold was not enabled', async () => {
    const state=start([15,16,0,2,6],[0,2,3,4,6]);
    expect(state.allies[0].dragonCharge).toBeUndefined();
    const event:BattleEvent={kind:'cast',actor:'a0',scope:'all',targets:['e0'],skill:'渇天の息',effect:'hit',dragonChargeSpent:0};
    await render({allies:state.allies,enemies:state.enemies,effect:{text:'渇天の息',type:'wind',tick:1},castEvent:event,impact:event});frame(100);frame(700);
    expect(labels()).toContain('渇天の息');
    expect(labels().some(label=>String(label).includes('竜気'))).toBe(false);
  });

  it('does not invent spent charge from current unit state when older cast metadata is missing', async () => {
    const storm = vi.spyOn(battleMotion,'sampleVritraMotion');
    const state = start([15,16,17,18,5],[0,2,3,4,6]);
    const event:BattleEvent={kind:'cast',actor:'a0',scope:'all',targets:['e0'],skill:'渇天の息',effect:'hit'};
    await render({allies:state.allies.map(unit=>({...unit,dragonCharge:5})),enemies:state.enemies,effect:{text:'渇天の息',type:'wind',tick:1},castEvent:event,impact:event});frame(100);frame(700);
    expect(storm).toHaveBeenLastCalledWith(600,undefined,false);
    expect(labels().some(label=>String(label).includes('消費'))).toBe(false);
  });

  it('preserves all hit cues with a still body, still camera and stationary storm in reduced motion', async () => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const state = start([0,2,3,4,6],[15,16,17,18,5]);
    const event:BattleEvent={kind:'cast',actor:'e0',scope:'all',targets:state.allies.map(unit=>unit.key),skill:'渇天の息',effect:'hit',dragonChargeSpent:5};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:'渇天の息',type:'wind',tick:1},castEvent:event,impact:event};
    await render(props);frame(100);const before=sprites[0];frame(799);expect(sprites[0]).toEqual(before);
    const hits:BattleEvent[]=state.allies.map(unit=>({kind:'damage',actor:'e0',target:unit.key,amount:45,hp:unit.hp-45}));
    await render({...props,impact:hits[0],impacts:hits});frame(900);frame(1030);
    expect(sprites[0]).toEqual(before);expect((context as unknown as CanvasRenderingContext2D).quadraticCurveTo).not.toHaveBeenCalled();
    expect(labels()).toContain('味方全体 · 5体');expect(labels()).toContain('竜気 5 消費 · 嵐を放出');
    expect(document.querySelector('[aria-live]')?.textContent).toContain('5体に同時着弾');
    expect(teamTransforms()).toHaveLength(0);
  });

  it('uses both head directions and their exact hit order without borrowing the wolf pounce', async () => {
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const twin=vi.spyOn(battleMotion,'sampleAmphisbaenaMotion');const wolf=vi.spyOn(battleMotion,'sampleFenrirMotion');
    const state=start([0,2,3,4,6],[17,0,2,6,10]);
    const event:BattleEvent={kind:'cast',actor:'e0',scope:'random',targets:['a0','a1'],hitTargets:['a0','a1'],hits:2,skill:'双頭の連突',effect:'hit'};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:'双頭の連突',type:'slash',tick:1},castEvent:event,impact:event};
    await render(props);frame(100);frame(800);expect(twin).toHaveBeenLastCalledWith(700,2,false);expect(wolf).not.toHaveBeenCalled();
    for (let index=0;index<2;index++) {
      const hit:BattleEvent={kind:'damage',actor:'e0',target:`a${index}`,amount:15,hp:135,hitIndex:index};
      await render({...props,impact:hit,impacts:[hit]});frame(900+index*180);
      expect(twin).toHaveBeenLastCalledWith(800+index*180,2,false);
      expect(Math.sign(sprites[0][1])).toBe(index ? 1 : -1);
      expect(labels()).toContain(`ランダム2回 · ${index+1}/2撃`);
    }
    frame(1800);expect(labels()).not.toContain('双頭の連突');
  });

  it('keeps charge bookkeeping quiet and labels a real charge break truthfully', async () => {
    const ctx=context as unknown as CanvasRenderingContext2D;
    const charge:BattleEvent={kind:'charge',target:'e0',dragonCharge:3,effect:'dragon-charge-gain'};
    await render({...base,impact:charge,impacts:[charge]});frame(100);
    expect(labels()).not.toContain('竜気解除');expect(ctx.strokeText).not.toHaveBeenCalled();
    const broken:BattleEvent={kind:'break',actor:'a0',target:'e0',dragonCharge:0,removed:['dragonCharge']};
    await render({...base,impact:broken,impacts:[broken]});frame(200);
    expect(labels()).toContain('竜気解除');expect(labels()).not.toContain('守り解除');
  });
});

describe('material figures, repair and grounded effects',()=>{
  it('loads all five full bodies and keeps every allied portrait out of the canvas',async()=>{
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const {MATERIAL_ART}=await import('./materialArt');
    const state=start([19,20,21,22,23],[19,20,21,22,23]);
    await render({allies:state.allies,enemies:state.enemies,effect:null,impact:null});frame(100);
    expect(sprites).toHaveLength(5);expect(glyphs).toHaveLength(0);
    const images=context.drawImage.mock.calls as unknown as [HTMLImageElement,number,number,number,number][];
    expect(images.map(([img])=>img.src)).toEqual(Object.values(MATERIAL_ART).map(art=>art.artUrl));
    expect(images.map(([,x,y,w,h])=>[x,y,w,h])).toEqual([112,116,124,115,127].map(w=>[-w/2,35.5-w*.75,w,w*.75]));
    expect(teamTransforms()).toHaveLength(0);
  });
  it.each([1,2,4])('holds the hammer at %ix until the actual area hit, then releases only one shared ground field',async rate=>{
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const talos=vi.spyOn(battleMotion,'sampleTalosMotion');
    const state=start([19,20,21,22,23],[0,2,3,4,6]);
    const event:BattleEvent={kind:'cast',actor:'a0',scope:'all',targets:state.enemies.map(u=>u.key),skill:'環銅の衝撃',effect:'hit'};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:event.skill!,type:'slash',tick:1},impact:event,castEvent:event,playbackRate:rate};
    await render(props);frame(100);frame(2400);
    expect(talos).toHaveBeenLastCalledWith(799,false,false);
    const rings=()=>vi.mocked((context as unknown as CanvasRenderingContext2D).ellipse).mock.calls.filter(args=>args[2]===290);
    expect(rings()).toHaveLength(0);expect(areaEffects.drawAreaEffect).not.toHaveBeenCalled();
    const hits:BattleEvent[]=state.enemies.map((u,i)=>({kind:'damage',actor:'a0',target:u.key,amount:25+i,hp:u.hp-25-i}));
    await render({...props,impact:hits[0],impacts:hits});frame(2500);frame(2500+100/rate);
    expect(talos).toHaveBeenLastCalledWith(900,false,false);
    expect(rings().length).toBeGreaterThan(0);expect(labels()).toEqual(expect.arrayContaining(['25','26','27','28','29']));
    frame(2500+750/rate);expect(labels()).not.toContain('環銅の衝撃');
  });
  it.each([[19,'炉心の槌','sampleTalosMotion'],[20,'雨縫い','sampleUmbrellaMotion'],[21,'石段押し','sampleWallMotion'],[22,'三輪の一押し','sampleTripodMotion'],[23,'銅角の突き','sampleBronzeBullMotion']] as const)('routes %i to its own motion with still reduced-motion body and camera',async(id,skill,sampler)=>{
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const own=vi.spyOn(battleMotion,sampler);const wolf=vi.spyOn(battleMotion,'sampleFenrirMotion');
    const state=start([0,2,3,4,6],[id,0,2,6,10]);
    const event:BattleEvent={kind:'cast',actor:'e0',target:'a0',targets:['a0'],scope:'single',skill,effect:'hit'};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:skill,type:'slash',tick:1},impact:event,castEvent:event};
    await render(props);frame(100);const before=sprites[0];frame(750);
    expect(own).toHaveBeenCalled();expect(wolf).not.toHaveBeenCalled();expect(sprites[0]).toEqual(before);
    const hit:BattleEvent={kind:'damage',actor:'e0',target:'a0',amount:25,hp:100};
    await render({...props,impact:hit,impacts:[hit]});frame(900);frame(1050);
    expect(sprites[0]).toEqual(before);expect(labels()).toContain(skill);expect(teamTransforms()).toHaveLength(0);
  });
  it('shows only live pending core repair lights, removing them on consumption or dispel',async()=>{
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const fills:unknown[]=[];const ctx=context as unknown as CanvasRenderingContext2D;
    vi.mocked(ctx.fill).mockImplementation(()=>{fills.push(ctx.fillStyle);});
    const state=start([0,2,3,4,6],[19,20,21,22,23]);
    const props={allies:state.allies,enemies:state.enemies,effect:null,impact:null};
    await render(props);frame(100);expect(fills.filter(x=>x==='#b9ecc2')).toHaveLength(3);
    fills.length=0;await render({...props,enemies:state.enemies.map(u=>({...u,repairReady:false}))});frame(200);
    expect(fills).not.toContain('#b9ecc2');
    fills.length=0;await render({...props,enemies:state.enemies.map((u,i)=>i===0?{...u,hp:0}:u)});frame(300);
    expect(fills).not.toContain('#b9ecc2');vi.mocked(ctx.fill).mockReset();
  });
  it('uses the passive cue and exact heals, without inventing a cast from the bookkeeping event',async()=>{
    vi.stubGlobal('Image',class {src='';complete=true;naturalWidth=280;});
    const state=start([0,2,3,4,6],[19,20,21,22,23]);
    const passive:BattleEvent={kind:'passive',effect:'material-repair',skill:'炉心の修復',actor:'e0',target:'e0',targets:['e0','e2'],repairReady:false};
    const props={allies:state.allies,enemies:state.enemies,effect:{text:'炉心の修復',type:'water',tick:1}};
    await render({...props,impact:passive,impacts:[passive]});frame(100);expect(labels()).not.toContain('炉心の修復');
    const cue:BattleEvent={kind:'cast',passive:'material-repair',effect:'heal',skill:'炉心の修復',actor:'e0',targets:['e0','e2'],scope:'all'};
    await render({...props,impact:cue,castEvent:cue});frame(200);frame(500);
    expect(labels()).toContain('炉心の修復');expect(labels()).toContain('生存物質 · 2体修復');
    expect(labels()).not.toContain('敵全体 · 2体');expect(context.strokeText).not.toHaveBeenCalled();
    const heals:BattleEvent[]=[{kind:'heal',effect:'material-repair',actor:'e0',target:'e0',amount:21,hp:180},{kind:'heal',effect:'material-repair',actor:'e0',target:'e2',amount:8,hp:220}];
    await render({...props,castEvent:cue,impact:heals[0],impacts:heals});frame(1000);
    expect(labels()).toEqual(expect.arrayContaining(['+21','+8']));expect(labels()).not.toContain('+0');
    expect(document.querySelector('[aria-live]')?.textContent).toContain('2体に同時回復');
    expect(areaEffects.drawAreaEffect).not.toHaveBeenCalled();
    await render({...base,castEvent:null,impacts:[]});frame(1050);
    expect(labels()).not.toContain('炉心の修復');expect(labels()).not.toContain('+21');
  });
  it('labels only actual repair-readiness dispel and ignores quiet consumption',async()=>{
    const expire:BattleEvent={kind:'expire',target:'e0',repairReady:false};
    await render({...base,impact:expire,impacts:[expire]});frame(100);expect(labels()).not.toContain('修復待ち解除');
    const broken:BattleEvent={kind:'break',actor:'a0',target:'e0',repairReady:false,removed:['repairReady']};
    await render({...base,impact:broken,impacts:[broken]});frame(200);
    expect(labels()).toContain('修復待ち解除');expect(labels()).not.toContain('守り解除');
  });
});
