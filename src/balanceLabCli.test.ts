import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const configuration = {
  schemaVersion: 1, suiteId: 'cli-test', seeds: [42], costLimit: 17,
  teams: [
    { id: 'beasts', role: 'beast synergy', ids: [12, 0, 2, 6, 10] },
    { id: 'guards', role: 'guard and healing', ids: [1, 2, 7, 10, 6] },
  ],
  scenarios: [{ id: 'beasts-vs-guards', a: 'beasts', b: 'guards', complaintIds: [], keyUnitId: 12 }],
  candidate: { id: 'identity', label: 'Unchanged rules', overrides: {} },
};
type Report = {
  source: { engineSha256: string; labSha256: string; configSha256: string };
  config: typeof configuration;
  scheduleCounts: { matches: number };
  matches: { id: string; result: { traceHash: string } }[];
};
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
function invoke(args: string[], root = repository) {
  const result = spawnSync(process.execPath, [join(root, 'scripts/balance-lab/cli.mjs'), ...args], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  expect(result.error).toBeUndefined();
  return result;
}

let temporary: string;
let reportPath: string;
let report: Report;
let fixtureRoot: string;
let failurePath: string;

beforeAll(() => {
  temporary = mkdtempSync(join(tmpdir(), 'arena-balance-lab-cli-'));
  const input = join(temporary, 'input.json');
  writeJson(input, configuration);
  const run = invoke(['run', '--config', input, '--out', join(temporary, 'report')]);
  expect(run.status, run.stderr).toBe(0);
  reportPath = join(temporary, 'report/report.json');
  report = readJson<Report>(reportPath);

  // An isolated copy is deliberately broken to exercise the real failure CLI.
  // Never patch the production resolver, even temporarily.
  fixtureRoot = join(temporary, 'broken-fixture');
  for (const file of ['scripts/balance-lab/cli.mjs', 'scripts/balance-lab/core.mjs', 'src/engine.ts', 'package.json']) {
    const destination = join(fixtureRoot, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repository, file), destination);
  }
  const enginePath = join(fixtureRoot, 'src/engine.ts');
  const original = readFileSync(enginePath, 'utf8');
  const signature = /(export function advanceWithEvents[^\n]*\{\n)/;
  expect(original.match(signature)).not.toBeNull();
  writeFileSync(enginePath, original.replace(signature, "$1  throw new Error('fixture resolver failure');\n"));
  const failureRun = invoke(['run', '--config', input, '--out', join(temporary, 'failure')], fixtureRoot);
  expect(failureRun.status).toBe(1);
  expect(failureRun.stderr).toContain('Failing match preserved');
  failurePath = join(temporary, 'failure/failure.json');
}, 30000);

afterAll(() => {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
});

describe('balance lab real CLI integration', () => {
  it('writes a complete 12-match report and deterministically replays a selected match', () => {
    expect(report.scheduleCounts.matches).toBe(12);
    expect(report.matches).toHaveLength(12);
    expect(existsSync(join(temporary, 'report/config.json'))).toBe(true);
    expect(readFileSync(join(temporary, 'report/report.md'), 'utf8')).toContain('Physical side and initiative diagnostics');
    const destination = join(temporary, 'replay.json');
    const result = invoke(['replay', '--report', reportPath, '--match', report.matches[0].id, '--out', destination]);
    expect(result.status, result.stderr).toBe(0);
    const replay = readJson<{ verified: boolean; result: { traceHash: string; trace: { turns: unknown[] } } }>(destination);
    expect(replay.verified).toBe(true);
    expect(replay.result.traceHash).toBe(report.matches[0].result.traceHash);
    expect(replay.result.trace.turns.length).toBeGreaterThan(0);
  });

  it.each(['engine', 'lab', 'config', 'trace'] as const)('rejects %s evidence tampering without producing a replay', kind => {
    const modified = structuredClone(report);
    if (kind === 'engine') modified.source.engineSha256 = '0'.repeat(64);
    else if (kind === 'lab') modified.source.labSha256 = '0'.repeat(64);
    else if (kind === 'config') modified.config.seeds = [43];
    else modified.matches[0].result.traceHash = '0'.repeat(64);
    const input = join(temporary, `tampered-${kind}.json`);
    const output = join(temporary, `rejected-${kind}.json`);
    writeJson(input, modified);
    const result = invoke(['replay', '--report', input, '--match', report.matches[0].id, '--out', output]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/differs|hash/i);
    expect(existsSync(output)).toBe(false);
  });

  it.each(['unknown-field', 'roster-cost', 'work-budget'] as const)('rejects invalid %s configuration before writing any successful report', kind => {
    const invalid = structuredClone(configuration);
    if (kind === 'roster-cost') invalid.teams[0].ids = [12, 0, 5, 7, 11];
    else if (kind === 'work-budget') invalid.seeds = Array.from({ length: 1000 }, (_, i) => i);
    const input = join(temporary, `invalid-${kind}.json`);
    const output = join(temporary, `invalid-${kind}`);
    writeJson(input, kind === 'unknown-field' ? { ...invalid, typo: true }
      : kind === 'work-budget' ? { ...invalid, sampling: { count: 2, seed: 42 } } : invalid);
    const result = invoke(['run', '--config', input, '--out', output]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/unknown field|cost exceeds|workload exceeds/);
    expect(existsSync(join(output, 'report.json'))).toBe(false);
    expect(existsSync(join(output, 'report.md'))).toBe(false);
  });

  it('refuses existing generated outputs unless overwrite is explicit', () => {
    const before = readFileSync(reportPath, 'utf8');
    const result = invoke(['run', '--config', join(temporary, 'input.json'), '--out', join(temporary, 'report')]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/overwrite/i);
    expect(readFileSync(reportPath, 'utf8')).toBe(before);
  });

  it('preserves prior evidence and warns about it when overwrite receives an invalid config', () => {
    const before = readFileSync(reportPath, 'utf8');
    const input = join(temporary, 'invalid-overwrite.json');
    writeJson(input, { ...configuration, typo: true });
    const result = invoke(['run', '--config', input, '--out', join(temporary, 'report'), '--overwrite']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown field');
    expect(result.stderr).toMatch(/remain|stale|previous|existing/i);
    expect(readFileSync(reportPath, 'utf8')).toBe(before);
  });

  it('clears a stale failure after a successful explicit overwrite and preserves unrelated files', () => {
    const output = join(temporary, 'failure-then-success');
    const input = join(temporary, 'input.json');
    const failed = invoke(['run', '--config', input, '--out', output], fixtureRoot);
    expect(failed.status).toBe(1);
    expect(existsSync(join(output, 'failure.json'))).toBe(true);
    writeFileSync(join(output, 'notes.txt'), 'Keep this unrelated file');
    const successful = invoke(['run', '--config', input, '--out', output, '--overwrite']);
    expect(successful.status, successful.stderr).toBe(0);
    expect(existsSync(join(output, 'report.json'))).toBe(true);
    expect(existsSync(join(output, 'report.md'))).toBe(true);
    expect(existsSync(join(output, 'config.json'))).toBe(true);
    expect(existsSync(join(output, 'failure.json'))).toBe(false);
    expect(readFileSync(join(output, 'notes.txt'), 'utf8')).toBe('Keep this unrelated file');
  });

  it('removes previous success evidence when an explicit overwrite produces a captured failure', () => {
    const output = join(temporary, 'success-then-failure');
    const input = join(temporary, 'input.json');
    const successful = invoke(['run', '--config', input, '--out', output]);
    expect(successful.status, successful.stderr).toBe(0);
    const failed = invoke(['run', '--config', input, '--out', output, '--overwrite'], fixtureRoot);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('Failing match preserved');
    expect(existsSync(join(output, 'failure.json'))).toBe(true);
    expect(existsSync(join(output, 'report.json'))).toBe(false);
    expect(existsSync(join(output, 'report.md'))).toBe(false);
    expect(existsSync(join(output, 'config.json'))).toBe(false);
  });

  it('captures a resolver failure and verifies its request, error, and full trace on replay', () => {
    const failure = readJson<{
      error: string; matchId: string; traceSha256: string;
      trace: { activeAttempt: { turn: number; orders: unknown[]; enemyOrders: unknown[] }; turns: unknown[] };
    }>(failurePath);
    expect(failure.error).toBe('fixture resolver failure');
    expect(failure.matchId).toBe('beasts-vs-guards__s42__a-left__baseline');
    expect(failure.traceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(failure.trace.activeAttempt.turn).toBe(1);
    expect(failure.trace.activeAttempt.orders).toHaveLength(5);
    expect(failure.trace.activeAttempt.enemyOrders).toHaveLength(5);
    expect(failure.trace.turns).toEqual([]);
    expect(existsSync(join(temporary, 'failure/report.json'))).toBe(false);
    const destination = join(temporary, 'replayed-failure.json');
    const result = invoke(['replay-failure', '--failure', failurePath, '--out', destination], fixtureRoot);
    expect(result.status, result.stderr).toBe(0);
    const replay = readJson<{ reproducedFailure: boolean; traceSha256: string; error: string }>(destination);
    expect(replay.reproducedFailure).toBe(true);
    expect(replay.traceSha256).toBe(failure.traceSha256);
    expect(replay.error).toBe(failure.error);
  });

  it.each(['request', 'trace', 'message'] as const)('rejects a tampered failure %s instead of claiming reproduction', kind => {
    const failure = readJson<{ request: { seed: number }; trace: { activeAttempt: { seedBefore: number } }; error: string }>(failurePath);
    if (kind === 'request') failure.request.seed = 43;
    else if (kind === 'trace') failure.trace.activeAttempt.seedBefore = 43;
    else failure.error = 'a different failure';
    const input = join(temporary, `tampered-failure-${kind}.json`);
    const output = join(temporary, `rejected-failure-${kind}.json`);
    writeJson(input, failure);
    const result = invoke(['replay-failure', '--failure', input, '--out', output], fixtureRoot);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/differ/i);
    if (existsSync(output)) {
      expect(readJson<{ reproducedFailure: boolean }>(output).reproducedFailure).toBe(false);
    }
  });
});
