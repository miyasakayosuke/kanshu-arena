import * as historicalEngine from '../tests/reference-v02030/engine';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { advanceWithEvents, autoOrders, DEFAULT_POISON_IMPACT_SCALE, DEFAULT_RESERVE_POISON, start, type State } from './engine';

// Captured before changing defaults, from frozen engine d7b9b0f0 with explicit
// scale0/reservation=true. No result/log/event/order/resource/RNG field is removed.
const expectedDigests = [
  'fa1f42243b8e465cd4fdc10cdf5e2f02ca6a08e3f89b83eeb35472c198d79538',
  '9c0f24496064be53b4b40439b2ce7c4b896336b5933f7d241d17c00f72cf91ca',
  '89b8b1fc86078400212bbad366801a78958980dd53ab7cae2b8749127d2917c0',
];
const withoutControls = (state: State): State => {
  const { reservePoison: _, ...rest } = state;
  return { ...rest, allies: state.allies.map(({ poisonImpactScale: _, ...unit }) => unit), enemies: state.enemies.map(({ poisonImpactScale: _, ...unit }) => unit) };
};

describe('intentional playtest poison-default adoption', () => {
  it('declares state-only poison and reservation-aware automatic orders without per-unit overrides', () => {
    expect(DEFAULT_POISON_IMPACT_SCALE).toBe(0);
    expect(DEFAULT_RESERVE_POISON).toBe(true);
    const state = start([14,3,6,9,10], [32,4,33,34,35]);
    expect(state).not.toHaveProperty('reservePoison');
    expect([...state.allies, ...state.enemies].every(unit => !Object.hasOwn(unit, 'poisonImpactScale'))).toBe(true);
  });
  it('historical v30 reference: exactly matches all 1,014 frozen candidate battles, including ordinary CPU variation and explicit same-AI orders', () => {
    const freeze = JSON.parse(readFileSync('docs/poison-adoption-parity-freeze.json', 'utf8'));
    expect(freeze.engineSha256).toBe('d7b9b0f04fa452f84db22467d5be74b8a11200f82ba7d79d2e0fb777fd7614fd');
    expect(freeze.digests).toEqual(expectedDigests);
    expect(freeze.options).toEqual({ leaders: true, poisonImpactScale: 0, reservePoison: true });
    expect(freeze.normalizedFields).toEqual(['State.reservePoison', 'Unit.poisonImpactScale']);
    const hashes = [createHash('sha256'), createHash('sha256'), createHash('sha256')];
    let count = 0;
    for (const team of freeze.parties as number[][]) for (const enemy of freeze.parties as number[][]) for (const seed of freeze.seeds as number[]) for (const samePolicy of [false,true]) {
      let state = historicalEngine.start(team, enemy, seed, { leaders: true });
      while (!state.winner) state = historicalEngine.advanceWithEvents(state, historicalEngine.autoOrders(state), samePolicy ? { enemyOrders: historicalEngine.autoOrders(state, 'enemies') } : {}).state;
      const line = JSON.stringify({ team, enemy, seed, samePolicy, state: withoutControls(state) }) + '\n';
      hashes[0].update(line); hashes[samePolicy ? 2 : 1].update(line); count++;
    }
    expect(count).toBe(1014);
    expect(hashes.map(hash => hash.digest('hex'))).toEqual(expectedDigests);
  }, 30000);
});
