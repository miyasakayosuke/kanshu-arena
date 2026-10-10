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

describe('original dragon choreography', () => {
  it('compresses Vritra until the observed hit, exhales without a lunge, and settles', async () => {
    const {sampleVritraMotion} = await import('./battleMotion');
    const ready = sampleVritraMotion(actionAge(3200),5);
    expect(ready).toMatchObject({phase:'release',travel:0,lift:-6,scaleX:.87,scaleY:.925});
    expect(sampleVritraMotion(920,5).scaleX).toBeGreaterThan(1.08);
    expect(sampleVritraMotion(920,5).lift).toBe(3);
    expect(sampleVritraMotion(1350,5)).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
    expect(sampleVritraMotion(ACTION_DURATION_MS,5).titleAlpha).toBe(0);
  });

  it('scales its storm only from bounded passed-in charge metadata', async () => {
    const {sampleVritraMotion} = await import('./battleMotion');
    const weak = sampleVritraMotion(920,0), strong = sampleVritraMotion(920,5);
    expect(strong.stormScale).toBeGreaterThan(weak.stormScale);
    expect(strong.camera).toBeGreaterThan(weak.camera);
    expect(sampleVritraMotion(920)).toMatchObject({spentCharge:0,stormScale:.8});
    expect(sampleVritraMotion(920,99).spentCharge).toBe(5);
    expect(sampleVritraMotion(920,-2).spentCharge).toBe(0);
    expect(sampleVritraMotion(920,NaN).spentCharge).toBe(0);
  });

  it('alternates the two head strikes and releases only after their final observed hit', async () => {
    const {sampleAmphisbaenaMotion} = await import('./battleMotion');
    expect(sampleAmphisbaenaMotion(800).tilt).toBeLessThan(0);
    expect(sampleAmphisbaenaMotion(980).tilt).toBeGreaterThan(0);
    expect(sampleAmphisbaenaMotion(800).travel).toBe(19);
    expect(sampleAmphisbaenaMotion(980).phase).toBe('impact');
    expect(sampleAmphisbaenaMotion(barrageDuration(2))).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0,titleAlpha:0});
    expect(sampleAmphisbaenaMotion(ACTION_DURATION_MS,1).phase).toBe('rest');
  });

  it('keeps Lindwurm braced and Zilant light without pounce or support zoom', async () => {
    const {sampleLindwurmMotion,sampleZilantMotion} = await import('./battleMotion');
    expect(sampleLindwurmMotion(799,true)).toMatchObject({travel:0,lift:-4,camera:0});
    expect(sampleLindwurmMotion(800,false).travel).toBe(24);
    expect(sampleZilantMotion(799)).toMatchObject({travel:0,lift:9,camera:0,scaleX:1,scaleY:1});
    for (const motion of [sampleLindwurmMotion(ACTION_DURATION_MS),sampleZilantMotion(ACTION_DURATION_MS)]) expect(motion).toMatchObject({phase:'rest',travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0,titleAlpha:0});
  });

  it('removes every dragon body and camera movement in reduced motion', async () => {
    const {sampleVritraMotion,sampleAmphisbaenaMotion,sampleLindwurmMotion,sampleZilantMotion} = await import('./battleMotion');
    for (const time of [0,340,799,800,920,980,1100,1500,1680]) {
      for (const motion of [sampleVritraMotion(time,5,true),sampleAmphisbaenaMotion(time,2,true),sampleLindwurmMotion(time,true,true),sampleZilantMotion(time,true)]) expect(motion).toMatchObject({travel:0,lift:0,tilt:0,scaleX:1,scaleY:1,camera:0});
      expect(sampleVritraMotion(time,5,true).stormScale).toBe(1.35);
    }
  });
});
