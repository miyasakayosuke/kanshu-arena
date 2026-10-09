import {describe, expect, it} from 'vitest';
import {actionAge, ANTICIPATION_MS, HIT_HOLD_MS, motionKind, NUMBER_DURATION_MS, sampleActionMotion, sampleHitMotion, sampleNumberMotion} from './battleMotion';
import {ACTION_DURATION_MS, CAST_IMPACT_MS} from './playback';

describe('action choreography', () => {
  it('distinguishes physical attacks, spells, whole fields and support without changing combat', () => {
    expect(motionKind({kind:'cast', skill:'通常攻撃', effect:'hit'})).toBe('strike');
    expect(motionKind({kind:'cast', skill:'疾風斬り', effect:'hit'})).toBe('strike');
    expect(motionKind({kind:'cast', skill:'狐火', effect:'hit'})).toBe('spell');
    expect(motionKind({kind:'cast', skill:'炎嵐', effect:'hit', scope:'all'})).toBe('area');
    for (const effect of ['guard','protect','heal','cleanse']) expect(motionKind({kind:'cast',effect})).toBe('support');
  });
  it('keeps anticipation, fast release, hit hold and recovery in order', () => {
    expect(sampleActionMotion('strike',0).phase).toBe('prepare');
    expect(sampleActionMotion('strike',ANTICIPATION_MS).travel).toBeLessThan(0);
    expect(sampleActionMotion('strike',CAST_IMPACT_MS-1).travel).toBeGreaterThan(60);
    expect(sampleActionMotion('strike',CAST_IMPACT_MS).phase).toBe('impact');
    expect(sampleActionMotion('strike',CAST_IMPACT_MS+HIT_HOLD_MS-1).travel).toBe(66);
    expect(sampleActionMotion('strike',CAST_IMPACT_MS+HIT_HOLD_MS).phase).toBe('recover');
    const rest=sampleActionMotion('strike',ACTION_DURATION_MS);
    expect(rest).toMatchObject({phase:'rest', travel:0, lift:0, tilt:0, scaleX:1, scaleY:1, camera:0, focus:0, titleAlpha:0});
  });
  it('does not finish an animation before a delayed authoritative impact', () => {
    expect(actionAge(2500)).toBe(CAST_IMPACT_MS-1);
    expect(sampleActionMotion('strike',actionAge(2500)).phase).toBe('release');
    expect(actionAge(2500,0)).toBe(CAST_IMPACT_MS);
    expect(sampleActionMotion('strike',actionAge(2800,300)).phase).toBe('recover');
  });
  it('does not lunge or zoom support and does not lunge spells or area effects', () => {
    for(const kind of ['support','spell','area'] as const) expect(sampleActionMotion(kind,799).travel).toBe(0);
    expect(sampleActionMotion('support',799).camera).toBe(0);
  });
  it('uses a short directional hit hold and returns fully to rest', () => {
    expect(sampleHitMotion(0).recoil).toBe(7);
    expect(sampleHitMotion(60).recoil).toBe(7);
    expect(sampleHitMotion(160).recoil).toBeLessThan(7);
    expect(sampleHitMotion(300)).toEqual({recoil:0,squash:1,shake:0});
    expect(sampleHitMotion(60,false,false)).toEqual({recoil:0,squash:1,shake:0});
  });
  it('keeps numbers readable until a short fade inside recovery', () => {
    expect(sampleNumberMotion(0)).toEqual({rise:0,scale:1,alpha:1});
    expect(sampleNumberMotion(350).alpha).toBe(1);
    expect(sampleNumberMotion(NUMBER_DURATION_MS-50).alpha).toBeGreaterThan(0);
    expect(sampleNumberMotion(NUMBER_DURATION_MS).alpha).toBe(0);
    expect(NUMBER_DURATION_MS).toBeLessThanOrEqual(ACTION_DURATION_MS-CAST_IMPACT_MS);
  });
  it('removes camera, travel, squash, recoil and number movement for reduced motion', () => {
    for(const time of [0,100,340,700,800,1000,1500]) {
      expect(sampleActionMotion('strike',time,true)).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
      expect(sampleHitMotion(time,true)).toEqual({recoil:0,squash:1,shake:0});
      expect(sampleNumberMotion(time,true)).toMatchObject({rise:0,scale:1});
    }
  });
});
