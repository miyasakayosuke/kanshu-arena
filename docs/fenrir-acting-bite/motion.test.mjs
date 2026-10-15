import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, IMPACT, SKILL, EXPOSURES, frameAt, makeController } from './motion.mjs';
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
