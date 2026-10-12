import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// CSS contracts only. This does not claim browser geometry verification.
const css = ['style.css', 'homePasture.css'].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n').replaceAll('@media(', '@media (');

describe('art-first pasture home layout', () => {
  it.each([[400,606], [802,394], [326,432], [720,900], [802,360], [540,320]])('does not reserve an empty navigation column at %s×%s', (width, height) => {
    const window = new Window({ width, height });
    window.document.body.innerHTML = `<style>${css}</style><div class="app screen-home"><main class="gameHome"><section class="homePasture"><img class="pastureLandscape" /><div class="pastureMonster"><img class="monsterArt" /></div><button class="pastureDetails"><span></span></button></section><div class="homeCredits"><a href="credits.html"></a></div></main><nav class="mainNav"><button></button><button></button><button></button><button></button></nav></div>`;
    const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
    expect(style('.gameHome').display).not.toBe('grid');
    expect(window.document.querySelector('.homeDestinations')).toBeNull();
    expect(window.document.querySelector('.familyTrialGate')).toBeNull();
    expect(parseFloat(style('.homeCredits a').minHeight)).toBeGreaterThanOrEqual(44);
    expect(style('.homePasture').overflow).toBe('hidden');
    expect(style('.homePasture').height).toContain('100svh');
    if (height <= 480 && width >= 500) expect(style('.homePasture').minHeight).toBe('262px');
    expect(style('.pastureLandscape').objectFit).toBe('cover');
    expect(style('.pastureMonster').position).toBe('absolute');
    expect(parseFloat(style('.pastureDetails').width)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style('.pastureDetails').height)).toBeGreaterThanOrEqual(44);
    expect(style('.pastureDetails').zIndex).toBe('4');
    expect(style('.pastureMonster .monsterArt').objectFit).toBe('contain');
    expect(style('.mainNav').position).toBe('fixed');
    expect(style('.mainNav').gridTemplateColumns).toBe('repeat(4,minmax(0,1fr))');
  });
});
