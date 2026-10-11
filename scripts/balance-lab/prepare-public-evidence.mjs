#!/usr/bin/env node
/** Local, additive export. Never modifies the study, Git index, or network state. */
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw Error(message); };
const ORIGINAL = 'docs/all-family-balance-config-freeze.json';
const ARCHIVE = 'docs/all-family-balance-source/all-family-frozen-system-index.json';
const FIXTURE = 'evidence-public/dryas-replay-fixture.json';
const MANIFEST = 'evidence-public/manifest.json';
const REQUIRED_AUDITS = [
  'docs/all-family-balance-audit.md', 'docs/all-family-balance-initial64.md',
  'docs/all-family-balance-recommended-distribution.json', 'docs/all-family-balance-recommended-distribution.md',
  'docs/all-family-pure-confirmation-interpretation.md',
  'docs/slime-balance-audit.md', 'docs/demon-balance-audit.md', 'docs/undead-balance-audit.md', 'docs/extraordinary-balance-audit.md',
];
const FROZEN = ['src/engine.ts', 'src/families.ts', 'scripts/balance-lab/core.mjs', 'scripts/balance-lab/cli.mjs'];
const LEDGER_ROOTS = [
  'docs/all-family-balance-packed', 'docs/all-family-pure-confirmation-packed',
  'docs/all-family-leader-followup-packed', 'docs/demon-balance-packed',
  'docs/undead-balance-packed', 'docs/extraordinary-balance-packed',
];
const STUDIES = [
  { id: 'original', freeze: ORIGINAL, root: LEDGER_ROOTS[0], results: 'docs/all-family-balance-initial64.json' },
  { id: 'pure', freeze: 'docs/all-family-pure-confirmation-config-freeze.json', root: LEDGER_ROOTS[1], results: 'docs/all-family-pure-confirmation-results.json' },
  { id: 'leader', freeze: 'docs/all-family-leader-followup-config-freeze.json', root: LEDGER_ROOTS[2], results: 'docs/all-family-leader-followup-results.json' },
];

export function safePath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\') || path.includes('\0') || path.split('/').some(p => !p || p === '.' || p === '..')) fail(`Unsafe relative path: ${path}`);
  const base = resolve(root), target = resolve(base, path);
  if (!target.startsWith(base + sep)) fail(`Path escapes root: ${path}`);
  let current = base;
  if (existsSync(base) && lstatSync(base).isSymbolicLink()) fail(`Symlink root: ${base}`);
  for (const part of path.split('/')) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) fail(`Symlink path: ${path}`);
  }
  return target;
}
const read = (root, path) => readFileSync(safePath(root, path));
const load = (root, path) => JSON.parse(read(root, path));
const record = (root, path) => { const bytes = read(root, path); return { path, bytes: bytes.length, sha256: sha(bytes) }; };
function put(root, path, bytes) {
  const target = safePath(root, path); mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes, { flag: 'wx' });
}
function list(root, path) {
  const absolute = safePath(root, path), s = lstatSync(absolute);
  if (s.isSymbolicLink()) fail(`Symlink input: ${path}`);
  if (s.isFile()) return [path];
  if (!s.isDirectory()) fail(`Unsupported input: ${path}`);
  return readdirSync(absolute).sort().flatMap(name => list(root, `${path}/${name}`));
}
function checkRecord(root, row) {
  if (!isDeepStrictEqual(record(root, row.path), { path: row.path, bytes: row.bytes, sha256: row.sha256 })) fail(`Artifact differs: ${row.path}`);
}
export function newOutput(root, out) {
  if (!out || out.split(/[\\/]/).includes('..')) fail('Output path must be explicit and contain no parent traversal');
  const target = resolve(out), base = realpathSync(root);
  if (target === base || target.startsWith(base + sep)) fail('Output must be outside the input tree');
  if (existsSync(target)) fail('Output collision: destination must not exist');
  let ancestor = dirname(target);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  if (realpathSync(ancestor) !== ancestor) fail('Output ancestor must not be a symlink');
  return target;
}
function createOutput(destination) {
  mkdirSync(dirname(destination), { recursive: true });
  // Atomic final component creation also rejects a collision after preflight.
  mkdirSync(destination);
}
function verifySource(root, source) {
  for (const path of FROZEN) {
    const expected = source.files.find(row => row.path === path);
    if (!expected || sha(read(root, path)) !== expected.sha256) fail(`Frozen source differs: ${path}`);
  }
  if (sha(read(root, FROZEN[0])) !== source.engineSha256 || sha(read(root, FROZEN[1])) !== source.familySha256) fail('Frozen engine/family source fingerprint differs');
  if (sha(FROZEN.slice(2).map(path => read(root, path).toString()).join('\n')) !== source.labSha256) fail('Frozen Lab source differs');
}
export function requireOriginalFailures(root) {
  for (const path of REQUIRED_AUDITS) if (!read(root, path).length) fail(`Required audit is empty: ${path}`);
  const initial = load(root, 'docs/all-family-balance-initial64.json');
  const extension = load(root, 'docs/all-family-balance-extension-decision.json');
  const pure = load(root, 'docs/all-family-pure-confirmation-results.json');
  if (initial.selection?.independent !== null || initial.selection?.reserve !== null || Object.keys(initial.gates ?? {}).length !== 6 || !Object.values(initial.gates).every(g => g.knownShells?.length === 2 && g.knownShells.some(s => s.counterGate === false))) fail('Original failed counter gates or null selections missing');
  if (extension.authorizedSuiteIds?.length !== 0 || extension.unchangedFailedGatesRemainFailures !== true) fail('Original empty extension/failure record differs');
  if (!pure.originalProtocol?.startsWith('FAILED')) fail('Pure follow-up must retain original protocol failure');
}
function inspectStudies(root) {
  const extension = load(root, 'docs/all-family-balance-extension-decision.json');
  return STUDIES.map(spec => {
    const freeze = load(root, spec.freeze);
    verifyFrozenInputs(root, freeze);
    const suites = freeze.configs.map(entry => {
      const authorized = spec.id !== 'original' || entry.phase !== 'reserve' || extension.authorizedSuiteIds.includes(entry.id);
      const indexPath = `${spec.root}/${entry.id}-index.json`;
      if (!authorized) {
        if (existsSync(safePath(root, indexPath))) fail(`Unauthorized original extension exists: ${entry.id}`);
        return { id: entry.id, status: 'not-authorized-not-run', scheduledMatches: entry.matches, executedMatches: 0 };
      }
      if (!existsSync(safePath(root, indexPath))) return { id: entry.id, status: 'not-final', scheduledMatches: entry.matches, executedMatches: null };
      const index = load(root, indexPath);
      if (index.status !== 'complete' || index.executedMatches !== entry.matches || index.scheduledMatches !== entry.matches || index.configSha256 !== entry.canonicalSha256 || index.scheduleSha256 !== entry.scheduleSha256 || !isDeepStrictEqual(index.source, freeze.source)) fail(`Incomplete or unbound suite index: ${entry.id}`);
      return { id: entry.id, status: 'complete', scheduledMatches: entry.matches, executedMatches: index.executedMatches, indexPath };
    });
    const complete = suites.every(s => s.status !== 'not-final') && existsSync(safePath(root, spec.results));
    return {
      ...spec, status: complete ? 'complete-recorded-not-rerun' : 'incomplete-not-final',
      authorizedScheduledMatches: suites.filter(s => s.status !== 'not-authorized-not-run').reduce((n, s) => n + s.scheduledMatches, 0),
      recordedCompleteMatches: suites.reduce((n, s) => n + (s.executedMatches ?? 0), 0),
      suites,
    };
  });
}
function verifyFrozenInputs(root, freeze) {
  const { index } = readArchivedSource(root);
  if (!isDeepStrictEqual(index.source, freeze.source)) fail('Frozen input source differs from archived study source');
  for (const row of freeze.configs) {
    const bytes = read(root, row.path);
    if (sha(bytes) !== row.fileSha256 || sha(JSON.stringify(JSON.parse(bytes))) !== row.canonicalSha256) fail(`Frozen config differs: ${row.path}`);
  }
  for (const row of [...(freeze.originalEvidence ?? []), ...[freeze.matrix, freeze.base, freeze.amendment].filter(r => r?.path && r?.sha256)]) {
    if (sha(read(root, row.path)) !== row.sha256) fail(`Bound original evidence differs: ${row.path}`);
  }
}
function verifySummaryBindings(root, studies) {
  for (const study of studies) {
    const freeze = load(root, study.freeze);
    verifyFrozenInputs(root, freeze);
    if (study.status === 'incomplete-not-final') continue;
    const summary = load(root, study.results);
    if (!isDeepStrictEqual(summary.source, freeze.source) || summary.derivedFreezeSha256 !== sha(read(root, study.freeze))) fail(`Summary source/freeze binding differs: ${study.results}`);
  }
}
function unpack(bytes) {
  const payload = JSON.parse(bytes), zipped = Buffer.from(payload.data, 'base64');
  if (payload.format !== 'gzip-base64-json' || sha(zipped) !== payload.gzipSha256) fail('Packed source encoding/hash differs');
  const raw = gunzipSync(zipped);
  if (raw.length !== payload.rawBytes || sha(raw) !== payload.sha256) fail('Packed source content differs');
  return JSON.parse(raw);
}
function readArchivedSource(root) {
  const index = load(root, ARCHIVE), base = dirname(ARCHIVE), files = [];
  for (const chunk of index.chunks) {
    checkRecord(root, { ...chunk, path: `${base}/${chunk.file}` });
    const rows = unpack(read(root, `${base}/${chunk.file}`));
    if (rows.length !== chunk.records) fail('Source archive record count differs');
    files.push(...rows);
  }
  if (new Set(files.map(f => f.path)).size !== files.length || files.length !== index.files.length) fail('Duplicate or missing source archive entries');
  for (const f of files) {
    safePath(root, f.path);
    const expected = index.files.find(row => row.path === f.path), bytes = Buffer.from(f.data, 'base64');
    if (!expected || bytes.length !== expected.bytes || sha(bytes) !== expected.sha256 || f.sha256 !== expected.sha256) fail(`Archived source differs: ${f.path}`);
  }
  for (const path of FROZEN) {
    const file = files.find(f => f.path === path), expected = index.source.files.find(f => f.path === path);
    if (!file || !expected || file.sha256 !== expected.sha256) fail(`Archived source identity differs: ${path}`);
  }
  if (index.source.engineSha256 !== files.find(f => f.path === FROZEN[0]).sha256 || index.source.familySha256 !== files.find(f => f.path === FROZEN[1]).sha256 || sha(FROZEN.slice(2).map(path => Buffer.from(files.find(f => f.path === path).data, 'base64').toString()).join('\n')) !== index.source.labSha256) fail('Archived combined source fingerprint differs');
  return { index, files };
}
function protectedEvidence(path) {
  return path.startsWith('configs/') || path.startsWith('scripts/balance-lab/') || path.startsWith('evidence-public/') || path.startsWith('lab-results/') || (path.startsWith('docs/') && /(?:balance|all-family-)/.test(path));
}
function releaseFiles(root) {
  const ignore = new Set(['.git', 'node_modules', 'dist', 'lab-results', 'evidence-public', 'EVIDENCE-README.md']);
  return readdirSync(root).sort().filter(p => !ignore.has(p)).flatMap(p => list(root, p));
}
/** Explicit before/after overlays; the full original study tree is still the evidence authority. */
export function inspectAdoption(root, releaseRoot, adoptionPath, baseRows) {
  const release = realpathSync(releaseRoot);
  if (release === realpathSync(root)) fail('Release root must be separate from the frozen study root');
  const adoption = load(release, adoptionPath), original = load(root, ORIGINAL);
  if (adoption.schemaVersion !== 1 || adoption.kind !== 'explicit-release-adoption-v1' || typeof adoption.reason !== 'string' || !adoption.reason.trim()) fail('Explicit adoption record schema/reason required');
  if (!isDeepStrictEqual(adoption.studySource, original.source) || adoption.studyArchiveSha256 !== sha(read(root, ARCHIVE))) fail('Adoption record relabels the frozen study/source archive');
  if (existsSync(safePath(root, adoptionPath))) fail('Adoption record must be a new file absent from the study tree');
  if (protectedEvidence(adoptionPath)) fail('Adoption record path cannot replace or impersonate frozen evidence');
  if (!Array.isArray(adoption.files) || !adoption.files.length || new Set(adoption.files.map(f => f.path)).size !== adoption.files.length) fail('Adoption requires a unique explicit overlay file list');
  const overlays = new Map();
  for (const entry of adoption.files) {
    safePath(root, entry.path);
    if (entry.path === adoptionPath || protectedEvidence(entry.path) || entry.path.startsWith('.') || entry.path.startsWith('node_modules/') || entry.path.startsWith('dist/')) fail(`Frozen evidence or unsafe overlay prohibited: ${entry.path}`);
    const present = existsSync(safePath(root, entry.path));
    if (entry.beforeSha256 !== (present ? sha(read(root, entry.path)) : null)) fail(`Overlay before hash/absence differs: ${entry.path}`);
    const after = record(release, entry.path);
    if (entry.afterSha256 !== after.sha256) fail(`Overlay after hash differs: ${entry.path}`);
    overlays.set(entry.path, { ...after, disposition: 'shipped' });
  }
  verifySource(release, adoption.releaseSource);
  const expectedFiles = new Map(baseRows.map(row => [row.path, row]));
  const releasePaths = releaseFiles(release);
  for (const path of releasePaths) {
    if (path === adoptionPath || overlays.has(path)) continue;
    const expected = expectedFiles.get(path);
    if (!expected || sha(read(release, path)) !== expected.sha256) fail(`Unlisted release drift: ${path}`);
  }
  for (const row of baseRows.filter(r => r.disposition === 'shipped')) if (!releasePaths.includes(row.path)) fail(`Missing release input: ${row.path}`);
  const adoptionRecord = record(release, adoptionPath);
  return { releaseRoot: release, overlays, adoptionRecord, adoption, releasePaths };
}
function verifyAdoptionRecord(root, manifest) {
  if (!manifest.adoption) {
    if (!isDeepStrictEqual(manifest.releaseSource, manifest.studySource)) fail('Unrecorded release source drift');
    return;
  }
  checkRecord(root, manifest.adoption);
  const adoption = load(root, manifest.adoption.path);
  if (adoption.kind !== 'explicit-release-adoption-v1' || !isDeepStrictEqual(adoption.studySource, manifest.studySource) || !isDeepStrictEqual(adoption.releaseSource, manifest.releaseSource) || adoption.studyArchiveSha256 !== sha(read(root, ARCHIVE))) fail('Adoption/source bindings differ');
  for (const entry of adoption.files) {
    if (protectedEvidence(entry.path) || sha(read(root, entry.path)) !== entry.afterSha256) fail(`Adopted file differs or overwrites frozen evidence: ${entry.path}`);
  }
}
function fixtureFromExisting(root) {
  const path = 'lab-results/all-family-residual-dryas/demon-dual-cleanse-scale0.json';
  const replay = load(root, path), { trace, ...expectedResult } = replay.result;
  if (!replay.verified || sha(JSON.stringify(trace)) !== expectedResult.traceHash) fail('Existing real fixture trace hash differs');
  const derived = load(root, ORIGINAL), entry = derived.configs.find(c => c.id === replay.suite);
  if (!entry || !isDeepStrictEqual(replay.source, derived.source) || replay.configSha256 !== entry.canonicalSha256) fail('Existing fixture source/config differs');
  return {
    schemaVersion: 1, scope: 'One deliberately selected residual-loss replay; not a representative sample or new study game.',
    selection: load(root, 'docs/all-family-balance-dryas-trace-selection.json').selection,
    originalReplay: record(root, path), archive: record(root, ARCHIVE), derivedFreeze: record(root, ORIGINAL),
    suite: replay.suite, matchId: replay.matchId, source: replay.source,
    config: record(root, entry.path), canonicalConfigSha256: entry.canonicalSha256,
    scheduleSha256: entry.scheduleSha256, request: replay.request,
    expectedResult, expectedResultSha256: sha(JSON.stringify(expectedResult)),
  };
}

/** This intentionally does not call any full-ledger verifier. */
export async function replayFixture(root, out) {
  const destination = newOutput(root, out), fixture = load(root, FIXTURE);
  for (const row of [fixture.archive, fixture.derivedFreeze, fixture.config]) checkRecord(root, row);
  if (fixture.archive.path !== ARCHIVE || fixture.derivedFreeze.path !== ORIGINAL || sha(JSON.stringify(fixture.expectedResult)) !== fixture.expectedResultSha256) fail('Fixture binding/result hash differs');
  const derived = load(root, ORIGINAL), entry = derived.configs.find(c => c.id === fixture.suite);
  if (!entry || fixture.config.path !== entry.path || fixture.canonicalConfigSha256 !== entry.canonicalSha256 || fixture.scheduleSha256 !== entry.scheduleSha256 || !isDeepStrictEqual(fixture.source, derived.source)) fail('Fixture frozen metadata differs');
  const config = load(root, entry.path);
  if (sha(JSON.stringify(config)) !== entry.canonicalSha256) fail('Fixture canonical config differs');
  const { index, files } = readArchivedSource(root);
  if (!isDeepStrictEqual(index.source, fixture.source)) fail('Fixture/archive source identity differs');
  createOutput(destination);
  const extracted = resolve(destination, 'frozen');
  for (const f of files) put(extracted, f.path, Buffer.from(f.data, 'base64'));
  put(extracted, 'package.json', '{"type":"module"}\n');
  verifySource(extracted, fixture.source);
  const { buildSchedule, runMatch } = await import(pathToFileURL(resolve(extracted, 'scripts/balance-lab/core.mjs')).href);
  const schedule = buildSchedule(config);
  if (sha(JSON.stringify(schedule.cases)) !== entry.scheduleSha256) fail('Reconstructed schedule differs');
  const item = schedule.cases.find(c => c.id === fixture.matchId);
  if (!item || !isDeepStrictEqual(item.request, fixture.request)) fail('Fixture exact request differs');
  const { trace, ...actual } = runMatch({ ...item.request, trace: true });
  if (!isDeepStrictEqual(actual, fixture.expectedResult) || sha(JSON.stringify(actual)) !== fixture.expectedResultSha256 || sha(JSON.stringify(trace)) !== actual.traceHash) fail('Exact fixture replay result/trace differs');
  verifySource(extracted, fixture.source);
  const report = { schemaVersion: 1, verified: true, mode: 'bounded-exact-reconstruction', actualReplaysExecuted: 1, sourceFilesReconstructed: files.length, suite: fixture.suite, matchId: fixture.matchId, traceSha256: actual.traceHash, compactResultSha256: fixture.expectedResultSha256, unitLedgersCompared: actual.units.length, fullStudyRerun: false, limitations: 'One real fixture reconstructed from shipped source/config; omitted ledgers are not independently verified by hashes. Historical study results are retained unchanged.', nodeVersion: process.version };
  put(destination, 'verification.json', json(report));
  return report;
}

export async function verifyPackage(root, out, expectedManifestSha256) {
  const manifestBytes = read(root, MANIFEST);
  if (expectedManifestSha256 && sha(manifestBytes) !== expectedManifestSha256) fail('Pinned manifest SHA-256 differs');
  const manifest = JSON.parse(manifestBytes), included = [];
  if (manifest.format !== 'compact-public-evidence-v1') fail('Unsupported compact manifest');
  for (const page of manifest.inventoryPages) {
    checkRecord(root, page);
    for (const row of load(root, page.path)) {
      safePath(root, row.path);
      if (row.disposition === 'shipped') { checkRecord(root, row); included.push(row.path); }
      else if (row.disposition !== 'omitted-locally-preserved') fail('Unknown artifact disposition');
    }
  }
  for (const path of [FIXTURE, ARCHIVE, ORIGINAL, ...FROZEN, ...REQUIRED_AUDITS, 'docs/all-family-balance-initial64.json', 'docs/all-family-balance-extension-decision.json', 'docs/all-family-pure-confirmation-results.json']) if (!included.includes(path)) fail(`Missing required package artifact: ${path}`);
  requireOriginalFailures(root);
  if (!isDeepStrictEqual(manifest.studySource, load(root, ORIGINAL).source)) fail('Manifest study source differs');
  verifySource(root, manifest.releaseSource);
  verifyAdoptionRecord(root, manifest);
  verifySummaryBindings(root, manifest.studies);
  return replayFixture(root, out);
}

export async function preparePackage(root, out, { allowIncomplete = false, releaseRoot, adoptionRecord } = {}) {
  root = realpathSync(root);
  const destination = newOutput(root, out), original = load(root, ORIGINAL);
  if (Boolean(releaseRoot) !== Boolean(adoptionRecord)) fail('Release root and adoption record are required together');
  if (releaseRoot) newOutput(releaseRoot, out);
  verifySource(root, original.source); requireOriginalFailures(root); readArchivedSource(root);
  const studies = inspectStudies(root), pending = studies.filter(s => s.status === 'incomplete-not-final');
  verifySummaryBindings(root, studies);
  if (pending.length && !allowIncomplete) fail(`Study evidence not final: ${pending.map(s => s.id).join(', ')}; only an explicitly incomplete preview is permitted`);
  const deferred = pending.flatMap(s => [s.root, s.root.replace(/-packed$/, '-analysis'), s.results, s.results.replace(/\.json$/, '.md')]);
  const deferredPath = path => deferred.some(p => path === p || path.startsWith(p + '/')) || (pending.some(s => s.id === 'leader') && path.startsWith('lab-results/all-family-leader-'));
  const entrypoints = ['AGENTS.md', 'README.md', '.gitignore', '.github', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'src', 'public', 'configs', 'scripts', 'docs', 'lab-results'];
  const paths = entrypoints.flatMap(p => list(root, p)).filter(p => !deferredPath(p)).sort();
  const rows = paths.map(path => ({ ...record(root, path), disposition: path.startsWith('lab-results/') || LEDGER_ROOTS.some(p => path.startsWith(p + '/')) ? 'omitted-locally-preserved' : 'shipped' }));
  const metadataPaths = new Set();
  for (const ledger of LEDGER_ROOTS.filter(p => !deferred.includes(p))) {
    for (const path of paths.filter(p => p.startsWith(ledger + '/') && p.endsWith('-index.json'))) {
      metadataPaths.add(path);
      for (const chunk of load(root, path).chunkManifest ?? []) metadataPaths.add(`${ledger}/${chunk.file}`);
    }
  }
  for (const row of rows) if (metadataPaths.has(row.path)) row.disposition = 'shipped';
  const baseRows = rows.map(row => ({ ...row }));
  const adopted = releaseRoot ? inspectAdoption(root, releaseRoot, adoptionRecord, baseRows) : null;
  if (adopted) {
    for (const [path, row] of adopted.overlays) {
      const position = rows.findIndex(r => r.path === path);
      if (position < 0) rows.push(row); else rows[position] = row;
    }
    rows.push({ ...adopted.adoptionRecord, disposition: 'shipped' });
  }
  const fixture = fixtureFromExisting(root);
  createOutput(destination);
  for (const row of rows.filter(r => r.disposition === 'shipped')) {
    const input = adopted && (adopted.overlays.has(row.path) || row.path === adopted.adoptionRecord.path) ? adopted.releaseRoot : root;
    const bytes = read(input, row.path);
    if (sha(bytes) !== row.sha256 || bytes.length !== row.bytes) fail(`Input changed while packaging: ${row.path}`);
    put(destination, row.path, bytes);
  }
  put(destination, FIXTURE, json(fixture));
  put(destination, 'EVIDENCE-README.md', `# Compact evidence export\n\nStatus: ${pending.length ? 'INCOMPLETE PREVIEW; not a final release package' : 'stable recorded evidence snapshot; publication not performed'}.\n\nFull match ledgers remain local and are deliberately not shipped. Hash inventories identify omitted artifacts; they do not recreate or independently verify them. Exact failed original gates and later successful/failed summaries are retained byte-for-byte. Slime's 4MB deduplicated aggregate archive is retained.\n\nRun from this exported tree with Node ${original.source.nodeVersion}:\n\n\`node scripts/balance-lab/prepare-public-evidence.mjs verify --root . --out /absolute/new/replay-directory --manifest-sha256 PINNED_HASH\`\n\nUse the manifest hash reported by the preparer. Verification checks shipped bytes, reconstructs frozen source and rebuilds the exact schedule, then executes one real selected Dryas residual-loss fixture. No original workspace, full ledger, Git history, node_modules or network is required for this replay. It is not a full-study regeneration.\n\n## Existing link and command limitations\n\n- Existing audit links/paths into omitted packed result chunks or lab-results identify locally preserved artifacts and will not open in this export. Shipped indexes and chunk-manifest files are metadata; their existence does not mean their data payloads were shipped.\n- Original full analyzers, packed readers and full-study verifiers remain unchanged and require their original packed roots. They must fail if payloads are absent; the bounded command above is separate.\n- Existing historical source reconstruction commands may require their named older source checkout. Exact archived sources and predecessor snapshots are retained, but this bounded demonstration establishes the all-family fixture only.\n- See docs/balance-evidence-packaging.md for release checks, interpretation and scope, and evidence-public/link-limitations.json for affected Markdown references. Do not copy this export over an existing evidence archive without reviewing its contents.\n`);
  const linkLimitations = [];
  for (const row of rows.filter(r => r.disposition === 'shipped' && r.path.endsWith('.md'))) {
    const lines = read(destination, row.path).toString().split('\n');
    lines.forEach((line, i) => { if (/(?:balance-packed|confirmation-packed|followup-packed|lab-results|read-.*-packed|replay-.*-packed|verify-all-family)/.test(line)) linkLimitations.push({ path: row.path, line: i + 1, text: line, reason: 'Review local-only evidence reference/full-ledger command; original document was not edited.' }); });
  }
  put(destination, 'evidence-public/link-limitations.json', json(linkLimitations));
  for (const path of [FIXTURE, 'EVIDENCE-README.md', 'evidence-public/link-limitations.json']) rows.push({ ...record(destination, path), disposition: 'shipped' });
  // Recheck every snapshotted input. New active files are explicitly outside preview scope.
  for (const row of baseRows) checkRecord(root, row);
  if (adopted) {
    const finalAdoption = inspectAdoption(root, adopted.releaseRoot, adoptionRecord, baseRows);
    if (!isDeepStrictEqual(finalAdoption.adoptionRecord, adopted.adoptionRecord) || !isDeepStrictEqual(finalAdoption.releasePaths, adopted.releasePaths)) fail('Release inputs changed while packaging');
  }
  const afterPaths = entrypoints.flatMap(p => list(root, p)).filter(p => !deferredPath(p)).sort();
  if (!isDeepStrictEqual(paths, afterPaths)) fail('Input file inventory changed while packaging');
  verifySource(root, original.source);
  const inventoryPages = [];
  rows.sort((a, b) => a.path.localeCompare(b.path));
  for (let i = 0; i < rows.length; i += 160) {
    const path = `evidence-public/inventory-${String(inventoryPages.length + 1).padStart(4, '0')}.json`;
    put(destination, path, json(rows.slice(i, i + 160))); inventoryPages.push(record(destination, path));
  }
  const total = disposition => ({ files: rows.filter(r => r.disposition === disposition).length, bytes: rows.filter(r => r.disposition === disposition).reduce((n, r) => n + r.bytes, 0) });
  const manifest = { format: 'compact-public-evidence-v1', status: pending.length ? 'incomplete-preview' : 'stable-snapshot', baselinePublicCommit: 'bc55e50efff7e20be997aa683be95b2b40e88cf9', studySource: original.source, releaseSource: adopted?.adoption.releaseSource ?? original.source, adoption: adopted?.adoptionRecord ?? null, studies, deferredActivePaths: deferred, inventoryPages, shipped: total('shipped'), omittedLocallyPreserved: total('omitted-locally-preserved'), limits: 'Omitted byte hashes are identity records, not shipped evidence or independent verification. All original files remain local. Aggregate release checks, study completion and publication are separate.', fixture: FIXTURE };
  put(destination, MANIFEST, json(manifest));
  return { destination, manifestSha256: sha(read(destination, MANIFEST)), status: manifest.status, shipped: manifest.shipped, omittedLocallyPreserved: manifest.omittedLocallyPreserved, deferredActivePaths: deferred };
}

async function main() {
  const [command, ...args] = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--allow-incomplete') options.allowIncomplete = true;
    else if (['--root', '--out', '--manifest-sha256', '--release-root', '--adoption-record'].includes(flag) && args[i + 1]) options[flag.slice(2)] = args[++i];
    else fail(`Unknown/missing option: ${flag}`);
  }
  if (!options.root || !options.out) fail('Usage: prepare|verify --root INPUT_ROOT --out NEW_OUTPUT [--allow-incomplete|--manifest-sha256 HASH]');
  const result = command === 'prepare' ? await preparePackage(options.root, options.out, { ...options, releaseRoot: options['release-root'], adoptionRecord: options['adoption-record'] }) : command === 'verify' ? await verifyPackage(options.root, options.out, options['manifest-sha256']) : fail('Choose prepare or verify');
  console.log(json(result));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
