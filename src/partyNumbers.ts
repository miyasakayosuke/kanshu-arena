import type { BattleEvent } from './engine';
import { NUMBER_DURATION_MS } from './battleMotion';

/** Presentation only. Never replay these events into battle state. */
export type PartyNumber = { id: string; event: BattleEvent; expires: number; lane: number };
export const MAX_PARTY_NUMBERS = 4;
export const partyNumberDuration = (speed: number) => NUMBER_DURATION_MS / speed;
export function retainPartyNumbers(previous: PartyNumber[], events: BattleEvent[], recipients: string[], replay: number, cast: number, cue: number, now: number, speed: number): PartyNumber[] {
  let next = previous.filter(item => item.expires > now);
  events.forEach((event, index) => {
    if (!event.target || !recipients.includes(event.target) || event.amount === undefined || !['damage', 'heal', 'resource-gain', 'resource-loss'].includes(event.kind)) return;
    const id = `${replay}:${cast}:${cue}:${event.hitIndex ?? 0}:${event.target}:${event.kind}:${index}`;
    if (next.some(item => item.id === id)) return;
    const current = next.filter(item => item.event.target === event.target);
    if (current.length >= MAX_PARTY_NUMBERS) next = next.filter(item => item.id !== current[0].id);
    const used = next.filter(item => item.event.target === event.target).map(item => item.lane);
    const lane = Array.from({ length: MAX_PARTY_NUMBERS }, (_, i) => i).find(i => !used.includes(i))!;
    next.push({ id, event, expires: now + partyNumberDuration(speed), lane });
  });
  return next;
}
