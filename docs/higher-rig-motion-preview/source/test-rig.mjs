import fs from 'node:fs';
import {META,BONES,SUPPORT,PHASES,PANEL,skeletonAt,boneEdges,inkBounds,len,sub,frameSvg,primitivesAt,rad} from './rig.mjs';
import * as old from './baseline-rig.mjs';
const checks=[],assert=(v,s)=>{if(!v)throw new Error(s);};let maxBoneError=0,maxContactError=0,maxReachFraction=0,minReachSlack=Infinity,minMargin=Infinity,maxStep=0,minFootInkY=Infinity,maxFootInkY=-Infinity;let last;let minWholeInkGroundClearance=Infinity,oldWorstPenetration={y:-Infinity,t:null},worstUpperLeg={bottom:-Infinity,t:null,limb:null};
const landmarks=[];
for(let i=0;i<=6000;i++){
 const t=i/4,s=skeletonAt(t);
 for(const [a,b,n]of boneEdges()){const e=Math.abs(len(sub(s.p[a],s.p[b]))-BONES[n]);maxBoneError=Math.max(maxBoneError,e);assert(e<1e-8,`Bone ${n} changed at ${t}`);}
 for(const [stem,k]of Object.entries(s.feet)){
  const upperBottom=Math.max(k.origin[1],k.knee[1])+(stem.toLowerCase().includes('fore')?6:8.5);if(upperBottom>worstUpperLeg.bottom)worstUpperLeg={bottom:upperBottom,t,limb:stem};
  const rule=SUPPORT[stem],fore=stem.toLowerCase().includes('fore'),total=fore?79:93;minReachSlack=Math.min(minReachSlack,total-k.reach);maxReachFraction=Math.max(maxReachFraction,k.reach/total);
  if(k.contact==='planted'){const expected=t<=rule.release?rule.toe:rule.landingToe;const e=len(sub(k.toe,expected));maxContactError=Math.max(maxContactError,e);assert(e<1e-9,`${stem} slipped at ${t}`);}
  const footBottom=Math.max(k.ankle[1],k.toe[1])+5;maxFootInkY=Math.max(maxFootInkY,footBottom);minFootInkY=Math.min(minFootInkY,footBottom);assert(footBottom<1e-8,`${stem} penetrated ground at ${t}`);
 }
 const b=inkBounds(t);minWholeInkGroundClearance=Math.min(minWholeInkGroundClearance,-b.y1);assert(b.y1<1e-8,`Whole actor ink penetrates ground at ${t}: ${b.y1}`);
 const oldBounds=old.inkBounds(t);if(oldBounds.y1>oldWorstPenetration.y)oldWorstPenetration={y:oldBounds.y1,t};
 // Audit every full-width line, ellipse stroke and conservative triangle bound.
 for(const primitive of primitivesAt(t)){
  let bottom;if(primitive.kind==='line')bottom=Math.max(primitive.a[1],primitive.b[1])+primitive.w/2;
  else if(primitive.kind==='oval'){const a=rad(primitive.a);bottom=primitive.p[1]+Math.hypot(primitive.rx*Math.sin(a),primitive.ry*Math.cos(a))+primitive.w/2;}
  else bottom=Math.max(...primitive.points.map(p=>p[1]))+primitive.w;
  assert(bottom<1e-8,`${primitive.kind} ink under ground at ${t}: ${bottom}`);
 }
 const dimensionSignature=x=>x.map(p=>({kind:p.kind,w:p.w,rx:p.rx,ry:p.ry}));assert(JSON.stringify(dimensionSignature(primitivesAt(t)))===JSON.stringify(dimensionSignature(old.primitivesAt(t))),'Part widths or primitive counts changed');
 const os=old.skeletonAt(t);for(const key of Object.keys(s.q))if(key!=='y')assert(s.q[key]===os.q[key],`Unrequested axial change ${key} ${t}`);
 if(t<=100||t>=800)assert(s.q.y===os.q.y,`Root outside correction window ${t}`);
 for(const [a,c] of [[BONES,old.BONES],[SUPPORT,old.SUPPORT],[PANEL,old.PANEL],[PHASES,old.PHASES]])assert(JSON.stringify(a)===JSON.stringify(c),'Fixed dimensions/contact/camera/timing changed');
for(const cfg of Object.values(PANEL)){const sc=cfg.physicalWidth/META.nominalWidth,margin=Math.min(cfg.origin[0]+b.x0*sc,cfg.origin[1]+b.y0*sc,cfg.width-cfg.origin[0]-b.x1*sc,cfg.height-cfg.origin[1]-b.y1*sc);minMargin=Math.min(minMargin,margin);assert(margin>10,`Ink cropped at ${t}: ${margin}`);}
 if(last)for(const [name,p]of Object.entries(s.p)){const step=len(sub(p,last.p[name]));maxStep=Math.max(maxStep,step);assert(step<1,`Discontinuity ${name} at ${t}: ${step}`);}last=s;
 if(i%4===0)landmarks.push({t,phase:s.phase,hip:s.p.hip,shoulder:s.p.shoulder,head:s.p.head,feet:Object.fromEntries(Object.entries(s.feet).map(([k,v])=>[k,{toe:v.toe,ankle:v.ankle,knee:v.knee,contact:v.contact}]))});
}
checks.push({name:'all actor primitives including whole leg strokes and body stay above ground',minWholeInkGroundClearance,worstUpperLeg,oldWorstPenetration},{name:'fixed bone lengths over 6001 samples',maxBoneError},{name:'world-space planted toe invariance',maxContactError},{name:'IK reachability without stretch or clamp',minReachSlack,maxReachFraction},{name:'paw capsule does not penetrate ground',maxFootInkY},{name:'fixed-camera stroked ink bounds',minMargin},{name:'quarter-millisecond landmark continuity',maxStep});
let maxBoundaryDelta=0,maxVelocityJump=0;
const boundaries=[...new Set([...PHASES.map(x=>x[0]),...Object.values(SUPPORT).flatMap(x=>[x.release,x.land])])].filter(x=>x>0&&x<1500);
for(const t of boundaries){const eps=1e-3,a=skeletonAt(t-eps),b=skeletonAt(t),c=skeletonAt(t+eps);for(const k of Object.keys(b.p)){const delta=len(sub(c.p[k],a.p[k]));maxBoundaryDelta=Math.max(maxBoundaryDelta,delta);const va=sub(b.p[k],a.p[k]).map(x=>x/eps),vb=sub(c.p[k],b.p[k]).map(x=>x/eps),jump=len(sub(va,vb));maxVelocityJump=Math.max(maxVelocityJump,jump);assert(delta<.01,`Boundary jump ${k} ${t}`);assert(jump<.01,`Velocity break ${k} ${t}: ${jump}`);}}
checks.push({name:'finite release/landing and phase boundary transitions',maxBoundaryDelta,maxVelocityJump});
const standingY=skeletonAt(0).p.hip[1],oldApexY=old.skeletonAt(500).p.hip[1],newApexY=skeletonAt(500).p.hip[1];assert(standingY===-70&&oldApexY===-148&&newApexY===-187,'Height metric');assert((standingY-newApexY)/(standingY-oldApexY)===1.5,'Exactly 1.5x root rise');for(let t=0;t<=1500;t+=.25)assert(skeletonAt(t).p.hip[1]>=newApexY-1e-9,'Different apex');checks.push({name:'existing hip/root anchor apex rise is exactly 1.5x',standingY,oldApexY,newApexY,oldRise:78,newRise:117,ratio:1.5,apexMs:500},{name:'unchanged bones, primitive dimensions/counts, contact rules, panels, phases and non-Y axial tracks',pass:true});
const start=skeletonAt(0),end=skeletonAt(1500);let maxReturnError=0;for(const k of Object.keys(start.p)){const e=len(sub(sub(end.p[k],start.p[k]),[-35,0]));maxReturnError=Math.max(maxReturnError,e);assert(e<1e-8,`Recovery pose differs: ${k}`);}checks.push({name:'exact proxy standing recovery translated -35 units',maxReturnError});
assert(META.durationMs===1500&&META.impactMs===800&&META.power===55&&META.mp===10,'Timing/game metadata changed');assert(start.q.jawOpen===0&&skeletonAt(760).q.jawOpen===36&&skeletonAt(800).q.jawOpen===0,'Jaw timing');checks.push({name:'1500 ms / 800 ms impact / power 55 / MP 10 metadata and jaw closure',pass:true});
for(const value of [NaN,Infinity,-Infinity]){let threw=false;try{skeletonAt(value);}catch{threw=true;}assert(threw,'Invalid input accepted');}assert(skeletonAt(-1).t===0&&skeletonAt(1501).t===1500,'Clamp');checks.push({name:'input guards and finite clamping',pass:true});
const markup=frameSvg(800);assert(!/opacity=|crossfade|<image/.test(markup),'Concealment/image substitution');checks.push({name:'no source raster, animated scale, opacity concealment or substitutions',pass:true});
const result={pass:true,samples:6001,sampleSpacingMs:.25,checks,limits:['Focused proxy checks only, not whole-game regression.','One bounded correction to the frozen schematic: shallower load plus extra airborne root rise; no original-art or physical-simulation claim.','142/420 px are fixed nominal rig reference scales, not exact silhouette widths.','Browser and production game were not executed.']};
fs.mkdirSync(new URL('../evidence/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/tests.json',import.meta.url),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(new URL('../evidence/landmarks-1ms.json',import.meta.url),JSON.stringify(landmarks)+'\n');console.log(JSON.stringify(result,null,2));
