// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MonsterDetails from './MonsterDetails';
import { monsters } from './engine';
import { detailRules, detailTextPages, skillDetail, skillLore } from './monsterDetailContent';
import { monsterRole } from './strategy';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">詳細</button><div id="root"></div>';
  document.getElementById('opener')!.focus();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });
const mount = async (id: number) => { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); };
const click = async (node: HTMLElement) => { await act(async () => node.click()); };
const tab = (id: string) => document.querySelector<HTMLButtonElement>(`[data-detail-tab=${id}]`)!;
const visiblePanel = () => document.querySelector<HTMLElement>('.profilePanel:not([hidden])')!;
const key = async (name: string) => { const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }); await act(async () => document.activeElement!.dispatchEvent(event)); return event; };

async function readAllPages(container: Element, selector: string): Promise<string> {
  const seen: string[] = [];
  const pager = container.querySelector('.detailPager');
  const next = pager?.querySelectorAll<HTMLButtonElement>('button')[1];
  do {
    const page = container.querySelector('.detailPage:not([hidden])')!;
    expect(container.querySelectorAll('.detailPage:not([hidden])')).toHaveLength(1);
    expect(page.closest('[hidden]')).toBeNull();
    seen.push(page.querySelector(selector)?.textContent ?? '');
    if (!next || next.getAttribute('aria-disabled') === 'true') break;
    await click(next);
  } while (seen.length < 50);
  expect(seen.length).toBeLessThan(50);
  return seen.join('');
}

describe('manual detail groups', () => {
  it('uses four related ARIA tabs, one roving stop, and explicit keyboard changes only', async () => {
    await mount(0);
    expect([...document.querySelectorAll('[role=tab]')].map(node => node.textContent)).toEqual(['姿', '物語', '能力', '特技']);
    expect(document.querySelectorAll('[role=tab][tabindex="0"]')).toHaveLength(1);
    expect(document.querySelectorAll('[role=tabpanel]:not([hidden])')).toHaveLength(1);
    for (const item of document.querySelectorAll('[role=tab]')) {
      const panel = document.getElementById(item.getAttribute('aria-controls')!)!;
      expect(panel.getAttribute('aria-labelledby')).toBe(item.id);
    }
    tab('appearance').focus();
    expect((await key('ArrowRight')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tab('story')); expect(tab('story').getAttribute('aria-selected')).toBe('true');
    await key('End'); expect(document.activeElement).toBe(tab('skills'));
    await key('ArrowRight'); expect(document.activeElement).toBe(tab('appearance'));
    await key('ArrowLeft'); expect(document.activeElement).toBe(tab('skills'));
    await key('Home'); expect(document.activeElement).toBe(tab('appearance'));
    expect(document.querySelector('.mythPlayer')).toBeNull();
  });

  it.each(monsters)('makes every $name rule and skill story reachable by manual pages', async monster => {
    await mount(monster.id);
    expect(document.querySelector('.roleBrief')).toBeNull();
    const text = document.querySelector('.profileModal')!.textContent;
    expect(text).not.toContain(monsterRole(monster.id).strength);
    expect(text).not.toContain(monsterRole(monster.id).tradeoff);
    await click(tab('abilities'));
    const ruleText = await readAllPages(visiblePanel(), '.familyExplanation');
    expect(ruleText).toBe(detailRules(monster.id).map(rule => rule.text).join(''));
    await click(tab('skills'));
    for (const [index, skill] of monster.skills.entries()) {
      await click(visiblePanel().querySelectorAll<HTMLButtonElement>('.detailSkillPicker button')[index]);
      const reading = visiblePanel().querySelector('.detailSkillReading:not([hidden])')!;
      const all = await readAllPages(reading, '.detailSkillRule, .skillLore');
      expect(all).toBe(skillDetail(skill) + skillLore(skill.name));
    }
  });

  it('keeps boundary controls focused and neither skips pages nor resets unrelated groups', async () => {
    await mount(36); await click(tab('abilities'));
    const pager = visiblePanel().querySelector('.detailPager')!;
    const [prev, next] = [...pager.querySelectorAll<HTMLButtonElement>('button')];
    prev.focus(); await click(prev); expect(document.activeElement).toBe(prev);
    expect(pager.textContent).toContain('1 /');
    next.focus(); await click(next); const count = pager.querySelector('span')!.textContent;
    await click(tab('story')); await click(tab('abilities'));
    expect(pager.querySelector('span')!.textContent).toBe(count);
    for (let i = 0; i < 20; i++) await click(next);
    next.focus(); await click(next); expect(document.activeElement).toBe(next); expect(next.getAttribute('aria-disabled')).toBe('true');
    await mount(0); expect(tab('appearance').getAttribute('aria-selected')).toBe('true');
    await click(tab('abilities')); expect(document.querySelector('.detailPager')).toBeTruthy(); // Other skills have story pages.
    expect(visiblePanel().querySelector('.detailPage:not([hidden]) h3')!.textContent).toBe('基礎能力（リーダー補正前）');
  });

  it('keeps fallback scrolling local and resets it on a group change', async () => {
    await mount(36);
    const body = document.querySelector<HTMLElement>('.profileBody')!;
    body.scrollTop = 140;
    await click(tab('abilities'));
    expect(body.scrollTop).toBe(0);
    expect(document.body.style.overflow).toBe('hidden');
  });
});

describe('lossless compact-page text budget', () => {
  it('keeps all current technical pages within 140 characters without deleting any text', () => {
    for (const monster of monsters) for (const text of [...detailRules(monster.id).map(rule => rule.text), ...monster.skills.map(skillDetail)]) {
      const pages = detailTextPages(text);
      expect(pages.join('')).toBe(text);
      for (const page of pages) expect(page.length).toBeLessThanOrEqual(140);
    }
  });
  it('can split a single long sentence without ellipsis or text loss', () => {
    const text = '長い説明'.repeat(100) + '。続き。';
    const pages = detailTextPages(text);
    expect(pages.join('')).toBe(text); expect(pages.every(page => page.length <= 140)).toBe(true);
  });
});
