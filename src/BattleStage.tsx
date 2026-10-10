import {useEffect, useRef} from 'react';
import {effectStatus, type BattleEvent, type Unit} from './engine';
import {drawAreaEffect} from './areaEffects';
import {FENRIR_ART_URL} from './fenrirArt';
import {GENBU_ART_URL, RATATOSKR_ART_URL} from './familyArt';
import {CAST_IMPACT_MS, MULTIHIT_INTERVAL_MS} from './playback';
import {actionAge, motionKind, NUMBER_DURATION_MS, sampleActionMotion, sampleFenrirMotion, sampleGenbuMotion, sampleHitMotion, sampleNumberMotion, sampleRatatoskrMotion} from './battleMotion';

type Effect = {text: string; type: string; tick: number} | null;
type Props = {
  allies: Unit[];
  enemies: Unit[];
  effect: Effect;
  impact: BattleEvent | null;
  /** Retain cast metadata even if a delayed frame only sees its impact. */
  castEvent?: BattleEvent | null;
  impacts?: BattleEvent[];
  playbackRate?: number;
  targetKeys?: string[];
  selectedTarget?: string;
  onSelectTarget?: (key: string) => void;
};
type Point = {x: number; y: number};
type Visual = 'slash' | 'fire' | 'wind' | 'water' | 'shadow' | 'guard' | 'poison' | 'seed';
type Cast = {event: BattleEvent; type: Visual; name: string; started: number; rate: number; from: Point; to: Point; targets: Point[]; incoming: boolean; impacted: boolean; impactedAt?: number; lastHitIndex?: number; lastHitAt?: number};
type Impact = {event: BattleEvent; type: Visual; started: number; rate: number; at: Point};
type Health = {value: number; trail: number; target: number; changed: number};
const WIDTH = 720;
const HEIGHT = 460;
const TAU = Math.PI * 2;
const palettes: Record<Visual, {light: string; core: string; dark: string}> = {
  slash: {light: '#fffbe6', core: '#e8b951', dark: '#bc7c29'},
  fire: {light: '#fff0a9', core: '#ff963e', dark: '#e75538'},
  wind: {light: '#edfff2', core: '#6cd5b2', dark: '#268c79'},
  water: {light: '#e5ffff', core: '#70d2e1', dark: '#338ba7'},
  shadow: {light: '#f0dbff', core: '#bc8bdc', dark: '#734985'},
  guard: {light: '#fff6c9', core: '#e5c264', dark: '#b69139'},
  poison: {light: '#e6f5c1', core: '#a5c76c', dark: '#75814b'},
  seed: {light: '#fff0bc', core: '#c38d4d', dark: '#638156'},
};
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = (value: number) => 1 - (1 - clamp(value)) ** 3;
const mix = (a: number, b: number, progress: number) => a + (b - a) * progress;
function position(index: number, count: number): Point {
  const spread = Math.min(138, 552 / Math.max(1, count - 1));
  const offset = index - (count - 1) / 2;
  return {x: WIDTH / 2 + offset * spread, y: 232 - Math.abs(offset) * 8};
}
function locate(key: string | undefined, props: Props): Point | undefined {
  if (!key) return undefined;
  const enemy = props.enemies.findIndex(unit => unit.key === key);
  return enemy >= 0 ? position(enemy, props.enemies.length) : undefined;
}
function visual(effect: Effect, event: BattleEvent): Visual {
  if (event.skill === '木の実の連弾') return 'seed';
  if (event.skill === '海山の轟き') return 'water';
  if (event.kind === 'heal' || event.effect === 'heal') return 'water';
  if (event.kind === 'guard' || event.effect === 'guard') return 'guard';
  if (event.kind === 'poison' || event.effect === 'poison') return 'poison';
  return effect && effect.type in palettes ? effect.type as Visual : 'slash';
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill?: string | CanvasGradient) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU);
  if (fill) {ctx.fillStyle = fill; ctx.fill();}
}
function line(ctx: CanvasRenderingContext2D, points: Point[], color: string, width = 1) {
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, size));
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ellipse(ctx, x, y, size, size, gradient);
}
function shield(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, nature = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * TAU - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size * 1.12;
    index ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = nature ? '#73d0ad24' : '#ffe5a538';
  ctx.fill();
  ctx.strokeStyle = nature ? '#4eaa91' : '#c6a34f';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (nature) {
    // A quiet leaf-vein mark keeps opening ward distinct from the gold guard.
    line(ctx, [{x: x - size * .27, y: y + size * .31}, {x: x + size * .22, y: y - size * .36}], '#bef2d9', size > 10 ? 2 : 1.2);
    line(ctx, [{x: x - size * .26, y: y - size * .1}, {x, y: y - size * .01}, {x: x + size * .27, y: y + size * .01}], '#bef2d9', size > 10 ? 1.5 : 1);
  } else line(ctx, [{x: x - size * .3, y}, {x, y: y + size * .26}, {x: x + size * .35, y: y - size * .3}], '#fff9de', 3);
  ctx.restore();
}
function arena(ctx: CanvasRenderingContext2D, time: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#d7e9e4');
  sky.addColorStop(.44, '#f2f0dc');
  sky.addColorStop(1, '#c9ddd1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(ctx, 365, 25, 310, '#fffdf1b0');
  // Distant arched stonework frames a sunlit, original arena.
  ctx.fillStyle = '#9fbdb528';
  for (const x of [25, 126, 227, 328, 429, 530, 631]) {
    ctx.fillRect(x, 0, 57, 95);
    ctx.beginPath();
    ctx.arc(x + 78, 40, 27, Math.PI, 0);
    ctx.lineTo(x + 105, 92);
    ctx.lineTo(x + 51, 92);
    ctx.fill();
  }
  const mist = ctx.createLinearGradient(0, 35, 0, 151);
  mist.addColorStop(0, '#f8f3df00');
  mist.addColorStop(1, '#e5ecdf');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 35, WIDTH, 115);
  ctx.fillStyle = '#79988d18';
  ctx.fillRect(0, 109, WIDTH, 9);
  ctx.fillStyle = '#fff6dc91';
  ctx.fillRect(0, 108, WIDTH, 2);
  ellipse(ctx, 360, 288, 358, 156, '#819e8c26');
  ellipse(ctx, 360, 273, 354, 155, '#c2cdb8');
  ellipse(ctx, 360, 265, 349, 151, '#edead6');
  ctx.strokeStyle = '#ad9f704b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 360, 263, 327, 134, '#e4e5cf');
  ctx.strokeStyle = '#fff8e4';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let index = 0; index < 14; index++) {
    const angle = index / 14 * TAU;
    line(ctx, [
      {x: 360 + Math.cos(angle) * 293, y: 263 + Math.sin(angle) * 119},
      {x: 360 + Math.cos(angle) * 325, y: 263 + Math.sin(angle) * 133},
    ], '#a8a57b48');
  }
  ellipse(ctx, 360, 263, 245, 99);
  ctx.strokeStyle = '#afa4774a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ellipse(ctx, 360, 263, 108, 44, '#b7cabb24');
  ctx.strokeStyle = '#88a99853';
  ctx.stroke();
  ellipse(ctx, 360, 263, 94, 38);
  ctx.strokeStyle = '#a6ae8366';
  ctx.stroke();
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * TAU;
    line(ctx, [
      {x: 360 + Math.cos(angle) * 18, y: 263 + Math.sin(angle) * 8},
      {x: 360 + Math.cos(angle + .25) * 77, y: 263 + Math.sin(angle + .25) * 31},
      {x: 360 + Math.cos(angle + .5) * 18, y: 263 + Math.sin(angle + .5) * 8},
    ], '#8eaa9559', 1.2);
  }
  // Small lanterns and drifting flecks, kept away from the tap targets.
  for (const x of [27, 693]) {
    ellipse(ctx, x, 243, 14, 5, '#637c6820');
    ctx.fillStyle = '#b8ac7c';
    ctx.fillRect(x - 6, 214, 12, 28);
    ctx.fillStyle = '#fff7c0';
    ctx.fillRect(x - 5, 212, 10, 7);
    glow(ctx, x, 212, 24, '#fff4b475');
  }
  for (let index = 0; index < 13; index++) {
    const x = 25 + (index * 97) % 665;
    const y = 60 + (index * 47) % 310 + Math.sin(time * .6 + index) * 8;
    ellipse(ctx, x, y, 1.2, 1.2, '#fff9d9b0');
  }
  const vignette = ctx.createRadialGradient(360, 215, 180, 360, 215, 445);
  vignette.addColorStop(0, '#47746100');
  vignette.addColorStop(1, '#47746128');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}
function drawCast(ctx: CanvasRenderingContext2D, cast: Cast, age: number, reduced: boolean) {
  if (age > 950 || cast.event.scope === 'all' || cast.event.scope === 'random') return;
  const {from, to, type} = cast;
  const palette = palettes[type];
  const strength = Math.sin(clamp(age / 950) * Math.PI);
  ctx.save();
  ctx.globalAlpha = strength * .8;
  ellipse(ctx, from.x, from.y + 31, 43 + strength * 10, 13);
  ctx.strokeStyle = palette.core;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (type === 'guard') {
    shield(ctx, from.x, from.y, 41, .8);
  } else if (type !== 'slash' && age < 800) {
    glow(ctx, from.x, from.y + 3, 48, `${palette.core}68`);
    if (!reduced && age >= 430) {
      const progress = clamp((age - 430) / (CAST_IMPACT_MS - 430)) ** 2;
      const x = mix(from.x, to.x, progress);
      const y = mix(from.y, to.y, progress) - Math.sin(progress * Math.PI) * 35;
      for (let index = 5; index >= 0; index--) {
        const tail = Math.max(0, progress - index * .055);
        const tx = mix(from.x, to.x, tail);
        const ty = mix(from.y, to.y, tail) - Math.sin(tail * Math.PI) * 35;
        ctx.globalAlpha = strength * (1 - index / 7) * .7;
        ellipse(ctx, tx, ty, 9 - index, type === 'wind' ? 3 : 9 - index, palette.core);
      }
      ctx.globalAlpha = strength;
      glow(ctx, x, y, 24, `${palette.core}aa`);
      ellipse(ctx, x, y, 7, type === 'wind' ? 3 : 7, palette.light);
    }
  }
  ctx.restore();
}

/** Three/four discrete acorns follow the replay's exact hit order, never an area. */
function drawSeedBarrage(ctx: CanvasRenderingContext2D, cast: Cast, targets: Point[], age: number, reduced: boolean) {
  const hits = Math.max(1, cast.event.hitTargets?.length ?? cast.event.hits ?? 3);
  const end = CAST_IMPACT_MS + (hits - 1) * MULTIHIT_INTERVAL_MS;
  if (age > end + 160) return;
  ctx.save();
  if (reduced) {
    // No projectiles in reduced motion; the actual impact keeps its seed accent.
    ctx.globalAlpha = .5 * (1 - clamp((age - end) / 160));
    for (let index = 0; index < hits; index++) ellipse(ctx, cast.from.x - 12 + index * 8, cast.from.y + 27, 2.5, 3.5, palettes.seed.core);
  } else {
    for (let index = 0; index < hits; index++) {
      const progress = (age - (CAST_IMPACT_MS - 170 + index * MULTIHIT_INTERVAL_MS)) / 170;
      if (progress < 0 || progress > 1 || (cast.lastHitIndex ?? -1) >= index) continue;
      const target = targets[index] ?? cast.to;
      const from = {x: cast.from.x - 6, y: cast.from.y - 9};
      const arc = Math.sin(progress * Math.PI) * 20;
      const x = mix(from.x, target.x, progress);
      const y = mix(from.y, target.y, progress) - arc;
      for (let trail = 3; trail > 0; trail--) {
        const p = Math.max(0, progress - trail * .045);
        ctx.globalAlpha = .55 - trail * .12;
        ellipse(ctx, mix(from.x, target.x, p), mix(from.y, target.y, p) - Math.sin(p * Math.PI) * 20, 2, 2, '#b9d59a');
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(progress * 3 + index);
      ellipse(ctx, 0, 1, 4.5, 6, '#bb8247');
      ctx.strokeStyle = '#755332'; ctx.lineWidth = 1.2; ctx.stroke();
      ellipse(ctx, 0, -3, 5.3, 2.5, '#73925c');
      line(ctx, [{x: 0, y: -5}, {x: 1, y: -8}], '#665138', 1.5);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** The grounded preparation only rises after the authoritative all-target cue. */
function drawGenbuField(ctx: CanvasRenderingContext2D, cast: Cast, age: number, reduced: boolean, scaleY: number) {
  const sinceImpact = Math.max(0, age - CAST_IMPACT_MS);
  if (cast.impacted && sinceImpact >= 600) return;
  const y = cast.incoming ? 475 : 231;
  const sy = cast.incoming ? Math.max(.65, scaleY) : scaleY;
  const charge = clamp(age / CAST_IMPACT_MS);
  const fade = cast.impacted ? 1 - clamp(sinceImpact / 600) : 1;
  const rise = cast.impacted && !reduced ? ease(sinceImpact / 140) * 68 : 0;
  const ring = (x: number, py: number, rx: number, ry: number, color: string, width: number) => {
    ellipse(ctx, x, py, rx, ry); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  ctx.save();
  ctx.translate(0, y); ctx.scale(1, sy); ctx.translate(0, -y);
  ctx.globalAlpha = (cast.impacted ? .78 : .2 + charge * .2) * fade;
  ring(360, y + 29, 315, 46, '#68bda9', 2);
  ring(360, y + 29 - rise, 304, 40, '#acf0d1', cast.impacted ? 5 : 1.5);
  // Stone uprights rise as one ring around the formation, never as aimed missiles.
  if (cast.impacted) {
    for (let index = 0; index < 14; index++) {
      const angle = index / 14 * TAU;
      const x = 360 + Math.cos(angle) * 307;
      const base = y + 29 + Math.sin(angle) * 43;
      const height = reduced ? 17 : rise * (.55 + (index % 3) * .14);
      ctx.beginPath();
      ctx.moveTo(x - 9, base); ctx.lineTo(x - 7, base - height + 4);
      ctx.lineTo(x + 2, base - height - 5); ctx.lineTo(x + 9, base - height + 2); ctx.lineTo(x + 12, base); ctx.closePath();
      ctx.fillStyle = index % 2 ? '#71988d' : '#426f6a'; ctx.fill();
      line(ctx, [{x: x - 3, y: base - height + 5}, {x: x + 2, y: base - height + 12}, {x: x - 1, y: base - 3}], '#a0e5c5', 1.5);
      if (!reduced) {
        ring(x, base - rise * .66, 10, 3, '#d7f8e5', 1.8);
        line(ctx, [{x: x - 13, y: base - 4}, {x: x - 10, y: base - rise * .7}], '#76d1c2', 2);
      }
    }
    ring(360, y + 23 - rise * .6, 322, 47, '#62c6ba', 3);
  }
  for (const point of cast.targets) {
    const py = y + (point.y - y) / sy;
    ring(point.x, py + 28, 33, 9, '#c0f0d6', cast.impacted ? 3 : 1.4);
  }
  ctx.restore();
}
function drawImpact(ctx: CanvasRenderingContext2D, impact: Impact, age: number, reduced: boolean, scaleY: number) {
  const {event, type, at} = impact;
  const palette = palettes[type];
  const duration = event.kind === 'defeat' ? 650 : NUMBER_DURATION_MS;
  const progress = clamp(age / duration);
  const fade = 1 - ease(clamp((progress - .45) / .55));
  const burst = reduced ? .6 : Math.sin(clamp(age / 430) * Math.PI);
  const movement = reduced ? 0 : 1;
  const x = at.x;
  const y = at.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, scaleY);
  ctx.translate(-x, -y);
  ctx.globalAlpha = fade;
  if (event.kind === 'defeat') {
    for (let index = 0; index < 8; index++) {
      const angle = index / 8 * TAU;
      const distance = 18 + progress * 42 * movement;
      ellipse(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * .6 - progress * 20 * movement, 2, 2, '#fff7d2');
    }
  } else if (event.kind === 'guard') {
    shield(ctx, x, y, 38 + ease(progress) * 10 * movement, .9);
  } else if (event.kind === 'break') {
    // This is the actual post-hit strip event, never a decorative promise at cast.
    const distance = 22 + ease(progress) * 28 * movement;
    for (let index = 0; index < 6; index++) {
      const angle = index / 6 * TAU;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 9); ctx.lineTo(px + 10, py - 3); ctx.lineTo(px + 3, py + 10); ctx.closePath();
      ctx.fillStyle = index % 2 ? '#e8c983bb' : '#81e3cfaa'; ctx.fill();
      ctx.strokeStyle = '#fff7db'; ctx.lineWidth = 1; ctx.stroke();
    }
    line(ctx, [{x:x-17,y:y-31},{x:x+2,y:y-9},{x:x-8,y:y+8},{x:x+19,y:y+30}], '#b6ffec', 3);
    ctx.globalAlpha = fade; ctx.fillStyle = '#566f62'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${event.removed ? event.removed.map(value => value === 'rally' ? '群気' : value === 'ward' ? '自然障壁' : '守り').join('・') : '守り'}解除`, x, y + 48);
  } else if (event.kind === 'heal') {
    glow(ctx, x, y + 12, 57, '#84d9aa5c');
    for (let index = 0; index < 3; index++) {
      ellipse(ctx, x, y + 30 - index * 15 - progress * 20 * movement, 39 - index * 8, 10);
      ctx.strokeStyle = index % 2 ? '#f4ffe8' : '#66b89d';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (let index = 0; index < 5; index++) {
      const px = x + Math.sin(index * 2.4) * 30;
      const py = y + 20 - index * 9 - progress * 35 * movement;
      line(ctx, [{x: px - 3, y: py}, {x: px + 3, y: py}], '#f3fff1', 2);
      line(ctx, [{x: px, y: py - 3}, {x: px, y: py + 3}], '#f3fff1', 2);
    }
  } else if (event.kind === 'poison' || type === 'poison') {
    glow(ctx, x, y + 15, 43, '#a6b97945');
    for (let index = 0; index < 7; index++) {
      const px = x + Math.sin(index * 2.4) * (20 + progress * 15 * movement);
      const py = y + 27 - progress * (25 + index * 5) * movement;
      ellipse(ctx, px, py, 3 + index % 3, 3 + index % 3, '#91a2639c');
      ctx.strokeStyle = '#dce9b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = burst * .85 * fade;
    glow(ctx, x, y, 55 + burst * 15, `${palette.core}6b`);
    if (type === 'seed') {
      // A light seed burst, deliberately smaller than a sword strike or spell.
      for (let index = 0; index < 5; index++) {
        const angle = index / 5 * TAU;
        const distance = 8 + progress * 23 * movement;
        ellipse(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * .7, 2.5, 4, index % 2 ? '#b88a50' : '#a0b878');
      }
      ellipse(ctx, x, y, 13 + progress * 17 * movement, 10 + progress * 8 * movement);
      ctx.strokeStyle = '#e8dfaa'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (type === 'slash') {
      for (let index = 0; index < 2; index++) {
        ctx.save();
        ctx.translate(x + index * 10, y - index * 4);
        ctx.rotate(-.65);
        ctx.beginPath();
        ctx.moveTo(-46, 7 + index * 8);
        ctx.quadraticCurveTo(0, -16, 49, -5);
        ctx.quadraticCurveTo(-1, -2, -46, 7 + index * 8);
        ctx.fillStyle = index ? palette.core : palette.light;
        ctx.fill();
        ctx.restore();
      }
    } else if (type === 'fire') {
      for (let index = 0; index < 9; index++) {
        const angle = index * 2.4;
        const radius = 12 + ease(progress * 2) * 33 * movement;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius * .6 - progress * 23 * movement;
        ctx.beginPath();
        ctx.moveTo(px - 6, py + 8);
        ctx.quadraticCurveTo(px - 10, py - 4, px + 3, py - 18 - index % 3 * 4);
        ctx.quadraticCurveTo(px + 11, py + 8, px - 6, py + 8);
        ctx.fillStyle = index % 2 ? palette.core : palette.light;
        ctx.fill();
      }
    } else if (type === 'wind') {
      for (let index = 0; index < 3; index++) {
        ctx.beginPath();
        ctx.ellipse(x, y - 12 + index * 17, 40 + index * 4 + burst * 8, 10, -.3, .3 + progress * movement * 3, Math.PI * 1.8 + progress * movement * 3);
        ctx.strokeStyle = index === 1 ? palette.light : palette.core;
        ctx.lineWidth = index === 1 ? 5 : 3;
        ctx.stroke();
      }
    } else if (type === 'water') {
      ellipse(ctx, x, y + 26, 28 + progress * 45 * movement, 9 + progress * 12 * movement);
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let index = 0; index < 8; index++) {
        const angle = index / 8 * TAU;
        const distance = 14 + progress * 44 * movement;
        ellipse(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * .5 - burst * 25, 3, 6, index % 2 ? palette.core : palette.light);
      }
    } else if (type === 'shadow') {
      for (let index = 0; index < 3; index++) {
        ctx.beginPath();
        ctx.ellipse(x, y, 24 + index * 12, 8 + index * 6, index * 1.1 + progress * movement, .2, Math.PI * 1.8);
        ctx.strokeStyle = index === 1 ? palette.light : palette.core;
        ctx.lineWidth = 4 - index;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x + 7, y - 5);
      ctx.lineTo(x + 27, y);
      ctx.lineTo(x + 7, y + 5);
      ctx.lineTo(x, y + 30);
      ctx.lineTo(x - 7, y + 5);
      ctx.lineTo(x - 27, y);
      ctx.lineTo(x - 7, y - 5);
      ctx.closePath();
      ctx.fillStyle = palette.dark;
      ctx.fill();
    }
    for (let index = 0; index < (reduced ? 4 : 10); index++) {
      const angle = index * 2.4;
      const radius = 20 + progress * 50 * movement;
      ellipse(ctx, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * .7, 1.8, 1.8, palette.light);
    }
  }
  // Numbers belong to the actual impact, never to a cast or an unrelated heal.
  if (event.amount !== undefined && (event.kind === 'damage' || event.kind === 'heal')) {
    const number = sampleNumberMotion(age, reduced);
    ctx.globalAlpha = number.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${31 * number.scale}px system-ui, sans-serif`;
    const label = event.kind === 'heal' ? `+${event.amount}` : String(event.amount);
    const px = x + (event.hitIndex === undefined ? 0 : (event.hitIndex % 3 - 1) * 21);
    const py = y - 44 - number.rise - (event.hitIndex === undefined ? 0 : event.hitIndex % 2 * 13);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fffbed';
    ctx.strokeText(label, px, py);
    ctx.fillStyle = event.kind === 'heal' ? '#238467' : type === 'poison' ? '#777644' : '#9c5435';
    ctx.fillText(label, px, py);
  }
  ctx.restore();
}

export default function BattleStage(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const clearVersion = useRef(0);
  // A cleared React commit must not be lost between two animation frames.
  useEffect(() => {if (!props.effect && !props.impact) ++clearVersion.current;}, [props.effect, props.impact]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const characterImages = new Map<number, HTMLImageElement>();
    for (const [id, source] of [[12, FENRIR_ART_URL], [13, RATATOSKR_ART_URL], [14, GENBU_ART_URL]] as const) {
      const image = new Image(); image.src = source; characterImages.set(id, image);
    }
    let handle = 0;
    let previous = performance.now();
    let lastImpact: BattleEvent | null = null;
    let lastCast: BattleEvent | null = null;
    let observedClear = clearVersion.current;
    let lastImpacts: BattleEvent[] | undefined;
    const seenImpacts = new WeakSet<BattleEvent>();
    let cast: Cast | null = null;
    let impacts: Impact[] = [];
    const health = new Map<string, Health>();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    const onMotionChange = () => {reduced = media.matches;};
    media.addEventListener('change', onMotionChange);
    let ratio = Math.min(window.devicePixelRatio || 1, 2);
    let scaleY = 1;
    const updateAspect = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width && bounds.height) scaleY = (bounds.width / WIDTH) / (bounds.height / HEIGHT);
    };
    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(WIDTH * ratio);
      element.height = Math.round(HEIGHT * ratio);
      updateAspect();
    };
    resize();
    const observer = new ResizeObserver(updateAspect);
    observer.observe(element);
    window.addEventListener('resize', resize);
    const draw = (now: number) => {
      const data = latest.current;
      const dt = Math.min(50, now - previous);
      previous = now;
      // The rAF clock lives for the entire mounted battle. New HP arrays do not restart it.
      const rate = Math.max(.5, Math.min(4, data.playbackRate ?? 1));
      if (observedClear !== clearVersion.current) {
        observedClear = clearVersion.current;
        cast = null; lastCast = null; lastImpact = null; lastImpacts = undefined; impacts = []; health.clear();
      }
      if (data.castEvent === null) {cast = null; lastCast = null;}
      const activeCast = data.castEvent ?? (data.impact?.kind === 'cast' ? data.impact : null);
      if (activeCast && activeCast !== lastCast) {
        lastCast = activeCast;
        impacts = [];
        const event = activeCast;
        // Party members act from below the frame; no ally occupies the arena.
        const from = locate(event.actor, data) ?? {x: WIDTH / 2, y: HEIGHT + 70};
        const fallback = ['guard', 'protect', 'heal', 'cleanse'].includes(event.effect ?? '') ? from : {x: WIDTH / 2, y: HEIGHT + 70};
        const targets = (event.targets ?? (event.target ? [event.target] : [])).flatMap(key => {const at = locate(key, data); return at ? [at] : [];});
        const incoming = (event.targets ?? []).some(key => data.allies.some(unit => unit.key === key));
        cast = {targets, incoming, impacted: false, event, type: visual(data.effect, event), name: event.skill ?? data.effect?.text ?? '攻撃', started: now, rate, from, to: locate(event.target, data) ?? fallback};
      }
      if (data.impact !== lastImpact || data.impacts !== lastImpacts) {
        lastImpact = data.impact;
        lastImpacts = data.impacts;
        if (data.impact?.kind !== 'cast') for (const event of data.impacts?.length ? data.impacts : data.impact ? [data.impact] : []) {
          if (cast && !cast.impacted && event.actor === cast.event.actor && ['damage', 'heal', 'guard', 'poison', 'cleanse', 'break'].includes(event.kind)) {cast.impacted = true; cast.impactedAt = now;}
          if (cast && event.actor === cast.event.actor && event.hitIndex !== undefined && (cast.lastHitIndex === undefined || event.hitIndex > cast.lastHitIndex)) {cast.lastHitIndex = event.hitIndex; cast.lastHitAt = now;}
          if (seenImpacts.has(event)) continue;
          seenImpacts.add(event);
          const at = locate(event.target, data);
          if (at) {
            const sameCast = cast && event.actor && cast.event.actor === event.actor;
            const type = event.kind === 'heal' || event.kind === 'guard' || event.kind === 'poison' || event.effect === 'poison'
              ? visual(data.effect, event) : sameCast ? cast!.type : 'slash';
            impacts.push({event, type, started: now, rate, at});
          }
        }
      }
      if (!data.effect && !data.impact) {cast = null; lastCast = null; impacts = [];}
      impacts = impacts.filter(impact => (now - impact.started) * impact.rate < 1000);
      const elapsed = cast ? (now - cast.started) * cast.rate : 2000;
      let age = cast ? actionAge(elapsed, cast.impactedAt === undefined ? undefined : (now - cast.impactedAt) * cast.rate) : 2000;
      const barrage = cast?.event.scope === 'random';
      const seedBarrage = barrage && cast?.event.skill === '木の実の連弾';
      const genbuField = cast?.event.scope === 'all' && cast.event.skill === '海山の轟き';
      const hitCount = cast?.event.hitTargets?.length ?? cast?.event.hits ?? 5;
      if (barrage && cast?.lastHitIndex !== undefined) {
        age = cast.lastHitIndex >= hitCount - 1 && cast.lastHitAt !== undefined
          ? CAST_IMPACT_MS + (hitCount - 1) * MULTIHIT_INTERVAL_MS + (now - cast.lastHitAt) * cast.rate
          : Math.min(age, CAST_IMPACT_MS + (cast.lastHitIndex + 1) * MULTIHIT_INTERVAL_MS - 1);
      }
      const motion = seedBarrage ? sampleRatatoskrMotion(age, hitCount, reduced)
        : barrage ? sampleFenrirMotion(age, hitCount, reduced)
        : genbuField ? sampleGenbuMotion(age, reduced)
        : sampleActionMotion(cast ? motionKind(cast.event) : 'support', age, reduced);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      arena(ctx, reduced ? 0 : now / 1000);
      const latestHit = [...impacts].reverse().find(impact => impact.event.kind === 'damage' && (impact.event.amount ?? 0) > 0 && (now - impact.started) * impact.rate < 190);
      const shake = latestHit ? sampleHitMotion((now - latestHit.started) * latestHit.rate, reduced, latestHit.type !== 'poison').shake : 0;
      const zoom = 1 + motion.camera;
      const center = cast ? {x: mix(360, (cast.from.x + cast.to.x) / 2, .16), y: 246} : {x: 360, y: 246};
      // Frame enemy effects with the same camera, leaving the offscreen party origin below it.
      const frameEffectPoint = (point: Point): Point => point.y < HEIGHT ? {
        x: center.x + (point.x - center.x) * zoom + shake,
        y: center.y + (point.y - center.y) * zoom + shake * .4,
      } : point;
      const drawEnemies = () => data.enemies.forEach((unit, index) => {
        const point = position(index, data.enemies.length);
        const alive = unit.hp > 0;
        const hit = [...impacts].reverse().find(impact => impact.event.target === unit.key && impact.event.kind === 'damage' && (now - impact.started) * impact.rate < 260);
        const death = impacts.find(impact => impact.event.target === unit.key && impact.event.kind === 'defeat');
        const deathProgress = death ? clamp((now - death.started) * death.rate / 550) : 1;
        const attacker = cast?.event.actor === unit.key && motion.phase !== 'rest';
        const type = cast?.type ?? 'slash';
        let x = point.x;
        let y = point.y + (!reduced && alive && unit.monster.id !== 14 && (!attacker || motion.phase !== 'impact') ? Math.sin(now / 760 + index * 1.2) * 2.2 : 0);
        let tilt = 0;
        if (attacker && cast) {
          const distance = Math.hypot(cast.to.x - point.x, cast.to.y - point.y) || 1;
          x += (cast.to.x - point.x) / distance * motion.travel;
          y += (cast.to.y - point.y) / distance * motion.travel - motion.lift;
          tilt = motion.tilt;
        }
        const reaction = sampleHitMotion(hit ? (now - hit.started) * hit.rate : 300, reduced, hit?.type !== 'poison');
        if (hit) {y -= reaction.recoil; x += reaction.recoil * .25;}
        if (!alive && !reduced) y += deathProgress * 13;
        ctx.save();
        ctx.globalAlpha = alive ? 1 : mix(.85, .24, deathProgress);
        ellipse(ctx, point.x, point.y + 33 * scaleY, alive ? 31 : 24, 8 * scaleY, '#526f612d');
        const eligible = alive && data.targetKeys?.includes(unit.key);
        const selected = eligible && data.selectedTarget === unit.key;
        if (eligible) {
          const ringWidth = selected ? 41 : 37;
          const ringHeight = selected ? 13 : 11;
          ellipse(ctx, point.x, point.y + 32 * scaleY, ringWidth, ringHeight * scaleY, selected ? '#bca85a38' : '#fdf9e746');
          ctx.strokeStyle = selected ? '#a47e29' : '#789c896a';
          ctx.lineWidth = selected ? 2.5 : 1.5;
          ctx.setLineDash(selected ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          if (selected) {
            const tip = point.y - 48 * scaleY + (!reduced ? Math.sin(now / 270) * 2 : 0);
            ctx.beginPath();
            ctx.moveTo(point.x - 6, tip - 7);
            ctx.lineTo(point.x + 6, tip - 7);
            ctx.lineTo(point.x, tip);
            ctx.closePath();
            ctx.fillStyle = '#a67e2c';
            ctx.fill();
          }
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, scaleY);
        ctx.translate(-x, -y);
        if (unit.guard && alive) shield(ctx, x, y, 35, .38);
        if ((unit.ward ?? 0) > 0 && alive) shield(ctx, x, y, unit.guard ? 42 : 38, .34, true);
        if (attacker) {
          glow(ctx, x, y, 40, `${palettes[type].core}59`);
          ellipse(ctx, point.x, point.y + 33, 36, 11);
          ctx.strokeStyle = palettes[type].dark; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.scale((attacker ? motion.scaleX : 1) / reaction.squash, (attacker ? motion.scaleY : 1) * reaction.squash);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `57px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
        ctx.shadowColor = '#58716624';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;
        // Color emoji inherit the current fill alpha in Chromium; reset the translucent arena brush.
        ctx.fillStyle = '#ffffff';
        const characterImage = characterImages.get(unit.monster.id);
        if (characterImage?.complete && characterImage.naturalWidth > 0) {
          // Small squirrel / broad tortoise stay distinct beside the unchanged wolf.
          const width = unit.monster.id === 13 ? 99 : unit.monster.id === 14 ? 121 : 110;
          const height = width * .75;
          ctx.drawImage(characterImage, -width / 2, 35.5 - height, width, height);
        } else ctx.fillText(unit.monster.icon, 0, 0);
        ctx.restore();
        ctx.restore();
        let hp = health.get(unit.key);
        if (!hp) {hp = {value: unit.hp, trail: unit.hp, target: unit.hp, changed: now}; health.set(unit.key, hp);}
        if (hp.target !== unit.hp) {hp.target = unit.hp; hp.changed = now;}
        hp.value = reduced ? hp.target : mix(hp.value, hp.target, 1 - Math.exp(-dt * rate / 95));
        if ((now - hp.changed) * rate > 160 || hp.trail < hp.target || reduced) hp.trail = mix(hp.trail, hp.target, reduced ? 1 : 1 - Math.exp(-dt * rate / 150));
        const barY = point.y + 46 * scaleY;
        ctx.fillStyle = '#6574682b';
        ctx.beginPath();
        ctx.roundRect(point.x - 33, barY, 66, 6, 3);
        ctx.fill();
        const fillBar = (value: number, color: string) => {
          const width = 64 * clamp(value / unit.monster.hp);
          if (width < .3) return;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(point.x - 32, barY + 1, width, 4, 2);
          ctx.fill();
        };
        fillBar(hp.trail, '#e6c481');
        fillBar(hp.value, '#c97765');
        if (unit.poison > 0 && alive) {
          ellipse(ctx, point.x + 39, barY + 3, 5, 5, '#81894f');
          ctx.fillStyle = '#fff9dd';
          ctx.font = 'bold 8px system-ui';
          ctx.fillText('•', point.x + 39, barY + 2);
        }
        if (unit.guard && alive) {
          shield(ctx, point.x - 41, barY + 3, 5, 1);
        }
        if ((unit.ward ?? 0) > 0 && alive) shield(ctx, point.x - (unit.guard ? 54 : 41), barY + 3, 5, 1, true);
        ctx.restore();
      });
      ctx.save();
      ctx.translate(center.x + shake, center.y + shake * .4);
      ctx.scale(zoom, zoom);
      ctx.translate(-center.x, -center.y);
      if (cast?.event.scope === 'all') {
        if (genbuField) drawGenbuField(ctx, cast, age, reduced, scaleY);
        else drawAreaEffect(ctx, {type: cast.type, palette: palettes[cast.type], targets: cast.targets, incoming: cast.incoming, age: age, impacted: cast.impacted, reduced, scaleY});
      }
      drawEnemies();
      ctx.restore();
      if (cast && cast.event.scope !== 'all' && (locate(cast.event.actor, data) || locate(cast.event.target, data))) drawCast(ctx, {...cast, from: frameEffectPoint(cast.from), to: frameEffectPoint(cast.to)}, age, reduced);
      if (cast && seedBarrage) {
        const sequence = (cast.event.hitTargets ?? []).map(key => frameEffectPoint(locate(key, data) ?? {x: WIDTH / 2, y: HEIGHT + 70}));
        const enemyOrigin = locate(cast.event.actor, data);
        const from = enemyOrigin ? {x: cast.from.x, y: cast.from.y + motion.travel - motion.lift} : cast.from;
        drawSeedBarrage(ctx, {...cast, from: frameEffectPoint(from), to: frameEffectPoint(cast.to)}, sequence, age, reduced);
      }
      for (const impact of impacts) drawImpact(ctx, {...impact, at: frameEffectPoint(impact.at)}, (now - impact.started) * impact.rate, reduced, scaleY);
      // The title stays still while the action is framed underneath it.
      if (cast && motion.titleAlpha > 0) {
        ctx.save();
        ctx.translate(0, 38);
        ctx.scale(1, scaleY);
        ctx.translate(0, -38);
        ctx.globalAlpha = motion.titleAlpha;
        ctx.font = '700 19px system-ui, sans-serif';
        const width = Math.min(430, Math.max(210, ctx.measureText(cast.name).width + 88));
        ctx.beginPath();
        ctx.roundRect((WIDTH - width) / 2, 17, width, 42, 21);
        ctx.fillStyle = '#fffbeced';
        ctx.fill();
        ctx.strokeStyle = '#bea665a6';
        ctx.lineWidth = 1;
        ctx.stroke();
        const accentX = (WIDTH - width) / 2 + 25;
        ctx.translate(accentX, 38);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = palettes[cast.type].dark;
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-accentX, -38);
        ctx.fillStyle = '#53604f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cast.name, WIDTH / 2 + 8, 38);
        const actor = [...data.allies, ...data.enemies].find(unit => unit.key === cast!.event.actor);
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillStyle = '#53604f';
        ctx.fillText(`${actor?.key.startsWith('e') ? '敵' : '味方'} · ${actor?.monster.name ?? ''}`, WIDTH / 2, 80);
        ctx.restore();
        if (cast.event.scope === 'all' || cast.event.scope === 'random') {
          ctx.save();
          ctx.translate(0, 67); ctx.scale(1, scaleY); ctx.translate(0, -67);
          ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = palettes[cast.type].dark;
          ctx.fillText(cast.event.scope === 'random' ? `ランダム${cast.event.hits}回 · ${cast.lastHitIndex === undefined ? '構え' : `${cast.lastHitIndex + 1}/${cast.event.hits}撃`}` : `${cast.incoming ? '味方' : '敵'}全体 · ${cast.event.targets?.length ?? cast.targets.length}体`, WIDTH / 2, 67);
          ctx.restore();
        }
      }
      handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(handle);
      observer.disconnect();
      media.removeEventListener('change', onMotionChange);
      window.removeEventListener('resize', resize);
    };
  }, []);
  const selectable = props.enemies.map((unit, index) => ({unit, point: position(index, props.enemies.length)})).filter(({unit}) => unit.hp > 0 && props.targetKeys?.includes(unit.key));
  const feedback = (props.impacts ?? []).filter(event => event.amount !== undefined && (event.kind === 'damage' || event.kind === 'heal'));
  const announcement = feedback.length > 1 ? `${feedback.length}体に同時着弾。${feedback.map(event => `${[...props.allies, ...props.enemies].find(unit => unit.key === event.target)?.monster.name ?? ''} ${event.kind === 'heal' ? '回復' : 'ダメージ'} ${event.amount}`).join('、')}` : props.impact?.kind === 'cast' ? `${props.impact.skill ?? '特技'} ${props.impact.scope === 'random' ? `ランダム${props.impact.hits}回` : props.impact.scope === 'all' ? `全体 ${props.impact.targets?.length ?? 0}体へ` : '単体'} 発動`
    : props.impact?.amount !== undefined ? `${[...props.allies, ...props.enemies].find(unit => unit.key === props.impact?.target)?.monster.name ?? ''} ${props.impact.kind === 'heal' ? '回復' : 'ダメージ'} ${props.impact.amount}` : '';
  return <div className="battleStage" style={{position: 'relative', width: '100%', height: '100%', minHeight: 0}}>
    <canvas className="battleCanvas" ref={canvas} width={WIDTH} height={HEIGHT}
      role="img" aria-label="敵だけが表示される戦闘フィールド。敵の下のバーは残りHP、下部に各敵のHP・MP・状態を表示しています。味方は画面下のアイコンで確認できます。"
      style={{display: 'block', width: '100%', height: '100%'}}
      onClick={event => {
        if (!props.onSelectTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * WIDTH;
        const y = (event.clientY - bounds.top) / bounds.height * HEIGHT;
        const target = selectable.find(({point}) => Math.abs(point.x - x) < 51 && Math.abs(point.y - y) < 51);
        if (target) props.onSelectTarget(target.unit.key);
      }}/>
    {props.onSelectTarget && <div className="battleTargets" role="group" aria-label="特技の対象を選択">
      {selectable.map(({unit, point}) => <button key={unit.key} type="button" className="battleTarget" data-target={unit.key}
        aria-label={`${unit.monster.name}を対象にする HP ${unit.hp}/${unit.monster.hp} MP ${unit.mp}/${unit.monster.mp}`}
        aria-pressed={props.selectedTarget === unit.key}
        title={`${unit.monster.name} · HP ${unit.hp}/${unit.monster.hp} · MP ${unit.mp}/${unit.monster.mp}`}
        style={{position: 'absolute', left: `${point.x / WIDTH * 100}%`, top: `${point.y / HEIGHT * 100}%`, width: '13%', height: '22%', minWidth: 44, minHeight: 44, transform: 'translate(-50%, -50%)', padding: 0, background: 'transparent', border: 0, borderRadius: '50%', cursor: 'pointer', touchAction: 'manipulation'}}
        onClick={() => props.onSelectTarget?.(unit.key)}/>)}
    </div>}
    <div className="enemyVitals" aria-label="敵のHP・MP・状態">{props.enemies.map(unit => <div className={`enemyVital ${unit.hp <= 0 ? 'fallen' : ''}`} key={unit.key} aria-label={`${unit.monster.name} HP ${unit.hp}/${unit.monster.hp} MP ${unit.mp}/${unit.monster.mp} ${unit.hp <= 0 ? '戦闘不能' : effectStatus(unit) || '状態異常なし'}`}>
      <strong>{unit.monster.name}</strong><small>HP {unit.hp}/{unit.monster.hp}</small><small className="enemyMp">MP {unit.mp}/{unit.monster.mp}</small><em>{unit.hp <= 0 ? '戦闘不能' : effectStatus(unit)}</em>
    </div>)}</div>
    <span aria-live="polite" aria-atomic="true" style={{position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0}}>{announcement}</span>
  </div>;
}
