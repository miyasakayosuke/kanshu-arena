#!/usr/bin/env node
/** Rebuild the exact original experiment source in a new local directory. Never edits production. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
const sha = value => createHash('sha256').update(value).digest('hex');
const out = process.argv[2];
if (!out) throw Error('Usage: node scripts/balance-lab/reconstruct-slime-source.mjs NEW_OUTPUT_DIRECTORY');
const root = resolve(out);
if (existsSync(root)) throw Error('Refuse to replace an existing output directory');
const spec = JSON.parse(readFileSync('docs/slime-balance-source-reconstruction.json'));
const engine = readFileSync('src/engine.ts', 'utf8');
if (sha(engine) !== spec.finalEngineSha256) throw Error('Use the recorded final playtest source checkout');
if (engine.slice(spec.characterOffset, spec.characterOffset + spec.replaceFinal.length) !== spec.replaceFinal) throw Error('Source replacement span differs');
const historical = engine.slice(0, spec.characterOffset) + spec.withHistorical + engine.slice(spec.characterOffset + spec.replaceFinal.length);
if (sha(historical) !== spec.historicalEngineSha256) throw Error('Reconstructed historical source hash differs');
const files = new Map([['src/engine.ts', historical], ['package.json', '{"type":"module"}\n']]);
for (const [path, expected] of Object.entries(spec.unchangedFiles)) {
  const contents = readFileSync(path, 'utf8');
  if (sha(contents) !== expected) throw Error(`Recorded unchanged source differs: ${path}`);
  files.set(path, contents);
}
for (const [path, contents] of files) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}
console.log(JSON.stringify({ root, engineSha256: sha(historical), labSha256: spec.labSha256, productionUnchanged: true }, null, 2));
