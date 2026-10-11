#!/usr/bin/env node
/** Node-only packaging tests. All mutations are confined to a newly created temporary export. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, renameSync, symlinkSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { preparePackage, verifyPackage, replayFixture, requireOriginalFailures, safePath, newOutput, inspectAdoption } from './prepare-public-evidence.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = mkdtempSync(join(tmpdir(), 'prepare-public-evidence-selftest-'));
const output = join(temporary, 'compact');
const fixturePath = 'evidence-public/dryas-replay-fixture.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let prepared;
let release, adoption, baseRows;
const adoptionPath = 'docs/release-adoption-example.json';
let sequence = 0;
const destination = () => join(temporary, `replay-${++sequence}`);
async function altered(path, transform, operation) {
  const target = join(output, path), original = readFileSync(target);
  try { writeFileSync(target, transform(original)); await operation(); }
  finally { writeFileSync(target, original); }
}
async function missing(path, operation) {
  const target = join(output, path), held = target + '.selftest-held';
  renameSync(target, held);
  try { await operation(); } finally { renameSync(held, target); }
}
before(async () => {
  prepared = await preparePackage(repository, output, { allowIncomplete: true });
  release = join(temporary, 'controlled-release-example');
  cpSync(output, release, { recursive: true, errorOnExist: true, force: false });
  const manifest = JSON.parse(readFileSync(join(output, 'evidence-public/manifest.json')));
  baseRows = manifest.inventoryPages.flatMap(page => JSON.parse(readFileSync(join(output, page.path))))
    .filter(row => !row.path.startsWith('evidence-public/') && row.path !== 'EVIDENCE-README.md');
  const beforeEngine = readFileSync(join(release, 'src/engine.ts'));
  const afterEngine = beforeEngine.toString().replace('DEFAULT_POISON_IMPACT_SCALE = 1;', 'DEFAULT_POISON_IMPACT_SCALE = 0;').replace('DEFAULT_RESERVE_POISON = false;', 'DEFAULT_RESERVE_POISON = true;');
  assert.notEqual(afterEngine, beforeEngine.toString());
  writeFileSync(join(release, 'src/engine.ts'), afterEngine);
  const newPath = 'docs/release-adoption-example.md', newBytes = 'Selftest-only controlled release overlay; not an actual adoption.\n';
  writeFileSync(join(release, newPath), newBytes);
  const releaseSource = structuredClone(manifest.studySource);
  releaseSource.engineSha256 = sha(afterEngine);
  releaseSource.files.find(row => row.path === 'src/engine.ts').sha256 = sha(afterEngine);
  adoption = {
    schemaVersion: 1, kind: 'explicit-release-adoption-v1', reason: 'Selftest only: controlled default change to zero impact plus reservation.',
    studySource: manifest.studySource, studyArchiveSha256: sha(readFileSync(join(repository, 'docs/all-family-balance-source/all-family-frozen-system-index.json'))),
    releaseSource, files: [
      { path: 'src/engine.ts', beforeSha256: sha(beforeEngine), afterSha256: sha(afterEngine) },
      { path: newPath, beforeSha256: null, afterSha256: sha(newBytes) },
    ],
  };
  writeFileSync(join(release, adoptionPath), JSON.stringify(adoption, null, 2) + '\n');
});
async function adoptionChanged(edit, operation) {
  const value = structuredClone(adoption); edit(value);
  writeFileSync(join(release, adoptionPath), JSON.stringify(value));
  try { await operation(); } finally { writeFileSync(join(release, adoptionPath), JSON.stringify(adoption, null, 2) + '\n'); }
}

test('compact output alone reconstructs the real frozen fixture in a separate process', () => {
  const run = spawnSync(process.execPath, ['scripts/balance-lab/prepare-public-evidence.mjs', 'verify', '--root', '.', '--out', destination(), '--manifest-sha256', prepared.manifestSha256], { cwd: output, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.verified, true);
  assert.equal(report.actualReplaysExecuted, 1);
  assert.equal(report.sourceFilesReconstructed, 17);
  assert.equal(report.unitLedgersCompared, 10);
  assert.equal(report.fullStudyRerun, false);
  assert.equal(report.traceSha256, 'ea359ebe2497d85d2b9aef239c07b3781bb191332c15d6909bb23b982adcf970');
  assert.equal(existsSync(join(output, 'node_modules')), false);
  assert.equal(existsSync(join(output, 'lab-results')), false);
});
test('does not alter current frozen source or original failure records', () => {
  const source = JSON.parse(readFileSync(join(repository, 'docs/all-family-balance-config-freeze.json'))).source;
  for (const row of source.files) assert.equal(sha(readFileSync(join(repository, row.path))), row.sha256);
  requireOriginalFailures(output);
});
test('rejects output collision and output nested in the input tree without overwriting', async () => {
  await assert.rejects(() => preparePackage(repository, output, { allowIncomplete: true }), /collision/);
  assert.throws(() => newOutput(repository, join(repository, 'must-not-create-public-evidence')), /outside/);
  assert.throws(() => newOutput(repository, join(temporary, 'path') + '/../escape'), /traversal/);
});
test('rejects traversal, absolute paths, empty components and symlink escape', () => {
  for (const path of ['../x', '/tmp/x', 'src/../x', 'src//x', './x', 'src\\x', 'src/\0x']) assert.throws(() => safePath(output, path), /Unsafe/);
  symlinkSync(repository, join(output, 'selftest-link'));
  assert.throws(() => safePath(output, 'selftest-link/src/engine.ts'), /Symlink/);
  assert.throws(() => newOutput(output, join(output, 'selftest-link', 'new')), /outside/);
});
test('rejects a wrong pinned manifest before executing a fixture', async () => {
  await assert.rejects(() => verifyPackage(output, destination(), '0'.repeat(64)), /Pinned/);
});
for (const [label, path] of [
  ['shipping source', 'src/engine.ts'],
  ['frozen source archive', 'docs/all-family-balance-source/all-family-frozen-system-00001.json'],
  ['config', 'configs/balance-lab/all-family-counter-independent-0.json'],
  ['fixture', fixturePath],
  ['failed original gates', 'docs/all-family-balance-initial64.json'],
  ['failed original audit', 'docs/all-family-balance-audit.md'],
]) {
  test(`rejects missing ${label}`, async () => {
    await missing(path, async () => assert.rejects(() => verifyPackage(output, destination()), /ENOENT|differs|missing/i));
  });
  test(`rejects tampered ${label}`, async () => {
    await altered(path, bytes => Buffer.concat([bytes, Buffer.from('\n')]), async () => assert.rejects(() => verifyPackage(output, destination()), /differs/));
  });
}
test('exact reconstruction rejects a self-consistent but incorrect expected result', async () => {
  await altered(fixturePath, bytes => {
    const fixture = JSON.parse(bytes); fixture.expectedResult.turns++;
    fixture.expectedResultSha256 = sha(JSON.stringify(fixture.expectedResult));
    return JSON.stringify(fixture);
  }, async () => assert.rejects(() => replayFixture(output, destination()), /Exact fixture replay/));
});
test('exact reconstruction rejects a changed seed/request', async () => {
  await altered(fixturePath, bytes => {
    const fixture = JSON.parse(bytes); fixture.request.seed++;
    return JSON.stringify(fixture);
  }, async () => assert.rejects(() => replayFixture(output, destination()), /exact request/));
});
test('semantic guard rejects relabeling failed original selections as a success', async () => {
  await altered('docs/all-family-balance-initial64.json', bytes => {
    const value = JSON.parse(bytes); value.selection.independent = 0;
    return JSON.stringify(value);
  }, async () => assert.throws(() => requireOriginalFailures(output), /failed counter gates/));
});
test('semantic guard rejects deleting the empty extension and failed protocol qualification', async () => {
  await altered('docs/all-family-balance-extension-decision.json', bytes => {
    const value = JSON.parse(bytes); value.authorizedSuiteIds = ['invented'];
    return JSON.stringify(value);
  }, async () => assert.throws(() => requireOriginalFailures(output), /extension/));
  await altered('docs/all-family-pure-confirmation-results.json', bytes => {
    const value = JSON.parse(bytes); value.originalProtocol = 'PASSED';
    return JSON.stringify(value);
  }, async () => assert.throws(() => requireOriginalFailures(output), /original protocol failure/));
});
test('a missing failed-result record blocks package preparation before creating output', async () => {
  await missing('docs/all-family-balance-initial64.json', async () => {
    const out = destination();
    await assert.rejects(() => preparePackage(output, out, { allowIncomplete: true }), /ENOENT/);
    assert.equal(existsSync(out), false);
  });
});
test('an incomplete study cannot be exported as a final package', async () => {
  await missing('docs/all-family-balance-packed/all-family-matrix-independent-1-index.json', async () => {
    const out = destination();
    await assert.rejects(() => preparePackage(output, out), /Study evidence not final/);
    assert.equal(existsSync(out), false);
  });
});
test('records omitted ledgers as locally preserved, never as shipped or freshly verified', () => {
  const manifest = JSON.parse(readFileSync(join(output, 'evidence-public/manifest.json')));
  assert.ok(manifest.omittedLocallyPreserved.bytes > 200_000_000);
  assert.ok(manifest.shipped.bytes < 35_000_000);
  assert.match(manifest.limits, /not shipped evidence or independent verification/);
  const fixture = JSON.parse(readFileSync(join(output, fixturePath)));
  assert.match(fixture.selection, /deliberately residual-loss/);
  assert.equal(fixture.expectedResult.winner, 'lose');
});
test('controlled release defaults get a fresh manifest and replay only the old archived engine', async () => {
  const adoptedOutput = join(temporary, 'adopted-export');
  const result = await preparePackage(repository, adoptedOutput, { allowIncomplete: true, releaseRoot: release, adoptionRecord: adoptionPath });
  assert.notEqual(result.manifestSha256, prepared.manifestSha256);
  const manifest = JSON.parse(readFileSync(join(adoptedOutput, 'evidence-public/manifest.json')));
  assert.equal(manifest.studySource.engineSha256, adoption.studySource.engineSha256);
  assert.equal(manifest.releaseSource.engineSha256, adoption.releaseSource.engineSha256);
  assert.notEqual(manifest.studySource.engineSha256, manifest.releaseSource.engineSha256);
  const report = await verifyPackage(adoptedOutput, destination(), result.manifestSha256);
  assert.equal(report.traceSha256, 'ea359ebe2497d85d2b9aef239c07b3781bb191332c15d6909bb23b982adcf970');
  assert.match(readFileSync(join(adoptedOutput, 'src/engine.ts'), 'utf8'), /DEFAULT_POISON_IMPACT_SCALE = 0;/);
  assert.equal(sha(readFileSync(join(repository, 'src/engine.ts'))), adoption.studySource.engineSha256);
});
test('release root and explicit adoption record are required together', async () => {
  await assert.rejects(() => preparePackage(repository, destination(), { releaseRoot: release }), /required together/);
  await assert.rejects(() => preparePackage(repository, destination(), { adoptionRecord: adoptionPath }), /required together/);
  await assert.rejects(() => preparePackage(release, destination(), { allowIncomplete: true }), /Frozen source differs/);
});
test('rejects missing release source and any unlisted altered or extra files', () => {
  const target = join(release, 'src/families.ts'), held = target + '.held';
  renameSync(target, held);
  try { assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /ENOENT/); }
  finally { renameSync(held, target); }
  const readme = join(release, 'README.md'), previous = readFileSync(readme);
  writeFileSync(readme, Buffer.concat([previous, Buffer.from('\nUnlisted change\n')]));
  try { assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /Unlisted release drift/); }
  finally { writeFileSync(readme, previous); }
  const extra = join(release, 'docs/unlisted-release-example.txt');
  writeFileSync(extra, 'unlisted');
  try { assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /Unlisted release drift/); }
  finally { renameSync(extra, join(temporary, 'unlisted-release-example-preserved.txt')); }
});
test('rejects bad before/after hashes and invented prior absence', async () => {
  for (const edit of [
    value => { value.files[0].beforeSha256 = '0'.repeat(64); },
    value => { value.files[0].afterSha256 = '0'.repeat(64); },
    value => { value.files[0].beforeSha256 = null; },
    value => { value.files[1].beforeSha256 = '0'.repeat(64); },
  ]) await adoptionChanged(edit, async () => assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /before hash|after hash/));
});
test('rejects adoption records that relabel study hashes or overlay frozen evidence', async () => {
  await adoptionChanged(value => { value.studySource.engineSha256 = value.releaseSource.engineSha256; }, async () => assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /relabels/));
  for (const path of ['docs/all-family-balance-initial64.json', 'docs/all-family-balance-source/all-family-frozen-system-index.json', 'configs/balance-lab/all-family-counter-independent-0.json', 'scripts/balance-lab/core.mjs']) {
    await adoptionChanged(value => { value.files.push({ path, beforeSha256: sha(readFileSync(join(repository, path))), afterSha256: sha(readFileSync(join(release, path))) }); }, async () => assert.throws(() => inspectAdoption(repository, release, adoptionPath, baseRows), /Frozen evidence/));
  }
});
