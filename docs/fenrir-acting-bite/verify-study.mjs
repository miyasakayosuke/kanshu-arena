import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
// Fail before Vitest if a standalone Node-runner check is accidentally discoverable.
const runnerCollision=(file,source)=>/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)&&/from\s*['"]node:test['"]/.test(source);
assert(runnerCollision('example.test.mjs', "import test from 'node:test';"));
assert(!runnerCollision('example-checks.mjs', "import test from 'node:test';"));
assert(!runnerCollision('example.test.ts', "import {test} from 'vitest';"));
function checkRunnerNames(directory){for(const item of readdirSync(directory,{withFileTypes:true})){if(['node_modules','evidence','assets'].includes(item.name))continue;const path=resolve(directory,item.name);if(item.isDirectory())checkRunnerNames(path);else if(/\.[cm]?[jt]sx?$/.test(item.name))assert(!runnerCollision(item.name,readFileSync(path,'utf8')),`Standalone Node test is discoverable by Vitest: ${path}. Use the -checks name and explicit node --test invocation.`);}}
checkRunnerNames(here);checkRunnerNames(resolve(here,'../../qa/fenrir-acting-bite'));
const manifest = JSON.parse(readFileSync(resolve(here, '../rights/asset-manifest.json'), 'utf8'));
const entry = manifest.assets.find(item => item.id === 'fenrir-acting-bite-plan-one-studies');
assert(entry);
const expected = {
  'assets/high-leap-deep-load-study.png': [1254, 1254],
  'assets/high-leap-toe-off-study.png': [1254, 1254],
  'assets/landing-contact-handoff-study.png': [1254, 1254],
  'assets/high-leap-reach-clearance-study.png': [1254, 1254],
  'assets/high-leap-reach-study.png': [1254, 1254],
  'assets/high-leap-bite-close-study.png': [1254, 1254],
  'assets/high-leap-apex-study.png': [1254, 1254],
  'assets/high-leap-descent-study.png': [1254, 1254],
  'assets/landing-seq-rise-study.png': [1254, 1254],
  'assets/landing-seq-mid-rise.png': [1254, 1254],
  'assets/landing-seq-rear-land.png': [1254, 1254],
  'assets/landing-seq-rear-land-clean.png': [1254, 1254],
  'assets/landing-seq-contact.png': [1254, 1254],
  'assets/landing-seq-compress.png': [1254, 1254],
  'assets/reference.png': [1312, 1199],
  'assets/return-halfway.png': [1254, 1254],
  'assets/return-near-original.png': [1254, 1254],
  'assets/continuity-four-key-study.png': [1536, 1024],
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
for (const [file, hash] of Object.entries(entry.binarySha256)) {
  assert.equal(createHash('sha256').update(readFileSync(resolve(here, '../..', file))).digest('hex'), hash, file);
}
console.log('All registered binary byte hashes, including the retained browser clip, verified. 23 PNG byte hashes, dimensions and exact reference identity verified. Visual acceptance is not established.');
