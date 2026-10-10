import type { BattleEvent, State, Unit } from './engine';

export type BattleCue = {
  at: number;
  /** A passive's cast is a presentation-only adapter, never written to engine history. */
  cast: BattleEvent | null;
  impacts: BattleEvent[];
  updates?: BattleEvent[];
  /** Exclude from command/cast counts and label separately from poison. */
  passive?: 'material-repair';
};
export type BattleTimeline = { cues: BattleCue[]; duration: number };

/** Shared by the event timeline and visuals so windup ends at the HP change. */
export const CAST_IMPACT_MS = 800;
export const ACTION_DURATION_MS = 1500;
export const MULTIHIT_INTERVAL_MS = 180;
export const barrageDuration = (hits: number) => ACTION_DURATION_MS + Math.max(0, hits - 1) * MULTIHIT_INTERVAL_MS;

export function effectType(name: string, kind?: string) {
  if (kind === 'heal' || kind === 'cleanse') return 'water';
  if (kind === 'guard' || kind === 'protect') return 'guard';
  if (kind === 'poison') return 'shadow';
  return /炎|火|灼熱|狐火/.test(name) ? 'fire' : /毒|影|冥府|悲鳴/.test(name) ? 'shadow' : /水|雫|海山/.test(name) ? 'water' : /風|翼|疾風|旋風|嵐/.test(name) ? 'wind' : 'slash';
}

/** One reducer serves natural playback, cast-time MP, and quiet expiry cues. */
export function applyBattleEvents(state: State, events: BattleEvent[]): State {
  const update = (unit: Unit): Unit => events.reduce((current, event) => {
    if (event.target !== current.key) return current;
    return { ...current,
      hp: event.hp ?? current.hp,
      mp: event.mp ?? current.mp,
      guard: event.guard ?? (event.kind === 'guard' ? true : event.kind === 'break' || event.kind === 'defeat' ? false : current.guard),
      ...(event.rally !== undefined ? { rally: event.rally } : current.rally !== undefined && event.kind === 'defeat' ? { rally: 0 } : {}),
      ...(event.ward !== undefined ? { ward: event.ward } : current.ward !== undefined && event.kind === 'defeat' ? { ward: 0 } : {}),
      ...(event.dragonCharge !== undefined ? { dragonCharge: event.dragonCharge } : current.dragonCharge !== undefined && event.kind === 'defeat' ? { dragonCharge: 0 } : {}),
      ...(event.repairReady !== undefined ? { repairReady: event.repairReady } : current.repairReady !== undefined && event.kind === 'defeat' ? { repairReady: false } : {}),
      poison: event.poison ?? (event.kind === 'poison' ? 3 : event.kind === 'cleanse' || event.kind === 'defeat' ? 0 : current.poison),
    };
  }, unit);
  return { ...state, allies: state.allies.map(update), enemies: state.enemies.map(update) };
}

// Area hits land together. MP changes at cast start; expiry never masquerades as an attack.
export function buildTimeline(events: BattleEvent[]): BattleTimeline {
  const groups: { cast: BattleEvent | null; impacts: BattleEvent[]; updates: BattleEvent[]; endUpdates: BattleEvent[]; passive?: 'material-repair' }[] = [];
  const before: BattleEvent[] = [];
  const after: BattleEvent[] = [];
  for (const event of events) {
    if (event.kind === 'phase') continue;
    if (event.kind === 'expire') {
      (event.phase === 'turn-start' ? before : after).push(event);
    } else if (event.kind === 'passive' && event.effect === 'material-repair') {
      // Give repair its own visual boundary after poison, without inventing a learned
      // skill/order in the authoritative stream. Absolute readiness changes at start.
      groups.push({ cast: { kind: 'cast', actor: event.actor, skill: event.skill, scope: 'all', targets: [...(event.targets ?? [])], effect: 'heal', passive: 'material-repair' }, impacts: [], updates: [event], endUpdates: [], passive: 'material-repair' });
    } else if (event.kind === 'cast') groups.push({ cast: event, impacts: [], updates: [], endUpdates: [] });
    else if (event.kind === 'charge' && event.effect === 'dragon-charge-gain') {
      if (groups.at(-1)?.cast) groups.at(-1)!.endUpdates.push(event);
      else before.push(event);
    } else if (event.kind === 'resource' || event.kind === 'charge') {
      if (groups.at(-1)?.cast) groups.at(-1)!.updates.push(event);
      else before.push(event);
    } else if (event.effect === 'poison' && !event.actor) {
      if (groups.at(-1)?.cast !== null) groups.push({ cast: null, impacts: [], updates: [], endUpdates: [] });
      groups.at(-1)!.impacts.push(event);
    } else {
      if (!groups.length) groups.push({ cast: null, impacts: [], updates: [], endUpdates: [] });
      groups.at(-1)!.impacts.push(event);
    }
  }
  const cues: BattleCue[] = [];
  let time = 0;
  if (before.length) cues.push({ at: 0, cast: null, impacts: [], updates: before });
  for (const group of groups) {
    let cast: BattleEvent | null = null;
    if (group.cast) {
      // Older event streams lack scope metadata. Count distinct impact recipients,
      // never cast-time resource updates, and retain explicit all even for one survivor.
      const targets = [...new Set(group.cast.targets ?? group.impacts.flatMap(event =>
        event.kind !== 'resource' && event.target ? [event.target] : []))];
      if (!targets.length && group.cast.targets === undefined && group.cast.target) targets.push(group.cast.target);
      const scope = group.cast.scope ?? (targets.length > 1 ? 'all' : 'single');
      cast = { ...group.cast, scope, targets };
      if (scope === 'all' || scope === 'random') delete cast.target;
      else cast.target = group.cast.target ?? targets[0];
    }
    const passive = group.passive ? { passive: group.passive } : {};
    cues.push({ at: time, cast, impacts: [], ...(group.updates.length ? { updates: group.updates } : {}), ...passive });
    if (cast?.scope === 'random') {
      const hits = Math.max(1, cast.hitTargets?.length ?? cast.hits ?? 1);
      for (let index = 0; index < hits; index++) {
        const impacts = group.impacts.filter(event => (event.hitIndex ?? 0) === index);
        if (impacts.length) cues.push({ at: time + CAST_IMPACT_MS + index * MULTIHIT_INTERVAL_MS, cast, impacts });
      }
      if (group.endUpdates.length) cues.push({ at: time + CAST_IMPACT_MS + (hits - 1) * MULTIHIT_INTERVAL_MS, cast: null, impacts: [], updates: group.endUpdates });
      time += barrageDuration(hits);
    } else {
      if (group.impacts.length) cues.push({ at: time + (cast ? CAST_IMPACT_MS : 240), cast, impacts: group.impacts, ...passive });
      if (group.endUpdates.length) cues.push({ at: time + (cast ? CAST_IMPACT_MS : 240), cast: null, impacts: [], updates: group.endUpdates });
      time += cast ? ACTION_DURATION_MS : 950;
    }
  }
  if (after.length) cues.push({ at: time, cast: null, impacts: [], updates: after });
  return { cues, duration: time + 150 };
}
