/** Run only against the archived pre-adoption source; never updates expected hashes. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import * as engine from '../../src/engine.ts';
const sourcePath = new URL('../../src/engine.ts', import.meta.url);
const expectedSource = 'd7b9b0f04fa452f84db22467d5be74b8a11200f82ba7d79d2e0fb777fd7614fd';
const sha = value => createHash('sha256').update(value).digest('hex');
if (sha(readFileSync(sourcePath)) !== expectedSource) throw Error('Use the exact archived pre-adoption engine, not later live defaults');
const out = process.argv[2];
if (!out) throw Error('Pass an explicit new output file');
const parties = [[19,20,21,22,23],[15,5,16,17,18],[12,0,2,11,13],[14,3,6,9,10],[1,5,8,10,6],[4,7,8,13,22],[24,25,26,27,28],[29,1,8,30,31],[32,4,33,34,35],[32,4,35,3,10],[36,12,2,30,26],[36,4,3,10,30],[36,14,10,20,35]];
const normalize = state => {
  const { reservePoison: _, ...rest } = state;
  return { ...rest, allies: state.allies.map(({ poisonImpactScale: _, ...unit }) => unit), enemies: state.enemies.map(({ poisonImpactScale: _, ...unit }) => unit) };
};
const options = { leaders: true, poisonImpactScale: 0, reservePoison: true };
const digests = [createHash('sha256'), createHash('sha256'), createHash('sha256')];
let count = 0;
for (const team of parties) for (const enemy of parties) for (const seed of [0,42,4294967295]) for (const samePolicy of [false,true]) {
  let state = engine.start(team, enemy, seed, options);
  while (!state.winner) state = engine.advanceWithEvents(state, engine.autoOrders(state), samePolicy ? { enemyOrders: engine.autoOrders(state, 'enemies') } : {}).state;
  const line = JSON.stringify({ team, enemy, seed, samePolicy, state: normalize(state) }) + '\n';
  digests[0].update(line); digests[samePolicy ? 2 : 1].update(line); count++;
}
if (sha(readFileSync(sourcePath)) !== expectedSource) throw Error('Source drift during capture');
const record = { kind: 'pre-adoption production parity contract, not independent balance evidence', recordedAt: new Date().toISOString(), engineSha256: expectedSource, nodeVersion: process.version, parties, seeds: [0,42,4294967295], options, count, normalizedFields: ['State.reservePoison','Unit.poisonImpactScale'], digests: digests.map(hash => hash.digest('hex')) };
writeFileSync(out, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ count, digests: record.digests, engineSha256: expectedSource }));
