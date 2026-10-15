import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, '../rights/asset-manifest.json'), 'utf8'));
const entry = manifest.assets.find(item => item.id === 'fenrir-acting-bite-plan-one-studies');
assert(entry);
const expected = {
  'assets/reference.png': [1312, 1199],
  'assets/keyposes-first.png': [1536, 1024],
  'assets/inbetween-study.png': [1024, 1536],
  'pose-render.png': [1536, 2360],
  'assets/weight-transfer-bridges.png': [1536, 1024],
  'assets/anticipation-landing-correction.png': [1536, 1024],
};
for (const [file, [width, height]] of Object.entries(expected)) {
  const bytes = readFileSync(resolve(here, file));
  const path = `docs/fenrir-acting-bite/${file}`;
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.binarySha256[path], path);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file}: PNG signature`);
  assert.equal(bytes.readUInt32BE(16), width, `${file}: width`);
  assert.equal(bytes.readUInt32BE(20), height, `${file}: height`);
}
assert.equal(entry.binarySha256['docs/fenrir-acting-bite/assets/reference.png'],
  'e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137');
console.log('6 PNG byte hashes, dimensions and exact reference identity verified. Visual acceptance is not established.');
