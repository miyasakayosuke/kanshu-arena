// Isolated choreography study: explicit key exposures, not finished in-betweens.
export const DURATION=1500,IMPACT=800,SOURCE_SCALE=1/1312;
export const SOURCES={original:'reference.png',load:'high-leap-deep-load-study.png',push:'high-leap-toe-off-study.png',apex:'high-leap-apex-study.png',descent:'high-leap-descent-study.png',close:'high-leap-bite-close-study.png',reach:'high-leap-reach-study.png',contact:'landing-contact-handoff-study.png',compress:'landing-seq-compress.png',land:'landing-seq-rear-land-clean.png',mid:'landing-seq-mid-rise.png',rise:'landing-seq-rise-study.png',half:'return-halfway.png',near:'return-near-original.png'};
export const EXPOSURES=[[0,'original'],[100,'load'],[260,'push'],[400,'apex'],[560,'descent'],[800,'close'],[840,'reach'],[890,'contact'],[930,'compress'],[970,'land'],[1020,'mid'],[1080,'rise'],[1130,'half'],[1240,'near'],[1380,'original']];
export const SUPPORT={originalFore:[304.5,1179],loadFore:[357,1221],loadRear:[1115,1121],pushRear:[1144,1208]};
// Same rear toe world point as registered load: (758,-100) source units.
const rearWorld=SUPPORT.loadRear.map((v,i)=>v-SUPPORT.loadFore[i]);
export const PUSH_ANCHOR=SUPPORT.pushRear.map((v,i)=>v-rearWorld[i]);
export function phaseAt(ms){if(!Number.isFinite(ms)||ms<0||ms>=DURATION)return'original';return EXPOSURES.findLast(([t])=>t<=ms)[1];}
export function offsetAt(ms,width){const s=width*SOURCE_SCALE,peak=.55*width-(1196-1046)*s,name=phaseAt(ms);
 if(name==='original')return SUPPORT.originalFore.map(v=>-v*s);
 if(name==='load')return SUPPORT.loadFore.map(v=>-v*s);
 if(ms<400){const start=PUSH_ANCHOR.map(v=>-v*s);if(ms<=360)return start;const t=Math.max(0,Math.min(1,(ms-360)/140)),e=1-(1-t)**2,end=[-334.5*s,-1196*s-peak];return start.map((v,i)=>v+(end[i]-v)*e);}
 if(ms<500){const start=PUSH_ANCHOR.map(v=>-v*s),end=[-334.5*s,-1196*s-peak],t=(ms-360)/140,e=1-(1-t)**2;return start.map((v,i)=>v+(end[i]-v)*e);}
 if(ms<890){const t=(ms-500)/390;return[-334.5*s,-1196*s-peak*(1-t*t)];}
 if(name==='half')return[-334.5*s,-1174*s];
 if(name==='near')return[-302.5*s,-1207*s];
 return[-334.5*s,-1196*s];
}
export const INFO={scope:'rough-one-action-high-leap',impact:IMPACT,duration:DURATION,power:55,mp:10,sourceScale:SOURCE_SCALE,releaseMs:360,apexMs:500,contactMs:890,sourceRegistration:SUPPORT,pushAnchor:PUSH_ANCHOR,otherFeetLocked:false,fullBackwardLoadProven:false,heldDrawingsNotInbetweens:true,failedReachNotUsed:true,visualAcceptance:false,gameIntegration:false};
