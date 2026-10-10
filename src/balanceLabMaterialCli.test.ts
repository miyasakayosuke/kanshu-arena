import { describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const write = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copyFixture = (root: string) => {
  for (const file of ['scripts/balance-lab/core.mjs', 'scripts/balance-lab/cli.mjs', 'src/engine.ts', 'src/families.ts', 'package.json']) {
    const destination = join(root, file); mkdirSync(dirname(destination), { recursive: true }); copyFileSync(join(repository, file), destination);
  }
};
const fixtureConfig = (reverse: boolean) => ({ schemaVersion: 1, suiteId: 'material-failure-cli', seeds: [42], costLimit: 17,
  teams: [{ id: 'a', role: 'fixture left', ids: reverse ? [14, 3, 6, 9, 10] : [19, 20, 21, 22, 23] },
    { id: 'b', role: 'fixture right', ids: reverse ? [19, 20, 21, 22, 23] : [14, 3, 6, 9, 10] }],
  scenarios: [{ id: 'fixture', a: 'a', b: 'b' }], candidate: { id: 'repair11', label: 'Material CLI fixture', overrides: { materialRepair: { percent: 11 } } } });
const invoke = (root: string, args: string[]) => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/balance-lab/cli.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
  expect(result.error).toBeUndefined();
  return result;
};
type Snapshot = { key: string; repairReady?: boolean; repairPercent?: number };

describe('material CLI replay and failure evidence in isolated source copies', () => {
  it('writes material metrics and replays optional default/tuned snapshots in both orientations', () => {
    const root = mkdtempSync(join(tmpdir(), 'arena-material-cli-success-'));
    try {
      copyFixture(root);
      const input = join(root, 'input.json'); write(input, fixtureConfig(false));
      const run = invoke(root, ['run', '--config', input, '--out', join(root, 'result')]);
      expect(run.status, run.stderr).toBe(0);
      const path = join(root, 'result/report.json'), report = read(path);
      const markdown = readFileSync(join(root, 'result/report.md'), 'utf8');
      expect(markdown).toContain('meanRepairHealing');
      expect(markdown).toContain('meanRepairMpSpent');
      expect(report.summary.baseline.meanRepairMpSpent).toBe(0);
      for (const orientation of ['a-left', 'a-right']) for (const variant of ['baseline', 'candidate']) {
        const match = report.matches.find((row: { scenarioId: string; orientation: string; variant: string }) => row.scenarioId === 'fixture' && row.orientation === orientation && row.variant === variant);
        const output = join(root, `replay-${orientation}-${variant}.json`);
        const replay = invoke(root, ['replay', '--report', path, '--match', match.id, '--out', output]);
        expect(replay.status, replay.stderr).toBe(0);
        const verified = read(output), key = orientation === 'a-left' ? 'a0' : 'e0';
        expect(verified.verified).toBe(true);
        expect(verified.result.traceHash).toBe(match.result.traceHash);
        for (const turn of verified.result.trace.turns) for (const unit of turn.unitsAfter as Snapshot[]) {
          if (unit.key === key) {
            expect(unit.repairReady).toBe(false);
            if (variant === 'candidate') expect(unit.repairPercent).toBe(11);
            else expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
          } else {
            expect(Object.hasOwn(unit, 'repairReady')).toBe(false);
            expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
          }
        }
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 30000);

  it.each([false, true])('reproduces repair-bearing failure partials and rejects snapshot corruption (material on right=%s)', reverse => {
    const root = mkdtempSync(join(tmpdir(), 'arena-material-cli-failure-'));
    try {
      copyFixture(root);
      const engine = join(root, 'src/engine.ts'), original = readFileSync(engine, 'utf8');
      const marker = /(export function advanceWithEvents[^\n]*\{\n)/;
      expect(original.match(marker)).not.toBeNull();
      writeFileSync(engine, original.replace(marker, "$1  if (old.turn === 2 && [...old.allies, ...old.enemies].some(unit => unit.repairPercent === 11)) throw new Error('material second-turn fixture');\n"));
      const input = join(root, 'input.json'); write(input, fixtureConfig(reverse));
      const run = invoke(root, ['run', '--config', input, '--out', join(root, 'result')]);
      expect(run.status, run.stderr).toBe(1);
      expect(run.stderr).toContain('Failing match preserved');
      expect(existsSync(join(root, 'result/report.json'))).toBe(false);
      const path = join(root, 'result/failure.json'), failure = read(path), key = reverse ? 'e0' : 'a0';
      expect(failure.trace.turns).toHaveLength(1);
      expect(failure.trace.activeAttempt.unitsBefore).toContainEqual(expect.objectContaining({ key, repairReady: false, repairPercent: 11 }));
      for (const unit of failure.trace.activeAttempt.unitsBefore as Snapshot[]) if (unit.key !== key) {
        expect(Object.hasOwn(unit, 'repairReady')).toBe(false);
        expect(Object.hasOwn(unit, 'repairPercent')).toBe(false);
      }
      const output = join(root, 'reproduced.json');
      const replay = invoke(root, ['replay-failure', '--failure', path, '--out', output]);
      expect(replay.status, replay.stderr).toBe(0);
      expect(read(output).reproducedFailure).toBe(true);
      expect(read(output).trace).toEqual(failure.trace);
      for (const kind of ['readiness', 'percent', 'missing', 'invented'] as const) {
        const corrupt = structuredClone(failure);
        const units: Snapshot[] = corrupt.trace.activeAttempt.unitsBefore;
        const core = units.find(unit => unit.key === key)!;
        if (kind === 'readiness') core.repairReady = true;
        else if (kind === 'percent') core.repairPercent = 12;
        else if (kind === 'missing') delete core.repairReady;
        else units.find(unit => unit.key !== key)!.repairReady = false;
        const corruptPath = join(root, `corrupt-${kind}.json`), corruptOutput = join(root, `rejected-${kind}.json`);
        write(corruptPath, corrupt);
        const rejected = invoke(root, ['replay-failure', '--failure', corruptPath, '--out', corruptOutput]);
        expect(rejected.status).toBe(1);
        expect(rejected.stderr).toContain('Stored failure trace hash differs');
        expect(existsSync(corruptOutput)).toBe(false);
        // Even a recomputed envelope hash cannot turn changed snapshots into reproduction.
        corrupt.traceSha256 = hash(corrupt.trace); write(corruptPath, corrupt);
        const forged = invoke(root, ['replay-failure', '--failure', corruptPath, '--out', corruptOutput]);
        expect(forged.status).toBe(1);
        expect(forged.stderr).toContain('Failure message, request or trace differed');
        expect(read(corruptOutput).reproducedFailure).toBe(false);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 30000);
});
