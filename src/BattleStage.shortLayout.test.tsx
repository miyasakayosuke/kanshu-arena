import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {describe, expect, it} from 'vitest';

// These are CSS cascade/structure contracts, not browser layout measurements.
// happy-dom requires whitespace after @media, although browsers accept both.
const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8').replaceAll('@media(', '@media (');
function styles(width: number, height: number, {compact = false, result = false} = {}) {
  const window = new Window({width, height});
  window.document.body.innerHTML = `<style>${css}</style><div class="app battleMode ${result ? 'resultMode' : ''}"><main class="battle ${compact ? 'hasCompactCastCaption' : ''}">
    <div class="battleTop"><output class="commandClock" role="timer">30</output></div>
    <div class="battleStage"><div class="battleScene"><canvas class="battleCanvas"></canvas><div class="battleTargets"></div></div><div class="enemyVitals"><div class="enemyVital"><strong>長い名前</strong><small>HP 100/100</small><em>守り:今T・自然障壁:残2T・毒:残3回</em></div></div></div>
    <div class="battleMessage"><div class="battleCastCaption">発動する特技と対象</div></div><section class="commandDock"><button class="turnStart">開始</button></section><section class="result"></section>
  </main></div>`;
  return (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
}

describe('short portrait battle CSS contract', () => {
  it.each([false, true])('reserves a readable field and one scroller, compact caption=%s', compact => {
    const style = styles(326, 432, {compact});
    expect(style('.battle').gridTemplateRows).toBe('38px auto auto auto');
    expect(style('.battle').alignContent).toBe('start');
    expect(style('.battle').overflowY).toBe('auto');
    expect(style('.battleTop').position).toBe('sticky');
    expect(style('.battleTop').top).toBe('0px');
    expect(style('.battleStage').height).toBe('auto');
    expect(style('.battleStage').gridTemplateRows).toBe('auto auto');
    expect(style('.battleScene').display).toBe('block');
    expect(style('.battleScene').position).toBe('relative');
    expect(style('.battleScene').minHeight).toBe('140px');
    expect(style('.enemyVitals').position).toBe('static');
    expect(style('.enemyVital strong').whiteSpace).toBe('normal');
    expect(style('.enemyVital strong').overflow).toBe('visible');
    expect(style('.enemyVital em').overflowWrap).toBe('anywhere');
    expect(style('.enemyVital em').fontSize).toBe('8px');
    expect(style('.battleMessage').whiteSpace).toBe('normal');
    expect(style('.battleMessage').overflow).toBe('visible');
    expect(style('.battleCastCaption').flexWrap).toBe('wrap');
    expect(style('.commandDock').maxHeight).toBe('none');
    expect(style('.commandDock').overflowY).toBe('visible');
  });

  it.each([[457, 605], [596, 381], [499, 551], [500, 550], [720, 800]])(
    'preserves the ordinary Canvas and overlay arrangement at %s×%s', (width, height) => {
      const style = styles(width, height);
      expect(style('.battleScene').display).toBe('contents');
      expect(style('.enemyVitals').position).toBe('absolute');
      expect(style('.battleStage').height).toBe('100%');
      expect(style('.battleTop').position).not.toBe('sticky');
      expect(style('.commandDock').maxHeight).not.toBe('none');
      if (width === 596) expect(style('.battle').gridTemplateColumns).toBe('minmax(0,1fr) 285px');
    },
  );

  it('includes the short-portrait boundary but leaves the bounded result scroller alone', () => {
    expect(styles(499, 550)('.battleScene').minHeight).toBe('140px');
    const result = styles(326, 432, {result: true});
    expect(result('.battleTop').position).not.toBe('sticky');
    expect(result('.battle').gridTemplateRows).toBe('38px 24px minmax(0,1fr)');
    expect(result('.result').overflow).toBe('auto');
  });
});
