import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// CSS contracts only. This does not claim browser geometry verification.
const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8').replaceAll('@media(', '@media (');

describe('balanced single-action home layout', () => {
  it.each([[400,606], [802,394], [326,432], [720,900]])('does not reserve an empty navigation column at %s×%s', (width, height) => {
    const window = new Window({ width, height });
    window.document.body.innerHTML = `<style>${css}</style><div class="app screen-home"><main class="gameHome"><section class="homeHero"></section><section class="partyCard partySummary"></section><div class="homeDestinations"><button class="workshopLink familyTrialGate"></button></div></main><nav class="mainNav"><button></button><button></button><button></button></nav></div>`;
    const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
    expect(style('.gameHome').display).not.toBe('grid');
    expect(style('.homeDestinations').gridTemplateColumns).not.toContain('1fr 1fr');
    expect(style('.familyTrialGate').width).toBe('100%');
    expect(parseFloat(style('.familyTrialGate').minHeight)).toBeGreaterThanOrEqual(44);
    expect(style('.mainNav').position).toBe('fixed');
    expect(style('.mainNav').gridTemplateColumns).toBe('repeat(3,1fr)');
  });
});
