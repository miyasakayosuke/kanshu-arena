import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const directory=fileURLToPath(new URL('../../docs/fenrir-acting-bite/',import.meta.url));
const out=fileURLToPath(new URL('./evidence/',import.meta.url));await mkdir(out,{recursive:true});
const server=spawn('python3',['-m','http.server','8883','--directory',directory],{stdio:'inherit'});let browser;
const checks={kind:'two-key-high-leap-feasibility',finishedAnimation:false,visualAcceptance:false,gameIntegration:false,errors:[],contexts:[]};
try{for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8883')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const p=await browser.newPage({viewport:{width:1120,height:1100}});p.on('pageerror',e=>checks.errors.push(e.message));await p.goto('http://127.0.0.1:8883/high-leap-study.html');await p.waitForFunction(()=>window.leapReady);
 checks.info=await p.evaluate(()=>window.leap.info);checks.sources=await p.evaluate(()=>window.leap.sourceBounds);checks.pathSamples=[];
 for(let ms=500;ms<=890;ms+=10){const bounds=await p.evaluate(ms=>window.leap.setTime(ms),ms);checks.pathSamples.push({ms,bounds});assert(bounds.filter(x=>x.stageHeight>=240).every(x=>x.fits),'headroom diagnostic should contain meaningful alpha');}
 // Short-stage overflow is measured and retained, not silently hidden or treated as a passed gate.
 checks.shortStageFit=checks.pathSamples[0].bounds.filter(x=>x.stageHeight<240);
 for(const width of [1120,390]){await p.setViewportSize({width,height:1100});for(const theme of ['light','dark']){await p.evaluate(t=>window.leap.setTheme(t),theme);for(const ms of [500,560,650,730,890]){await p.evaluate(ms=>window.leap.setTime(ms),ms);const name=`leap-${width}-${theme}-${ms}.png`;await p.screenshot({path:out+name,fullPage:true});checks.contexts.push(name);}}}
 await p.setViewportSize({width:1120,height:1100});await p.evaluate(()=>window.leap.setTheme('light'));const frames=out+'leap-pair-frames/';await mkdir(frames,{recursive:true});
 // Four repeated 230ms conceptual apex/descent excerpts; the reset is not part of the action.
 for(let i=0;i<56;i++){const ms=Math.min(730,500+(i%14)*1000/60);await p.evaluate(ms=>window.leap.setTime(ms),ms);await p.screenshot({path:frames+String(i).padStart(3,'0')+'.png'});}
 for(const [name,fps]of [['leap-pair',60],['leap-pair-slow',15]])assert.equal(spawnSync('ffmpeg',['-loglevel','error','-y','-framerate',String(fps),'-i',frames+'%03d.png','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out+name+'.mp4'],{stdio:'inherit'}).status,0);
 checks.capture={fps:60,logicalStart:500,logicalEnd:730,loopResetNotPartOfAction:true,holdsAreNotInbetweens:true};assert.deepEqual(checks.errors,[]);checks.completed=true;
}catch(e){checks.completed=false;checks.error=String(e);throw e;}finally{await writeFile(out+'leap-checks.json',JSON.stringify(checks,null,2)+'\n');await browser?.close();server.kill();}
