import { CAST_IMPACT_MS } from './playback';

export type EffectPoint = {x: number; y: number};
export type AreaEffect = {
  type: string;
  palette: {light: string; core: string; dark: string};
  targets: EffectPoint[];
  /** Incoming attacks terminate below the arena, at the allied icon row. */
  incoming: boolean;
  age: number;
  impacted: boolean;
  reduced: boolean;
  scaleY: number;
};
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Whole-formation choreography. Deliberately contains no single-target projectile. */
export function drawAreaEffect(ctx: CanvasRenderingContext2D, effect: AreaEffect) {
  const {palette, targets, incoming, type, impacted, reduced, scaleY} = effect;
  if ((!incoming && !targets.length) || (impacted && effect.age >= 1400)) return;
  // Never run the damaging surge ahead of the authoritative impact cue, even if
  // a background tab delays timers. Before that cue this is only a wind-up.
  const age = impacted ? effect.age : Math.min(effect.age, CAST_IMPACT_MS - 1);
  const charge = clamp(age / CAST_IMPACT_MS);
  const release = impacted ? clamp((age - CAST_IMPACT_MS) / 500) : 0;
  const opacity = impacted ? 1 - release : .2 + charge * .42;
  const y = incoming ? 475 : 231;
  const sy = incoming ? Math.max(.65, scaleY) : scaleY;
  const left = 28;
  const right = 692;
  const ring = (x: number, py: number, rx: number, ry: number, color: string, width: number) => {
    ctx.beginPath();
    ctx.ellipse(x, py, rx, ry, 0, 0, TAU);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, sy);
  ctx.translate(0, -y);
  ctx.globalAlpha = opacity;
  // A single shared field connects every target instead of indicating one victim.
  const field = ctx.createLinearGradient(0, y - 75, 0, y + 67);
  field.addColorStop(0, `${palette.core}00`);
  field.addColorStop(.5, `${palette.core}${impacted ? '9c' : '36'}`);
  field.addColorStop(1, `${palette.dark}00`);
  ctx.fillStyle = field;
  ctx.fillRect(left, y - 75, right - left, 142);
  ring(360, y + 25, 323, 43 + charge * 8, palette.core, impacted ? 3 : 1.7);
  ring(360, y + 25, 306, 34 + charge * 8, palette.light, 1.3);
  // Reduced motion keeps the same full-field coverage and per-target markers,
  // with no travelling ribbons, flying embers, camera shake or pulsing light.
  if (!reduced) {
    const surge = impacted ? 1 - release * .5 : charge * .65;
    if (type === 'fire') {
      for (let i = 0; i < 17; i++) {
        const x = left + i * (right - left) / 16;
        const height = (35 + (i % 4) * 10) * surge;
        const sway = Math.sin(age / 140 + i * 1.7) * 7;
        ctx.beginPath();
        ctx.moveTo(x - 19, y + 34);
        ctx.quadraticCurveTo(x - 24, y + 9 - height * .35, x + sway, y + 29 - height * 1.8);
        ctx.quadraticCurveTo(x + 2, y + 12 - height * .3, x + 18, y + 34);
        ctx.closePath();
        ctx.fillStyle = i % 3 === 0 ? palette.light : palette.core;
        ctx.fill();
        ring(x + sway, y - height - 8, 1.8, 3.4, palette.light, 1.3);
      }
    } else if (type === 'wind' || type === 'slash') {
      for (let lane = 0; lane < 5; lane++) {
        ctx.beginPath();
        for (let i = 0; i <= 28; i++) {
          const x = left + i / 28 * (right - left);
          const py = y - 42 + lane * 20 + Math.sin(i / 3 + age / 170 + lane) * (9 + surge * 8);
          i ? ctx.lineTo(x, py) : ctx.moveTo(x, py);
        }
        ctx.strokeStyle = lane % 2 ? palette.light : palette.core;
        ctx.lineWidth = lane % 2 ? 4 : 2.5 + surge * 3;
        ctx.stroke();
      }
    } else if (type === 'water') {
      for (let lane = 0; lane < 3; lane++) {
        const base = y + 36 - lane * 26;
        ctx.beginPath();
        ctx.moveTo(left, base + 22);
        for (let i = 0; i <= 36; i++) {
          const x = left + i / 36 * (right - left);
          const py = base + Math.sin(i / 2.5 - age / 185 + lane) * (9 + surge * 12);
          ctx.lineTo(x, py);
        }
        ctx.lineTo(right, base + 24);
        ctx.closePath();
        ctx.fillStyle = `${lane % 2 ? palette.light : palette.core}88`;
        ctx.fill();
        ctx.strokeStyle = lane % 2 ? palette.core : palette.light;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else if (type === 'poison') {
      for (let i = 0; i < 21; i++) {
        const x = left + i * (right - left) / 20;
        const drift = Math.sin(age / 240 + i * 2.4);
        const py = y + 17 + drift * 18 - surge * (i % 4) * 9;
        ctx.beginPath(); ctx.ellipse(x, py, 24 + i % 3 * 7, 13 + i % 4 * 3, 0, 0, TAU);
        ctx.fillStyle = `${palette.core}72`; ctx.fill();
        ring(x + drift * 9, py - 26, 3 + i % 4, 3 + i % 4, palette.light, 1.5);
      }
    } else {
      for (let lane = 0; lane < 3; lane++) {
        ctx.beginPath();
        ctx.ellipse(360, y, 280 + lane * 18, 25 + lane * 17, Math.sin(age / 240 + lane) * .07, .1, TAU - .1);
        ctx.strokeStyle = lane === 1 ? palette.light : palette.core;
        ctx.lineWidth = 3 + surge * 2;
        ctx.stroke();
      }
    }
  }
  // These are the exact living targets at cast time, including a single survivor.
  for (const point of targets) {
    const py = y + (point.y - y) / sy;
    ring(point.x, py + 29, 34, 10, palette.light, impacted ? 3 : 1.6);
    if (type === 'shadow') {
      const beam = ctx.createLinearGradient(0, py - 90, 0, py + 27);
      beam.addColorStop(0, `${palette.core}00`);
      beam.addColorStop(1, `${palette.core}${impacted ? 'bb' : '55'}`);
      ctx.fillStyle = beam;
      ctx.fillRect(point.x - 18, py - 90, 36, 117);
      ring(point.x, py - 55, 20, 6, palette.light, 2);
    }
  }
  ctx.restore();
}
