import { describe, expect, it } from 'vitest';
import { buildTimeline, ACTION_DURATION_MS, barrageDuration } from './playback';
import type { BattleEvent } from './engine';
describe('authoritative replay command spans', () => {
  it('excludes passive repair, poison, and a defeated queued unit without a cast', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'e0', skill: '攻撃' },
      { kind: 'damage', actor: 'e0', target: 'a1', hp: 0, amount: 10 },
      { kind: 'defeat', target: 'a1' },
      { kind: 'cast', actor: 'a0', skill: 'ぼうぎょ' },
      { kind: 'guard', actor: 'a0', target: 'a0' },
      { kind: 'damage', target: 'a0', effect: 'poison', amount: 1 },
      { kind: 'passive', actor: 'a2', effect: 'material-repair', targets: ['a0','a2'] },
      { kind: 'heal', actor: 'a2', target: 'a0', amount: 10 },
    ];
    expect(buildTimeline(events).commands).toEqual([
      { actor: 'e0', start: 0, end: ACTION_DURATION_MS },
      { actor: 'a0', start: ACTION_DURATION_MS, end: ACTION_DURATION_MS * 2 },
    ]);
  });
  it('counts fallback only once and completes multi-hit after the final recovery', () => {
    const events: BattleEvent[] = [
      { kind: 'fallback', actor: 'a0' }, { kind: 'cast', actor: 'a0', skill: '攻撃' },
      { kind: 'damage', actor: 'a0', target: 'e0', amount: 1 },
      { kind: 'cast', actor: 'a1', scope: 'random', hits: 4, hitTargets: ['e0','e1','e0','e1'] },
      { kind: 'damage', actor: 'a1', target: 'e1', amount: 1, hitIndex: 3 },
    ];
    expect(buildTimeline(events).commands).toEqual([
      { actor: 'a0', start: 0, end: 1500 },
      { actor: 'a1', start: 1500, end: 1500 + barrageDuration(4) },
    ]);
  });
});
