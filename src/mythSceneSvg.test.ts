import { describe, expect, it } from 'vitest';
import { MYTH_DURATION, MYTH_SCENES, MYTH_STILLS, clampMythTime, mythBeat } from './mythVignettes';
import { mythSceneSvg } from './mythSceneSvg';

describe('original scene content and deterministic rendering',()=>{
  it('covers exactly the eight existing cores',()=>{expect(MYTH_SCENES.map(scene=>scene.id)).toEqual([12,14,15,19,24,29,32,36]);});
  it.each(MYTH_SCENES)('$name has three distinct bounded narrative frames and no external media',scene=>{
    const samples=MYTH_STILLS.map(time=>mythSceneSvg(scene.id,time));expect(new Set(samples).size).toBe(3);
    for(const svg of samples){expect(svg.startsWith('<svg')).toBe(true);expect(svg).not.toMatch(/NaN|Infinity|<script|<image|<foreignObject|<animate|<audio|<video|https?:\/\/(?!www\.w3\.org)/);expect(svg).toContain('data-scene-part=');}
    expect(mythSceneSvg(scene.id,MYTH_DURATION+10000)).toBe(mythSceneSvg(scene.id,MYTH_DURATION));expect(mythSceneSvg(scene.id,-10)).toBe(mythSceneSvg(scene.id,0));
    expect(scene.beats).toHaveLength(3);expect(scene.description.length).toBeGreaterThan(25);expect(scene.adaptation.length).toBeGreaterThan(25);
  });
  it('keeps adaptation and mythology distinctions explicit',()=>{
    expect(MYTH_SCENES.find(s=>s.id===24)?.source).toBeUndefined();expect(MYTH_SCENES.find(s=>s.id===24)?.adaptation).toContain('ゲームオリジナル');
    expect(MYTH_SCENES.find(s=>s.id===29)?.adaptation).toContain('寓話');expect(MYTH_SCENES.find(s=>s.id===15)?.adaptation).toContain('インドラ');expect(MYTH_SCENES.find(s=>s.id===12)?.adaptation).toContain('絹');
  });
  it('has a visible binding rupture, river release and moving gate rather than camera scaling',()=>{
    expect(mythSceneSvg(12,1600)).not.toContain('broken-silk');expect(mythSceneSvg(12,5200)).toContain('broken-silk');
    expect(mythSceneSvg(15,8200)).toContain('released-river');expect(mythSceneSvg(36,8200)).toContain('opening-left-door');
    expect(mythSceneSvg(29,5700)).toContain('mammon-catching-hand');expect(mythSceneSvg(19,7400)).toContain('talos-left-arm');
  });
  it('defines a non-looping three-beat timeline with safe invalid inputs',()=>{
    expect([0,2599,2600,6199,6200,9000].map(mythBeat)).toEqual([0,0,1,1,2,2]);expect(clampMythTime(NaN)).toBe(0);expect(clampMythTime(Infinity)).toBe(0);expect(clampMythTime(99999)).toBe(MYTH_DURATION);
  });
});
