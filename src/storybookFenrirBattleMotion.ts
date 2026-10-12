import {neutralFenrirPose,type FenrirPose} from './storybookFenrir';
import {CAST_IMPACT_MS,MULTIHIT_INTERVAL_MS} from './playback';
import {HIT_HOLD_MS,RECOVERY_MS,motionKind} from './battleMotion';
import type {BattleEvent} from './engine';
export type FenrirBattleFrame={time:number;cast?:BattleEvent;actionAge?:number;hitCount?:number;hurtAge?:number;defeatAge?:number;reduced?:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const pulse=(t:number,at:number,w:number)=>Math.max(0,1-Math.abs(t-at)/w);
/** Presentation only: actionAge is captured/rate-adjusted by the arena and held until impact. */
export function sampleFenrirBattlePose(frame:FenrirBattleFrame):FenrirPose{
 const {cast,reduced=false,hurtAge,defeatAge}=frame;const time=Number.isFinite(frame.time)?Math.max(0,frame.time):0;
 const a=Number.isFinite(frame.actionAge)?Math.max(0,frame.actionAge!):2000;
 const p=neutralFenrirPose();
 if(defeatAge!==undefined){const t=reduced?1:smooth(defeatAge/840);p.phase='defeat';p.bodyY=1-.2*t;p.headY=19*t;p.headAngle=-12*t;p.jaw=4*t;p.mane=12*t;p.earNear=-24*t;p.earFar=20*t;p.tail=20*t;p.frontNear=12*t;p.frontFar=8*t;p.rearNear=-10*t;p.rearFar=-8*t;p.chain=[-8*t,-8*t,-6*t];p.blink=t;return p;}
 if(hurtAge!==undefined&&hurtAge>=0&&hurtAge<620){p.phase='hurt';if(!reduced){const h=Math.sin(clamp(hurtAge/620)*Math.PI);p.headAngle=9*h;p.headY=2*h;p.earNear=-18*h;p.earFar=16*h;p.tail=-8*h;p.mane=6*h;p.jaw=-6*h;p.chain=[6*h,9*h,12*h];p.blink=.85*h;}return p;}
 const barrage=cast?.scope==='random';
 const count=barrage?Math.max(1,Math.floor(frame.hitCount??cast?.hitTargets?.length??cast?.hits??5)):1;
 const lastHit=CAST_IMPACT_MS+(count-1)*MULTIHIT_INTERVAL_MS;
 const hold=lastHit+HIT_HOLD_MS,end=hold+RECOVERY_MS;
 if(cast&&a<end){
  p.phase=a<CAST_IMPACT_MS?'anticipation':a<hold?'strike':'recovery';
  if(reduced)return p;
  const wind=smooth(a/CAST_IMPACT_MS),recover=1-smooth((a-hold)/RECOVERY_MS),before=a<CAST_IMPACT_MS;
  if(motionKind(cast)==='support'){
   const brace=before?wind:recover;p.bodyY=1-.025*brace;p.headAngle=3*brace;p.headY=2*brace;p.mane=2*brace;p.earNear=-5*brace;p.earFar=4*brace;p.tail=-4*brace;return p;
  }
  // Each attack accents only the existing rate-adjusted barrage clock. No event scheduling.
  const between=a>=CAST_IMPACT_MS&&a<lastHit;
  const beat=between?(a-CAST_IMPACT_MS)%MULTIHIT_INTERVAL_MS:Math.max(0,a-lastHit);
  const bite=between?1-.55*Math.sin(beat/MULTIHIT_INTERVAL_MS*Math.PI):recover;
  const tooth=cast.skill==='月下の一咬'?26:barrage?23:18;
  p.bodyY=before?1-.045*wind:1+.025*bite;
  p.headAngle=before?7*wind:-9*bite;p.headY=before?4*wind:-2*bite;
  p.jaw=before?-9*wind:-tooth*bite;
  p.earNear=-18*(before?wind:recover);p.earFar=13*(before?wind:recover);
  p.frontNear=before?-5*wind:15*bite;p.frontFar=before?5*wind:-9*bite;
  p.rearNear=before?8*wind:-7*bite;p.rearFar=before?-4*wind:5*bite;
  p.mane=before?-4*wind:6*bite;
  p.tail=before?-8*wind:13*(1-smooth((a-hold-70)/RECOVERY_MS));
  // The chain propagates through three hinges; follow-through continues behind the jaw.
  p.chain=[0,1,2].map(i=>before?(-4-i*2)*wind:between?(13+i*7)*(1-.4*Math.sin(Math.max(0,beat-i*22)/MULTIHIT_INTERVAL_MS*Math.PI)):(13+i*7)*(1-smooth((a-hold-i*45)/(RECOVERY_MS-i*45)))) as [number,number,number];
  p.blink=before?.18*wind:0;
  return p;
 }
 if(!reduced){const t=time/1000;p.bodyY=1+Math.sin(t*1.6)*.014;p.headY=-Math.sin(t*1.6-.35)*.7;p.headAngle=Math.sin(t*.8)*.7;p.mane=Math.sin(t*1.6-.6)*1.1;p.tail=Math.sin(t*1.1-.8)*2.8;p.earNear=-9*pulse(time%6200,1720,220);p.earFar=7*pulse(time%6200,1900,230);p.chain=[Math.sin(t*1.3)*.8,Math.sin(t*1.3-.5)*1.2,Math.sin(t*1.3-1)*1.6];p.blink=Math.max(pulse(time%4900,2900,110),.65*pulse(time%4900,3150,85));}
 return p;
}
