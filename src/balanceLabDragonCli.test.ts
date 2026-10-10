import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const repository = fileURLToPath(new URL('../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const write = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
describe('dragon CLI failure reproduction in isolated source copies', () => {
  it.each([false, true])('reproduces charge-bearing failure partials and rejects corruption (dragon on right=%s)', reverse => {
    const root = mkdtempSync(join(tmpdir(), 'arena-dragon-cli-'));
    try {
      for (const file of ['scripts/balance-lab/core.mjs', 'scripts/balance-lab/cli.mjs', 'src/engine.ts', 'src/families.ts', 'package.json']) {
        const destination = join(root, file); mkdirSync(dirname(destination), { recursive: true }); copyFileSync(join(repository, file), destination);
      }
      const engine = join(root, 'src/engine.ts');
      writeFileSync(engine, readFileSync(engine, 'utf8').replace(/(export function advanceWithEvents[^\n]*\{\n)/, "$1  if (old.turn === 2 && [...old.allies, ...old.enemies].some(unit => unit.dragonChargePerPoint === 11)) throw new Error('dragon second-turn fixture');\n"));
      const input = join(root, 'input.json');
      const dragon = [15, 5, 16, 17, 18], nature = [14, 3, 6, 9, 10];
      write(input, { schemaVersion: 1, suiteId: 'dragon-failure-cli', seeds: [42], costLimit: 17,
        teams: [{ id: 'a', role: 'fixture left', ids: reverse ? nature : dragon }, { id: 'b', role: 'fixture right', ids: reverse ? dragon : nature }],
        scenarios: [{ id: 'fixture', a: 'a', b: 'b' }], candidate: { id: 'charge11', label: 'Fixture candidate', overrides: { dragonCharge: { perPoint: 11 } } } });
      const invoke = (args: string[]) => spawnSync(process.execPath, [join(root, 'scripts/balance-lab/cli.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
      const run = invoke(['run', '--config', input, '--out', join(root, 'result')]);
      expect(run.status, run.stderr).toBe(1); expect(run.stderr).toContain('Failing match preserved');
      const path = join(root, 'result/failure.json'), failure = read(path), coreKey = reverse ? 'e0' : 'a0';
      expect(failure.trace.turns).toHaveLength(1);
      expect(failure.trace.activeAttempt.unitsBefore).toContainEqual(expect.objectContaining({ key: coreKey, dragonChargePerPoint: 11 }));
      const output = join(root, 'reproduced.json');
      const replay = invoke(['replay-failure', '--failure', path, '--out', output]);
      expect(replay.status, replay.stderr).toBe(0); expect(read(output).reproducedFailure).toBe(true);
      failure.trace.activeAttempt.unitsBefore.find((unit: { key: string }) => unit.key === coreKey).dragonCharge = 99;
      write(path, failure);
      const corrupt = invoke(['replay-failure', '--failure', path, '--out', join(root, 'corrupt.json')]);
      expect(corrupt.status).toBe(1); expect(corrupt.stderr).toContain('Stored failure trace hash differs');
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 30000);
});
