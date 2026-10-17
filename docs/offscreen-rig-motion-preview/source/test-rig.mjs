import fs from 'node:fs';
import * as r from './rig.mjs';import * as old from './baseline-rig.mjs';
const assert=(ok,s)=>{if(!ok)throw new Error(s);},distance=(p,a,b)=>{const ab=r.sub(b,a),ap=r.sub(p,a),u=r.clamp((ap[0]*ab[0]+ap[1]*ab[1])/r.len(ab)**2,0,1);return r.len(r.sub(p,a.map((v,i)=>v+u*ab[i])));};
const stats={samples:6001,sampleSpacingMs:.25,maxBoneError:0,maxPlantedToeError:0,minIkReachSlack:Infinity,maxWholeInkBelowGround:0,minSideBottomMarginPx:Infinity,maxQuarterMsPointStep:0,minPawTargetInkGap:Infinity,minBiteWindowPawTargetInkGap:Infinity,maxPrimitiveCount:0};
const windows=Object.fromEntries(Object.keys(r.PANEL).map(k=>[k,{firstTopCrossing:null,firstFullyAbove:null,lastFullyAbove:null,firstReturnInView:null}]));
const dimensions=p=>JSON.stringify(p.map(p=>({kind:p.kind,w:p.w,rx:p.rx,ry:p.ry})));let last;
for(let i=0;i<=6000;i++){
 const t=i/4,s=r.skeletonAt(t),o=old.skeletonAt(t),p=r.primitivesAt(t),b=r.inkBounds(t);
 assert(dimensions(p)===dimensions(old.primitivesAt(t)),`Part dimensions/counts changed at ${t}`);stats.maxPrimitiveCount=Math.max(stats.maxPrimitiveCount,p.length);
 for(const [a,b,n]of r.boneEdges()){const e=Math.abs(r.len(r.sub(s.p[a],s.p[b]))-r.BONES[n]);stats.maxBoneError=Math.max(stats.maxBoneError,e);assert(e<1e-8,`Bone ${n} changed at ${t}`);}
 for(const [stem,k]of Object.entries(s.feet)){
  const f=stem.toLowerCase().includes('fore'),rule=r.SUPPORT[stem],slack=(f?79:93)-k.reach;stats.minIkReachSlack=Math.min(stats.minIkReachSlack,slack);assert(slack>0,`Unreachable ${stem}`);
  if(k.contact==='planted'){const e=r.len(r.sub(k.toe,t<=rule.release?rule.toe:rule.landingToe));stats.maxPlantedToeError=Math.max(stats.maxPlantedToeError,e);assert(e<1e-8,`Support slip ${stem} ${t}`);}
  // Whole paw capsule versus solid dummy head, including its one-unit stroke.
  const gap=distance(r.TARGET.center,k.ankle,k.toe)-5-r.TARGET.radius-1;
  stats.minPawTargetInkGap=Math.min(stats.minPawTargetInkGap,gap);assert(gap>0,`Paw touches dummy head ${stem} ${t}: ${gap}`);
  if(t>=760&&t<=820)stats.minBiteWindowPawTargetInkGap=Math.min(stats.minBiteWindowPawTargetInkGap,gap);
 }
 stats.maxWholeInkBelowGround=Math.max(stats.maxWholeInkBelowGround,b.y1);assert(b.y1<=1e-8,`Actor penetrates ground ${t}: ${b.y1}`);
 for(const key of Object.keys(s.q))if(key!=='y')assert(s.q[key]===o.q[key],`Axial track changed ${key}`);
 if(t<=420||t>=800)assert(s.q.y===o.q.y,`Vertical change outside flight ${t}`);
 for(const [kind,c]of Object.entries(r.PANEL)){
  const scale=c.physicalWidth/240,margin=Math.min(c.origin[0]+b.x0*scale,c.width-c.origin[0]-b.x1*scale,c.height-c.origin[1]-b.y1*scale);stats.minSideBottomMarginPx=Math.min(stats.minSideBottomMarginPx,margin);assert(margin>10,`Side/bottom clipping ${t}`);
  const state=r.visibilityAt(t,kind),w=windows[kind];if(state!=='IN VIEW'&&w.firstTopCrossing===null)w.firstTopCrossing=t;if(state==='FULLY ABOVE'){if(w.firstFullyAbove===null)w.firstFullyAbove=t;w.lastFullyAbove=t;}if(state==='IN VIEW'&&w.lastFullyAbove!==null&&w.firstReturnInView===null)w.firstReturnInView=t;
 }
 if(last)for(const [k,v]of Object.entries(s.p)){const d=r.len(r.sub(v,last.p[k]));stats.maxQuarterMsPointStep=Math.max(stats.maxQuarterMsPointStep,d);assert(d<3,`Landmark discontinuity ${k} ${t}`);}last=s;
}
for(const [a,b]of [[r.BONES,old.BONES],[r.SUPPORT,old.SUPPORT],[r.PANEL,old.PANEL]])assert(JSON.stringify(a)===JSON.stringify(b),'Dimensions/support/camera changed');
for(const [kind,w]of Object.entries(windows)){w.fullyAboveDurationAtSamplePrecisionMs=w.lastFullyAbove-w.firstFullyAbove;assert(w.fullyAboveDurationAtSamplePrecisionMs>=100,`No meaningful full offscreen interval ${kind}`);}
let maxVelocityJump=0;for(const t of [100,200,220,260,350,360,420,480,500,600,620,650,700,760,800,840,890,900,930,970,980,1080,1500].filter(t=>t<1500)){const e=.001,a=r.skeletonAt(t-e),b=r.skeletonAt(t),c=r.skeletonAt(t+e);for(const k of Object.keys(b.p)){const va=r.sub(b.p[k],a.p[k]).map(n=>n/e),vb=r.sub(c.p[k],b.p[k]).map(n=>n/e),d=r.len(r.sub(va,vb));maxVelocityJump=Math.max(maxVelocityJump,d);assert(d<.02,`Velocity discontinuity ${t} ${k}: ${d}`);}}
const bite=r.skeletonAt(800),delta=.001,before=r.skeletonAt(800-delta),after=r.skeletonAt(800+delta);const impact={ms:800,center:r.TARGET.center,radius:r.TARGET.radius,jawTipDistance:r.len(r.sub(bite.p.jawTip,r.TARGET.center)),muzzleDistance:r.len(r.sub(bite.p.muzzle,r.TARGET.center)),jawOpenDegrees:bite.q.jawOpen,rootDownVelocity:(after.p.hip[1]-before.p.hip[1])/(2*delta),jawDownVelocity:(after.p.jawTip[1]-before.p.jawTip[1])/(2*delta),muzzleDownVelocity:(after.p.muzzle[1]-before.p.muzzle[1])/(2*delta)};
assert(impact.jawTipDistance<r.TARGET.radius&&impact.muzzleDistance<r.TARGET.radius&&impact.jawOpenDegrees===0,'Jaw does not close on target');assert(impact.rootDownVelocity>0&&impact.jawDownVelocity>0&&impact.muzzleDownVelocity>0,'Bite is not descending');
let recoveryError=0;const a=r.skeletonAt(0),b=r.skeletonAt(1500);for(const k of Object.keys(a.p)){const e=r.len(r.sub(r.sub(b.p[k],a.p[k]),[-35,0]));recoveryError=Math.max(recoveryError,e);assert(e<1e-8,`Recovery changed ${k}`);}
assert(r.META.durationMs===1500&&r.META.impactMs===800,'Timing changed');assert(r.skeletonAt(760).q.jawOpen===36,'Jaw opening changed');assert(!/opacity=|crossfade|<image/.test(r.frameSvg(800)),'Concealment/substitution');
const out={pass:true,...stats,windows,impact,maxVelocityJump,recoveryError,rootApex:{ms:500,standingY:-70,baselineY:old.skeletonAt(500).p.hip[1],newY:r.skeletonAt(500).p.hip[1]},unchanged:['bone lengths','all actor primitive dimensions/counts','camera origins and scales','support/release/contact times','all non-Y axial tracks','800 ms major bite and 1500 ms endpoint'],limits:['Sampled kinematics, not a continuous-time or physical-simulation proof.','Top clipping is intentional; all side/bottom clipping forbidden.','No browser, runtime, final-art or release claim.','Jaw/paw target separation checks the solid head, not cosmetic impact ring or static support arm.']};
fs.mkdirSync(new URL('../evidence/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/tests.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
