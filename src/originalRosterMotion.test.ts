import {describe, expect, it} from 'vitest';
import {monsters, battleSkill, BASIC_ATTACK, DEFEND, advanceWithEvents, autoOrders, start, type BattleEvent} from './engine';
import {sampleOriginalRosterMotion} from './originalRosterMotion';
import {actionAge, ANTICIPATION_MS, HIT_HOLD_MS, RECOVERY_MS} from './battleMotion';
import {ACTION_DURATION_MS, CAST_IMPACT_MS, applyBattleEvents, buildTimeline} from './playback';

const originals = monsters.filter(monster => monster.id < 12);
const cast = (id: number, index: number): BattleEvent => {
  const skill = battleSkill(monsters[id], index)!;
  return {kind: 'cast', actor: 'e0', skill: skill.name, effect: skill.kind, scope: skill.all ? 'all' : 'single'};
};
describe('original-roster action choreography', () => {
  it.each(originals)('$name retains every existing action and all four observed phases', monster => {
    for (const index of [BASIC_ATTACK, DEFEND, ...monster.skills.map((_, i) => i)]) {
      const event = cast(monster.id, index), before = structuredClone(event);
      expect(sampleOriginalRosterMotion(monster.id, event, 0).phase).toBe('prepare');
      expect(sampleOriginalRosterMotion(monster.id, event, ANTICIPATION_MS).phase).toBe('release');
      expect(sampleOriginalRosterMotion(monster.id, event, CAST_IMPACT_MS).phase).toBe('impact');
      expect(sampleOriginalRosterMotion(monster.id, event, CAST_IMPACT_MS + HIT_HOLD_MS).phase).toBe('recover');
      expect(sampleOriginalRosterMotion(monster.id, event, ACTION_DURATION_MS)).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
      expect(sampleOriginalRosterMotion(monster.id, event, actionAge(5000)).phase).toBe('release');
      expect(sampleOriginalRosterMotion(monster.id, event, actionAge(5000,0)).phase).toBe('impact');
      for (const age of [0,340,620,800,950,1349,1500]) {
        const motion = sampleOriginalRosterMotion(monster.id,event,age,true);
        expect(motion).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
        expect(Object.values(motion).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
      }
      expect(event).toEqual(before);
    }
  });
  it('gives all twelve bodies a distinct physical anticipation and release', () => {
    const signatures = originals.map(monster => [ANTICIPATION_MS,650,CAST_IMPACT_MS].map(age => sampleOriginalRosterMotion(monster.id,cast(monster.id,BASIC_ATTACK),age)));
    expect(new Set(signatures.map(signature => JSON.stringify(signature))).size).toBe(12);
    for (const monster of originals) {
      expect(sampleOriginalRosterMotion(monster.id,cast(monster.id,BASIC_ATTACK),ANTICIPATION_MS).travel).toBeLessThan(0);
      expect(sampleOriginalRosterMotion(monster.id,cast(monster.id,BASIC_ATTACK),CAST_IMPACT_MS).travel).toBeGreaterThan(0);
    }
  });
  it('separates aid and defense from attacks without travel, tilt, or camera movement', () => {
    for (const monster of originals) for (const index of [DEFEND,...monster.skills.map((_, i) => i)]) {
      const event = cast(monster.id,index);
      if (!['heal','cleanse','guard','protect'].includes(event.effect ?? '')) continue;
      for (const age of [340,650,800,950,1300]) expect(sampleOriginalRosterMotion(monster.id,event,age)).toMatchObject({travel:0,tilt:0,camera:0});
    }
  });
  it('keeps whole-field attacks anchored and finishes recovery at the shared bound', () => {
    for (const monster of originals) for (let index = 0; index < monster.skills.length; index++) {
      const event = cast(monster.id,index);
      if (event.scope === 'all') expect(sampleOriginalRosterMotion(monster.id,event,800).travel).toBe(0);
      expect(sampleOriginalRosterMotion(monster.id,event,CAST_IMPACT_MS + HIT_HOLD_MS + RECOVERY_MS).phase).toBe('rest');
    }
  });
});

describe('original-roster presentation cannot alter engine resolution', () => {
  it.each([1,2,99,736])('preserves normal, 2x, reduced-motion and skip resources for seed %s', seed => {
    let state = start([0,2,7,11,12],[3,6,9,10,14],seed);
    for (let turn=0; turn<4 && !state.winner; turn++) {
      const result = advanceWithEvents(state,autoOrders(state));
      const before = structuredClone(result), timeline = buildTimeline(result.events);
      const wanted = {allies:result.state.allies,enemies:result.state.enemies};
      for (const rate of [1,2]) for (const reduced of [false,true]) {
        let replay = state;
        for (const cue of timeline.cues) {
          if (cue.cast) {
            const unit = [...state.allies,...state.enemies].find(unit=>unit.key===cue.cast!.actor);
            if (unit && unit.monster.id<12) for(const realAge of [0,340/rate,800/rate,1500/rate]) sampleOriginalRosterMotion(unit.monster.id,cue.cast,realAge*rate,reduced);
          }
          replay=applyBattleEvents(replay,[...(cue.updates??[]),...cue.impacts]);
        }
        expect({allies:replay.allies,enemies:replay.enemies}).toEqual(wanted);
      }
      for (let split=0; split<=timeline.cues.length; split++) {
        const first=timeline.cues.slice(0,split).flatMap(cue=>[...(cue.updates??[]),...cue.impacts]);
        const rest=timeline.cues.slice(split).flatMap(cue=>[...(cue.updates??[]),...cue.impacts]);
        const skipped=applyBattleEvents(applyBattleEvents(state,first),rest);
        expect({allies:skipped.allies,enemies:skipped.enemies}).toEqual(wanted);
      }
      expect(result).toEqual(before); state=result.state;
    }
  });
});
