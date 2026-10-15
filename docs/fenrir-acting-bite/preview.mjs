import { frameAt, makeController } from './motion.mjs';
import { BASELINE, REGISTERED, supportPosition } from './placement.mjs';
const baseline = new URLSearchParams(location.search).get('anchors') === 'baseline';
const specs = baseline ? BASELINE : REGISTERED;
document.querySelector('#placement').textContent = baseline
  ? '配置: 比較用の修正前' : '配置: 支持足の位置合わせ後（作画は同じ）';
const sources = { reference: 'reference.png', correction: 'anticipation-landing-correction.png',
  bridges: 'weight-transfer-bridges.png', keys: 'keyposes-first.png' };
const frames = new Map();
const controller = makeController();
let theme = 'light', forced = null, paused = true, number = 0;
const canvases = [...document.querySelectorAll('canvas[data-size]')];
const status = document.querySelector('#status');
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
  for (const canvas of canvases) {
    const ctx = canvas.getContext('2d'), width = Number(canvas.dataset.size), k = width / 142;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme === 'dark' ? '#15212b' : '#f7f1e3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const floor = canvas.height - 30, anchor = canvas.width * .32;
    ctx.strokeStyle = theme === 'dark' ? '#62727c' : '#b5a990'; ctx.beginPath(); ctx.moveTo(12, floor + 2); ctx.lineTo(canvas.width - 12, floor + 2); ctx.stroke();
    if (!sample.hidden) {
      const name = frames.has(sample.frame) ? sample.frame : 'original', item = frames.get(name), spec = specs[name];
      if (item) { const scale = width * spec.scale; ctx.drawImage(item, anchor - spec.anchor[0] * scale,
        floor - spec.anchor[1] * scale - (spec.lift || 0) * k, item.width * scale, item.height * scale); }
    }
  }
  status.textContent = `${Math.round(sample.ms)} / 1500 ms · ${sample.frame} · ${sample.ms >= 800 ? '800 ms の判定時刻以後' : '判定前'} · 未承認のキーポーズ再生`;
  document.querySelector('#time').value = sample.ms;
}
function tick(now) { if (!paused) draw(controller.sample(now)); requestAnimationFrame(tick); }
function setTime(ms) { paused = true; forced = { frame: frameAt(ms), ms, active: ms < 1500, hidden: false }; draw(forced); return forced; }
window.preview = { setTime, setTheme(value) { theme = value; draw(forced || controller.sample(performance.now())); },
  placement: { baseline, support: name => supportPosition(name, 142, baseline) },
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
    if (name === 'reference') { frames.set('original', image); setTime(0); }
  }
  for (const [name, spec] of Object.entries(specs)) if (name !== 'original') frames.set(name, isolate(images[spec.source], spec.seed));
  controller.assets(true); window.ready = true; setTime(0);
}
load().catch(error => { controller.assets(false); window.previewError = String(error); status.textContent = `読込失敗。原画へ戻します: ${error}`; });
requestAnimationFrame(tick);
