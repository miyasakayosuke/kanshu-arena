import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const directory = fileURLToPath(new URL('../../docs/fenrir-acting-bite/', import.meta.url));
const out = fileURLToPath(new URL('./evidence/', import.meta.url));
await mkdir(out, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', '8882', '--directory', directory], { stdio: 'inherit' });
const base = 'http://127.0.0.1:8882/';
const observations = { kind: 'isolated-browser-keypose-diagnostic', visualAcceptance: false, gameIntegration: false, cases: [] };
const errors = [];
let browser;
async function ready(page) {
  await page.goto(base + '?motion=continuity');
  await page.waitForFunction(() => window.ready || window.previewError);
  assert.equal(await page.evaluate(() => window.previewError || null), null);
}
try {
  for (let n = 0; n < 50; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1120, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message)); await ready(page);
  assert.deepEqual(await page.evaluate(() => window.preview.info), { duration: 1500, impact: 800, power: 55, mp: 10,
    effects: false, cameraMotion: false, type: 'discrete-keypose-diagnostic-not-smooth-animation' });
  const sourceIdentity = await page.evaluate(() => {
    window.preview.setTime(0); const a = document.querySelector('canvas').toDataURL();
    window.preview.setTime(1500); const b = document.querySelector('canvas').toDataURL();
    return a === b;
  });
  assert.equal(sourceIdentity, true); observations.neutralRoundTripPixelExact = true;
  const support = await page.evaluate(() => Object.fromEntries(
    ['original', 'preload', 'drive', 'contact', 'recover', 'rise', 'near'].map(name => [name, window.preview.placement.support(name)])));
  for (const name of ['preload', 'contact', 'recover', 'rise', 'near']) support[name].forEach((value, i) =>
    assert(Math.abs(value - support.original[i]) < 1e-8));
  assert(Math.abs(support.drive[1] - support.original[1]) < 1e-8);
  observations.supportRegistration = { sourceLandmarksOnly: true, visualAcceptance: false, points142: support };
  for (const speed of [1, 2]) {
    const result = await page.evaluate(speed => {
      window.preview.assets(true); window.preview.start('normal-' + speed, 0, { speed });
      return [window.preview.sample(799 / speed), window.preview.sample(800 / speed), window.preview.sample(1500 / speed)];
    }, speed);
    assert.equal(result[0].impact, false); assert.equal(result[1].impact, true); assert.equal(result[2].active, false);
    observations.cases.push({ name: `speed-${speed}`, samples: result });
  }
  const reduced = await page.evaluate(() => { window.preview.start('reduced', 0, { reduced: true }); return window.preview.sample(800); });
  assert.equal(reduced.frame, 'original'); assert.equal(reduced.impact, true); observations.cases.push({ name: 'reduced', reduced });
  const skipped = await page.evaluate(() => { window.preview.start('skip', 0); window.preview.sample(500); window.preview.cancel(); return window.preview.sample(900); });
  assert.equal(skipped.active, false); assert.equal(skipped.frame, 'original'); observations.cases.push({ name: 'skip', skipped });
  const repeated = await page.evaluate(() => { window.preview.start('one', 0); window.preview.sample(900); window.preview.start('two', 1000); return window.preview.sample(1100); });
  assert.equal(repeated.id, 'two'); assert.equal(repeated.impact, false); observations.cases.push({ name: 'repeated-cast', repeated });
  const late = await page.evaluate(() => { window.preview.assets(false); window.preview.start('late', 0); window.preview.assets(true); return window.preview.sample(800); });
  assert.equal(late.frame, 'original'); observations.cases.push({ name: 'late-assets', late });
  const defeat = await page.evaluate(() => { window.preview.start('defeat', 0); window.preview.cancel({ defeat: true }); window.preview.assets(true); return window.preview.sample(800); });
  assert.equal(defeat.hidden, true); assert.equal(defeat.active, false); observations.cases.push({ name: 'defeat-interruption', defeat });
  await page.screenshot({ path: out + 'defeat-interruption.png', fullPage: true });
  const fallback = await page.evaluate(() => { window.preview.assets(false); window.preview.start('fallback', 0); return window.preview.sample(600); });
  assert.equal(fallback.frame, 'original'); observations.cases.push({ name: 'fallback', fallback });
  await page.screenshot({ path: out + 'fallback.png', fullPage: true });
  await page.evaluate(() => window.preview.assets(true));
  const keys = [['neutral', 0], ['preload', 250], ['drive', 450], ['open', 650], ['bite', 800], ['contact', 980], ['recover', 1080], ['rise', 1180], ['near', 1300], ['settled', 1450]];
  for (const viewport of [{ width: 1120, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.preview.setTheme(t), theme);
      for (const [name, ms] of keys) {
        await page.evaluate(ms => window.preview.setTime(ms), ms);
        await page.screenshot({ path: `${out}${viewport.width}-${theme}-${name}.png`, fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 1120, height: 1000 });
  await page.evaluate(() => window.preview.setTheme('light'));
  for (const [name, speed, reduced] of [['normal', 1, false], ['double-speed', 2, false], ['reduced', 1, true]]) {
    const dir = out + name + '-frames/'; await mkdir(dir, { recursive: true });
    await page.evaluate(({ speed, reduced }) => window.preview.start('video', 400, { speed, reduced }), { speed, reduced });
    const count = Math.ceil((.4 + 1.5 / speed + .4) * 30);
    for (let i = 0; i < count; i++) {
      const boxes = await page.evaluate(ms => { window.preview.sample(ms); return window.preview.bounds(); }, i * 1000 / 30);
      for (const { box, canvas, name: pose } of boxes) {
        assert(box[0] >= 0 && box[1] >= 0 && box[2] <= canvas[0] && box[3] <= canvas[1], `${name}/${i}/${pose}: clipped source alpha bounds`);
      }
      await page.screenshot({ path: dir + String(i).padStart(3, '0') + '.png' });
    }
    const encoded = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', dir + '%03d.png', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + name + '.mp4'], { stdio: 'inherit' });
    assert.equal(encoded.status, 0, `${name}: ffmpeg`);
  }
  // Re-render the unchanged baseline placement with the same browser, artwork,
  // page layout and clock. Boundary pairs expose the remaining pose-shape pops.
  for (const variant of ['registered', 'baseline']) {
    await page.goto(base + '?motion=registered&anchors=' + variant);
    await page.waitForFunction(() => window.ready || window.previewError);
    assert.equal(await page.evaluate(() => window.previewError || null), null);
    for (const ms of [450, 1039, 1040, 1349, 1350]) {
      await page.evaluate(ms => window.preview.setTime(ms), ms);
      await page.screenshot({ path: `${out}placement-${variant}-${ms}.png`, fullPage: true });
    }
  }
  await page.goto(base + '?motion=registered'); await page.waitForFunction(() => window.ready);
  const baselineDir = out + 'baseline-frames/'; await mkdir(baselineDir, { recursive: true });
  await page.evaluate(() => window.preview.start('baseline-video', 400));
  for (let i = 0; i < 69; i++) {
    await page.evaluate(ms => window.preview.sample(ms), i * 1000 / 30);
    await page.screenshot({ path: baselineDir + String(i).padStart(3, '0') + '.png' });
  }
  assert.equal(spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', baselineDir + '%03d.png',
    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + 'baseline-normal.mp4'], { stdio: 'inherit' }).status, 0);
  assert.equal(spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', out + 'baseline-normal.mp4', '-i', out + 'normal.mp4',
    '-filter_complex', '[0:v][1:v]hstack=inputs=2[v]', '-map', '[v]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out + 'continuity-before-after.mp4'], { stdio: 'inherit' }).status, 0);
  observations.placementComparison = { left: 'registered-prior-keys', right: 'recovery-bridges-and-airborne-lunge', artworkChanged: true,
    poseBoundaryTimes: [1039, 1040, 1349, 1350], smoothnessEstablished: false,
    addedPoses: ['rise', 'near'], rejectedForPurpose: ['deeper-anticipation', 'heavy-landing-compression'] };
  observations.videoAlphaBoundsInsideCanvas = true;
  const failedPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await failedPage.route('**/assets/weight-transfer-bridges.png', route => route.abort());
  await failedPage.goto(base); await failedPage.waitForFunction(() => window.previewError);
  const failedLoad = await failedPage.evaluate(() => {
    window.preview.start('real-load-failure', 0); return { error: window.previewError, sample: window.preview.sample(800) };
  });
  assert.equal(failedLoad.sample.frame, 'original');
  await failedPage.screenshot({ path: out + 'actual-failed-load.png', fullPage: true });
  observations.cases.push({ name: 'actual-network-failure', failedLoad }); await failedPage.close();
  const latePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let releaseAsset;
  const held = new Promise(resolve => { releaseAsset = resolve; });
  await latePage.route('**/assets/weight-transfer-bridges.png', async route => { await held; await route.continue(); });
  await latePage.goto(base);
  await latePage.waitForFunction(() => window.preview && document.querySelector('#status').textContent.includes('0 / 1500'));
  await latePage.evaluate(() => window.preview.start('actual-late-load', 0));
  releaseAsset(); await latePage.waitForFunction(() => window.ready || window.previewError);
  assert.equal(await latePage.evaluate(() => window.previewError || null), null);
  const lateNetwork = await latePage.evaluate(() => window.preview.sample(800));
  assert.equal(lateNetwork.frame, 'original');
  await latePage.screenshot({ path: out + 'actual-late-load.png', fullPage: true });
  const nextNetwork = await latePage.evaluate(() => { window.preview.start('after-late-load', 1000); return window.preview.sample(1600); });
  assert.equal(nextNetwork.frame, 'open'); observations.cases.push({ name: 'actual-network-delay', lateNetwork, nextNetwork });
  await latePage.close();
  assert.deepEqual(errors, []); observations.browserErrors = errors;
  observations.completed = true;
  await writeFile(out + 'browser-checks.json', JSON.stringify(observations, null, 2) + '\n');
} catch (error) {
  observations.completed = false; observations.error = String(error); observations.browserErrors = errors;
  await writeFile(out + 'browser-checks.json', JSON.stringify(observations, null, 2) + '\n'); throw error;
} finally { await browser?.close(); server.kill(); }
