import assert from 'node:assert/strict';
import fs from 'node:fs';
import {META,BONES,MASSES,KEYS,TIMES,poseAt,skeletonAt,boneEdges,sourceOffset,rootDelta,angleAt,panelSvg} from './rig.mjs';
import {offsetAt} from '../reference/high-leap-timing.mjs';
const checks=[],add=(name,details)=>checks.push({name,status:'passed',details});
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let maxBoneError=0,maxRootError=0,maxStep=0;
for(let t=360;t<=660;t+=.25){
 for(const mode of ['held','continuous']){const {p}=skeletonAt(t,mode);for(const [a,b,k]of boneEdges())maxBoneError=Math.max(maxBoneError,Math.abs(dist(p[a],p[b])-BONES[k]));}
 for(const width of META.physicalWidths){const a=sourceOffset(t,width),b=offsetAt(t,width);maxRootError=Math.max(maxRootError,dist(a,b));}
 if(t>360){const a=skeletonAt(t).p,b=skeletonAt(t-.25).p;for(const k of Object.keys(a))maxStep=Math.max(maxStep,dist(a[k],b[k]));}
}
assert(maxBoneError<1e-10);add('Bone lengths invariant in both variants at 1201 samples',{maxBoneError});
assert(maxRootError<1e-10);add('Root trajectory equals frozen source at all three widths',{maxRootError});
assert(maxStep<1);add('Continuous geometry has no quarter-millisecond teleport',{maxLandmarkStepInRigUnits:maxStep});
for(const t of [360,660])assert.deepEqual(skeletonAt(t,'held'),skeletonAt(t,'continuous'));
add('Both comparison endpoint poses exactly equal',{times:[360,660]});
for(const [k,v]of Object.entries(KEYS))for(let i=0;i<3;i++)for(let t=TIMES[i];t<=TIMES[i+1];t+=.5){const q=angleAt(v,t);assert(q>=Math.min(v[i],v[i+1])-1e-9&&q<=Math.max(v[i],v[i+1])+1e-9,`${k} overshoot`);}
add('Every angle stays inside its local key interval; no spline overshoot',{});
let maxVelocityMismatch=0;
for(const t of [430,510])for(const v of Object.values(KEYS)){const e=.001,a=(angleAt(v,t)-angleAt(v,t-e))/e,b=(angleAt(v,t+e)-angleAt(v,t))/e;maxVelocityMismatch=Math.max(maxVelocityMismatch,Math.abs(a-b));}
assert(maxVelocityMismatch<.0001);add('Joint angular velocity continuous at internal spline knots',{maxVelocityMismatchDegreesPerMs:maxVelocityMismatch});
const boundaryMetrics=[];
for(const t of [400,460,560]){let held=0,smooth=0;const a=skeletonAt(t-.001,'held').p,b=skeletonAt(t,'held').p,c=skeletonAt(t-.001).p,d=skeletonAt(t).p;for(const k of Object.keys(a)){held=Math.max(held,dist(a[k],b[k]));smooth=Math.max(smooth,dist(c[k],d[k]));}assert(held>1&&smooth<.01);boundaryMetrics.push({timeMs:t,heldMaxJumpRigUnits:held,continuousMaxDeltaRigUnits:smooth});}
add('Held control changes at original exposure boundaries; continuous rig has no jumps',boundaryMetrics);
for(const width of META.physicalWidths){const p=panelSvg(510,'continuous',{physicalWidth:width});assert(p.includes(`scale(${width/240})`));assert(!p.includes('opacity='));}
add('Constant physical scale and no fades', {physicalWidths:META.physicalWidths,masses:MASSES});
assert.deepEqual(poseAt(0),poseAt(360));assert.deepEqual(poseAt(1000),poseAt(660));assert.throws(()=>poseAt(NaN));assert.throws(()=>poseAt(500,'invalid'));
add('Paused seek, clamp and invalid-time guards',{});
// These scope checks do not assert a passed whole-game regression suite.
const report={scope:'Standalone temporary rig only',sourceCommit:META.sourceCommit,checks,browserQA:'not run',gameRegression:'not run; production code unchanged',originalArt:'not loaded or edited',visualVerdict:'pending independent review'};
fs.mkdirSync(new URL('../evidence/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/tests.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
