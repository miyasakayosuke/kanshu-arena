import { describe, it, expect } from 'vitest';
import { ACTION_DURATION_MS, applyBattleEvents, buildTimeline, CAST_IMPACT_MS, effectType } from './playback';
import { advanceWithEvents, start } from './engine';
import type { BattleEvent } from './engine';
describe('battle presentation timeline', () => {
  it('shows the cast before damage and keeps all-target hits simultaneous', () => {
    const events: BattleEvent[] = [{ kind: 'cast', actor: 'a0', skill: '炎嵐', effect: 'hit' }, { kind: 'damage', actor: 'a0', target: 'e0', amount: 20, hp: 80 }, { kind: 'damage', actor: 'a0', target: 'e1', amount: 20, hp: 70 }];
    const { cues, duration } = buildTimeline(events);
    expect(cues[0].cast).toMatchObject({ scope: 'all', targets: ['e0', 'e1'] });
    expect(cues[0].cast).not.toHaveProperty('target');
    expect(cues[0].impacts).toHaveLength(0);
    expect(cues[1].at - cues[0].at).toBe(CAST_IMPACT_MS);
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

describe('cast scope normalization', () => {
  it('keeps explicit all scope even with one target, removing any obsolete single target', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'e0', target: 'a2', targets: ['a2'], scope: 'all', skill: '炎嵐' },
      { kind: 'damage', actor: 'e0', target: 'a2', amount: 20, hp: 80 },
    ];
    const { cues } = buildTimeline(events);
    for (const cue of cues) {
      expect(cue.cast).toMatchObject({ scope: 'all', targets: ['a2'] });
      expect(cue.cast).not.toHaveProperty('target');
    }
  });

  it('uses explicit cast targets when no impacts are present, including an empty all scope', () => {
    for (const targets of [[], ['e1'], ['e1', 'e2']]) {
      const { cues } = buildTimeline([{ kind: 'cast', actor: 'a0', scope: 'all', targets }]);
      expect(cues[0].cast).toMatchObject({ scope: 'all', targets });
      expect(cues[0].cast).not.toHaveProperty('target');
      expect(cues).toHaveLength(1);
    }
  });

  it('deduplicates legacy impact recipients and excludes caster MP from target inference', () => {
    const { cues } = buildTimeline([
      { kind: 'cast', actor: 'a0', skill: '毒霧' },
      { kind: 'resource', actor: 'a0', target: 'a0', mp: 42, amount: 12 },
      { kind: 'damage', actor: 'a0', target: 'e2', hp: 0 },
      { kind: 'defeat', actor: 'a0', target: 'e2', hp: 0 },
      { kind: 'poison', actor: 'a0', target: 'e2', poison: 3 },
    ]);
    expect(cues[0].cast).toMatchObject({ scope: 'single', target: 'e2', targets: ['e2'] });
    expect(cues[0].updates).toHaveLength(1);
    expect(cues[1].impacts).toHaveLength(3);
  });

  it('infers legacy all scope from distinct impact recipients despite repeated status events', () => {
    const { cues } = buildTimeline([
      { kind: 'cast', actor: 'e0', target: 'a1', skill: '毒霧' },
      { kind: 'resource', actor: 'e0', target: 'e0', mp: 42 },
      { kind: 'damage', actor: 'e0', target: 'a1', hp: 80 },
      { kind: 'poison', actor: 'e0', target: 'a1', poison: 3 },
      { kind: 'damage', actor: 'e0', target: 'a3', hp: 0 },
      { kind: 'defeat', actor: 'e0', target: 'a3', hp: 0 },
    ]);
    expect(cues[0].cast).toMatchObject({ scope: 'all', targets: ['a1', 'a3'] });
    expect(cues[0].cast).not.toHaveProperty('target');
    expect(cues[1].impacts).toHaveLength(4);
  });

  it.each(['damage', 'guard', 'heal'] as const)('normalizes legacy %s casts as single-target', kind => {
    const { cues } = buildTimeline([
      { kind: 'cast', actor: 'a0' },
      { kind, actor: 'a0', target: kind === 'damage' ? 'e1' : 'a1' },
    ]);
    const target = kind === 'damage' ? 'e1' : 'a1';
    expect(cues[0].cast).toMatchObject({ scope: 'single', target, targets: [target] });
  });

  it('uses a legacy explicit single target if no impact is emitted', () => {
    const { cues } = buildTimeline([{ kind: 'cast', actor: 'a0', target: 'a1' }]);
    expect(cues[0].cast).toMatchObject({ scope: 'single', target: 'a1', targets: ['a1'] });
  });

  it('copies and deduplicates explicit target arrays without mutating source events', () => {
    const events: BattleEvent[] = [
      { kind: 'cast', actor: 'a0', scope: 'all', targets: ['e2', 'e0', 'e2'] },
      { kind: 'damage', actor: 'a0', target: 'e2', hp: 80 },
      { kind: 'damage', actor: 'a0', target: 'e0', hp: 70 },
    ];
    const snapshot = structuredClone(events);
    Object.freeze(events[0].targets);
    events.forEach(Object.freeze);
    Object.freeze(events);
    const { cues } = buildTimeline(events);
    expect(cues[0].cast?.targets).toEqual(['e2', 'e0']);
    expect(cues[0].cast?.targets).not.toBe(events[0].targets);
    expect(events).toEqual(snapshot);
  });

  it('uses shared timing for casts and applies all damage together after cast-time MP spending', () => {
    const initial = start([0], [1, 5, 8]);
    initial.enemies[1].hp = 0;
    const snapshot = structuredClone(initial);
    const result = advanceWithEvents(initial, [{ key: 'a0', skill: 2 }]);
    const { cues } = buildTimeline(result.events);
    const castIndex = cues.findIndex(cue => cue.cast?.actor === 'a0' && !cue.impacts.length);
    const castCue = cues[castIndex];
    const impactCue = cues[castIndex + 1];
    expect(CAST_IMPACT_MS).toBe(800);
    expect(ACTION_DURATION_MS).toBe(1500);
    expect(impactCue.at).toBe(castCue.at + CAST_IMPACT_MS);
    expect(castCue.cast).toMatchObject({ scope: 'all', targets: ['e0', 'e2'] });
    expect(impactCue.impacts.filter(event => event.kind === 'damage').map(event => event.target)).toEqual(['e0', 'e2']);
    const laterCast = cues.slice(castIndex + 2).find(cue => cue.cast && !cue.impacts.length);
    expect(laterCast?.at).toBe(castCue.at + ACTION_DURATION_MS);

    let played = initial;
    for (let index = 0; index < cues.length; index++) {
      const cue = cues[index];
      const before = played;
      played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
      if (index === castIndex) {
        expect(played.allies[0].mp).toBe(before.allies[0].mp - 18);
        expect(played.enemies.map(unit => unit.hp)).toEqual(before.enemies.map(unit => unit.hp));
      }
      if (index === castIndex + 1) {
        expect(played.allies[0].mp).toBe(before.allies[0].mp);
        expect(played.enemies[0].hp).toBeLessThan(before.enemies[0].hp);
        expect(played.enemies[2].hp).toBeLessThan(before.enemies[2].hp);
        expect(played.enemies[1].hp).toBe(0);
      }
    }
    expect(played.allies).toEqual(result.state.allies);
    expect(played.enemies).toEqual(result.state.enemies);
    expect(initial).toEqual(snapshot);
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
