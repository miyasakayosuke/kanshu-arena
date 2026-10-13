import { describe, expect, it } from 'vitest';
import type { BattleEvent } from './engine';
import { PARTY_GUARD_MS, partyGuardCues } from './partyGuardCues';

const guard = (actor = 'a0', target = actor): BattleEvent => ({ kind: 'guard', actor, target, guard: true });
const keys = ['a0', 'a1', 'a4'];
const cues = (events: readonly BattleEvent[], now = 1000, speed = 1) => partyGuardCues(events, keys, 7, 3, 1000, speed, now);

describe('authoritative ordinary allied guard presentation', () => {
  it('accepts self-defense and cross-ally protection from event semantics without skill names', () => {
    expect(cues([guard(), guard('a1', 'a4')])).toEqual([
      { id: '7:3:a0', actor: 'a0', target: 'a0', duration: 640, elapsed: 0, expires: 1640 },
      { id: '7:3:a4', actor: 'a1', target: 'a4', duration: 640, elapsed: 0, expires: 1640 },
    ]);
    expect(PARTY_GUARD_MS).toBe(640);
  });

  it.each([
    { kind: 'cast', actor: 'a0', target: 'a1', skill: 'ぼうぎょ', effect: 'guard' },
    { kind: 'damage', actor: 'a0', target: 'a1', amount: 12 },
    { kind: 'heal', actor: 'a0', target: 'a1', amount: 12 },
    { kind: 'cleanse', actor: 'a0', target: 'a1', poison: 0 },
    { kind: 'poison', actor: 'a0', target: 'a1', poison: 3 },
    { kind: 'break', actor: 'a0', target: 'a1', guard: false },
    { kind: 'expire', target: 'a1', guard: false, effect: 'guard' },
    { kind: 'defeat', actor: 'a0', target: 'a1', guard: false, hp: 0 },
    { kind: 'guard', actor: 'a0', target: 'a1', guard: false },
    { kind: 'guard', actor: 'a0', target: 'a1' },
    { kind: 'guard', actor: 'a0', target: 'a1', guard: true, effect: 'extraordinary-response-guard' },
    { kind: 'guard', actor: 'a0', target: 'a1', guard: true, effect: 'other-tagged-effect' },
    guard('e0', 'e0'), guard('e0', 'a1'), guard('a0', 'e1'), guard('a0', 'a3'), guard('a3', 'a1'),
    { kind: 'guard', target: 'a1', guard: true }, { kind: 'guard', actor: 'a1', guard: true },
  ] satisfies BattleEvent[])('does not infer an ordinary allied guard from $kind / $actor / $target / $effect', event => {
    expect(cues([event])).toEqual([]);
  });

  it('deduplicates recipients within an impact without stacking intensity or changing input events', () => {
    const events = [guard('a0', 'a4'), guard('a1', 'a4'), guard('a1', 'a1')];
    const snapshot = structuredClone(events);
    events.forEach(Object.freeze); Object.freeze(events); Object.freeze(keys);
    const result = cues(events);
    expect(result).toHaveLength(2);
    expect(result.map(cue => cue.target)).toEqual(['a4', 'a1']);
    expect(result.map(cue => cue.actor)).toEqual(['a0', 'a1']);
    expect(result.every(cue => cue.duration === PARTY_GUARD_MS)).toBe(true);
    expect(events).toEqual(snapshot); expect(keys).toEqual(['a0', 'a1', 'a4']);
    expect(cues(events)).toEqual(result);
  });

  it.each([1, 2])('has no cue before impact or at/after its absolute expiry at %sx', speed => {
    expect(cues([guard()], 999, speed)).toEqual([]);
    expect(cues([guard()], 1000, speed)[0]).toMatchObject({ duration: 640 / speed, elapsed: 0, expires: 1000 + 640 / speed });
    expect(cues([guard()], 1000 + 640 / speed - 1, speed)[0]).toMatchObject({ elapsed: 640 / speed - 1 });
    expect(cues([guard()], 1000 + 640 / speed, speed)).toEqual([]);
    expect(cues([guard()], 100000, speed)).toEqual([]);
  });

  it.each([1, 2])('uses elapsed scheduled time on a late callback without granting a fresh lifetime at %sx', speed => {
    const result = cues([guard()], 1110, speed)[0];
    expect(result.elapsed).toBe(110); expect(result.expires).toBe(1000 + 640 / speed);
    expect(result.expires - 1110).toBe(640 / speed - 110);
  });

  it('keys repeat casts and separate matches independently, using original unit keys', () => {
    const first = partyGuardCues([guard('a1', 'a4')], keys, 7, 3, 1000, 1, 1000)[0];
    const repeat = partyGuardCues([guard('a1', 'a4')], keys, 7, 4, 2500, 1, 2500)[0];
    const nextMatch = partyGuardCues([guard('a1', 'a4')], keys, 8, 3, 1000, 1, 1000)[0];
    expect(new Set([first.id, repeat.id, nextMatch.id]).size).toBe(3);
    expect([first, repeat, nextMatch].every(cue => cue.target === 'a4' && cue.duration === 640)).toBe(true);
  });
});
