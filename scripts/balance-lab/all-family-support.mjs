/** Frozen all-family study utilities; importing this file never executes a battle. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export const MATRIX_PATH = 'docs/all-family-matrix-freeze.json';
export const MATRIX_SHA256 = '72362ed3de3128ea7e547020084829c66fccda41b6d569000e575aa82dc7a540';
export const DERIVED_PATH = 'docs/all-family-balance-config-freeze.json';
export const PACKED_ROOT = 'docs/all-family-balance-packed';
export const SOURCE_ROOT = 'docs/all-family-balance-source';
export const MAX_ARCHIVE_BYTES = 65_000;
export const SOURCE_PATHS = ['src/engine.ts', 'src/families.ts', 'scripts/balance-lab/core.mjs', 'scripts/balance-lab/cli.mjs'];
export const sha = value => createHash('sha256').update(value).digest('hex');
export const load = path => JSON.parse(readFileSync(path, 'utf8'));
export const jsonBytes = value => JSON.stringify(value, null, 2) + '\n';
export function saveNew(path, value) {
  if (existsSync(path)) throw Error(`Refuse to replace evidence: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, jsonBytes(value), { flag: 'wx' });
}
export function saveCheckpoint(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.next`, jsonBytes(value)); renameSync(`${path}.next`, path);
}
export function readMatrix() {
  const raw = readFileSync(MATRIX_PATH);
  if (sha(raw) !== MATRIX_SHA256) throw Error('Immutable matrix freeze SHA-256 differs');
  const freeze = JSON.parse(raw);
  if (freeze.teams.length !== 24 || freeze.teams.filter(t => t.cost === 17).length !== 20 || freeze.matrixSeeds.length !== 16 || freeze.counterSeeds.length !== 64 || freeze.reserveCounterSeeds.length !== 64) throw Error('Frozen study dimensions differ');
  const seeds = [...freeze.matrixSeeds, ...freeze.counterSeeds, ...freeze.reserveCounterSeeds];
  if (new Set(seeds).size !== seeds.length) throw Error('Frozen seed sets overlap');
  return freeze;
}
export function sourceVersion() {
  const files = SOURCE_PATHS.map(path => ({ path, sha256: sha(readFileSync(path)) }));
  return { nodeVersion: process.version, files, engineSha256: files[0].sha256, familySha256: files[1].sha256, labSha256: sha(SOURCE_PATHS.slice(2).map(path => readFileSync(path, 'utf8')).join('\n')) };
}
export function assertSource(expected) {
  const actual = sourceVersion();
  for (const key of ['engineSha256', 'familySha256', 'labSha256']) if (actual[key] !== expected[key]) throw Error(`Frozen source changed: ${key}`);
}
export function packPayload(value) {
  const raw = JSON.stringify(value) + '\n';
  const zipped = gzipSync(raw, { level: 9 });
  const payload = { format: 'gzip-base64-json', sha256: sha(raw), rawBytes: Buffer.byteLength(raw), gzipSha256: sha(zipped), data: zipped.toString('base64') };
  if (JSON.stringify(unpackPayload(payload)) !== JSON.stringify(value)) throw Error('Packed round trip mismatch');
  return payload;
}
export function unpackPayload(payload) {
  if (payload.format !== 'gzip-base64-json') throw Error('Unknown packed format');
  const zipped = Buffer.from(payload.data, 'base64');
  if (sha(zipped) !== payload.gzipSha256) throw Error('Packed gzip SHA-256 differs');
  const raw = gunzipSync(zipped);
  if (raw.length !== payload.rawBytes || sha(raw) !== payload.sha256) throw Error('Packed raw SHA-256/size differs');
  return JSON.parse(raw);
}
export function writeBoundedRecords(root, prefix, records, startIndex = 0) {
  mkdirSync(root, { recursive: true });
  const chunks = [];
  const write = subset => {
    if (!subset.length) return;
    const payload = packPayload(subset), raw = JSON.stringify(payload) + '\n';
    if (Buffer.byteLength(raw) > MAX_ARCHIVE_BYTES) {
      if (subset.length === 1) throw Error(`Single packed record exceeds ${MAX_ARCHIVE_BYTES} bytes`);
      const split = Math.floor(subset.length / 2); write(subset.slice(0, split)); write(subset.slice(split)); return;
    }
    const file = `${prefix}-${String(startIndex + chunks.length + 1).padStart(5, '0')}.json`;
    if (existsSync(resolve(root, file))) throw Error(`Refuse to replace packed evidence: ${file}`);
    writeFileSync(resolve(root, file), raw, { flag: 'wx' });
    chunks.push({ file, bytes: Buffer.byteLength(raw), sha256: sha(raw), records: subset.length, first: subset[0].id ?? subset[0].key, last: subset.at(-1).id ?? subset.at(-1).key });
  };
  write(records); return chunks;
}
export function readChunk(root, chunk) {
  const raw = readFileSync(resolve(root, chunk.file));
  if (raw.length !== chunk.bytes || raw.length > MAX_ARCHIVE_BYTES || sha(raw) !== chunk.sha256) throw Error(`Chunk differs: ${chunk.file}`);
  const records = unpackPayload(JSON.parse(raw));
  if (records.length !== chunk.records) throw Error('Chunk record count differs');
  return records;
}
export function archiveSource(label, additionalPaths = []) {
  if (!/^all-family-[a-z0-9-]+$/.test(label)) throw Error('Invalid source archive label');
  const indexPath = `${SOURCE_ROOT}/${label}-index.json`;
  if (existsSync(indexPath)) throw Error('Source archive already exists');
  const records = [...new Set([...SOURCE_PATHS, ...additionalPaths])].map(path => {
    const raw = readFileSync(path); return { key: path, path, bytes: raw.length, sha256: sha(raw), data: raw.toString('base64') };
  });
  const chunks = writeBoundedRecords(SOURCE_ROOT, label, records);
  const index = { format: 'bounded-exact-source-v1', label, source: sourceVersion(), files: records.map(({ data, key, ...record }) => record), chunks };
  saveNew(indexPath, index); return index;
}
export const ARMS = [{ id: 'independent', reservePoison: false }, { id: 'reserve', reservePoison: true }];
export const scaleId = scale => scale === 0.5 ? 'half' : String(scale);
export function deriveConfigs(freeze) {
  const configs = [];
  const add = (phase, arm, scale, teams, seeds, scenarios, shell = null) => {
    const id = `all-family-${phase}-${arm.id}-${scaleId(scale)}${shell ? `-${shell.endsWith('dryas') ? 'dryas' : 'tengu'}` : ''}`;
    const config = { schemaVersion: 1, suiteId: id, seeds: [...seeds], costLimit: 17, teams: teams.map(({id,ids,role}) => ({id,ids:[...ids],role})), scenarios,
      candidate: { id: `${arm.id}-${scaleId(scale)}`, label: `Frozen poison impact ${scale}; ${arm.id} production policy; applied to both physical sides`, overrides: { poisonImpactScale: scale, reservePoison: arm.reservePoison } }, complaints: [] };
    configs.push({ id, phase, arm: arm.id, scale, shell, config });
  };
  for (const arm of ARMS) for (const scale of freeze.scales) {
    const pairs = freeze.teams.flatMap((a,i) => freeze.teams.slice(i+1).map((b,j) => ({ id: `pair-${i+1}-${i+j+2}`, a:a.id,b:b.id })));
    add('matrix', arm, scale, freeze.teams, freeze.matrixSeeds, pairs);
    const counterTeams = freeze.teams.filter(t => [...freeze.knownShells, ...freeze.counterplans].includes(t.id));
    const counterScenarios = freeze.knownShells.flatMap((shell,i) => freeze.counterplans.map((counter,j) => ({id:`counter-${i+1}-${j+1}`,a:counter,b:shell})));
    add('counter', arm, scale, counterTeams, freeze.counterSeeds, counterScenarios);
    for (const shell of freeze.knownShells) add('reserve', arm, scale, counterTeams.filter(t => t.id === shell || freeze.counterplans.includes(t.id)), freeze.reserveCounterSeeds, counterScenarios.filter(s => s.b === shell), shell);
  }
  return configs;
}
export function verifiedDerived() {
  readMatrix(); const manifest = load(DERIVED_PATH); assertSource(manifest.source);
  for (const entry of manifest.configs) {
    const raw = readFileSync(entry.path);
    if (sha(raw) !== entry.fileSha256 || sha(JSON.stringify(JSON.parse(raw))) !== entry.canonicalSha256) throw Error(`Frozen config differs: ${entry.path}`);
  }
  return manifest;
}
export function *readSuite(id, { allowPartial = false } = {}) {
  const index = load(`${PACKED_ROOT}/${id}-index.json`);
  if (!allowPartial && index.status !== 'complete') throw Error(`Suite is not complete: ${id}`);
  const chunks = index.chunks ?? index.chunkManifest.flatMap(chunk => readChunk(PACKED_ROOT, chunk));
  for (const chunk of chunks) for (const row of readChunk(PACKED_ROOT, chunk)) yield row;
}
export const physicalScore = result => result.winner === 'win' ? 1 : result.winner === 'draw' ? 0.5 : 0;
export const scoreForA = row => row.orientation === 'a-left' ? physicalScore(row.result) : 1 - physicalScore(row.result);
export const sideForA = row => row.orientation === 'a-left' ? 'allies' : 'enemies';
export function reverseRow(row) {
  // Physical result and resources remain unchanged. Only the logical row perspective reverses.
  return { ...row, teamAId: row.teamBId, teamBId: row.teamAId, orientation: row.orientation === 'a-left' ? 'a-right' : 'a-left' };
}
export function interval(values) {
  const mean = values.reduce((n,v)=>n+v,0) / values.length;
  const se = values.length > 1 ? Math.sqrt(values.reduce((n,v)=>n+(v-mean)**2,0)/(values.length-1)/values.length) : null;
  return { mean, n: values.length, approximate95: se === null ? null : [Math.max(0,mean-1.96*se),Math.min(1,mean+1.96*se)] };
}
