import { describe, it, expect } from 'vitest';
import { buildTimeline, effectType } from './playback';
import type { BattleEvent } from './engine';
describe('battle presentation timeline', () => {
  it('shows the cast before damage and keeps all-target hits simultaneous', () => {
    const events: BattleEvent[] = [{ kind: 'cast', actor: 'a0', skill: '炎嵐', effect: 'hit' }, { kind: 'damage', actor: 'a0', target: 'e0', amount: 20, hp: 80 }, { kind: 'damage', actor: 'a0', target: 'e1', amount: 20, hp: 70 }];
    const { cues, duration } = buildTimeline(events);
    expect(cues[0].cast?.target).toBe('e0');
    expect(cues[0].impacts).toHaveLength(0);
    expect(cues[1].at - cues[0].at).toBe(800);
    expect(cues[1].impacts).toHaveLength(2);
    expect(duration).toBeGreaterThan(cues[1].at + 500);
  });
  it('separates poison ticks from the final actor', () => {
    const { cues } = buildTimeline([{ kind: 'cast', actor: 'a0', skill: '爪撃' }, { kind: 'damage', actor: 'a0', target: 'e0', hp: 30 }, { kind: 'damage', target: 'e0', hp: 20, effect: 'poison' }]);
    expect(cues).toHaveLength(4);
    expect(cues[2].cast).toBeNull();
    expect(cues[3].impacts[0].effect).toBe('poison');
  });
  it('does not replay a cast when no impact is emitted', () => {
    const { cues } = buildTimeline([{ kind: 'cast', actor: 'a0', skill: '爪撃' }]);
    expect(cues).toHaveLength(1);
  });
  it('classifies support effects without attack flashes', () => {
    expect(effectType('生命の雫', 'heal')).toBe('water');
    expect(effectType('鉄壁の構え', 'guard')).toBe('guard');
    expect(effectType('炎嵐', 'hit')).toBe('fire');
    expect(effectType('毒霧', 'poison')).toBe('shadow');
  });
});
