import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, IMPACT, SKILL, EXPOSURES, frameAt, flightAt, makeController } from './motion.mjs';
import { BASELINE, REGISTERED, supportPosition } from './placement.mjs';
test('rigid support registration preserves neutral and airborne drawings', () => {
  for (const name of ['original', 'open', 'bite']) assert.deepEqual(REGISTERED[name], BASELINE[name]);
  for (const width of [130, 142, 420]) {
    const original = supportPosition('original', width);
    for (const name of ['preload', 'contact', 'recover', 'rise', 'near']) {
      const point = supportPosition(name, width);
      point.forEach((value, i) => assert(Math.abs(value - original[i]) < 1e-9));
    }
    assert(Math.abs(supportPosition('drive', width)[1] - original[1]) < 1e-9);
  }
});
test('bounded continuity uses recovery bridges and only airborne rigid travel', () => {
  assert.equal(frameAt(800, true), 'bite'); assert.equal(frameAt(940, true), 'contact');
  assert.equal(frameAt(1180, true), 'rise'); assert.equal(frameAt(1300, true), 'near');
  assert.equal(frameAt(1400, true), 'original');
  for (const ms of [0, 140, 360, 549, 940, 1040, 1130, 1240, 1500]) assert.deepEqual(flightAt(ms), [0, 0]);
  assert.deepEqual(flightAt(800), [-.28, -.02]);
  assert(Math.abs(flightAt(939.999)[0]) < 1e-7);
  const c = makeController({ continuity: true }); c.assets(true); c.start('new', 0);
  assert.equal(c.sample(800).impact, true); assert.equal(c.sample(1180).frame, 'rise');
  c.start('reduced', 0, { reduced: true }); assert.equal(c.sample(800).frame, 'original');
});
test('existing one-hit skill constants and explicit impact exposure', () => {
  assert.deepEqual(SKILL, { name: '月下の一咬', power: 55, mp: 10 });
  assert.equal(IMPACT, 800); assert.equal(DURATION, 1500);
  assert.equal(frameAt(799), 'bite'); assert.equal(frameAt(800), 'bite');
  assert.equal(frameAt(1499), 'original'); assert.equal(frameAt(1500), 'original');
  assert.deepEqual(EXPOSURES.map(x => x[0]), [0, 140, 360, 550, 760, 890, 1040, 1350]);
});
test('normal, double speed, reduced motion and repeated casts', () => {
  const c = makeController(); c.assets(true); c.start('a', 100);
  assert.equal(c.sample(899).impact, false); assert.equal(c.sample(900).impact, true);
  assert.equal(c.sample(1600).active, false);
  c.start('b', 2000, { speed: 2 }); assert.equal(c.sample(2400).impact, true);
  assert.equal(c.sample(2750).active, false);
  c.start('c', 3000, { reduced: true }); assert.equal(c.sample(3800).frame, 'original');
  assert.equal(c.sample(3800).impact, true);
  c.start('d', 3900); assert.equal(c.sample(3900).id, 'd'); assert.equal(c.sample(3900).impact, false);
});
test('skip and defeat cannot be revived by late assets; fallback is latched per cast', () => {
  const c = makeController(); c.start('late', 0); c.assets(true);
  assert.equal(c.sample(600).frame, 'original');
  c.cancel(); c.assets(true); assert.equal(c.sample(900).active, false);
  c.start('new', 1000); assert.equal(c.sample(1600).frame, 'open');
  c.cancel({ defeat: true }); c.assets(true);
  assert.equal(c.sample(1800).hidden, true); assert.equal(c.sample(1800).active, false);
  c.assets(false); c.start('failed-load', 2000); assert.equal(c.sample(2800).frame, 'original');
});
