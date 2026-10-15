import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));const out=fileURLToPath(new URL('./evidence/',import.meta.url));await mkdir(out,{recursive:true});
const checks={kind:'actual-app-same-art-staging-comparison',sourceMain:'14134f351d8eca79714199e1f2b34dc76e826a4e',productionSourceChanged:false,visualAcceptance:false,gameIntegration:false,fixtures:[],sourceHashes:{},errors:[]};
for(const path of ['src/App.tsx','src/navigation.ts','src/style.css','src/enemyFormation.ts','src/BattleStage.tsx','src/MonsterArt.tsx']){const b=await readFile(root+path);checks.sourceHashes[path]=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');}
const server=spawn('node',['node_modules/vite/bin/vite.js','--config','qa/fenrir-acting-bite/stage.config.mjs'],{cwd:root,stdio:'inherit'});let browser;
try{for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:8884/qa/fenrir-acting-bite/stage-fixture.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:390,height:640},{width:844,height:390},{width:1120,height:900}])for(const row of ['front','rear'])for(const mode of ['clip','overlay','tall']){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});page.on('pageerror',e=>checks.errors.push(e.message));
  await page.goto(`http://127.0.0.1:8884/qa/fenrir-acting-bite/stage-fixture.html?row=${row}`);
  await page.waitForFunction(()=>window.__stageStudy?.get());await page.evaluate(mode=>window.__stageStudy.setMode(mode),mode);
  await page.waitForFunction(mode=>window.__stageStudy.get()?.mode===mode,mode);
  await page.waitForTimeout(120);
  const fixture={viewport,row,mode,info:await page.evaluate(()=>window.__stageStudy.info),samples:[],screenshots:[]};
  const sample=async ms=>{await page.evaluate(ms=>window.__stageStudy.setTime(ms),ms);await page.waitForFunction(ms=>window.__stageStudy.get()?.ms===ms,ms);return page.evaluate(()=>window.__stageStudy.get());};
  for(let ms=500;ms<=890;ms+=10)fixture.samples.push(await sample(ms));
  for(const [name,ms]of [['neutral',0],['apex',500],['descent',650],['contact',890]]){const state=await sample(ms);const file=`stage-${viewport.width}x${viewport.height}-${row}-${mode}-${name}.png`;await page.screenshot({path:out+file});fixture.screenshots.push({file,ms,state});}
  const neutral=fixture.screenshots[0].state,contact=fixture.screenshots[3].state;
  assert(Math.abs(neutral.physicalWidth-contact.physicalWidth)<1e-6);assert(Math.abs(neutral.floor.x-contact.floor.x)<1e-6&&Math.abs(neutral.floor.y-contact.floor.y)<1e-6,'within-variant landing floor moved');
  assert(fixture.samples.every(x=>Math.abs(x.physicalWidth-neutral.baseline.physicalWidth)<1e-6),'physical sprite size changed');
  fixture.layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,scrollHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,scene:document.querySelector('.battleScene').getBoundingClientRect().toJSON(),commandDock:document.querySelector('.commandDock').getBoundingClientRect().toJSON(),turnStart:document.querySelector('.turnStart')?.getBoundingClientRect().toJSON()}));
  assert(fixture.layout.scrollWidth<=viewport.width,'horizontal overflow');
  const button=page.locator('.turnStart');await button.scrollIntoViewIfNeeded();await button.focus();fixture.turnStartReachable=await button.evaluate(e=>document.activeElement===e&&e.getBoundingClientRect().bottom<=innerHeight+1&&e.getBoundingClientRect().top>=-1);
  await page.screenshot({path:out+`stage-${viewport.width}x${viewport.height}-${row}-${mode}-controls.png`});
  fixture.allSamplesInsideStage=fixture.samples.every(x=>x.withinStage);fixture.allSamplesInsideViewport=fixture.samples.every(x=>x.withinViewport);fixture.uiOverlapSamples=fixture.samples.filter(x=>x.uiIntersections.length).map(x=>({ms:x.ms,intersections:x.uiIntersections}));
  checks.fixtures.push(fixture);await page.close();
 }
 assert.deepEqual(checks.errors,[]);checks.completed=true;
}catch(e){checks.completed=false;checks.error=String(e);throw e;}finally{await writeFile(out+'stage-checks.json',JSON.stringify(checks,null,2)+'\n');await browser?.close();server.kill();}
