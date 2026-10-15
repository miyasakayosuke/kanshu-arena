import { frameAt, flightAt, makeController } from './motion.mjs';
import { BASELINE, REGISTERED, supportPosition } from './placement.mjs';
const baseline = new URLSearchParams(location.search).get('anchors') === 'baseline';
const continuity = !baseline && new URLSearchParams(location.search).get('motion') === 'continuity';
const specs = baseline ? BASELINE : REGISTERED;
document.querySelector('#placement').textContent = baseline
  ? '配置: 比較用の修正前' : continuity ? '失敗比較：体格の変化と空中の後退が未解決' : '配置: 支持足の位置合わせ後・前段階のキーポーズ';
const sources = { reference: 'reference.png', correction: 'anticipation-landing-correction.png',
  bridges: 'weight-transfer-bridges.png', keys: 'keyposes-first.png', continuity: 'continuity-four-key-study.png' };
const frames = new Map();
const bounds = new Map();
let renderedBounds = [];
const controller = makeController({ continuity });
let theme = 'light', forced = null, paused = true, number = 0;
const canvases = [...document.querySelectorAll('canvas[data-size]')];
const status = document.querySelector('#status');
document.querySelector('#timeline').textContent = continuity
  ? '140 ms：溜め → 360 ms：蹴り出し → 550 ms：空中突進 → 760 ms：噛み閉じ → 800 ms：命中 → 940 ms：接地 → 1130 / 1240 ms：立ち上がりと振り向き → 1380 ms：原画へ。'
  : '比較用の前段階：140 ms 溜め / 360 ms 蹴り出し / 550 ms 開口 / 760 ms 噛み閉じ / 800 ms 命中 / 890 ms 接地 / 1040 ms 復帰 / 1350 ms 原画。';
function measure(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const box = [c.width, c.height, 0, 0];
  for (let p = 0; p < c.width * c.height; p++) if (d[p * 4 + 3] > 32) {
    const px = p % c.width, py = Math.floor(p / c.width);
    box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py);
    box[2] = Math.max(box[2], px + 1); box[3] = Math.max(box[3], py + 1);
  }
  return box;
}
// Whole-character selection only. No body-part masks, warps, tweened anatomy or
// new pixels: retain source RGBA inside the selected connected whole-wolf region.
function isolate(img, seed) {
  const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, img.width, img.height), w = img.width, h = img.height;
  const mask = new Uint8Array(w * h), queue = new Int32Array(w * h);
  let initial = seed[1] * w + seed[0];
  if (pixels.data[initial * 4 + 3] <= 32) throw Error('Selection seed is not inside the character');
  let head = 0, tail = 1; queue[0] = initial; mask[initial] = 1;
  while (head < tail) {
    const p = queue[head++], x = p % w, y = Math.floor(p / w);
    for (const q of [x ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y ? p - w : -1, y + 1 < h ? p + w : -1]) {
      if (q >= 0 && !mask[q] && pixels.data[q * 4 + 3] > 32) { mask[q] = 1; queue[tail++] = q; }
    }
  }
  if (tail < 20000) throw Error('Incomplete whole-character selection');
  // Four-pixel fringe preserves the generated soft edge without merging adjacent wolves.
  let edge = mask;
  for (let n = 0; n < 4; n++) {
    const next = edge.slice();
    for (let p = 0; p < edge.length; p++) if (edge[p]) {
      const x = p % w, y = Math.floor(p / w);
      for (const q of [x ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y ? p - w : -1, y + 1 < h ? p + w : -1])
        if (q >= 0 && pixels.data[q * 4 + 3] <= 32) next[q] = 1;
    }
    edge = next;
  }
  for (let p = 0; p < edge.length; p++) if (!edge[p]) pixels.data[p * 4 + 3] = 0;
  ctx.putImageData(pixels, 0, 0); return canvas;
}
function draw(sample) {
  renderedBounds = [];
  for (const canvas of canvases) {
    const ctx = canvas.getContext('2d'), width = Number(canvas.dataset.size), k = width / 142;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme === 'dark' ? '#15212b' : '#f7f1e3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Same stage origin in both comparison modes; extra left room for the airborne lunge.
    const floor = canvas.height - 30, anchor = canvas.width * .4;
    ctx.strokeStyle = theme === 'dark' ? '#62727c' : '#b5a990'; ctx.beginPath(); ctx.moveTo(12, floor + 2); ctx.lineTo(canvas.width - 12, floor + 2); ctx.stroke();
    if (!sample.hidden) {
      const name = frames.has(sample.frame) ? sample.frame : 'original', item = frames.get(name), spec = specs[name];
      if (item) { const scale = width * spec.scale;
        const [dx, dy] = continuity && ['open', 'bite'].includes(name) ? flightAt(sample.ms) : [0, 0];
        const x = anchor - spec.anchor[0] * scale + dx * width;
        const y = floor - spec.anchor[1] * scale - (spec.lift || 0) * k + dy * width;
        ctx.drawImage(item, x, y, item.width * scale, item.height * scale);
        const b = bounds.get(name);
        if (b) renderedBounds.push({ name, size: width, canvas: [canvas.width, canvas.height],
          box: [x + b[0] * scale, y + b[1] * scale, x + b[2] * scale, y + b[3] * scale] });
      }
    }
  }
  status.textContent = `${Math.round(sample.ms)} / 1500 ms · ${sample.frame} · ${sample.ms >= 800 ? '800 ms の判定時刻以後' : '判定前'} · 未承認のキーポーズ再生`;
  document.querySelector('#time').value = sample.ms;
}
function tick(now) { if (!paused) draw(controller.sample(now)); requestAnimationFrame(tick); }
function setTime(ms) { paused = true; forced = { frame: frameAt(ms, continuity), ms, active: ms < 1500, hidden: false }; draw(forced); return forced; }
window.preview = { setTime, setTheme(value) { theme = value; draw(forced || controller.sample(performance.now())); },
  bounds: () => renderedBounds,
  placement: { baseline, continuity, support: name => supportPosition(name, 142, baseline) },
  start(id, now, options) { paused = true; forced = null; controller.start(id, now, options); },
  sample(now) { forced = controller.sample(now); draw(forced); return forced; },
  cancel(options) { controller.cancel(options); forced = controller.sample(0); draw(forced); },
  assets(value) { controller.assets(value); },
  info: { duration: 1500, impact: 800, power: 55, mp: 10, effects: false, cameraMotion: false,
    type: 'discrete-keypose-diagnostic-not-smooth-animation' },
};
document.querySelector('#play').onclick = () => { controller.start(`cast-${++number}`, performance.now(),
  { speed: Number(document.querySelector('#speed').value), reduced: document.querySelector('#reduced').checked }); forced = null; paused = false; };
document.querySelector('#skip').onclick = () => { paused = true; window.preview.cancel(); };
document.querySelector('#defeat').onclick = () => { paused = true; window.preview.cancel({ defeat: true }); };
document.querySelector('#theme').onclick = () => window.preview.setTheme(theme === 'light' ? 'dark' : 'light');
document.querySelector('#time').oninput = event => setTime(Number(event.target.value));
async function load() {
  const images = {};
  for (const [name, file] of Object.entries(sources)) {
    const image = new Image(); image.src = `assets/${file}`; await image.decode(); images[name] = image;
    if (name === 'reference') { frames.set('original', image); bounds.set('original', measure(image)); setTime(0); }
  }
  for (const [name, spec] of Object.entries(specs)) if (name !== 'original') {
    const selected = isolate(images[spec.source], spec.seed); frames.set(name, selected); bounds.set(name, measure(selected));
  }
  controller.assets(true); window.ready = true; setTime(0);
}
load().catch(error => { controller.assets(false); window.previewError = String(error); status.textContent = `読込失敗。原画へ戻します: ${error}`; });
requestAnimationFrame(tick);
