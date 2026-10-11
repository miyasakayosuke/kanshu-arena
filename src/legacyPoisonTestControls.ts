import type { State } from './engine';

/**
 * Test-only serialization of historical poison-control battles. Remove exactly
 * the optional State.reservePoison and Unit.poisonImpactScale metadata; keep
 * roster data, logs, history, orders, events, HP/MP, statuses and RNG untouched.
 * This does not turn a playtest-default battle into a historical battle. For
 * historical digests, simulate with poisonImpactScale: 1 and reservePoison: false.
 */
export const withoutPoisonControlMetadata = (state: State): State => {
  const { reservePoison: _, ...rest } = state;
  return {
    ...rest,
    allies: state.allies.map(({ poisonImpactScale: _, ...unit }) => unit),
    enemies: state.enemies.map(({ poisonImpactScale: _, ...unit }) => unit),
  };
};
