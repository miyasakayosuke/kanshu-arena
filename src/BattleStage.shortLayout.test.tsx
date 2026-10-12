import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {describe, expect, it} from 'vitest';

// These are CSS cascade/structure contracts, not browser layout measurements.
// Live Chrome exposed auto-track shrink even while these contracts passed.
// max-content must survive the cascade; scrollHeight and clipping still require
// post-deployment browser measurements, which happy-dom cannot establish.
// happy-dom requires whitespace after @media, although browsers accept both.
const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8').replaceAll('@media(', '@media (');
function styles(width: number, height: number, {compact = false, result = false} = {}) {
  const window = new Window({width, height});
  window.document.body.innerHTML = `<style>${css}</style><div class="app battleMode ${result ? 'resultMode' : ''}"><main class="battle ${compact ? 'hasCompactCastCaption' : ''}">
    <div class="battleTop"><output class="commandClock" role="timer">30</output></div>
    <div class="battleStage layeredBattleStage"><div class="battleScene"><canvas class="battleCanvas"></canvas><div class="battleTargets"></div></div><div class="enemyVitals"><div class="enemyVital"><strong>長い名前</strong><small>HP 100/100</small><em>守り:今T・自然障壁:残2T・毒:残3回</em></div></div></div>
    <div class="battleMessage"><div class="battleCastCaption">発動する特技と対象</div></div><section class="commandDock"><button class="turnStart">開始</button></section><section class="result"></section>
  </main></div>`;
  return (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
}

describe('layered enemies and separated target strip CSS contract', () => {
  it.each([[326,432],[400,606],[500,394],[596,381],[619,480],[650,606]])('uses intrinsic scrolling rows at %s×%s so neither bodies nor long status cards are clipped', (width,height) => {
    for(const compact of [false,true]) {
      const style=styles(width,height,{compact});
      expect(style('.battle').gridTemplateRows).toBe('38px max-content max-content max-content');
      expect(style('.battle').gridTemplateColumns).toBe('minmax(0,1fr)');
      expect(style('.battle').overflowY).toBe('auto');
      expect(style('.battleTop').position).toBe('sticky');
      expect(style('.battleStage').height).toBe('auto');
      expect(style('.battleStage').gridTemplateRows).toBe('auto auto');
      expect(style('.battleScene').minHeight).toBe('140px');
      expect(style('.enemyVitals').position).toBe('static');
      expect(style('.enemyVital strong').whiteSpace).toBe('normal');
      expect(style('.enemyVital em').overflowWrap).toBe('anywhere');
      expect(style('.commandDock').maxHeight).toBe('none');
      expect(style('.commandDock').overflowY).toBe('visible');
    }
  });
  it.each([[620,394],[802,394],[720,800],[400,800]])('reserves the intrinsic full Canvas and vitals height at %s×%s', (width,height) => {
    const style=styles(width,height);
    expect(style('.battle').gridTemplateRows).toContain('minmax(min-content,1fr)');
    expect(style('.battle').overflowY).toBe('auto');
    expect(style('.battleScene').display).toBe('block');
    expect(style('.battleScene').minHeight).toBe('140px');
    expect(style('.enemyVitals').position).toBe('static');
    if(height<481)expect(style('.battle').gridTemplateColumns).toBe('minmax(0,1fr) 285px');
  });
  it('keeps card buttons fully inside their own cell with an inset focus outline',()=>{
    const window=new Window({width:326,height:432});
    window.document.body.innerHTML=`<style>${css}</style><div class="layeredBattleStage"><div class="enemyVital"><button class="battleTarget"></button></div></div>`;
    const style=window.getComputedStyle(window.document.querySelector('button')!);
    expect(style.minWidth).toBe('44px');expect(style.minHeight).toBe('44px');expect(style.width).toBe('100%');expect(style.height).toBe('100%');
    expect(css).toContain('.layeredBattleStage .battleTarget:focus-visible{outline:3px solid #315d64;outline-offset:-3px');
  });
  it('leaves the bounded result scroller alone',()=>{
    const result=styles(326,432,{result:true});
    expect(result('.battleTop').position).not.toBe('sticky');
    expect(result('.battle').gridTemplateRows).toBe('38px 24px minmax(0,1fr)');
    expect(result('.result').overflow).toBe('auto');
  });
});
