// Test-only entry. Production source is hash-checked, then transformed in memory.
import React from 'react';
import {createRoot} from 'react-dom/client';
const row=new URLSearchParams(location.search).get('row')==='rear'?'rear':'front';
const sources={};
for(const [n,f]of Object.entries({original:'reference.png',apex:'high-leap-apex-study.png',descent:'high-leap-descent-study.png',contact:'landing-seq-contact.png'})){const image=new Image();image.src='/docs/fenrir-acting-bite/assets/'+f;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);const data=x.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let z=0;z<c.width;z++)if(data[(y*c.width+z)*4+3]>16){l=Math.min(l,z);t=Math.min(t,y);r=Math.max(r,z+1);b=Math.max(b,y+1);}sources[n]={image,box:[l,t,r,b]};}
const overlay=document.createElement('canvas');overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:80';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
const note=document.createElement('div');note.style.cssText='position:fixed;right:2px;bottom:2px;z-index:90;background:#172c3de8;color:white;font:10px system-ui;padding:3px;pointer-events:none';document.body.append(note);
let ms=500,mode='clip',fixedWidth=null,baseline=null,last=null;
const stageStyle=document.createElement('style');document.head.append(stageStyle);
function phase(){return ms<100?'original':ms<560?'apex':ms<890?'descent':'contact';}
function rect(r){return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}
function intersects(a,b){return Math.max(0,Math.min(a[2],b.right)-Math.max(a[0],b.x))*Math.max(0,Math.min(a[3],b.bottom)-Math.max(a[1],b.y));}
const api={row,draw(ctx,{index,foot,bodyScale,width,canvas}){
 const bounds=canvas.getBoundingClientRect(),actualWidth=width*bodyScale*bounds.width/720;
 fixedWidth??=actualWidth;const w=fixedWidth,s=w/1312,name=phase(),src=sources[name],anchor=name==='original'?[304.5,1179]:[334.5,1196];
 const floor={x:bounds.x+foot.x/720*bounds.width,y:bounds.y+foot.y/460*bounds.height};
 baseline??={stage:rect(bounds),floor:{...floor},physicalWidth:w};
 const rootX=floor.x+(-.5+304.5/1312)*w;
 const natural=(1196-sources.apex.box[3])*s,peak=w*.55-natural;
 const progress=Math.max(0,Math.min(1,(ms-500)/390));const lift=(name==='apex'||name==='descent')?peak*(1-progress*progress):0;
 const dx=rootX-anchor[0]*s,dy=floor.y-anchor[1]*s-lift;
 const box=src.box.map((v,i)=>v*s+(i%2?dy:dx));
 if(overlay.width!==innerWidth||overlay.height!==innerHeight){overlay.width=innerWidth;overlay.height=innerHeight;}overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
 const overlayAir=mode==='overlay'&&(name==='apex'||name==='descent');
 if(overlayAir){const x=overlay.getContext('2d');x.drawImage(src.image,dx,dy,src.image.width*s,src.image.height*s);}
 else{const factor=w/actualWidth,localScale=width*factor/1312,localRoot=(-.5+304.5/1312)*width*factor,localLift=lift/(actualWidth/width);ctx.save();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.drawImage(src.image,localRoot-anchor[0]*localScale,35.5-anchor[1]*localScale-localLift,src.image.width*localScale,src.image.height*localScale);ctx.restore();}
 const protectedUi=[...document.querySelectorAll('.battleNavigation,.battleTop,.enemyVitals,.battleMessage,.commandDock')].map(e=>({selector:e.className,rect:rect(e.getBoundingClientRect())}));
 last={mode,ms,pose:name,row,index,physicalWidth:w,computedWidthBeforeFreeze:actualWidth,sourceScale:1/1312,stage:rect(bounds),floor,baseline,box,withinStage:box[0]>=bounds.x&&box[1]>=bounds.y&&box[2]<=bounds.right&&box[3]<=bounds.bottom,withinViewport:box[0]>=0&&box[1]>=0&&box[2]<=innerWidth&&box[3]<=innerHeight,paintLayer:overlayAir?'unclipped-airborne-overlay':'actual-enemy-paint-order',uiIntersections:protectedUi.map(x=>({...x,intersectionArea:intersects(box,x.rect)})).filter(x=>x.intersectionArea>0)};
 note.textContent=`QA ${mode} / ${row} / ${w.toFixed(1)}px / ${ms}ms / 同じ絵・未完成`;
 return true;
},setTime(value){ms=value;},setMode(value){mode=value;if(mode==='tall'){const gap=row==='rear'?70*(baseline.stage.width/720):0;const h=Math.max(baseline.stage.height,Math.ceil((1.31*fixedWidth+18+gap)/(358/460)));stageStyle.textContent=`.battleMode .layeredBattleStage .battleScene{height:${h}px!important;min-height:${h}px!important}`;}else stageStyle.textContent='';},get(){return last;},info:{kind:'actual-app-isolated-staging-fixture',acceptedMain:'14134f351d8eca79714199e1f2b34dc76e826a4e',productionSourceChanged:false,combatClockChanged:false,artChanged:false,visualAcceptance:false,gameIntegration:false,fixtureChanges:['deterministic-initial-battle','initial-navigation-battle','Fenrir-only-draw-hook'],tallReservationBeforeCast:true}};
window.__stageStudy=api;
const {default:App}=await import('/src/App.tsx');createRoot(document.querySelector('#root')).render(React.createElement(App));
