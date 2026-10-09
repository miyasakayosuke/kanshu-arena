import {describe, expect, it, vi} from 'vitest';
import {drawAreaEffect, type AreaEffect} from './areaEffects';
import {CAST_IMPACT_MS} from './playback';
const targets = [84, 222, 360, 498, 636].map(x => ({x, y: 225}));
const fixture: AreaEffect = {type:'fire', palette:{light:'#fff1aa',core:'#ff9944',dark:'#ab5533'}, targets, incoming:false, age:650, impacted:false, reduced:false, scaleY:.6};
function context() {
  return {
    ...Object.fromEntries(['save','restore','translate','scale','beginPath','ellipse','stroke','fill','fillRect','moveTo','lineTo','quadraticCurveTo','closePath'].map(name => [name, vi.fn()])),
    createLinearGradient:vi.fn(() => ({addColorStop:vi.fn()})), globalAlpha:1,
  } as unknown as CanvasRenderingContext2D;
}
describe('formation-wide effect choreography', () => {
  it.each(['fire','wind','water','shadow','poison','slash'])('covers the whole formation and marks every intended target for %s', type => {
    const ctx = context();
    drawAreaEffect(ctx, {...fixture, type});
    expect(ctx.fillRect).toHaveBeenCalledWith(28, 156, 664, 142);
    const markers = vi.mocked(ctx.ellipse).mock.calls.filter(call => call[2] === 34 && call[3] === 10);
    expect(markers.map(call => call[0])).toEqual(targets.map(p => p.x));
    expect(ctx.scale).toHaveBeenCalledWith(1, .6);
  });
  it('retains wide coverage for a single survivor without marking dead slots', () => {
    const ctx = context();
    drawAreaEffect(ctx, {...fixture, targets:[targets[3]], age:CAST_IMPACT_MS, impacted:true});
    expect(ctx.fillRect).toHaveBeenCalledWith(28, 156, 664, 142);
    expect(vi.mocked(ctx.ellipse).mock.calls.filter(call => call[2] === 34).map(call => call[0])).toEqual([498]);
  });
  it('renders different geometry for fire, wind, water and poison instead of recoloring a projectile', () => {
    const shapes = ['fire','wind','water','poison'].map(type => {
      const ctx = context(); drawAreaEffect(ctx, {...fixture,type});
      return [vi.mocked(ctx.quadraticCurveTo).mock.calls.length, vi.mocked(ctx.lineTo).mock.calls.length, vi.mocked(ctx.ellipse).mock.calls.length];
    });
    expect(new Set(shapes.map(shape => JSON.stringify(shape)))).toHaveLength(4);
  });
  it('sends incoming coverage below the arena rather than marking enemy recipients', () => {
    const ctx = context();
    drawAreaEffect(ctx, {...fixture, incoming:true, targets:[]});
    expect(ctx.fillRect).toHaveBeenCalledWith(28, 400, 664, 142);
    expect(vi.mocked(ctx.ellipse).mock.calls.filter(call => call[2] === 34)).toHaveLength(0);
  });
  it('keeps full coverage in reduced motion without moving particles or ribbons', () => {
    const ctx = context();
    drawAreaEffect(ctx, {...fixture,reduced:true});
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.ellipse).toHaveBeenCalledTimes(7);
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
  });
  it('holds the windup while an impact cue is delayed, then fades relative to impact', () => {
    const ctx = context();
    drawAreaEffect(ctx, {...fixture,age:3000});
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.globalAlpha).toBeLessThan(.7);
    drawAreaEffect(ctx, {...fixture,age:CAST_IMPACT_MS,impacted:true});
    expect(ctx.globalAlpha).toBe(1);
    drawAreaEffect(ctx, {...fixture,age:CAST_IMPACT_MS+250,impacted:true});
    expect(ctx.globalAlpha).toBe(.5);
  });
});
