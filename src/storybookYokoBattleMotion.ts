import {sampleStorybookYoko,type YokoPose} from './storybookYoko';
import {CAST_IMPACT_MS} from './playback';
import {HIT_HOLD_MS,RECOVERY_MS,motionKind} from './battleMotion';
import type {BattleEvent} from './engine';
export type YokoBattleFrame={time:number;cast?:BattleEvent;actionAge?:number;hurtAge?:number;defeatAge?:number;reduced?:boolean};
/** Time is already rate-adjusted by the arena. This function never changes game time. */
export function sampleYokoBattlePose(frame:YokoBattleFrame):YokoPose{
 const {time,cast,actionAge=2000,hurtAge,defeatAge,reduced=false}=frame;
 if(defeatAge!==undefined){
  const p=sampleStorybookYoko(time,'defeat',defeatAge,reduced);
  // Arena owns global recoil/death drift/opacity. Only articulated collapse is local.
  p.x=0;p.y=0;p.bodyAngle=0;p.opacity=1;return p;
 }
 if(hurtAge!==undefined&&hurtAge>=0&&hurtAge<620){
  const p=sampleStorybookYoko(time,'hurt',hurtAge,reduced);p.x=0;p.y=0;p.bodyAngle=0;p.bodyX=1;p.bodyY=1;return p;
 }
 if(!cast||actionAge>=CAST_IMPACT_MS+HIT_HOLD_MS+RECOVERY_MS)return sampleStorybookYoko(time,'idle',0,reduced);
 const a=Math.max(0,actionAge),since=a-CAST_IMPACT_MS;
 // The preview's release is remapped to the authoritative 800ms impact boundary.
 // actionAge() holds at 799ms while damage is delayed, so recovery cannot race HP.
 const rigAge=a<CAST_IMPACT_MS ? a/CAST_IMPACT_MS*420 : since<HIT_HOLD_MS ? 420+since/HIT_HOLD_MS*100 : 520+(since-HIT_HOLD_MS)/RECOVERY_MS*600;
 const p=sampleStorybookYoko(time,'attack',rigAge,reduced);
 p.x=0;p.y=0;p.bodyAngle=0;p.bodyX=1;p.bodyY=1;
 const kind=motionKind(cast);
 if(!reduced&&kind!=='strike'){
  const held=Math.min(1,a/340)*(since<0?1:Math.max(0,1-(since-HIT_HOLD_MS)/RECOVERY_MS));
  p.paw=kind==='support'?0:-3*held;
  p.headAngle=-4*held;p.headY=-2*held;
  p.earLeft=-5*held;p.earRight=4*held;
  p.tails=[-7*held,-11*held,-15*held];
 }
 return p;
}
