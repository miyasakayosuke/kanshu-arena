import {useEffect, useRef} from 'react';
import type {BattleEvent, Unit} from './engine';

type Effect = {text: string; type: string; tick: number} | null;
type Props = {
  allies: Unit[];
  enemies: Unit[];
  effect: Effect;
  impact: BattleEvent | null;
  impacts?: BattleEvent[];
  activeActorKey?: string;
  playbackRate?: number;
  targetKeys?: string[];
  selectedTarget?: string;
  onSelectTarget?: (key: string) => void;
};
type Point = {x: number; y: number};
type Visual = 'slash' | 'fire' | 'wind' | 'water' | 'shadow' | 'guard' | 'poison';
type Cast = {event: BattleEvent; type: Visual; name: string; started: number; rate: number; from: Point; to: Point};
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
};
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = (value: number) => 1 - (1 - clamp(value)) ** 3;
const mix = (a: number, b: number, progress: number) => a + (b - a) * progress;
function position(index: number, count: number, enemy: boolean): Point {
  const spread = Math.min(138, 552 / Math.max(1, count - 1));
  const offset = index - (count - 1) / 2;
  return {x: WIDTH / 2 + offset * spread, y: enemy ? 139 - Math.abs(offset) * 7 : 326 + Math.abs(offset) * 5};
}
function locate(key: string | undefined, props: Props): Point | undefined {
  if (!key) return undefined;
  const enemy = props.enemies.findIndex(unit => unit.key === key);
  if (enemy >= 0) return position(enemy, props.enemies.length, true);
  const ally = props.allies.findIndex(unit => unit.key === key);
  return ally >= 0 ? position(ally, props.allies.length, false) : undefined;
}
function visual(effect: Effect, event: BattleEvent): Visual {
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
function shield(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
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
  ctx.fillStyle = '#ffe5a538';
  ctx.fill();
  ctx.strokeStyle = '#c6a34f';
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, [{x: x - size * .3, y}, {x, y: y + size * .26}, {x: x + size * .35, y: y - size * .3}], '#fff9de', 3);
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
  if (age > 950) return;
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
    if (!reduced && age >= 370) {
      const progress = ease((age - 370) / 430);
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
function drawImpact(ctx: CanvasRenderingContext2D, impact: Impact, age: number, reduced: boolean, scaleY: number) {
  const {event, type, at} = impact;
  const palette = palettes[type];
  const duration = event.kind === 'defeat' ? 850 : 900;
  const progress = clamp(age / duration);
  const fade = 1 - ease(clamp((progress - .45) / .55));
  const burst = Math.sin(clamp(age / 430) * Math.PI);
  const movement = reduced ? .3 : 1;
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
      ellipse(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * .6 - progress * 20, 2, 2, '#fff7d2');
    }
  } else if (event.kind === 'guard') {
    shield(ctx, x, y, 38 + ease(progress) * 10 * movement, .9);
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
    ctx.globalAlpha = burst * .85;
    glow(ctx, x, y, 55 + burst * 15, `${palette.core}6b`);
    if (type === 'slash') {
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
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 31px system-ui, sans-serif';
    const label = event.kind === 'heal' ? `+${event.amount}` : String(event.amount);
    const py = y - 44 - ease(progress) * 26 * movement;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fffbed';
    ctx.strokeText(label, x, py);
    ctx.fillStyle = event.kind === 'heal' ? '#238467' : type === 'poison' ? '#777644' : '#9c5435';
    ctx.fillText(label, x, py);
  }
  ctx.restore();
}

export default function BattleStage(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    let handle = 0;
    let previous = performance.now();
    let lastImpact: BattleEvent | null = null;
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
      if (data.impact !== lastImpact || data.impacts !== lastImpacts) {
        const impactChanged = data.impact !== lastImpact;
        lastImpact = data.impact;
        lastImpacts = data.impacts;
        if (data.impact?.kind === 'cast') {
          if (impactChanged) {
            const event = data.impact;
            const from = locate(event.actor, data) ?? {x: 360, y: 326};
            const isAlly = data.allies.some(unit => unit.key === event.actor);
            const fallback = event.effect === 'guard' || event.effect === 'heal' ? from : {x: 360, y: isAlly ? 139 : 326};
            cast = {event, type: visual(data.effect, event), name: event.skill ?? data.effect?.text ?? '攻撃', started: now, rate, from, to: locate(event.target, data) ?? fallback};
          }
        } else for (const event of data.impacts?.length ? data.impacts : data.impact ? [data.impact] : []) {
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
      if (!data.effect && !data.impact) {cast = null; impacts = [];}
      impacts = impacts.filter(impact => (now - impact.started) * impact.rate < 1000);
      const age = cast ? (now - cast.started) * cast.rate : 2000;
      const castPower = cast && age < 1200 ? Math.sin(clamp(age / 1200) * Math.PI) : 0;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      arena(ctx, reduced ? 0 : now / 1000);
      ctx.save();
      const latestHit = [...impacts].reverse().find(impact => impact.event.kind === 'damage' && (impact.event.amount ?? 0) > 0 && (now - impact.started) * impact.rate < 190);
      const shake = !reduced && latestHit && latestHit.type !== 'poison' ? Math.sin((now - latestHit.started) * latestHit.rate * .08) * 2.5 * (1 - (now - latestHit.started) * latestHit.rate / 190) : 0;
      const zoom = reduced ? 1 : 1 + castPower * .023;
      const center = cast ? {x: mix(360, (cast.from.x + cast.to.x) / 2, .16), y: 246} : {x: 360, y: 246};
      ctx.translate(center.x + shake, center.y + shake * .4);
      ctx.scale(zoom, zoom);
      ctx.translate(-center.x, -center.y);
      const drawTeam = (units: Unit[], enemy: boolean) => units.forEach((unit, index) => {
        const point = position(index, units.length, enemy);
        const alive = unit.hp > 0;
        const hit = [...impacts].reverse().find(impact => impact.event.target === unit.key && impact.event.kind === 'damage' && (now - impact.started) * impact.rate < 260);
        const death = impacts.find(impact => impact.event.target === unit.key && impact.event.kind === 'defeat');
        const deathProgress = death ? clamp((now - death.started) * death.rate / 550) : 1;
        const attacker = cast?.event.actor === unit.key && age < 1200;
        const type = cast?.type ?? 'slash';
        let x = point.x;
        let y = point.y + (!reduced && alive ? Math.sin(now / 760 + index * 1.2) * 2.2 : 0);
        let tilt = 0;
        if (attacker && cast && !reduced) {
          if (type === 'slash' || type === 'wind' && /斬|翼|降下/.test(cast.name)) {
            const lunge = age < 800 ? ease((age - 410) / 390) : 1 - ease((age - 800) / 330);
            const distance = Math.hypot(cast.to.x - point.x, cast.to.y - point.y) || 1;
            x += (cast.to.x - point.x) / distance * 62 * lunge;
            y += (cast.to.y - point.y) / distance * 62 * lunge - Math.sin(clamp(age / 1130) * Math.PI) * 11;
            tilt = (enemy ? -.11 : .11) * lunge;
          } else {
            y -= Math.sin(clamp(age / 1150) * Math.PI) * 7;
          }
        }
        if (hit && !reduced) x += Math.sin((now - hit.started) * hit.rate * .075) * 5 * (1 - (now - hit.started) * hit.rate / 260);
        if (!alive && !reduced) y += deathProgress * 13;
        ctx.save();
        ctx.globalAlpha = alive ? 1 : mix(.85, .24, deathProgress);
        ellipse(ctx, point.x, point.y + 33 * scaleY, alive ? 31 : 24, 8 * scaleY, '#526f612d');
        if (alive && data.activeActorKey === unit.key && !data.effect) {
          ellipse(ctx, point.x, point.y + 32 * scaleY, 39, 12 * scaleY, '#498e7820');
          ctx.strokeStyle = '#418b74';
          ctx.lineWidth = 2;
          ctx.stroke();
          glow(ctx, point.x, point.y + 15, 40, '#f9ffe636');
        }
        const eligible = alive && data.targetKeys?.includes(unit.key);
        const selected = eligible && data.selectedTarget === unit.key;
        if (eligible) {
          ellipse(ctx, point.x, point.y + 32 * scaleY, selected ? 41 : 37, (selected ? 13 : 11) * scaleY, selected ? '#bca85a38' : '#fdf9e746');
          ctx.strokeStyle = selected ? '#a47e29' : '#789c896a';
          ctx.lineWidth = selected ? 2.5 : 1.5;
          ctx.setLineDash(selected ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          if (selected) {
            const tip = point.y - 48 * scaleY + (reduced ? 0 : Math.sin(now / 270) * 2);
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
        if (attacker) glow(ctx, x, y, 40, `${palettes[type].core}59`);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '57px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif';
        ctx.shadowColor = '#58716624';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;
        // Color emoji inherit the current fill alpha in Chromium; reset the translucent arena brush.
        ctx.fillStyle = '#ffffff';
        ctx.fillText(unit.monster.icon, 0, 0);
        ctx.restore();
        ctx.restore();
        let hp = health.get(unit.key);
        if (!hp) {hp = {value: unit.hp, trail: unit.hp, target: unit.hp, changed: now}; health.set(unit.key, hp);}
        if (hp.target !== unit.hp) {hp.target = unit.hp; hp.changed = now;}
        hp.value = reduced ? hp.target : mix(hp.value, hp.target, 1 - Math.exp(-dt / 95));
        if (now - hp.changed > 240 || hp.trail < hp.target || reduced) hp.trail = mix(hp.trail, hp.target, reduced ? 1 : 1 - Math.exp(-dt / 180));
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
        fillBar(hp.value, enemy ? '#c97765' : '#479d85');
        if (unit.poison > 0 && alive) {
          ellipse(ctx, point.x + 39, barY + 3, 5, 5, '#81894f');
          ctx.fillStyle = '#fff9dd';
          ctx.font = 'bold 8px system-ui';
          ctx.fillText('•', point.x + 39, barY + 2);
        }
        if (unit.guard && alive) {
          shield(ctx, point.x - 41, barY + 3, 5, 1);
        }
        ctx.restore();
      });
      drawTeam(data.enemies, true);
      drawTeam(data.allies, false);
      if (cast) drawCast(ctx, cast, age, reduced);
      for (const impact of impacts) drawImpact(ctx, impact, (now - impact.started) * impact.rate, reduced, scaleY);
      ctx.restore();
      // The title stays still while the action is framed underneath it.
      if (cast && age < 1400) {
        ctx.save();
        ctx.translate(0, 38);
        ctx.scale(1, scaleY);
        ctx.translate(0, -38);
        ctx.globalAlpha = Math.min(1, age / 90, (1400 - age) / 220);
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
        ctx.restore();
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
  const selectable = [
    ...props.enemies.map((unit, index) => ({unit, point: position(index, props.enemies.length, true)})),
    ...props.allies.map((unit, index) => ({unit, point: position(index, props.allies.length, false)})),
  ].filter(({unit}) => unit.hp > 0 && props.targetKeys?.includes(unit.key));
  const announcement = props.impact?.kind === 'cast' ? `${props.impact.skill ?? '特技'} 発動`
    : props.impact?.amount !== undefined ? `${[...props.allies, ...props.enemies].find(unit => unit.key === props.impact?.target)?.monster.name ?? ''} ${props.impact.kind === 'heal' ? '回復' : 'ダメージ'} ${props.impact.amount}` : '';
  return <div className="battleStage" style={{position: 'relative', width: '100%', height: '100%', minHeight: 0}}>
    <canvas className="battleCanvas" ref={canvas} width={WIDTH} height={HEIGHT}
      role="img" aria-label="敵が上、味方が下の戦闘フィールド。モンスターの下のバーは残りHPです。"
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
        aria-label={`${unit.monster.name}を対象にする HP ${unit.hp}/${unit.monster.hp}`}
        aria-pressed={props.selectedTarget === unit.key}
        title={`${unit.monster.name} · HP ${unit.hp}/${unit.monster.hp}`}
        style={{position: 'absolute', left: `${point.x / WIDTH * 100}%`, top: `${point.y / HEIGHT * 100}%`, width: '13%', height: '22%', minWidth: 44, minHeight: 44, transform: 'translate(-50%, -50%)', padding: 0, background: 'transparent', border: 0, borderRadius: '50%', cursor: 'pointer', touchAction: 'manipulation'}}
        onClick={() => props.onSelectTarget?.(unit.key)}/>)}
    </div>}
    <span aria-live="polite" aria-atomic="true" style={{position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0}}>{announcement}</span>
  </div>;
}
