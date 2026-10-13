// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PartyGuardShield from './PartyGuardShield';
import { PARTY_GUARD_MS, type PartyGuardCue } from './partyGuardCues';

let root: Root;
const cue = (speed = 1, id = '1:2:a3'): PartyGuardCue => ({ id, actor: 'a1', target: 'a3', duration: PARTY_GUARD_MS / speed, elapsed: 0, expires: 1000 + PARTY_GUARD_MS / speed });
const shield = () => document.querySelector<SVGElement>('.partyGuardCue');
async function render(value: PartyGuardCue) { await act(async () => root.render(<PartyGuardShield key={value.id} cue={value} />)); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(1000); document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); });

describe('guard outline mount-time synchronization', () => {
  it.each([1, 2])('catches up a deferred first render at ×%s without adding time to the cue', async speed => {
    const value = cue(speed); vi.setSystemTime(1100); await render(value);
    expect(shield()?.style.animationDuration).toBe(`${640 / speed}ms`);
    expect(shield()?.style.animationDelay).toBe('-100ms');
    expect(shield()?.dataset.guardTarget).toBe('a3'); expect(shield()?.dataset.guardActor).toBe('a1');
    expect(shield()?.getAttribute('aria-hidden')).toBe('true'); expect(value.elapsed).toBe(0);
    vi.setSystemTime(value.expires); await render(value); expect(shield()).toBeNull();
  });

  it('does not advance the animation a second time or remount it on an unrelated rerender', async () => {
    const value = cue(); vi.setSystemTime(1050); await render(value); const original = shield();
    expect(original?.style.animationDelay).toBe('-50ms');
    vi.setSystemTime(1250); await render({ ...value });
    expect(shield()).toBe(original); expect(shield()?.style.animationDelay).toBe('-50ms');
    expect(shield()?.dataset.guardCue).toBe(value.id);
  });

  it.each([1640, 1641, 10000])('does not mount an expired outline when first render occurs at %s', async now => {
    vi.setSystemTime(now); await render(cue()); expect(shield()).toBeNull();
  });

  it('remounts a new resolved cue for the same recipient with its own elapsed time and identity', async () => {
    vi.setSystemTime(1010); await render(cue()); const original = shield();
    const repeated = { ...cue(), id: '1:5:a3', expires: 2140 };
    vi.setSystemTime(1600); await render(repeated);
    expect(shield()).not.toBe(original); expect(shield()?.dataset.guardCue).toBe('1:5:a3');
    expect(shield()?.style.animationDelay).toBe('-100ms'); expect(shield()?.style.animationDuration).toBe('640ms');
  });
});
