// Opt-in diagnostic entry only. The normal Vite config never installs these hooks.
import React from'react';import{createRoot}from'react-dom/client';
import{SOURCES,bridgePhaseAt}from'/docs/fenrir-acting-bite/extension-tuck-timing.mjs';
import{offsetAt}from'/docs/fenrir-acting-bite/high-leap-timing.mjs';
import{createBiteLifecycle}from'/docs/fenrir-acting-bite/lifecycle-adapter.mjs';
const q=new URLSearchParams(location.search),row=q.get('row')==='rear'?'rear':'front',assetMode=q.get('assets')||'ready';
const sources={},cache={ready:false,errors:[]};
async function load(name,file){const image=new Image();image.src='/docs/fenrir-acting-bite/assets/'+file;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let z=0;z<c.width;z++)if(a[(y*c.width+z)*4+3]>16){l=Math.min(l,z);t=Math.min(t,y);r=Math.max(r,z+1);b=Math.max(b,y+1);}sources[name]={image,box:[l,t,r,b]};}
await load('original',SOURCES.original).catch(e=>cache.errors.push(String(e)));
let releaseAssets;const assetGate=assetMode==='late'?new Promise(r=>releaseAssets=r):Promise.resolve();
const assetTask=(async()=>{await assetGate;try{await Promise.all(Object.entries(SOURCES).filter(([n])=>n!=='original').map(([n,f])=>load(n,f)));cache.ready=!!sources.original;}catch(e){cache.errors.push(String(e));}})();
if(assetMode==='ready')await assetTask;
const model=createBiteLifecycle(),style=document.createElement('style');document.head.append(style);
const note=document.createElement('div');note.style.cssText='position:fixed;right:2px;bottom:2px;z-index:90;background:#172c3de8;color:white;font:10px system-ui;padding:3px;pointer-events:none';note.textContent='QA 実戦ライフサイクル / 未完成';document.body.append(note);
let generation=0,preparationResolve,lastState=null,lastFrame=null,lastDraw=null,fixedWidth=null,baseline=null,currentRun=null;
const runs=[],clears=[],frames=[],draws=[],ordinaryDraws=[];
const clone=x=>JSON.parse(JSON.stringify(x)),raf=()=>new Promise(r=>requestAnimationFrame(r));
const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
function layout(){const scene=document.querySelector('.battleScene'),battle=document.querySelector('.battle'),skip=document.querySelector('.playingPanel button');return{scene:scene?rect(scene.getBoundingClientRect()):null,battle:battle?{scrollTop:battle.scrollTop,clientHeight:battle.clientHeight,scrollHeight:battle.scrollHeight}:null,skip:skip?rect(skip.getBoundingClientRect()):null};}
function clear(reason){generation++;model.clear();preparationResolve?.();preparationResolve=null;clears.push({reason,at:Date.now(),generation});}
const api={row,originalReady:!!sources.original,
 prepare(){clear('prepare-next-turn');if(baseline&&fixedWidth){const gap=row==='rear'?70*baseline.stage.width/720:0,h=Math.max(baseline.stage.height,Math.ceil((1.31*fixedWidth+18+gap)/(358/460)));style.textContent=`.battleMode .layeredBattleStage .battleScene{height:${h}px!important;min-height:${h}px!important}`;}return generation;},
 async beforeClock(ticket,data){currentRun={...clone(data),ticket,preparedAt:Date.now(),startedAt:null,cues:[],finishes:[],preLayout:layout()};runs.push(currentRun);if(q.get('prepare')==='hold')await new Promise(r=>preparationResolve=r);await raf();await raf();if(ticket!==generation)return false;const scene=document.querySelector('.battleScene'),battle=document.querySelector('.battle'),header=document.querySelector('.battleNavigation');const b=scene.getBoundingClientRect(),top=header?.getBoundingClientRect().bottom??0;currentRun.revealed=b.y<top||b.bottom>innerHeight;currentRun.settledBeforeReveal=layout();if(currentRun.revealed)battle.scrollTop=0;await raf();if(ticket!==generation)return false;currentRun.clockLayout=layout();return true;},
 started(at){currentRun.startedAt=at;},
 cue(value){currentRun?.cues.push(clone(value));},
 finish(result){currentRun?.finishes.push({at:Date.now(),result:result?clone(result):null});clear('finish-or-skip');},clear,
 observe(value){lastState=value;},
 frame(input){const decision=model.sample({...input,ready:cache.ready});if(!sources.original){decision.eligible=false;decision.animate=false;decision.reason="ordinary-source-fallback";}lastFrame={...decision,age:input.age,actorId:input.actorId,skill:input.event?.skill,actor:input.event?.actor,at:Date.now(),reduced:input.reduced};frames.push(lastFrame);return decision;},
 draw(ctx,{unit,index,foot,bodyScale,width,canvas,qaBite,cast,age,reduced}){
  // Exact original is the diagnostic neutral/reduced/fallback when available.
  // Another Fenrir skill retains the ordinary production rig; all-source failure does too.
  if(!sources.original || (cast?.actor===unit.key&&cast.skill!=='月下の一咬') || unit.hp<=0)return false;
  const bounds=canvas.getBoundingClientRect(),actualWidth=width*bodyScale*bounds.width/720;fixedWidth??=actualWidth;
  const w=fixedWidth,s=w/1312,name=qaBite.animate?bridgePhaseAt(age):'original',src=sources[name]||sources.original;
  const floor={x:bounds.x+foot.x/720*bounds.width,y:bounds.y+foot.y/460*bounds.height};baseline??={stage:rect(bounds),floor:{...floor},physicalWidth:w};
  const time=qaBite.animate?age:0,off=offsetAt(time,w),rootX=floor.x+(-.5+304.5/1312)*w,dx=rootX+off[0],dy=floor.y+off[1],box=src.box.map((v,i)=>v*s+(i%2?dy:dx));
  const factor=w/actualWidth,localScale=width*factor/1312,localRoot=(-.5+304.5/1312)*width*factor;ctx.save();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.drawImage(src.image,localRoot+off[0]/(actualWidth/width),35.5+off[1]/(actualWidth/width),src.image.width*localScale,src.image.height*localScale);ctx.restore();
  lastDraw={at:Date.now(),age,pose:name,serial:qaBite.serial,animate:qaBite.animate,eligible:qaBite.eligible,reason:qaBite.reason,row,index,physicalWidth:w,floor,stage:rect(bounds),box,withinStage:box[0]>=bounds.x&&box[1]>=bounds.y&&box[2]<=bounds.right&&box[3]<=bounds.bottom};draws.push(lastDraw);return true;
 },
 ordinary(kind,unit){if(unit.monster.id===12)ordinaryDraws.push({kind,at:Date.now(),hp:unit.hp});},
 releaseAssets:async()=>{releaseAssets?.();await assetTask;},releasePreparation:()=>preparationResolve?.(),
 get(){return clone({state:lastState,frame:lastFrame,draw:lastDraw,cache:{...cache,originalReady:!!sources.original},runs,clears,layout:layout()});},
 frames(){return clone({frames,draws,ordinaryDraws});},
 info:{kind:'opt-in-real-combat-fixture',productionSourceChanged:false,engineChanged:false,ordersThroughRealUI:true,initialTeamsSeedOnly:true,neutralRasterIsDiagnosticSubstitution:true,ordinaryFallbackWhenAllSourcesFail:true,fullTurnIsLongerThan1500:true,visualAcceptance:false},
};
window.__biteLifecycle=api;
const{default:App}=await import('/src/App.tsx');createRoot(document.querySelector('#root')).render(React.createElement(App));
