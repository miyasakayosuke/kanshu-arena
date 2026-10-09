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

describe('counter-skill playback', () => {
  it('uses friendly support effects for protection and cleansing', () => {
    expect(effectType('守護の誓い', 'protect')).toBe('guard');
    expect(effectType('蛇鱗の庇護', 'protect')).toBe('guard');
    expect(effectType('清めの鈴', 'cleanse')).toBe('water');
    expect(effectType('潮騒の浄化', 'cleanse')).toBe('water');
  });

  it('replays guard breaking together with its hit and in the original impact order', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'a0', target: 'e0', skill: '破城の拳', effect: 'hit' },
      { kind: 'break', actor: 'a0', target: 'e0' },
      { kind: 'damage', actor: 'a0', target: 'e0', amount: 50, hp: 50 },
    ];
    const { cues } = buildTimeline(events);
    expect(cues).toHaveLength(2);
    expect(cues[1].impacts).toEqual(events.slice(1));
    expect(cues[1].at - cues[0].at).toBe(800);
  });

  it('clears poison and restores HP at one shared impact after the cleanse windup', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'a0', target: 'a1', skill: '清めの鈴', effect: 'cleanse' },
      { kind: 'cleanse', actor: 'a0', target: 'a1' },
      { kind: 'heal', actor: 'a0', target: 'a1', amount: 35, hp: 80 },
    ];
    const { cues } = buildTimeline(events);
    expect(cues[0].impacts).toEqual([]);
    expect(cues[1].impacts).toEqual(events.slice(1));
    expect(cues[1].cast?.target).toBe('a1');
  });

  it('preserves protection followed by an attack and a separate poison tick without mutating events', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'a0', target: 'a1', skill: '守護の誓い', effect: 'protect' },
      { kind: 'guard', actor: 'a0', target: 'a1' },
      { kind: 'cast', actor: 'e0', target: 'a1', skill: '影斬り', effect: 'hit' },
      { kind: 'damage', actor: 'e0', target: 'a1', amount: 20, hp: 80 },
      { kind: 'damage', target: 'a1', amount: 6, hp: 74, effect: 'poison' },
    ];
    const before = structuredClone(events);
    events.forEach(Object.freeze);
    Object.freeze(events);
    const { cues } = buildTimeline(events);
    expect(cues.map(cue => cue.impacts).flat()).toEqual(events.filter(event => event.kind !== 'cast'));
    expect(cues.filter(cue => cue.impacts.length).map(cue => cue.at)).toEqual([800, 2300, 3240]);
    expect(events).toEqual(before);
  });
});
