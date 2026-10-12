import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
const sources = Object.fromEntries(['style.css', 'teamBuilder.css', 'catalog.css'].map(file => [file, readFileSync(new URL(file, import.meta.url), 'utf8')]));
// Cascade contracts only. happy-dom does not provide rendered browser geometry.
const markup = `<div class="app screen-catalog"><header></header><main class="home teamBuilder catalogScreen"><h2 class="catalogAccessibleTitle">モンスター図鑑</h2><section class="candidatePanel"><div class="tools"><input><select></select></div><details class="builderDisclosure filterDisclosure"><summary><span class="catalogCount"></span></summary><div class="filterChips"><button></button></div><div class="advancedFilters"><select></select></div></details><div class="roster candidateList catalogGallery"><article class="rosterItem catalogCard"><button class="catalogCardOpen"><span class="catalogArtStage"><img class="monsterArt"></span><span class="catalogCardCaption rosterText"><strong>ケツァルコアトル</strong></span></button></article></div></section></main><nav class="mainNav"><button></button></nav></div><section class="modal profileModal profileArtFirst"><div class="profileHeader"><button class="close"></button></div><div class="profileBody"><div class="profileHeading"><span class="heroIcon"><img class="monsterArt"></span></div><p class="familyExplanation"></p><div class="skill"><small></small></div><div class="leaderBanner"><small></small></div><p class="skillLore"></p></div></section>`;
describe.each([['catalog.css','teamBuilder.css','style.css'], ['style.css','teamBuilder.css','catalog.css']])('art-first cascade in %s + %s + %s order', (...order) => {
 it.each([[320,432],[390,844],[400,606],[802,394],[650,900]])('keeps whole-body art, 44px controls and one bounded gallery at %s×%s', (width, height) => {
  const window = new Window({ width, height });
  window.document.body.innerHTML = `<style>${order.map(file => sources[file]).join('\n').replaceAll('@media(', '@media (')}</style>${markup}`;
  const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
  expect(style('.screen-catalog>header').display).toBe('none');
  expect(style('.catalogAccessibleTitle').position).toBe('absolute');
  expect(style('.app').overflowY).toBe('auto');
  expect(style('.mainNav').position).toBe('static');
  expect(style('.mainNav').flexShrink).toBe('0');
  expect(parseFloat(style('.candidatePanel').minHeight)).toBe(0);
  expect(parseFloat(style('.candidatePanel').borderWidth)).toBe(0);
  expect(style('.tools').gridTemplateColumns).toBe('minmax(0,1fr) auto');
  expect(parseFloat(style('.tools input').fontSize)).toBeGreaterThanOrEqual(16);
  expect(parseFloat(style('.tools select').fontSize)).toBeGreaterThanOrEqual(16);
  expect(style('.catalogGallery').overflowY).toBe('auto');
  expect(style('.catalogGallery').maxHeight).toBe('none');
  expect(style('.catalogCard').display).toBe('block');
  expect(parseFloat(style('.catalogCard').padding)).toBe(0);
  expect(style('.catalogArtStage .monsterArt').width).toBe('100%');
  expect(style('.catalogArtStage .monsterArt').objectFit).toBe('contain');
  expect(parseFloat(style('.catalogCardCaption strong').fontSize)).toBeGreaterThanOrEqual(12);
  expect(style('.catalogCardCaption strong').whiteSpace).toBe('normal');
  for (const selector of ['.tools input','.tools select','.filterDisclosure>summary','.filterChips button','.mainNav button','.profileHeader .close']) expect(parseFloat(style(selector).minHeight) || parseFloat(style(selector).height), selector).toBeGreaterThanOrEqual(44);
  expect(style('.profileModal').overflow).toBe('hidden');
  expect(style('.profileBody').overflowY).toBe('auto');
  expect(style('.profileHeader .close').position).toBe('static');
  expect(style('.heroIcon .monsterArt').width).toBe('100%');
  expect(style('.heroIcon .monsterArt').height).toBe('100%');
  expect(style('.heroIcon .monsterArt').objectFit).toBe('contain');
  for (const selector of ['.familyExplanation','.skill small','.leaderBanner small','.skillLore']) expect(parseFloat(style(selector).fontSize), selector).toBeGreaterThanOrEqual(13);
 });
});
