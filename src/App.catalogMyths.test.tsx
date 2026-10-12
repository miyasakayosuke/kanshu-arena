// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { MYTH_SCENES, MYTH_STILLS } from './mythVignettes';
import { monsters } from './engine';
let root: Root, frames: Map<number, FrameRequestCallback>, nextFrame: number, reduced: boolean, media: MediaQueryList;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const textButton = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === name)!;
async function key(name: string, target: EventTarget = document.activeElement!) {
 const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
 await act(async () => target.dispatchEvent(event)); return event;
}
async function mount() { await act(async () => root.render(<App />)); }
async function openProfile(id = 12) {
 const opener = label(`${monsters[id].name}の詳細`); opener.focus(); await click(opener);
 // The real module is loaded asynchronously by the opened core profile, never by the gallery.
 await act(async () => { await import('./components/MythVignette'); });
 return opener;
}
async function openMovie() {
 const trigger = document.querySelector<HTMLButtonElement>('.mythPlay')!; trigger.focus(); await click(trigger); return trigger;
}
beforeEach(() => {
 localStorage.clear(); window.history.replaceState(null, '', '#catalog');
 document.body.innerHTML = '<div id="test-root"></div><div id="pre-existing-inert" inert></div>';
 document.body.style.overflow = 'auto'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
 root = createRoot(document.getElementById('test-root')!); frames = new Map(); nextFrame = 0; reduced = false;
 media = new EventTarget() as MediaQueryList; Object.defineProperty(media, 'matches', { get: () => reduced });
 vi.spyOn(window, 'matchMedia').mockReturnValue(media);
 vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
 vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
 vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
 Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
 const originalFocus = HTMLElement.prototype.focus;
 vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function(this: HTMLElement, options?: FocusOptions) { if (!this.closest('[inert]')) originalFocus.call(this, options); });
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('catalog → profile → eight optional myth scenes', () => {
 it.each(MYTH_SCENES)('opens $name only on request and returns through both focus layers', async scene => {
  await mount(); const saved = localStorage.getItem('kanshu-workshop-v1');
  expect(document.querySelectorAll('.catalogCard')).toHaveLength(37); expect(frames.size).toBe(0);
  const gallery = document.querySelector<HTMLElement>('.catalogGallery')!; gallery.scrollTop = 187;
  const card = await openProfile(scene.id); expect(document.querySelector('.mythPlayer')).toBeNull(); expect(frames.size).toBe(0);
  const trigger = await openMovie();
  expect(document.querySelector('.profileModal')).toBeTruthy(); expect(document.querySelector('.mythStage')?.getAttribute('data-scene')).toBe(String(scene.id));
  expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(true);
  expect(document.activeElement).toBe(label('物語を閉じて詳細に戻る')); expect(frames.size).toBe(1);
  await click(textButton('詳細に戻る'));
  expect(document.querySelector('.mythPlayer')).toBeNull(); expect(document.querySelector('.profileModal')).toBeTruthy(); expect(document.activeElement).toBe(trigger);
  expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(false); expect(document.getElementById('pre-existing-inert')!.hasAttribute('inert')).toBe(true);
  expect(document.body.style.overflow).toBe('hidden'); expect(frames.size).toBe(0);
  await click(label('詳細を閉じる'));
  expect(document.activeElement).toBe(card); expect(gallery.scrollTop).toBe(187); expect(document.body.style.overflow).toBe('auto');
  expect(localStorage.getItem('kanshu-workshop-v1')).toBe(saved); expect(window.location.hash).toBe('#catalog');
 });
 it('returns to the tapped card after both overlays unmount without browser click focus', async () => {
  await mount(); const card = label('フェンリルの詳細');
  expect(document.activeElement).not.toBe(card); await click(card);
  await act(async () => { await import('./components/MythVignette'); });
  await click(document.querySelector<HTMLButtonElement>('.mythPlay')!);
  await key('Escape', window);
  expect(document.activeElement).toBe(card); expect(document.querySelector('.profileModal')).toBeNull(); expect(frames.size).toBe(0);
 });
 it('returns to the actual play trigger after pointer activation that did not focus it', async () => {
  await mount(); await openProfile();
  const trigger = document.querySelector<HTMLButtonElement>('.mythPlay')!;
  label('詳細を閉じる').focus();
  await click(trigger); await click(textButton('詳細に戻る'));
  expect(document.activeElement).toBe(trigger);
 });
 it('does not show unavailable movies for the other 29 monsters', async () => {
  await mount();
  for (const monster of monsters.filter(monster => !MYTH_SCENES.some(scene => scene.id === monster.id))) {
   await openProfile(monster.id); expect(document.querySelector('.mythPlay')).toBeNull(); expect(document.querySelector('.mythEntryPending')).toBeNull();
   await click(label('詳細を閉じる'));
  }
  expect(frames.size).toBe(0);
 });
 it('Escape dismisses exactly one layer per key and preserves visible catalog filters', async () => {
  await mount(); await click(document.querySelector('.filterDisclosure > summary')!);
  const family = document.querySelector<HTMLSelectElement>('[aria-label="系統で絞り込み"]')!;
  await act(async () => { family.value = 'beast'; family.dispatchEvent(new Event('change', { bubbles: true })); });
  const card = await openProfile(); const trigger = await openMovie();
  expect((await key('Escape')).defaultPrevented).toBe(true);
  expect(document.querySelector('.mythPlayer')).toBeNull(); expect(document.querySelector('.profileModal')).toBeTruthy(); expect(document.activeElement).toBe(trigger);
  await key('Escape'); expect(document.querySelector('.profileModal')).toBeNull(); expect(document.activeElement).toBe(card);
  expect(family.value).toBe('beast'); expect(document.querySelector<HTMLDetailsElement>('.filterDisclosure')!.open).toBe(true);
 });
 it('returns focus to the catalog card if the parent profile is dismissed during playback', async () => {
  await mount(); const card = await openProfile(); await openMovie();
  // Exercise the parent's existing programmatic/window fallback, bypassing the child key handler.
  await key('Escape', window);
  expect(document.querySelector('.mythPlayer')).toBeNull(); expect(document.querySelector('.profileModal')).toBeNull();
  expect(frames.size).toBe(0); expect(document.activeElement).toBe(card); expect(document.body.style.overflow).toBe('auto');
  expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(false);
 });
 it('cancels playback and inert on navigation unmount, and reopening starts closed', async () => {
  await mount(); await click(label('ホーム')); await click(label('図鑑')); await openProfile(); await openMovie();
  await act(async () => { window.history.back(); await Promise.resolve(); });
  expect(window.location.hash).toBe('#home'); expect(document.querySelector('.mythOverlay')).toBeNull(); expect(document.querySelector('.profileModal')).toBeNull();
  expect(frames.size).toBe(0); expect(document.getElementById('test-root')!.hasAttribute('inert')).toBe(false); expect(document.body.style.overflow).toBe('auto');
  await act(async () => { window.history.forward(); await Promise.resolve(); });
  expect(window.location.hash).toBe('#catalog'); await openProfile(); expect(document.querySelector('.mythPlayer')).toBeNull();
 });
 it('uses manually stepped stills through the actual profile when reduced motion is requested', async () => {
  reduced = true; await mount(); await openProfile(24); await openMovie();
  expect(frames.size).toBe(0); expect(document.querySelector('.mythStage')?.getAttribute('data-time')).toBe(String(MYTH_STILLS[0]));
  await click(textButton('次の場面')); expect(document.querySelector('.mythStage')?.getAttribute('data-time')).toBe(String(MYTH_STILLS[1]));
  await click(textButton('次の場面')); expect(textButton('次の場面').disabled).toBe(true); expect(frames.size).toBe(0);
  await key('Escape'); expect(document.activeElement).toBe(document.querySelector('.mythPlay'));
 });
 it('keeps Tab inside the movie rather than the enclosing profile', async () => {
  await mount(); await openProfile(); await openMovie();
  for (let i = 0; i < 12; i++) { await key('Tab'); expect(document.activeElement?.closest('.mythPlayer')).toBeTruthy(); }
 });
});
