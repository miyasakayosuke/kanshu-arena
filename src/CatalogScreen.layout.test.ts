import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
const css = ['style.css', 'teamBuilder.css'].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n').replaceAll('@media(', '@media (');

describe('four-item catalog footer CSS contracts (not browser geometry)', () => {
  it.each([[320,568], [360,432], [400,606], [802,394], [1280,800]])('keeps 44px targets, a four-column footer and usable catalog controls at %s×%s', (width, height) => {
    const window = new Window({ width, height });
    window.document.body.innerHTML = `<style>${css}</style><div class="app screen-catalog"><main class="home teamBuilder catalogScreen"><section class="candidatePanel"><div class="tools"><input><select></select></div><div class="filterChips"><button></button></div><button class="resetFilters"></button><div class="roster candidateList"><div class="candidateCardActions"><button class="detailButton"></button></div></div></section></main><nav class="mainNav"><button></button><button></button><button></button><button></button></nav></div>`;
    const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
    expect(style('.mainNav').gridTemplateColumns).toBe('repeat(4,minmax(0,1fr))');
    expect(style('.mainNav').position).toBe('fixed');
    expect(parseFloat(style('.mainNav button').minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style('.mainNav button').minWidth)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style('.tools input').minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style('.tools select').minHeight)).toBeGreaterThanOrEqual(44);
    expect(style('.candidateList').overflowY).toBe('auto');
    for (const selector of ['.filterChips button', '.resetFilters', '.candidateCardActions .detailButton']) {
      expect(parseFloat(style(selector).minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(style(selector).minWidth)).toBeGreaterThanOrEqual(44);
    }
  });
  it('reserves the device bottom inset for catalog content and navigation', () => {
    expect(css).toContain('.app.screen-home,.app.screen-catalog{padding-bottom:calc(86px + env(safe-area-inset-bottom))}');
    expect(css).toContain('padding-bottom:env(safe-area-inset-bottom)');
    expect(css).toContain('.mainNav button:focus-visible');
  });
});
