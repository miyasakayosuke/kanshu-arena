import { CHARACTER_ART } from './MonsterArt';

type Track = { part: string; kind: 'scale' | 'rotate' | 'translate'; duration: number; values: number[][]; pivot?: [number, number]; times?: number[] };
const wave = (part: string, duration: number, amount: number, pivot: [number, number]): Track => ({ part, kind: 'rotate', duration, pivot, values: Array.from({ length: 17 }, (_, i) => [Math.sin(i / 16 * Math.PI * 2) * amount]) });
const blink = (part: string, duration: number, pivot: [number, number]): Track => ({ part, kind: 'scale', duration, pivot, values: [[1, 1], [1, 1], [1, .07], [1, 1], [1, 1], [1, .4], [1, 1], [1, 1]], times: [0, .55, .575, .6, .63, .65, .67, 1] });
const twitch = (part: string, duration: number, amount: number, pivot: [number, number]): Track => ({ part, kind: 'rotate', duration, pivot, values: [[0], [0], [amount], [0], [0]], times: [0, .25, .29, .34, 1] });

/** Home-only, quiet poses. Rig pivots match the existing artwork; no combat clocks are imported. */
export function homeIdleTracks(id: number, view: number[]): Track[] {
  if (id === 0) return [
    { part: 'root', kind: 'scale', duration: 3100, pivot: [140, 206], values: [[1, 1], [.996, 1.014], [1, 1], [1.003, .989], [1, 1]] },
    wave('tail0', 4000, 4, [168, 166]), wave('tail1', 4500, -5, [169, 171]), wave('tail2', 4900, 6, [172, 177]),
    wave('head', 5600, 1.8, [104, 137]), twitch('earLeft', 5100, -13, [77, 97]), twitch('earRight', 5500, 8, [123, 95]),
    blink('eyeLeft', 4300, [79, 110]), blink('eyeRight', 4300, [117, 108]), wave('pendant', 4700, 2, [105, 153]),
  ];
  if (id === 12) return [
    { part: 'torso', kind: 'scale', duration: 3900, pivot: [166, 216], values: [[1, 1], [1, 1.014], [1, 1], [1, .988], [1, 1]] },
    wave('head', 7400, .9, [119, 116]), wave('tail', 5700, 2.8, [241, 152]), wave('mane', 4000, 1.1, [120, 114]),
    twitch('earNear', 6200, -9, [81, 69]), twitch('earFar', 6500, 7, [126, 69]),
    blink('eyeNear', 4900, [77, 94]), blink('eyeFar', 4900, [115, 91]),
    wave('chain0', 4800, .8, [69, 214]), wave('chain1', 5200, 1.2, [55, 224]), wave('chain2', 5500, 1.6, [39, 232]),
  ];
  const [x, y, width, height] = view;
  const heavy = [1, 14, 19, 21, 22, 23, 36].includes(id);
  const soft = id >= 24 && id <= 28;
  const duration = (heavy ? 4900 : soft ? 3000 : 3700) + (id % 5) * 230;
  const amount = heavy ? .006 : soft ? .027 : .015;
  // These drawings have no articulated idle rig. Breathe at their own foot anchor,
  // keeping the original floor shadow fixed and never enlarging their silhouette.
  return [{ part: 'body', kind: 'scale', duration, pivot: [x + width / 2, y + height * (CHARACTER_ART[id].footAnchor ?? .94)], values: [[1, 1], [1 - amount * .2, 1 - amount], [1, 1]] }];
}

const NS = 'http://www.w3.org/2000/svg';
const number = (n: number) => Number(n.toFixed(5));
const valueText = (track: Track, value: number[]) => [...value, ...(track.kind === 'rotate' ? track.pivot ?? [] : [])].map(number).join(' ');

/** Deterministic sampling of the same native SVG tracks for actual raster QA. */
export function sampleHomeIdleTrack(track: Track, timeMs: number): number[] {
  const time = Math.max(0, Number.isFinite(timeMs) ? timeMs : 0) % track.duration / track.duration;
  const times = track.times ?? track.values.map((_, i) => i / (track.values.length - 1));
  const index = Math.max(0, times.findIndex((end, i) => i > 0 && time <= end) - 1);
  const from = track.values[index], to = track.values[index + 1];
  const t = (time - times[index]) / (times[index + 1] - times[index]);
  // Linear interpolation is also used by animateTransform, so evidence matches production.
  return from.map((value, i) => value + (to[i] - value) * t);
}

/** Only bundled, original SVG data is accepted. No per-frame parsing, assets, or caches. */
export function homeIdleSvg(id: number, instance: string, frameMs?: number): string {
  const source = CHARACTER_ART[id]?.artUrl;
  const prefix = 'data:image/svg+xml;charset=utf-8,';
  if (!source?.startsWith(prefix)) throw new Error('Home idle requires bundled original SVG art');
  const doc = new DOMParser().parseFromString(decodeURIComponent(source.slice(prefix.length)), 'image/svg+xml');
  const svg = doc.documentElement;
  const view = svg.getAttribute('viewBox')!.split(/[ ,]+/).map(Number);
  const namespace = `home-${instance.replace(/[^a-zA-Z0-9_-]/g, '')}-${id}-`;
  for (const node of [...svg.querySelectorAll('[id]')]) {
    const before = node.id, after = namespace + before;
    for (const target of [svg, ...svg.querySelectorAll('*')]) for (const attr of [...target.attributes]) {
      if (attr.value.includes(`url(#${before})`)) target.setAttribute(attr.name, attr.value.replaceAll(`url(#${before})`, `url(#${after})`));
      if (attr.value === `#${before}`) target.setAttribute(attr.name, `#${after}`);
    }
    node.setAttribute('id', after);
  }
  svg.removeAttribute('role'); svg.removeAttribute('aria-label');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('data-home-art', String(id));
  const tracks = homeIdleTracks(id, view);
  if (tracks[0].part === 'body') {
    const body = doc.createElementNS(NS, 'g'); body.setAttribute('data-rig', 'body');
    const geometry = [...svg.children].filter(node => node.tagName !== 'defs');
    // Only the leading floor ellipse is scenery. Later low ellipses may be feet,
    // water rims, or ornaments, and must keep their original painting order.
    const first = geometry[0];
    const shadow = first?.tagName === 'ellipse' && Number(first.getAttribute('cy')) > view[1] + view[3] * .75 && Number(first.getAttribute('ry')) < view[3] * .1 ? first : undefined;
    const nodes = geometry.filter(node => node !== shadow);
    svg.appendChild(body); nodes.forEach(node => body.appendChild(node));
  }
  for (const track of tracks) {
    const target = svg.querySelector(`[data-rig="${track.part}"]`);
    if (!target) throw new Error(`Missing home rig ${id}:${track.part}`);
    const outer = doc.createElementNS(NS, 'g'), motion = doc.createElementNS(NS, 'g');
    const inner = doc.createElementNS(NS, 'g');
    motion.setAttribute('data-home-track', track.part);
    if (track.kind === 'scale' && track.pivot) {
      outer.setAttribute('transform', `translate(${track.pivot.join(' ')})`);
      inner.setAttribute('transform', `translate(${-track.pivot[0]} ${-track.pivot[1]})`);
    }
    target.before(outer); outer.appendChild(motion); motion.appendChild(inner); inner.appendChild(target);
    if (frameMs !== undefined) {
      motion.setAttribute('transform', `${track.kind}(${valueText(track, sampleHomeIdleTrack(track, frameMs))})`);
    } else {
      const animation = doc.createElementNS(NS, 'animateTransform');
      for (const [name, value] of Object.entries({ attributeName: 'transform', type: track.kind, values: track.values.map(value => valueText(track, value)).join(';'), dur: `${track.duration}ms`, repeatCount: 'indefinite', begin: 'indefinite', fill: 'remove', calcMode: 'linear', ...(track.times ? { keyTimes: track.times.join(';') } : {}) })) animation.setAttribute(name, value);
      motion.appendChild(animation);
    }
  }
  return svg.outerHTML;
}
