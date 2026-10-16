import {actorSvg,panelRoot,rootDelta,META,KEYS,TIMES,slopes} from './rig.mjs';
const samples=[];
for(const [width,height,physicalWidth]of [[600,600,420],[296,213,130],[296,213,142],[230,198,130],[230,198,142]])for(const mode of ['held','continuous'])for(let ms=360;ms<=660;ms+=.25){
 const r=panelRoot(width,height,physicalWidth),d=rootDelta(ms,physicalWidth),scale=physicalWidth/META.nominalWidth;
 samples.push({width,height,physicalWidth,mode,ms,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g id="actor" transform="translate(${r[0]+d[0]} ${r[1]+d[1]}) scale(${scale})">${actorSvg(ms,mode,{joints:physicalWidth>200})}</g></svg>`});
}
// Derivative extrema of each cubic are endpoints or the quadratic's vertex.
let maxAngularVelocityDegreesPerMs=0;
for(const v of Object.values(KEYS)){const m=slopes(v);for(let i=0;i<3;i++){
 const h=TIMES[i+1]-TIMES[i],a=2*v[i]-2*v[i+1]+h*(m[i]+m[i+1]),b=-3*v[i]+3*v[i+1]-h*(2*m[i]+m[i+1]),c=h*m[i];
 const us=[0,1],critical=-b/(3*a);if(a!==0&&critical>0&&critical<1)us.push(critical);
 for(const u of us)maxAngularVelocityDegreesPerMs=Math.max(maxAngularVelocityDegreesPerMs,Math.abs((3*a*u*u+2*b*u+c)/h));
}}
// Every point/stroke on this rig has an angular lever-arm sum below 250 units.
// The exact source root speed over this interval is below 3px/ms at largest scale.
const maxVertexSpeedPxPerMs=250*maxAngularVelocityDegreesPerMs*Math.PI/180*1.75+3;
console.log(JSON.stringify({samples,motionBound:{maxAngularVelocityDegreesPerMs,maxVertexSpeedPxPerMs,sampleIntervalMs:.25,betweenSampleDisplacementBoundPx:maxVertexSpeedPxPerMs*.25,maximumLeverArmSumRigUnits:250,rootSpeedBoundPxPerMs:3,notes:'Held intervals are bounded separately up to their right-open exposure boundary; the boundary itself is sampled. No bound is asserted across a held-pose jump.'}}));
