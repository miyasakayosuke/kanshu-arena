import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { intersects } from '../../docs/fenrir-acting-bite/skip-presentation.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = fileURLToPath(new URL('./evidence/', import.meta.url));
await mkdir(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = page => page.evaluate(() => window.__biteLifecycle.get());
const pinSkip = process.env.PIN_SKIP === '1';
const checks = {
  kind: 'frozen-art-natural-clock-short-screen-controls', controlledClock: false,
  engineChanged: false, productionSourceChanged: false, visualAcceptance: false,
  browserVideo: 'Continuous Playwright video; native recording cadence, not a claimed 60fps trace',
  timingScope: 'Observed CI-browser wall time with real timers and rAF; not a universal scheduling guarantee',
  controlVariant: pinSkip ? 'conditional-existing-status-and-Skip-band' : 'ordinary-offscreen-control-baseline',
  cases: [], errors: [],
};
const server = spawn('node', ['node_modules/vite/bin/vite.js', '--config', 'qa/fenrir-acting-bite/lifecycle.config.mjs'], { cwd: root, stdio: 'inherit' });
let browser;
const recordings = [];
async function saveRecording(recording) {
  if (recording.saved) return;
  await recording.context.close();
  const recorded = await recording.video.path();
  assert.equal(spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', recorded, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + `natural-${recording.entry.name}.mp4`], { stdio: 'inherit' }).status, 0);
  recording.entry.video = `natural-${recording.entry.name}.mp4`;
  recording.saved = true;
}
async function enter(page, locator) {
  assert(await locator.isEnabled());
  await locator.focus();
  await page.keyboard.press('Enter');
}
async function orders(page) {
  const state = (await read(page)).state.battle;
  for (const unit of state.allies.filter(x => x.hp > 0)) {
    await enter(page, page.locator('.commander').nth(+unit.key.slice(1)));
    await enter(page, page.getByRole('button', { name: 'たたかう 通常攻撃 · MP 0', exact: true }));
    await enter(page, page.locator('.targetButtons button').last());
  }
}
async function ui(page) {
  return page.evaluate(() => {
    const rect = element => element?.getBoundingClientRect().toJSON() ?? null;
    const skip = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '演出をスキップ');
    const box = skip?.getBoundingClientRect();
    const x = box ? box.x + box.width / 2 : null, y = box ? box.y + box.height / 2 : null;
    const atCenter = box && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
    const battle = document.querySelector('.battle'), active = document.activeElement;
    const status = document.querySelector('.playingPanel>p');
    const nextTurn = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'この指示でターン開始');
    return {
      at: Date.now(), viewport: { width: innerWidth, height: innerHeight },
      active: { tag: active?.tagName, text: active?.textContent?.trim().slice(0, 160), rect: rect(active) },
      skip: skip ? { rect: rect(skip), position: getComputedStyle(skip).position, disabled: skip.disabled, focused: active === skip, centerInViewport: x >= 0 && y >= 0 && x < innerWidth && y < innerHeight, centerHits: !!atCenter && (atCenter === skip || skip.contains(atCenter)) } : null,
      status: status ? { text: status.textContent, rect: rect(status), contentFits: status.scrollHeight <= status.clientHeight && status.scrollWidth <= status.clientWidth } : null,
      essential: ['.battleTop','.battleScene','.enemyVitals','.commanderRow','.battleMessage'].flatMap(name => [...document.querySelectorAll(name)].map(e => ({ name, rect: rect(e) }))),
      nextTurn: nextTurn ? { rect: rect(nextTurn), disabled: nextTurn.disabled } : null,
      battle: battle ? { rect: rect(battle), scrollTop: battle.scrollTop, clientHeight: battle.clientHeight, scrollHeight: battle.scrollHeight } : null,
      scene: rect(document.querySelector('.battleScene')),
    };
  });
}
function assertPinnedUI(state) {
  assert(state.skip?.position === 'fixed' && state.skip.centerHits && state.skip.centerInViewport && !state.skip.disabled, 'pinned Skip is not initially discoverable/hittable');
  const box = state.skip.rect;
  assert(box.height >= 44 && box.width >= 44);
  assert(box.x >= 5 && box.y >= 5 && box.right <= state.viewport.width - 5 && box.bottom <= state.viewport.height - 5, 'focus ring margin');
  assert(state.status?.contentFits, 'status text no longer fits');
  assert(!intersects(box, state.status.rect), 'Skip covers status text');
  for (const item of state.essential) {
    assert(!intersects(box, item.rect) && !intersects(state.status.rect, item.rect), 'control band overlaps ' + item.name);
  }
}
async function snapshot(page, entry, label) {
  const record = { label, ui: await ui(page), state: await read(page) };
  entry.snapshots.push(record);
  await page.screenshot({ path: out + `natural-${entry.name}-${label}.png` });
  return record;
}
function oracle(state) {
  assert(!state.state.playing);
  assert.deepEqual(state.state.battle, state.runs[0].after, 'Skip must commit the entire real engine result');
  assert.equal(state.runs[0].finishes.filter(x => x.result !== null).length, 1);
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:8885/qa/fenrir-acting-bite/lifecycle-fixture.html')).ok) { ready = true; break; } } catch {}
    await wait(100);
  }
  assert(ready, 'fixture server did not start');
  browser = await chromium.launch({ headless: true });
  for (const spec of [
    { name: 'front-normal-tab-skip', row: 'front', speed: 1, control: 'tab-enter', theme: 'light' },
    { name: 'rear-double-pointer-skip', row: 'rear', speed: 2, control: 'wheel-pointer', theme: 'dark' },
  ]) {
    const entry = { ...spec, snapshots: [], focusPath: [], wheelSteps: [], assertions: [] };
    checks.cases.push(entry);
    const context = await browser.newContext({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', colorScheme: spec.theme, recordVideo: { dir: out + 'natural-video/', size: { width: 390, height: 640 } } });
    const page = await context.newPage(), video = page.video();
    const recording = { context, page, video, entry, saved: false }; recordings.push(recording);
    entry.recordingRequestedAt = Date.now();
    page.on('pageerror', error => checks.errors.push(spec.name + ': ' + error.message));
    await page.goto(`http://127.0.0.1:8885/qa/fenrir-acting-bite/lifecycle-fixture.html?row=${spec.row}&assets=ready&controls=${pinSkip ? 'pin' : ''}`);
    await page.waitForFunction(() => !!window.__biteLifecycle?.get().state?.battle);
    if (spec.speed === 2) await enter(page, page.getByRole('button', { name: '演出速度', exact: true }));
    await orders(page);
    await enter(page, page.getByRole('button', { name: 'この指示でターン開始', exact: true }));
    await page.waitForFunction(() => window.__biteLifecycle.get().runs[0]?.startedAt != null);
    const started = await read(page), run = started.runs[0];
    entry.clockStart = run.startedAt;
    entry.initialControl = await ui(page);
    if (pinSkip) {
      assert(run.controlPresentation?.pinned, 'pin declined: ' + JSON.stringify(run.controlPresentation));
      assert(run.controlPresentation.elementIdentityPreserved && run.controlPresentation.sceneAndScrollUnchanged);
      assertPinnedUI(entry.initialControl);
    }
    assert.equal(run.speed, spec.speed);
    const first = run.events.find(x => x.kind === 'cast');
    assert.equal(first.skill, '月下の一咬');
    assert.equal(first.actor, spec.row === 'rear' ? 'e1' : 'e0');
    assert.equal(run.timeline.commands[0].start, 0);
    assert.equal(run.timeline.commands[0].end, 1500);
    assert.equal(run.timeline.cues.find(x => x.impacts.some(y => y.kind === 'damage' && y.actor === first.actor)).at, 800);
    // No page.clock or scripted draw time: observe the first complete bite before touching Skip.
    await page.waitForFunction(({ start, speed }) => Date.now() >= start + 1500 / speed + 100, { start: run.startedAt, speed: spec.speed });
    const before = await snapshot(page, entry, 'before-user-scroll');
    assert(before.state.state.playing, 'turn ended before the bounded Skip interaction');
    if (pinSkip) assertPinnedUI(before.ui);
    const skip = page.getByRole('button', { name: '演出をスキップ', exact: true });
    if (spec.control === 'tab-enter') {
      const focusable = await page.locator('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]').count();
      let reached = false;
      for (let i = 0; i < focusable + 2; i++) {
        await page.keyboard.press('Tab');
        const state = await ui(page);
        entry.focusPath.push(state);
        if (pinSkip) assert.equal(state.battle.scrollTop, before.ui.battle.scrollTop, 'Tab to pinned Skip scrolled the arena');
        if (state.skip?.focused) { reached = true; break; }
      }
      assert(reached, 'Skip not reached in one bounded genuine Tab traversal');
      const focused = await snapshot(page, entry, 'skip-focused');
      assert(!focused.ui.skip.disabled);
      if (pinSkip) assertPinnedUI(focused.ui);
      await page.keyboard.press('Enter');
    } else {
      await page.mouse.move(195, 450);
      let hit = await ui(page);
      for (let i = 0; i < 8 && !(hit.skip?.centerInViewport && hit.skip?.centerHits); i++) {
        await page.mouse.wheel(0, 140);
        await page.waitForTimeout(100);
        hit = await ui(page);
        entry.wheelSteps.push(hit);
      }
      assert(hit.skip?.centerInViewport && hit.skip?.centerHits && !hit.skip.disabled, 'Skip cannot be revealed and hit through ordinary wheel scrolling');
      if (pinSkip) assert.equal(entry.wheelSteps.length, 0, 'pinned Skip still needs wheel scrolling');
      await snapshot(page, entry, 'skip-hit-tested');
      // Natural playback continues during screenshot serialization; re-check at activation.
      entry.pointerAtClick = await ui(page);
      assert(entry.pointerAtClick.skip?.centerHits && entry.pointerAtClick.skip?.centerInViewport && !entry.pointerAtClick.skip.disabled);
      const box = entry.pointerAtClick.skip.rect;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForFunction(() => !window.__biteLifecycle.get().state.playing);
    const after = await snapshot(page, entry, 'after-skip');
    oracle(after.state);
    const count = after.state.runs[0].cues.length;
    await page.waitForTimeout(2000);
    const settled = await snapshot(page, entry, 'settled');
    oracle(settled.state);
    assert.equal(settled.state.runs[0].cues.length, count, 'cleared cue fired after Skip');
    assert.equal(settled.state.draw?.pose, 'original');
    entry.frames = await page.evaluate(() => window.__biteLifecycle.frames());
    if (pinSkip) {
      const biteDraws = entry.frames.draws.filter(x => x.eligible && x.animate);
      assert(biteDraws.length > 0);
      const firstDraw = biteDraws[0];
      for (const draw of biteDraws) {
        assert.equal(draw.physicalWidth, firstDraw.physicalWidth);
        assert.deepEqual(draw.floor, firstDraw.floor);
        assert.deepEqual(draw.stage, firstDraw.stage);
      }
      assert.equal(after.ui.battle.scrollTop, before.ui.battle.scrollTop, 'unexpected automatic post-Skip scroll');
      entry.assertions.push('Same44px Skip and status visible without input scrolling; essential content not overlapped; bite floor/size/stage unchanged');
    }
    entry.final = settled.state;
    const cues = settled.state.runs[0].cues;
    const starts = cues.filter(x => x.cue.cast?.skill === '月下の一咬' && !x.cue.impacts.length);
    const impacts = cues.filter(x => x.updates.some(y => y.kind === 'damage' && y.actor === first.actor));
    assert.equal(starts.length, 1);
    assert.equal(impacts.length, 1);
    const paid = starts[0].updates.filter(x => x.kind === 'resource' && x.actor === first.actor && x.effect === 'mp');
    assert.equal(paid.length, 1); assert.equal(paid[0].amount, 10); assert.equal(paid[0].mp, 50);
    assert.equal(impacts[0].cue.at, 800);
    entry.cueTiming = cues.filter(x => x.cue.at <= 800).map(x => ({ scheduledLogical: x.cue.at, actualWall: x.at - run.startedAt, expectedWall: x.cue.at / spec.speed }));
    const closed = entry.frames.draws.find(x => x.pose === 'close' && x.at >= run.startedAt);
    entry.hpToClosedJawWallMs = closed ? closed.at - impacts[0].at : null;
    entry.closureObservation = { impactAt: impacts[0].at, firstCloseAt: closed?.at ?? null, signedWallMs: entry.hpToClosedJawWallMs, earlyClosure: !!closed && closed.at < impacts[0].at, closeNotObserved: !closed };
    entry.firstBitePoseExposures = entry.frames.draws.filter(x => x.animate && x.at <= run.startedAt + 1500 / spec.speed + 100).reduce((list, x) => { const last = list.at(-1); if (last?.pose === x.pose) { last.lastAt = x.at; last.samples++; } else list.push({ pose: x.pose, firstAt: x.at, lastAt: x.at, samples: 1 }); return list; }, []);
    entry.assertions.push('Real engine first bite and command timing unchanged', 'Genuine user-input Skip commits full oracle exactly once', 'No resumed cues or candidate motion during two-second post-Skip observation');
    await saveRecording(recording);
  }
  assert.deepEqual(checks.errors, []);
  checks.completed = true;
} catch (error) {
  checks.completed = false; checks.error = String(error); throw error;
} finally {
  for (const recording of recordings) {
    if (!recording.saved) {
      try {
        recording.entry.failureState = await read(recording.page);
        recording.entry.frames = await recording.page.evaluate(() => window.__biteLifecycle.frames());
        recording.entry.failureUI = await ui(recording.page);
        await recording.page.screenshot({ path: out + `natural-${recording.entry.name}-failure.png` });
      } catch (error) { checks.errors.push('Failure-state preservation: ' + String(error)); }
    }
    try { await saveRecording(recording); } catch (error) { checks.errors.push('Video preservation: ' + String(error)); }
  }
  if (checks.errors.length) checks.completed = false;
  await writeFile(out + 'natural-control-checks.json', JSON.stringify(checks, null, 2) + '\n');
  await browser?.close(); server.kill();
}
