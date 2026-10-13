// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MonsterDetails from './MonsterDetails';
import { monsters } from './engine';
import { skillDetail, skillLore } from './monsterDetailContent';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">敵を確認</button><div id="root"></div>';
  document.getElementById('opener')!.focus();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });
const click = async (node: HTMLElement) => { await act(async () => node.click()); };
const selectedTab = () => document.querySelector('[role="tab"][aria-selected="true"]');
const reading = () => document.querySelector('.detailSkillReading:not([hidden])')!;

it.each(monsters)('opens supplied skills tab for $name with every complete effect and story reachable', async monster => {
  const render = (seconds: number) => <MonsterDetails id={monster.id} initialTab="skills" battleContext={{ label: `敵3 ${monster.name}`, seconds }} onClose={() => root.render(null)} />;
  await act(async () => root.render(render(30)));
  expect(selectedTab()?.getAttribute('data-detail-tab')).toBe('skills');
  expect(document.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
  expect(document.querySelector('.profileModal')?.getAttribute('aria-label')).toBe(`敵3 ${monster.name}の詳細`);
  const timer = document.querySelector('[role="timer"]')!;
  expect(timer.getAttribute('aria-live')).toBe('off');
  expect(timer.getAttribute('aria-label')).toBe('コマンド入力 残り30秒');
  expect(timer.textContent).toBe('残り 30 秒');
  const choices = [...document.querySelectorAll<HTMLButtonElement>('.detailSkillPicker button')];
  expect(choices).toHaveLength(monster.skills.length);
  for (const [index, skill] of monster.skills.entries()) {
    await click(choices[index]);
    expect(choices[index].getAttribute('aria-pressed')).toBe('true');
    expect(reading().querySelector('.detailSkillRule')?.textContent).toBe(skillDetail(skill));
    expect(reading().querySelector('.skillLore')?.textContent).toBe(skillLore(skill.name));
  }
  const lastReading = reading().textContent;
  await act(async () => root.render(render(9)));
  expect(timer.getAttribute('aria-label')).toBe('コマンド入力 残り9秒');
  expect(timer.textContent).toBe('残り 9 秒');
  expect(selectedTab()?.getAttribute('data-detail-tab')).toBe('skills');
  expect(reading().textContent).toBe(lastReading);
  await click(document.querySelector<HTMLButtonElement>('[data-detail-tab="abilities"]')!);
  await act(async () => root.render(render(8)));
  expect(selectedTab()?.getAttribute('data-detail-tab')).toBe('abilities');
  await click(document.querySelector<HTMLButtonElement>('[aria-label="詳細を閉じる"]')!);
  expect(document.querySelector('.profileModal')).toBeNull();
  expect(document.activeElement).toBe(document.getElementById('opener'));
});

// These assertions verify CSS cascade contracts only. Native viewport geometry,
// clipping and real zoom remain covered by the release browser checks.
const sheets = Object.fromEntries(['style.css', 'catalog.css', 'monsterDetails.css'].map(file => [file, readFileSync(new URL(file, import.meta.url), 'utf8')]));
describe.each([
  ['style.css', 'catalog.css', 'monsterDetails.css'],
  ['monsterDetails.css', 'style.css', 'catalog.css'],
])('enemy inspection short and zoom cascade: %s / %s / %s', (...order) => {
  it.each([[360, 533], [320, 568], [844, 390], [195, 422], [240, 320]])('retains fixed controls, local reading scroll and wrapping at %s×%s', (width, height) => {
    const window = new Window({ width, height });
    const markup = renderToStaticMarkup(<MonsterDetails id={5} initialTab="skills" battleContext={{ label: '敵5 ケツァルコアトル · 戦闘不能', seconds: 30 }} onClose={() => {}} />);
    window.document.body.innerHTML = `<style>${order.map(file => sheets[file]).join('\n').replaceAll('@media(', '@media (')}</style>${markup}<div class="layeredBattleStage"><div class="enemyVitals"><div class="enemyVital inspectable"><button class="enemyInspect"><span>›</span></button></div></div></div>`;
    const style = (selector: string) => window.getComputedStyle(window.document.querySelector(selector)!);
    expect(style('.profileModal').display).toBe('flex');
    expect(style('.profileModal').overflow).toBe('hidden');
    for (const selector of ['.profileHeader', '.profileTabs']) expect(style(selector).flexShrink).toBe('0');
    expect(style('.profileHeader .close').width).toBe('44px');
    expect(style('.profileHeader .close').height).toBe('44px');
    expect(style('.profileBattleContext span').overflowWrap).toBe('anywhere');
    expect(style('.profileBattleContext output').fontSize).toBe('12px');
    expect(window.document.querySelector('.profileBattleContext')?.parentElement?.className).toBe('profileHeader');
    expect(window.document.querySelector('.profileBattleContext output')?.closest('[aria-live="polite"]')).toBeNull();
    expect(style('.profileBody').overflowY).toBe('auto');
    expect(parseFloat(style('.profileBody').minHeight)).toBe(0);
    expect(style('.profileAppearance[hidden]').display).toBe('none');
    expect(style('.detailSkillRule').fontSize).toBe('14px');
    expect(style('.skillLore').fontSize).toBe('14px');
    expect(style('.detailSkillPicker button').minHeight).toBe('44px');
    for (const selector of ['.detailSkillRule', '.skillLore']) {
      expect(style(selector).overflowWrap).toBe('anywhere');
      expect(style(selector).whiteSpace).not.toBe('nowrap');
      expect(style(selector).textOverflow).not.toBe('ellipsis');
      expect(style(selector).overflow).not.toBe('hidden');
    }
    expect(style('.enemyInspect').position).toBe('absolute');
    expect(style('.enemyInspect').width).toBe('100%');
    expect(style('.enemyInspect').height).toBe('100%');
    expect(style('.enemyVitals').pointerEvents).toBe('auto');
    window.happyDOM.cancelAsync();
  });
});
