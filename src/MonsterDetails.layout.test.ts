import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// CSS cascade contracts only. Browser geometry and touch/orientation behavior
// must be checked separately; happy-dom does not render or measure layout.
const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8').replaceAll('@media(', '@media (');
function styles(width: number, height: number) {
  const window = new Window({ width, height });
  window.document.body.innerHTML = `<style>${css}</style><div class="overlay"><section class="modal profileModal">
    <div class="profileHeader"><strong>ケツァルコアトルの詳細</strong><button class="close">×</button></div>
    <div class="profileBody"><div class="profileHeading"><span class="heroIcon"><img class="monsterArt"></span><div><h2>ケツァルコアトル</h2></div></div><button class="closeProfile">閉じて戻る</button></div>
  </section></div><section class="modal tacticsModal"><button class="close">×</button></section>`;
  return (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
}

describe('monster profile bounded body-scroller contract', () => {
  it.each([[400, 606], [802, 394], [326, 432], [500, 758], [720, 900]])('keeps the close header outside the only scroller at %s×%s', (width, height) => {
    const style = styles(width, height);
    expect(style('.profileModal').display).toBe('flex');
    expect(style('.profileModal').flexDirection).toBe('column');
    expect(style('.profileModal').overflow).toBe('hidden');
    expect(style('.profileModal').padding).toBe('0px');
    expect(style('.profileModal').maxHeight).toBe('min(88dvh, calc(100dvh - 34px))');
    expect(style('.profileHeader').flexShrink).toBe('0');
    expect(style('.profileHeader .close').position).toBe('static');
    expect(style('.profileHeader .close').width).toBe('44px');
    expect(style('.profileHeader .close').height).toBe('44px');
    expect(parseFloat(style('.profileBody').minHeight)).toBe(0);
    expect(style('.profileBody').overflowY).toBe('auto');
    expect(style('.profileBody').getPropertyValue('overscroll-behavior')).toBe('contain');
    expect(style('.heroIcon .monsterArt').width).toBe('140px');
    expect(style('.heroIcon .monsterArt').height).toBe('105px');
    expect(style('.closeProfile').minHeight).toBe('44px');
    // Do not change the other modal layouts or their dismiss controls.
    expect(style('.tacticsModal').overflow).toBe('auto');
    expect(style('.tacticsModal .close').position).toBe('absolute');
  });
});
