// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MythVignetteEntry from './MythVignetteEntry';
let root: Root;
const Player = ({ id }: { id: number }) => <button data-player-id={id}>物語を開く</button>;
beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); root = createRoot(document.getElementById('root')!); });
afterEach(async () => { await act(async () => root.unmount()); });
describe('core-only lazy movie module lifecycle', () => {
 it('does not request the player for an ordinary monster', async () => {
  const load = vi.fn().mockResolvedValue({ default: Player });
  await act(async () => root.render(<MythVignetteEntry id={0} load={load}/>));
  expect(load).not.toHaveBeenCalled(); expect(document.querySelector('[role=status]')).toBeNull();
 });
 it('shows pending state, then only the trigger rather than opening a movie', async () => {
  let resolve!: (module: { default: typeof Player }) => void;
  const load = vi.fn(() => new Promise<{ default: typeof Player }>(done => { resolve = done; }));
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  expect(document.querySelector('[role=status]')?.textContent).toContain('準備中');
  await act(async () => resolve({ default: Player }));
  expect(document.querySelector('[data-player-id="12"]')).toBeTruthy();
  expect(document.querySelector('[role=dialog]')).toBeNull(); expect(load).toHaveBeenCalledTimes(1);
 });
 it('retries a failed import without blocking the profile', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ default: Player });
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  expect(document.querySelector('[role=status]')?.textContent).toContain('読み込めません');
  await act(async () => document.querySelector<HTMLButtonElement>('button')!.click());
  expect(document.querySelector('[data-player-id="12"]')).toBeTruthy(); expect(load).toHaveBeenCalledTimes(2);
 });
 it('keeps retry focus while loading and moves only that focus to the ready trigger', async () => {
  let resolve!: (module: { default: typeof Player }) => void;
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => new Promise<{ default: typeof Player }>(done => { resolve = done; }));
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  const retry = document.querySelector<HTMLButtonElement>('button')!; retry.focus();
  await act(async () => retry.click());
  expect(document.activeElement).toBe(retry); expect(retry.getAttribute('aria-disabled')).toBe('true');
  await act(async () => retry.click()); expect(load).toHaveBeenCalledTimes(2);
  await act(async () => resolve({ default: Player }));
  expect(document.activeElement).toBe(document.querySelector('[data-player-id="12"]'));
 });
 it('does not steal focus when the reader moves away during retry loading', async () => {
  let resolve!: (module: { default: typeof Player }) => void;
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => new Promise<{ default: typeof Player }>(done => { resolve = done; }));
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  const retry = document.querySelector<HTMLButtonElement>('button')!; retry.focus(); await act(async () => retry.click());
  const outside = document.createElement('button'); document.body.append(outside); outside.focus();
  await act(async () => resolve({ default: Player })); expect(document.activeElement).toBe(outside);
 });
 it('ignores a late module result after profile dismissal', async () => {
  let resolve!: (module: { default: typeof Player }) => void;
  const load = vi.fn(() => new Promise<{ default: typeof Player }>(done => { resolve = done; }));
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  await act(async () => root.render(null)); await act(async () => resolve({ default: Player }));
  expect(document.querySelector('[data-player-id]')).toBeNull(); expect(document.querySelector('[role=dialog]')).toBeNull();
 });
 it('keeps the available scene identity current when a profile changes', async () => {
  const load = vi.fn().mockResolvedValue({ default: Player });
  await act(async () => root.render(<MythVignetteEntry id={12} load={load}/>));
  await act(async () => root.render(<MythVignetteEntry id={14} load={load}/>));
  expect(document.querySelector('[data-player-id="14"]')).toBeTruthy(); expect(load).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<MythVignetteEntry id={0} load={load}/>));
  expect(document.querySelector('[data-player-id]')).toBeNull();
 });
});
