import type { BattleEvent } from './engine';

/** Brief presentation of a resolved ordinary guard, never a new protection state. */
export type PartyGuardCue = { id: string; actor: string; target: string; duration: number; elapsed: number; expires: number };
export const PARTY_GUARD_MS = 640;

export function partyGuardCues(events: readonly BattleEvent[], alliedKeys: readonly string[], replay: number, cue: number, impactAt: number, speed: number, now: number): PartyGuardCue[] {
  const duration = PARTY_GUARD_MS / speed;
  const expires = impactAt + duration;
  // Throttled/background callbacks must not replay a visual whose window passed.
  if (now < impactAt || now >= expires) return [];
  const targets = new Set<string>();
  return events.flatMap(event => {
    if (event.kind !== 'guard' || event.guard !== true || event.effect !== undefined
      || !event.actor || !alliedKeys.includes(event.actor) || !event.target || !alliedKeys.includes(event.target)
      || targets.has(event.target)) return [];
    targets.add(event.target);
    return [{ id: `${replay}:${cue}:${event.target}`, actor: event.actor, target: event.target, duration,
      elapsed: Math.max(0, now - impactAt), expires }];
  });
}
