import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
const css = ['style.css', 'tabCopy.css'].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n').replaceAll('@media(', '@media (');
// CSS contracts only; rendered viewport evidence is recorded separately.
describe('heading-free layout accessibility', () => {
  it.each([[320,432], [390,844], [400,606], [802,394]])('keeps identity out of layout and preserves touch navigation at %s×%s', (width, height) => {
    const window = new Window({ width, height });
    window.document.body.innerHTML = `<style>${css}</style><div class="app screen-team"><h1 class="srOnly">環獣のアリーナ</h1><main class="home teamBuilder"><h2 class="srOnly">編成</h2></main></div><div class="app battleMode"><header class="battleNavigation"><button class="headerHome iconButton">ホーム</button></header></div>`;
    const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
    expect(style('h1').position).toBe('absolute');
    expect(style('h1').width).toBe('1px');
    expect(style('h1').height).toBe('1px');
    expect(style('h1').overflow).toBe('hidden');
    expect(style('h2').position).toBe('absolute');
    expect(style('.teamBuilder').paddingTop).toBe('16px');
    expect(parseFloat(style('.headerHome').minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style('.headerHome').minWidth)).toBeGreaterThanOrEqual(44);
  });
});
