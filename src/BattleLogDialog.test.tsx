// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BattleLogDialog from './BattleLogDialog';
import { start, advanceWithEvents, DEFEND, type State } from './engine';
import { initialTeam } from './strategy';

let root: Root, battle: State;
const close = () => document.querySelector<HTMLButtonElement>('.logModal .close')!;
const summary = () => document.querySelector<HTMLElement>('.historyLedger > summary')!;
const opener = () => document.getElementById('opener')!;
const fallback = () => document.getElementById('fallback');
const key = async (key: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  await act(async () => (document.activeElement ?? document.body).dispatchEvent(event));
  return event;
};
const mount = async (onClose: () => void = vi.fn()) => { await act(async () => root.render(<BattleLogDialog battle={battle} playing={false} onClose={onClose} fallbackFocus={fallback} />)); return onClose; };
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">Log</button><h2 id="fallback" tabindex="-1">Arena</h2><div id="root"></div><div id="already-inert" inert></div>';
  document.body.style.overflow = 'auto';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
  const state = start(initialTeam, initialTeam, 19);
  battle = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: DEFEND }))).state;
  opener().focus();
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
describe('battle log keyboard lifecycle', () => {
  it('focuses close, traps both directions, and skips all descendants of a closed ledger', async () => {
    await mount(); expect(document.activeElement).toBe(close());
    expect(document.getElementById('root')!.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    const focusSummary = vi.spyOn(summary(), 'focus');
    await key('Tab'); expect(document.activeElement).toBe(summary()); expect(focusSummary).toHaveBeenLastCalledWith();
    await key('Tab'); expect(document.activeElement).toBe(close());
    await key('Tab', true); expect(document.activeElement).toBe(summary());
    await key('Tab', true); expect(document.activeElement).toBe(close());
    const ledger = document.querySelector<HTMLDetailsElement>('.historyLedger')!;
    ledger.open = true; await key('Tab'); await key('Tab');
    expect(document.activeElement).toBe(ledger.querySelector(':scope > details > summary'));
    await key('Tab'); expect(document.activeElement).toBe(close());
  });
  it('restores the opener and original inert/scroll state after Escape and repeated open', async () => {
    const onClose = await mount(() => root.render(null));
    await key('Escape'); expect(document.querySelector('.logModal')).toBeNull();
    expect(document.activeElement).toBe(opener());
    expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('already-inert')!.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('auto');
    await mount(onClose); expect(document.activeElement).toBe(close()); await key('Escape'); expect(document.activeElement).toBe(opener());
  });
  it('restores a logical fallback when the opener disappears', async () => {
    await mount(); opener().remove(); await act(async () => root.render(null)); expect(document.activeElement).toBe(fallback());
  });
  it('repairs escaped focus and recovers Tab from BODY', async () => {
    await mount(); opener().focus(); expect(document.activeElement).toBe(close());
    close().blur(); await key('Tab', true); expect(document.activeElement).toBe(summary());
  });
  it('yields Escape, Tab and focus handling to an inert top layer', async () => {
    const onClose = await mount(); const overlay = close().closest('.overlay')!;
    overlay.setAttribute('inert', '');
    const top = document.createElement('button'); document.body.append(top); top.focus();
    expect((await key('Escape')).defaultPrevented).toBe(false); expect(onClose).not.toHaveBeenCalled();
    expect((await key('Tab')).defaultPrevented).toBe(false); expect(document.activeElement).toBe(top);
    overlay.removeAttribute('inert'); close().focus(); expect((await key('Escape')).defaultPrevented).toBe(true); expect(onClose).toHaveBeenCalledOnce();
  });
  it('keeps content clicks open, dismisses only backdrop/close, and leaves data untouched', async () => {
    const before = JSON.stringify(battle); const onClose = await mount();
    await act(async () => summary().click()); expect(onClose).not.toHaveBeenCalled();
    await act(async () => close().click()); expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => document.querySelector<HTMLElement>('.overlay')!.click()); expect(onClose).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(battle)).toBe(before);
  });
});
