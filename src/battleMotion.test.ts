import {describe, expect, it} from 'vitest';
import {actionAge, ANTICIPATION_MS, HIT_HOLD_MS, motionKind, NUMBER_DURATION_MS, sampleActionMotion, sampleGenbuMotion, sampleHitMotion, sampleNumberMotion, sampleRatatoskrMotion} from './battleMotion';
import {ACTION_DURATION_MS, barrageDuration, CAST_IMPACT_MS, MULTIHIT_INTERVAL_MS} from './playback';

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

describe('original Fenrir choreography', () => {
  it('crouches, pounces, holds all five impacts, and then settles completely', async () => {
    const {sampleFenrirMotion}=await import('./battleMotion');
    const crouch=sampleFenrirMotion(340);
    expect(crouch.travel).toBe(-12);expect(crouch.scaleY).toBe(.88);expect(crouch.lift).toBe(-6);
    expect(sampleFenrirMotion(799).travel).toBeGreaterThan(83);
    for (const time of [800,980,1160,1340,1520]) expect(sampleFenrirMotion(time).phase).toBe('impact');
    expect(sampleFenrirMotion(1800).phase).toBe('recover');
    expect(sampleFenrirMotion(2220)).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0,titleAlpha:0});
  });
  it('ends an interrupted barrage at its actual last hit and honors reduced motion', async () => {
    const {sampleFenrirMotion}=await import('./battleMotion');
    expect(sampleFenrirMotion(1500,1).phase).toBe('rest');
    for(const time of [0,340,799,800,1000,1520,1800,2220]) expect(sampleFenrirMotion(time,5,true)).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
  });
});

describe('family signature choreography', () => {
  it.each([3, 4])('hops lightly before %i discrete seed throws, then settles after the last hit', hits => {
    expect(sampleRatatoskrMotion(220, hits)).toMatchObject({travel:-5, lift:-3});
    expect(sampleRatatoskrMotion(410, hits).lift).toBeGreaterThan(27);
    expect(sampleRatatoskrMotion(799, hits).travel).toBe(15);
    for (let index = 0; index < hits; index++) expect(sampleRatatoskrMotion(CAST_IMPACT_MS + index * MULTIHIT_INTERVAL_MS, hits).phase).toBe('impact');
    expect(sampleRatatoskrMotion(barrageDuration(hits), hits)).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0,titleAlpha:0});
  });

  it('does not strand an interrupted seed barrage in its attack pose', () => {
    expect(sampleRatatoskrMotion(ACTION_DURATION_MS, 1).phase).toBe('rest');
    expect(sampleRatatoskrMotion(actionAge(2400), 3).phase).toBe('release');
  });

  it('plants Genbu slowly without a jump or lunge, waiting for the actual area hit', () => {
    const early = sampleGenbuMotion(220);
    const set = sampleGenbuMotion(CAST_IMPACT_MS - 1);
    expect(early.scaleY).toBeGreaterThan(set.scaleY);
    expect(set).toMatchObject({travel:0, lift:-5, tilt:0, scaleX:1.04});
    expect(set.scaleY).toBeCloseTo(.93);
    expect(sampleGenbuMotion(actionAge(2600)).phase).toBe('release');
    expect(sampleGenbuMotion(actionAge(2600, 0)).phase).toBe('impact');
    expect(sampleGenbuMotion(ACTION_DURATION_MS)).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0,titleAlpha:0});
  });

  it('removes every body and camera movement for reduced-motion family attacks', () => {
    for (const time of [0, 220, 410, 799, 800, 980, 1160, 1340, 1500, 2220]) {
      expect(sampleGenbuMotion(time, true)).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
      for (const hits of [1, 3, 4]) expect(sampleRatatoskrMotion(time, hits, true)).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
    }
  });
});
