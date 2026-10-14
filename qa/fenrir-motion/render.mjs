import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {samplePose,measurePose,POSES,DURATION} from '../../docs/fenrir-motion-preview/rig.mjs';
const sourceDir=fileURLToPath(new URL('../../docs/fenrir-motion-preview/',import.meta.url));
const out='evidence';await mkdir(out,{recursive:true});await mkdir(out+'/frames',{recursive:true});
const server=spawn('python3',['-m','http.server','8879','--directory',sourceDir],{stdio:'inherit'});
const errors=[];let browser;
async function ready(page){await page.goto('http://127.0.0.1:8879');await page.waitForFunction(()=>window.ready||window.previewError);assert.equal(await page.evaluate(()=>window.previewError??null),null);}
try{
 for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:8879')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1120,height:1000},deviceScaleFactor:1,reducedMotion:'no-preference'});
 page.on('pageerror',e=>errors.push(e.message));await ready(page);
 // Baseline pixels are captured from the exact source drawing at the same canvas placement.
 // Small toe-interior regions avoid the near paw's legitimate occlusion of the far forefoot.
 await page.evaluate(()=>{
  window.preview.setTime(0);
  const c=document.querySelector('#large'),ctx=c.getContext('2d'),scale=900/1312,left=50,top=932-1199*scale;
  const regions={farFore:[38,1095,48,15],farRear:[652,1057,82,24],nearRear:[1071,1082,78,25]};
  const toes=Object.fromEntries(Object.entries(regions).map(([name,[x,y,w,h]])=>{const box=[Math.ceil(left+x*scale),Math.ceil(top+y*scale),Math.floor(w*scale),Math.floor(h*scale)];return [name,{box,data:ctx.getImageData(...box).data}];}));
  window.__rigQaReference={data:ctx.getImageData(0,0,c.width,c.height).data,toes};
 });
 const transitionComparisons={};
 for(const background of ['light','dark']){
  await page.evaluate(v=>window.preview.setTheme(v),background);
  for(const [name,t]of [['entry',.5001],['exit',4.7499]]){
   transitionComparisons[`${background}-${name}`]=await page.evaluate(t=>{
    window.preview.setTime(t);const c=document.querySelector('#large'),a=window.__rigQaReference.data,b=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let changedPixels=0,newOpaquePixels=0,missingOpaquePixels=0,totalDelta=0,maxChannelDelta=0;
    for(let i=0;i<a.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]-b[i+k]);totalDelta+=d;maxChannelDelta=Math.max(maxChannelDelta,d);if(d>10)changed=true;}if(changed)changedPixels++;if(a[i+3]<10&&b[i+3]>64)newOpaquePixels++;if(a[i+3]>200&&b[i+3]<64)missingOpaquePixels++;}
    return {time:t,changedPixels,newOpaquePixels,missingOpaquePixels,maxChannelDelta,meanAbsoluteChannelDelta:totalDelta/a.length};
   },t);
   await page.screenshot({path:`${out}/transition-${background}-${name}.png`});
  }
 }
 await page.evaluate(()=>window.preview.setTheme('light'));
 const animation=[],renderedSupportChecks=[];
 for(let i=0;i<120;i++){
  const result=await page.evaluate(t=>{
   const pose=window.preview.setTime(t),ctx=document.querySelector('#large').getContext('2d');
   const toes=Object.fromEntries(Object.entries(window.__rigQaReference.toes).map(([name,{box,data:a}])=>{const b=ctx.getImageData(...box).data;let changedPixels=0,maxChannelDelta=0;for(let j=0;j<a.length;j+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a[j+k]-b[j+k]);maxChannelDelta=Math.max(maxChannelDelta,d);if(d>3)changed=true;}if(changed)changedPixels++;}return [name,{changedPixels,maxChannelDelta}];}));
   return {pose,toes};
  },i/24);
  animation.push(result.pose);renderedSupportChecks.push({time:i/24,...result.toes});
  await page.screenshot({path:`${out}/frames/${String(i).padStart(3,'0')}.png`});
 }
 const capturedPoses={};
 for(const background of ['light','dark']){
  await page.evaluate(v=>window.preview.setTheme(v),background);
  for(const [name,t]of Object.entries(POSES)){
   capturedPoses[`${background}-${name}`]=await page.evaluate(t=>window.preview.setTime(t),t);
   await page.screenshot({path:`${out}/${background}-${name}.png`});
   if(background==='light')await page.screenshot({path:`${out}/${name}.png`});
  }
 }
 await page.evaluate(()=>{window.preview.setTheme('light');window.preview.setTime(2.45);window.preview.setCompare(true);});
 await page.screenshot({path:`${out}/original-comparison.png`});assert.equal(await page.locator('#phase').textContent(),'元の姿勢');
 const originalData=await page.locator('#large').evaluate(c=>c.toDataURL());
 await page.evaluate(()=>window.preview.setCompare(false));
 await page.getByRole('button',{name:'再生',exact:true}).click();await page.getByRole('button',{name:'一時停止',exact:true}).click();
 // Both stages really display the same sampling time. The small sprite is 130 CSS px, not a scaled desktop proxy.
 assert.equal(await page.evaluate(()=>window.preview.state.smallCssSpriteWidth),130);
 const cssDimensions=await page.evaluate(()=>({smallStageWidth:document.querySelector('#small').getBoundingClientRect().width,originalWidth:document.querySelector('.original').getBoundingClientRect().width}));
 assert.equal(cssDimensions.originalWidth,130);
 await page.setViewportSize({width:390,height:844});
 for(const background of ['light','dark']){
  await page.evaluate(v=>{window.preview.setTheme(v);window.preview.setTime(2.45);},background);
  await page.screenshot({path:`${out}/mobile-${background}.png`,fullPage:true});
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1120,height:1000});await ready(page);
 const reducedA=await page.locator('#large').evaluate(c=>c.toDataURL());
 await page.evaluate(()=>window.preview.setTime(3.5));await page.waitForTimeout(250);
 const reducedB=await page.locator('#large').evaluate(c=>c.toDataURL());
 assert.equal(reducedA,reducedB);assert.equal(reducedB,originalData);assert.equal(await page.evaluate(()=>window.preview.state.playing),false);
 assert.equal(await page.getByRole('button',{name:'再生',exact:true}).isDisabled(),true);
 await page.screenshot({path:`${out}/reduced-motion.png`});
 const dense=Array.from({length:5001},(_,i)=>measurePose(samplePose(i/1000)));
 const numeric={sampleCount:dense.length,maxBoneLengthError:Math.max(...dense.map(m=>m.lengthError)),maxSupportSlide:Math.max(...dense.map(m=>m.supportSlide)),maxPawContactError:Math.max(...dense.map(m=>m.pawContactError)),maxChainAnchorError:Math.max(...dense.map(m=>m.chainAnchorError)),minReachMargin:Math.min(...dense.map(m=>m.reachMargin)),maxRigidDeterminantError:Math.max(...dense.flatMap(m=>Object.values(m.determinants).map(d=>Math.abs(d-1)))),maxLift:Math.max(...dense.map(m=>m.lift)),maxAdvance:Math.max(...dense.map(m=>m.advance)),maxTorsoForward:Math.max(...dense.map(m=>-m.bodyX))};
 assert.ok(numeric.maxBoneLengthError<1e-9);assert.equal(numeric.maxSupportSlide,0);assert.ok(numeric.maxPawContactError<1e-9);assert.ok(numeric.minReachMargin>12);assert.ok(numeric.maxRigidDeterminantError<1e-12);assert.equal(numeric.maxLift,90);assert.equal(numeric.maxAdvance,110);assert.equal(numeric.maxTorsoForward,40);
 const originalHash=createHash('sha256').update(await readFile(path.join(sourceDir,'original.png'))).digest('hex');
 assert.equal(originalHash,'e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137');
 assert.deepEqual(errors,[]);
 await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA??null,frames:120,fps:24,seconds:DURATION,consoleErrors:errors,mobileWidth:390,actualCssSpriteWidth:130,cssDimensions,originalHash,originalPixelsUnmodified:true,patchDisplayedOnlyThroughNarrowChestMask:true,rig:'rigid original-texture Canvas2D plates with fixed-length two-bone near-foreleg IK',transitionComparisons,renderedSupportChecks,chain:'one rigid original assembly; fixed source shape, small cuff-anchored sway',numeric,poses:capturedPoses,reducedMotionPixelIdentical:true,productionAdoption:false,visualApproval:'Pending independent visual review; numeric invariants do not prove clean seams.'},null,2));
 await writeFile(out+'/pose-samples.json',JSON.stringify(animation,null,2));
}finally{if(browser)await browser.close();server.kill();}
