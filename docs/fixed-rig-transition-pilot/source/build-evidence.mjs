import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {comparisonSvg,panelSvg,META} from './rig.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(base,'evidence'),work=path.join(out,'render-frames');
fs.mkdirSync(work,{recursive:true});
const frameRecords=[],unique=new Map();
function add(ms,playback){const key=`${ms.toFixed(5)}-${playback}`;if(!unique.has(key)){const file=`frame-${String(unique.size).padStart(4,'0')}`;unique.set(key,file);fs.writeFileSync(path.join(work,file+'.svg'),comparisonSvg(ms,{playback}));}frameRecords.push({timeMs:ms,label:playback,file:unique.get(key)});}
for(let loop=0;loop<2;loop++){
 for(let i=0;i<30;i++)add(360,'START HOLD · 1x next');
 for(let i=0;i<18;i++)add(360+i*1000/60,'NORMAL 1x');
 for(let i=0;i<42;i++)add(660,'END HOLD · 1x finished');
}
for(let i=0;i<30;i++)add(360,'START HOLD · 0.25x next');
for(let i=0;i<72;i++)add(360+i*250/60,'SLOW 0.25x');
for(let i=0;i<42;i++)add(660,'END HOLD · 0.25x finished');
for(const t of [360,430,510,660])fs.writeFileSync(path.join(out,`paused-${t}ms.svg`),comparisonSvg(t));
const boundaryTimes=[360,399,400,459,460,559,560,660];
for(const pw of [130,142]){
 const width=1920,height=550,parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="DejaVu Sans,sans-serif"><rect width="100%" height="100%" fill="#101d2b"/><text x="14" y="30" fill="#dce8ef" font-size="20">${pw}px fixed scale / paused exact-boundary comparison / schematic proxy, not original art</text>`];
 for(const [r,mode]of ['held','continuous'].entries()){
  parts.push(`<text x="14" y="${64+r*244}" fill="#dce8ef" font-size="16">${mode==='held'?'A: held key poses':'B: continuous joints'}</text>`);
  for(const [c,t]of boundaryTimes.entries()){parts.push(`<g transform="translate(${c*240+5} ${76+r*244})">${panelSvg(t,mode,{width:230,height:198,physicalWidth:pw})}<text x="8" y="220" fill="#dce8ef" font-size="15">${t}ms</text></g>`);}
 }
 parts.push('</svg>');fs.writeFileSync(path.join(out,`native-${pw}px-boundaries.svg`),parts.join(''));
}
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1300" font-family="DejaVu Sans,sans-serif"><rect width="100%" height="100%" fill="#101d2b"/><text x="14" y="30" fill="#dce8ef" font-size="20">Continuous fixed rig / 420px reference scale / start, spline knots, original exposure boundaries, end</text>`];
for(const [i,t]of [360,400,430,460,560,660].entries())parts.push(`<g transform="translate(${i%3*600} ${50+Math.floor(i/3)*625})">${panelSvg(t,'continuous',{joints:true})}<text x="15" y="620" fill="#dce8ef" font-size="16">${t}ms</text></g>`);
parts.push('</svg>');fs.writeFileSync(path.join(out,'enlarged-420px-sequence.svg'),parts.join(''));
const manifest={...META,renderer:'Installed librsvg and Cairo; deterministic frame rendering, not browser capture',fps:60,frameCount:frameRecords.length,videoDurationSeconds:frameRecords.length/60,frameRecords};fs.writeFileSync(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const source=fs.readFileSync(path.join(base,'source/rig.mjs'),'utf8').replaceAll('export ','');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Moonlit Bite fixed-rig pilot</title><style>body{margin:0;padding:16px;background:#101d2b;color:#dce8ef;font:16px system-ui}button,select{font:inherit;padding:8px 16px;margin-right:8px}#screen{max-width:1280px}#screen svg{width:100%;height:auto}input{width:min(600px,90vw)}p{max-width:1050px;line-height:1.5}</style><p>Temporary method test only. Left: the same rig held at key poses. Right: continuous joint angles. This is not an original-art before/after and is not integrated into the game.</p><button id="play">Play once</button><button id="pause">Pause</button><button id="reset">Reset</button><select id="speed"><option value="1">Normal 1x</option><option value="0.25">Slow 0.25x</option><option value="2">2x</option></select><p><input id="seek" type="range" min="360" max="660" step="0.1" value="360" aria-label="Time in milliseconds"> <output id="time"></output></p><div id="screen"></div><p>Original pixels unchanged. Same constant scale, body/head/paw sizes, bone lengths and source root trajectory on both sides. The exact endpoint poses match this proxy control, not the surrounding original artwork. Face, fur, chain, impact and landing remain outside scope. Offline HTML preview is provided but has not been executed in a browser.</p><script type="module">${source}\nlet ms=360,raf=0;const screen=document.querySelector('#screen'),seek=document.querySelector('#seek'),time=document.querySelector('#time');function show(label='PAUSED'){screen.innerHTML=comparisonSvg(ms,{playback:label});seek.value=ms;time.value=ms.toFixed(1)+' ms';}function stop(){cancelAnimationFrame(raf);raf=0;}document.querySelector('#play').onclick=()=>{stop();if(ms>=660)ms=360;const start=performance.now(),initial=ms,speed=Number(document.querySelector('#speed').value);function tick(now){ms=Math.min(660,initial+(now-start)*speed);show(ms<660?'PLAY '+speed+'x':'END HOLD');if(ms<660)raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);};document.querySelector('#pause').onclick=()=>{stop();show();};document.querySelector('#reset').onclick=()=>{stop();ms=360;show();};seek.oninput=()=>{stop();ms=Number(seek.value);show();};document.querySelector('#speed').onchange=()=>{stop();show();};document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();show();}});show();</script></html>`;
fs.writeFileSync(path.join(base,'index.html'),html);
console.log(JSON.stringify({uniqueRenderedFrames:unique.size,videoFrames:frameRecords.length,contactSheets:3,pausedComparisons:4}));
