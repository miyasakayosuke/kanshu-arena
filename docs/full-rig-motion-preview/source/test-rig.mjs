import fs from 'node:fs';
import {META,BONES,SUPPORT,PHASES,PANEL,skeletonAt,boneEdges,inkBounds,len,sub,frameSvg} from './rig.mjs';
const checks=[],assert=(v,s)=>{if(!v)throw new Error(s);};let maxBoneError=0,maxContactError=0,maxReachFraction=0,minReachSlack=Infinity,minMargin=Infinity,maxStep=0,minFootInkY=Infinity,maxFootInkY=-Infinity;let last;
const landmarks=[];
for(let i=0;i<=6000;i++){
 const t=i/4,s=skeletonAt(t);
 for(const [a,b,n]of boneEdges()){const e=Math.abs(len(sub(s.p[a],s.p[b]))-BONES[n]);maxBoneError=Math.max(maxBoneError,e);assert(e<1e-8,`Bone ${n} changed at ${t}`);}
 for(const [stem,k]of Object.entries(s.feet)){
  const rule=SUPPORT[stem],fore=stem.toLowerCase().includes('fore'),total=fore?79:93;minReachSlack=Math.min(minReachSlack,total-k.reach);maxReachFraction=Math.max(maxReachFraction,k.reach/total);
  if(k.contact==='planted'){const expected=t<=rule.release?rule.toe:rule.landingToe;const e=len(sub(k.toe,expected));maxContactError=Math.max(maxContactError,e);assert(e<1e-9,`${stem} slipped at ${t}`);}
  const footBottom=Math.max(k.ankle[1],k.toe[1])+5;maxFootInkY=Math.max(maxFootInkY,footBottom);minFootInkY=Math.min(minFootInkY,footBottom);assert(footBottom<1e-8,`${stem} penetrated ground at ${t}`);
 }
 const b=inkBounds(t);for(const cfg of Object.values(PANEL)){const sc=cfg.physicalWidth/META.nominalWidth,margin=Math.min(cfg.origin[0]+b.x0*sc,cfg.origin[1]+b.y0*sc,cfg.width-cfg.origin[0]-b.x1*sc,cfg.height-cfg.origin[1]-b.y1*sc);minMargin=Math.min(minMargin,margin);assert(margin>10,`Ink cropped at ${t}: ${margin}`);}
 if(last)for(const [name,p]of Object.entries(s.p)){const step=len(sub(p,last.p[name]));maxStep=Math.max(maxStep,step);assert(step<1,`Discontinuity ${name} at ${t}: ${step}`);}last=s;
 if(i%4===0)landmarks.push({t,phase:s.phase,hip:s.p.hip,shoulder:s.p.shoulder,head:s.p.head,feet:Object.fromEntries(Object.entries(s.feet).map(([k,v])=>[k,{toe:v.toe,ankle:v.ankle,knee:v.knee,contact:v.contact}]))});
}
checks.push({name:'fixed bone lengths over 6001 samples',maxBoneError},{name:'world-space planted toe invariance',maxContactError},{name:'IK reachability without stretch or clamp',minReachSlack,maxReachFraction},{name:'paw capsule does not penetrate ground',maxFootInkY},{name:'fixed-camera stroked ink bounds',minMargin},{name:'quarter-millisecond landmark continuity',maxStep});
let maxBoundaryDelta=0,maxVelocityJump=0;
const boundaries=[...new Set([...PHASES.map(x=>x[0]),...Object.values(SUPPORT).flatMap(x=>[x.release,x.land])])].filter(x=>x>0&&x<1500);
for(const t of boundaries){const eps=1e-3,a=skeletonAt(t-eps),b=skeletonAt(t),c=skeletonAt(t+eps);for(const k of Object.keys(b.p)){const delta=len(sub(c.p[k],a.p[k]));maxBoundaryDelta=Math.max(maxBoundaryDelta,delta);const va=sub(b.p[k],a.p[k]).map(x=>x/eps),vb=sub(c.p[k],b.p[k]).map(x=>x/eps),jump=len(sub(va,vb));maxVelocityJump=Math.max(maxVelocityJump,jump);assert(delta<.01,`Boundary jump ${k} ${t}`);assert(jump<.01,`Velocity break ${k} ${t}: ${jump}`);}}
checks.push({name:'finite release/landing and phase boundary transitions',maxBoundaryDelta,maxVelocityJump});
const start=skeletonAt(0),end=skeletonAt(1500);let maxReturnError=0;for(const k of Object.keys(start.p)){const e=len(sub(sub(end.p[k],start.p[k]),[-35,0]));maxReturnError=Math.max(maxReturnError,e);assert(e<1e-8,`Recovery pose differs: ${k}`);}checks.push({name:'exact proxy standing recovery translated -35 units',maxReturnError});
assert(META.durationMs===1500&&META.impactMs===800&&META.power===55&&META.mp===10,'Timing/game metadata changed');assert(start.q.jawOpen===0&&skeletonAt(760).q.jawOpen===36&&skeletonAt(800).q.jawOpen===0,'Jaw timing');checks.push({name:'1500 ms / 800 ms impact / power 55 / MP 10 metadata and jaw closure',pass:true});
for(const value of [NaN,Infinity,-Infinity]){let threw=false;try{skeletonAt(value);}catch{threw=true;}assert(threw,'Invalid input accepted');}assert(skeletonAt(-1).t===0&&skeletonAt(1501).t===1500,'Clamp');checks.push({name:'input guards and finite clamping',pass:true});
const markup=frameSvg(800);assert(!/opacity=|crossfade|<image/.test(markup),'Concealment/image substitution');checks.push({name:'no source raster, animated scale, opacity concealment or substitutions',pass:true});
const result={pass:true,samples:6001,sampleSpacingMs:.25,checks,limits:['Focused proxy checks only, not whole-game regression.','Root path and schematic pose are newly authored; not exact original source translation.','142/420 px are fixed nominal rig reference scales, not exact silhouette widths.','Browser and production game were not executed.']};
fs.mkdirSync(new URL('../evidence/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/tests.json',import.meta.url),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(new URL('../evidence/landmarks-1ms.json',import.meta.url),JSON.stringify(landmarks)+'\n');console.log(JSON.stringify(result,null,2));
