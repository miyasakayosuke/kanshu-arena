// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from './App';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
let root: Root;
const label=(name:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const click=async(node:HTMLElement)=>{expect(node).toBeTruthy();await act(async()=>node.click());};
const key=async(name:string)=>{await act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true})));};
beforeEach(()=>{
 localStorage.clear();window.history.replaceState(null,'','#home');
 document.body.innerHTML='<div id="root"></div>';document.body.style.overflow='auto';
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 root=createRoot(document.getElementById('root')!);
});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();vi.restoreAllMocks();});
it('home → compact groups → nested movie → home preserves party/history/focus',async()=>{
 localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team:[12,2,3,4,6],rule:'standard'}));
 await act(async()=>root.render(<App/>));
 const saved=localStorage.getItem('kanshu-workshop-v1');const opener=label('フェンリルの詳細');opener.focus();await click(opener);
 for(const name of ['story','abilities','skills','appearance']){await click(document.querySelector(`[data-detail-tab=${name}]`)!);expect(document.querySelector(`.profilePanel:not([hidden])`)!.id).toContain(name);}
 await act(async()=>{await import('./components/MythVignette');});
 const trigger=document.querySelector<HTMLButtonElement>('.mythPlay')!;trigger.focus();await click(trigger);
 expect(document.querySelector('.mythPlayer')).toBeTruthy();await key('Escape');
 expect(document.querySelector('.mythPlayer')).toBeNull();expect(document.activeElement).toBe(trigger);await key('Escape');
 expect(document.querySelector('.profileModal')).toBeNull();expect(document.activeElement).toBe(opener);
 expect(document.body.style.overflow).toBe('auto');expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
 expect(window.location.hash).toBe('#home');expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved);
});
it('home pointer opening restores the actual clicked name when browser click does not focus',async()=>{
 await act(async()=>root.render(<App/>));
 const prior=label('ホーム');prior.focus();const opener=label('妖狐の詳細');
 await click(opener);await click(label('詳細を閉じる'));
 expect(document.activeElement).toBe(opener);
});
it('all integrated style imports preserve isolated modal/home/footer contracts',()=>{
 const names=['teamBuilder.css','catalog.css','homePasture.css','monsterDetails.css','style.css','tabCopy.css'];
 const sheets=Object.fromEntries(names.map(file=>[file,readFileSync(new URL('./'+file,import.meta.url),'utf8')]));
 for(const [width,height] of [[360,640],[400,606],[802,360],[540,320],[240,320]])for(const order of [names,[...names].reverse()]){
  const window=new Window({width,height});window.document.body.innerHTML=`<style>${order.map(file=>sheets[file]).join('\n').replaceAll('@media(','@media (')}</style><div class="app screen-home"><h1 class="srOnly">環獣のアリーナ</h1><main class="gameHome"><section class="homePasture"><div class="pastureMonster"><img class="monsterArt"></div><button class="pastureDetails"><span>妖狐</span></button></section><div class="homeCredits"><a href="credits.html">クレジット</a></div></main><nav class="mainNav"><button>ホーム</button></nav><div class="overlay profileOverlay"><section class="modal profileModal profileArtFirst profileTabbed"><div class="profileHeader"><button class="close">×</button></div><div class="profileTabs"><button>姿</button></div><div class="profileBody"><section class="profilePanel" hidden><a href="#">隠し出典</a></section><section class="profilePanel profileAppearance"><div class="profileHeading"><span class="heroIcon"><img class="monsterArt"></span><div class="profileIdentity"><h2>妖狐</h2></div></div></section></div></section></div></div>`;
  const style=(s:string)=>window.getComputedStyle(window.document.querySelector(s)!);
  expect(style('h1').width).toBe('1px');expect(style('.mainNav').position).toBe('fixed');expect(style('.homeCredits a').minHeight).toBe('44px');
  expect(style('.profileHeader .close').position).toBe('static');expect(style('.profileTabs').flexShrink).toBe('0');expect(style('.profileBody').overflowY).toBe('auto');expect(style('.profilePanel[hidden]').display).toBe('none');expect(style('.profileHeading').overflow).toBe('visible');
  expect(style('.pastureDetails').width).toBe('44px');expect(style('.pastureDetails').height).toBe('44px');expect(style('.pastureDetails').zIndex).toBe('4');
  if(height<=480 && width>=500)expect(style('.homePasture').minHeight).toBe('262px');
 }
});
