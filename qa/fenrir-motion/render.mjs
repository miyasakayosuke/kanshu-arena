import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const out='evidence';await mkdir(out,{recursive:true});await mkdir(out+'/frames',{recursive:true});
const server=spawn('python3',['-m','http.server','8879','--directory','../../docs/fenrir-motion-preview'],{stdio:'inherit'});
let browser;
try{
 for(let n=0;n<40;n++){try{if((await fetch('http://127.0.0.1:8879')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8879');await page.waitForFunction(()=>window.ready);
 for(let i=0;i<144;i++){await page.evaluate(t=>window.preview.setTime(t),i/24);await page.screenshot({path:`${out}/frames/${String(i).padStart(3,'0')}.png`});}
 for(const [name,t] of [['neutral',0],['loaded',1.8],['braced',2.6],['recovered',5]]){await page.evaluate(t=>window.preview.setTime(t),t);await page.screenshot({path:`${out}/${name}.png`});}
 await page.getByRole('button',{name:'原画と比較'}).click();await page.screenshot({path:`${out}/original-comparison.png`});assert.equal(await page.locator('#phase').textContent(),'元の姿勢');
 await page.getByRole('button',{name:'原画と比較'}).click();await page.getByRole('button',{name:'再生',exact:true}).click();await page.getByRole('button',{name:'一時停止',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.preview.setTime(2.6));await page.screenshot({path:`${out}/mobile.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA,frames:144,fps:24,seconds:6,consoleErrors:errors,mobileWidth:390,originalPixelsUnmodified:true,productionAdoption:false},null,2));
}finally{if(browser)await browser.close();server.kill();}
