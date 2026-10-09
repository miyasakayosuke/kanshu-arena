// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScreenNavigation } from './navigation';

let root: Root;
let navigation: ReturnType<typeof useScreenNavigation>;
let leave: ReturnType<typeof vi.fn>;
let entries: { state: unknown; hash: string }[];
let position: number;
let traversals: number[];
let nativeReplace: History['replaceState'];

function Harness() {
  navigation = useScreenNavigation(true, leave);
  return React.createElement('div', { 'data-page': navigation.page });
}

// happy-dom traverses synchronously. Model the browser's queued traversals so
// Back, Back, and our compensating Forward can interleave before React renders.
function traverseOne() {
  const delta = traversals.shift()!;
  const target = position + delta;
  if (target < 0 || target >= entries.length) return;
  position = target;
  const entry = entries[position];
  nativeReplace(entry.state, '', entry.hash);
  window.dispatchEvent(new PopStateEvent('popstate', { state: entry.state }));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

async function drain() {
  await act(async () => {
    let operations = 0;
    while (traversals.length || vi.getTimerCount()) {
      if (++operations > 20) throw new Error('History restoration did not settle');
      if (traversals.length) traverseOne();
      else vi.runOnlyPendingTimers();
    }
  });
}

beforeEach(async () => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  nativeReplace = window.history.replaceState.bind(window.history);
  nativeReplace(null, '', '#home');
  entries = [{ state: null, hash: '#home' }]; position = 0; traversals = [];
  vi.spyOn(window.history, 'replaceState').mockImplementation((state, _, url) => {
    entries[position] = { state, hash: String(url) };
    nativeReplace(state, '', url);
  });
  vi.spyOn(window.history, 'pushState').mockImplementation((state, _, url) => {
    entries.splice(position + 1);
    entries.push({ state, hash: String(url) }); position++;
    nativeReplace(state, '', url);
  });
  vi.spyOn(window.history, 'go').mockImplementation(delta => { traversals.push(delta ?? 0); });
  document.body.innerHTML = '<div id="navigation-root"></div>';
  root = createRoot(document.getElementById('navigation-root')!);
  leave = vi.fn();
  await act(async () => root.render(React.createElement(Harness)));
  await act(async () => { navigation.navigate('arena'); navigation.navigate('battle'); });
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks(); vi.useRealTimers();
});

describe('queued browser history restoration', () => {
  it('settles duplicate popstate/hashchange events from ordinary Back', async () => {
    window.history.go(-1);
    await drain();
    expect(window.location.hash).toBe('#arena/battle');
    expect(navigation.pending?.target).toBe('arena');
    expect(window.history.go).toHaveBeenCalledTimes(2);
    await act(async () => navigation.cancel());
    expect(navigation.pending).toBeNull();
    expect(leave).not.toHaveBeenCalled();
  });

  it('recovers from Back, Back, Cancel without leaving navigation locked', async () => {
    window.history.go(-1); window.history.go(-1);
    await act(async () => traverseOne());
    await act(async () => navigation.cancel());
    await drain();
    expect(window.location.hash).toBe('#arena/battle');
    expect(navigation.page).toBe('battle');
    expect(navigation.pending).toBeNull();
    expect(window.history.go).toHaveBeenCalledTimes(4);
    await act(async () => navigation.navigate('home'));
    expect(navigation.pending?.target).toBe('home');
    await act(async () => navigation.confirm());
    await drain();
    expect(window.location.hash).toBe('#home');
    expect(navigation.page).toBe('home');
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('honors a confirmation made before repeated Back restoration completes', async () => {
    window.history.go(-1); window.history.go(-1);
    await act(async () => traverseOne());
    await act(async () => { navigation.confirm(); navigation.confirm(); });
    expect(leave).not.toHaveBeenCalled();
    await drain();
    expect(window.location.hash).toBe('#arena');
    expect(navigation.page).toBe('arena');
    expect(navigation.pending).toBeNull();
    expect(leave).toHaveBeenCalledTimes(1);
    window.history.go(1);
    await drain();
    expect(window.location.hash).toBe('#arena');
    expect(navigation.page).toBe('arena');
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('lets cancellation revoke a queued confirmation before restoration', async () => {
    window.history.go(-1); window.history.go(-1);
    await act(async () => traverseOne());
    await act(async () => { navigation.confirm(); navigation.cancel(); });
    await drain();
    expect(window.location.hash).toBe('#arena/battle');
    expect(navigation.page).toBe('battle');
    expect(navigation.pending).toBeNull();
    expect(leave).not.toHaveBeenCalled();
    await act(async () => navigation.navigate('home'));
    expect(navigation.pending?.target).toBe('home');
  });
});
