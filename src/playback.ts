import type { BattleEvent } from './engine';

export type BattleCue = { at: number; cast: BattleEvent | null; impacts: BattleEvent[] };
export type BattleTimeline = { cues: BattleCue[]; duration: number };

export function effectType(name: string, kind?: string) {
  if (kind === 'heal' || kind === 'cleanse') return 'water';
  if (kind === 'guard' || kind === 'protect') return 'guard';
  if (kind === 'poison') return 'shadow';
  return /炎|火|灼熱|狐火/.test(name) ? 'fire' : /毒|影|冥府|悲鳴/.test(name) ? 'shadow' : /水|雫/.test(name) ? 'water' : /風|翼|疾風|旋風|嵐/.test(name) ? 'wind' : 'slash';
}

// Group one action's impacts so area attacks land together, after the windup.
export function buildTimeline(events: BattleEvent[]): BattleTimeline {
  const groups: { cast: BattleEvent | null; impacts: BattleEvent[] }[] = [];
  for (const event of events) {
    if (event.kind === 'cast') groups.push({ cast: event, impacts: [] });
    else if (event.effect === 'poison' && !event.actor) {
      if (groups.at(-1)?.cast !== null) groups.push({ cast: null, impacts: [] });
      groups.at(-1)!.impacts.push(event);
    } else {
      if (!groups.length) groups.push({ cast: null, impacts: [] });
      groups.at(-1)!.impacts.push(event);
    }
  }
  const cues: BattleCue[] = [];
  let time = 0;
  for (const group of groups) {
    const cast = group.cast ? { ...group.cast, target: group.cast.target ?? group.impacts.find(e => e.target)?.target } : null;
    cues.push({ at: time, cast, impacts: [] });
    if (group.impacts.length) cues.push({ at: time + (cast ? 800 : 240), cast, impacts: group.impacts });
    time += cast ? 1500 : 950;
  }
  return { cues, duration: time + 150 };
}
