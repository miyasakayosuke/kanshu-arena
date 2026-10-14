// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RosterBrowser, { createRosterFilters, type RosterFilters } from './RosterBrowser';

let root: Root;
let update: React.Dispatch<React.SetStateAction<RosterFilters>>;
const remembered = { current: 420 };
const list = () => document.querySelector<HTMLElement>('.candidateList')!;
function Harness({ gallery = true }: { gallery?: boolean }) {
  const [filters, setFilters] = useState(createRosterFilters);
  update = setFilters;
  return <RosterBrowser gallery={gallery} filters={filters} setFilters={setFilters} onFocus={() => {}} scrollPosition={remembered} />;
}
async function patch(value: Partial<RosterFilters>) {
  await act(async () => update(previous => ({ ...previous, ...value })));
}
async function scroll(value: number) {
  await act(async () => { list().scrollTop = value; list().dispatchEvent(new Event('scroll', { bubbles: true })); });
}
beforeEach(() => {
  remembered.current = 420;
  document.body.innerHTML = '<div id="root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });

describe('roster result position', () => {
  it.each([
    { filter: '竜' }, { role: 'heal' }, { sort: 'speed' },
    { leaderFilter: 'atk' }, { familyFilter: 'dragon' }, { costFilter: '3' },
  ])('starts changed results at the first card: %j', async value => {
    await act(async () => root.render(<Harness />));
    expect(list().scrollTop).toBe(420);
    const search = document.querySelector<HTMLInputElement>('[aria-label="検索"]')!;
    search.focus();
    await patch(value);
    expect(list().scrollTop).toBe(0);
    expect(remembered.current).toBe(0);
    expect(document.activeElement).toBe(search);
  });
  it('preserves position when only the disclosure opens/closes or an unchanged query rerenders', async () => {
    await act(async () => root.render(<Harness />));
    await patch({ expanded: true }); expect(list().scrollTop).toBe(420);
    await patch({ expanded: false }); expect(list().scrollTop).toBe(420);
    await patch({ filter: '' }); expect(list().scrollTop).toBe(420);
  });
  it('resets sorted results and empty search recovery, including repeated searches', async () => {
    await act(async () => root.render(<Harness />));
    await patch({ sort: 'hp' }); await scroll(240);
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="絞り込みをリセット"]')!.click());
    expect(list().scrollTop).toBe(0);
    await patch({ filter: 'no-monster-matches-this' });
    expect(list().querySelectorAll('.rosterItem')).toHaveLength(0);
    await patch({ filter: '' }); expect(list().scrollTop).toBe(0);
    await scroll(320); await patch({ filter: '竜' }); expect(list().scrollTop).toBe(0);
  });
  it('retains the new browsing position across an actual unmount/remount', async () => {
    await act(async () => root.render(<Harness />));
    await patch({ sort: 'hp' }); await scroll(210);
    await act(async () => root.render(null));
    expect(remembered.current).toBe(210);
    await act(async () => root.render(<Harness />));
    expect(list().scrollTop).toBe(210);
  });
  it('also shows the first replacement candidate after a filter change', async () => {
    await act(async () => root.render(<Harness gallery={false} />));
    await patch({ familyFilter: 'beast' });
    expect(list().scrollTop).toBe(0);
  });
});
