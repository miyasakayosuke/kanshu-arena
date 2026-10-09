import type { BattleEvent, State, Unit } from './engine';

export type BattleCue = { at: number; cast: BattleEvent | null; impacts: BattleEvent[]; updates?: BattleEvent[] };
export type BattleTimeline = { cues: BattleCue[]; duration: number };

export function effectType(name: string, kind?: string) {
  if (kind === 'heal' || kind === 'cleanse') return 'water';
  if (kind === 'guard' || kind === 'protect') return 'guard';
  if (kind === 'poison') return 'shadow';
  return /炎|火|灼熱|狐火/.test(name) ? 'fire' : /毒|影|冥府|悲鳴/.test(name) ? 'shadow' : /水|雫/.test(name) ? 'water' : /風|翼|疾風|旋風|嵐/.test(name) ? 'wind' : 'slash';
}

/** One reducer serves natural playback, cast-time MP, and quiet expiry cues. */
export function applyBattleEvents(state: State, events: BattleEvent[]): State {
  const update = (unit: Unit): Unit => events.reduce((current, event) => {
    if (event.target !== current.key) return current;
    return { ...current,
      hp: event.hp ?? current.hp,
      mp: event.mp ?? current.mp,
      guard: event.guard ?? (event.kind === 'guard' ? true : event.kind === 'break' || event.kind === 'defeat' ? false : current.guard),
      poison: event.poison ?? (event.kind === 'poison' ? 3 : event.kind === 'cleanse' || event.kind === 'defeat' ? 0 : current.poison),
    };
  }, unit);
  return { ...state, allies: state.allies.map(update), enemies: state.enemies.map(update) };
}

// Area hits land together. MP changes at cast start; expiry never masquerades as an attack.
export function buildTimeline(events: BattleEvent[]): BattleTimeline {
  const groups: { cast: BattleEvent | null; impacts: BattleEvent[]; updates: BattleEvent[] }[] = [];
  const before: BattleEvent[] = [];
  const after: BattleEvent[] = [];
  for (const event of events) {
    if (event.kind === 'phase') continue;
    if (event.kind === 'expire') {
      (event.phase === 'turn-start' ? before : after).push(event);
    } else if (event.kind === 'cast') groups.push({ cast: event, impacts: [], updates: [] });
    else if (event.kind === 'resource') {
      if (groups.at(-1)?.cast) groups.at(-1)!.updates.push(event);
      else before.push(event);
    } else if (event.effect === 'poison' && !event.actor) {
      if (groups.at(-1)?.cast !== null) groups.push({ cast: null, impacts: [], updates: [] });
      groups.at(-1)!.impacts.push(event);
    } else {
      if (!groups.length) groups.push({ cast: null, impacts: [], updates: [] });
      groups.at(-1)!.impacts.push(event);
    }
  }
  const cues: BattleCue[] = [];
  let time = 0;
  if (before.length) cues.push({ at: 0, cast: null, impacts: [], updates: before });
  for (const group of groups) {
    const cast = group.cast ? { ...group.cast, target: group.cast.target ?? group.impacts.find(e => e.target)?.target } : null;
    cues.push({ at: time, cast, impacts: [], ...(group.updates.length ? { updates: group.updates } : {}) });
    if (group.impacts.length) cues.push({ at: time + (cast ? 800 : 240), cast, impacts: group.impacts });
    time += cast ? 1500 : 950;
  }
  if (after.length) cues.push({ at: time, cast: null, impacts: [], updates: after });
  return { cues, duration: time + 150 };
}
