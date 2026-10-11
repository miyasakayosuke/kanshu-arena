// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TeamBuilder from './TeamBuilder';
import { monsters } from './engine';
import { initialTeam, type RuleId, type TeamSlot } from './strategy';

// Happy DOM checks disclosure structure/focus and CSS contracts, not actual
// browser keyboard default actions or pixel layout at a mobile viewport.
const css = readFileSync('src/familyPlanDisclosure.css', 'utf8');
const acceptanceTeam = [36, 12, 20, 4, 26];
let root: Root;
let updates: number[][];
let latestTeam: number[];
let replaceTeam: (team: number[]) => void;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const slot = (index: number) => document.querySelectorAll<HTMLButtonElement>('.builderSlots .teamUnit')[index];
const candidate = (id: number) => label(`${monsters[id].name}を候補に選ぶ`);
const confirm = () => document.querySelector<HTMLButtonElement>('.confirmReplacement')!;
const party = () => document.querySelector<HTMLElement>('.partyCard')!;
const disclosure = (scope: ParentNode = party()) => scope.querySelector<HTMLDetailsElement>('.familyPlanDisclosure')!;
const summary = (scope: ParentNode = party()) => disclosure(scope).querySelector<HTMLElement>(':scope > summary')!;
const plan = (className: string, scope: ParentNode = party()) => scope.querySelector<HTMLElement>(`.${className}`)!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function cancel() { await click([...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'キャンセル')!); }

function Harness({ initial = acceptanceTeam, saved = [null, null, null] }: { initial?: number[]; saved?: (TeamSlot | null)[] }) {
  const [team, setTeam] = useState([...initial]);
  const [rule, setRule] = useState<RuleId>('standard');
  const [slots, setSlots] = useState(saved);
  const [notice, setNotice] = useState('');
  latestTeam = team;
  replaceTeam = setTeam;
  return <TeamBuilder team={team} setTeam={next => { updates.push([...next]); setTeam(next); }}
    rule={rule} setRule={setRule} slots={slots} setSlots={setSlots} notice={notice} setNotice={setNotice}
    onFocus={() => {}} practice={false} leavePractice={() => {}} />;
}
async function mount(props: React.ComponentProps<typeof Harness> = {}) { await act(async () => root.render(<Harness {...props} />)); }
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear(); updates = [];
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });

describe('progressive family-condition help', () => {
  it('keeps Janus, Fenrir and actual leader recipients prominent while naming the three absent cores', async () => {
    await mount();
    expect(party().textContent).toContain('COST 17/17');
    expect(disclosure().open).toBe(false);
    expect(summary().textContent).toBe('未編成の中核・条件を見る（3件）タロス・うつろ泉・ドラウグル');
    for (const name of ['materialRepairPlan', 'slimeSupplyPlan', 'undeadCashoutPlan']) {
      expect(plan(name).closest('details')).toBe(disclosure());
      expect(plan(name).dataset.active).toBe('false');
    }
    const response = plan('extraordinaryResponsePlan');
    expect(response.closest('details')).toBeNull();
    expect(response.dataset.active).toBe('true');
    expect(response.textContent).toContain('所属系統 5種類 / 必要4種類');
    expect(response.querySelector('.familyRecipients')?.textContent).toBe('対象 5/5体：ヤヌス・フェンリル・唐傘おばけ・バンシー・ひだまもり');
    const opening = plan('openingSupports');
    expect(opening.closest('details')).toBeNull();
    expect(opening.textContent).toContain('先頭以外でも編成中なら開幕に一度発動');
    expect(opening.querySelector('.familyRecipients')?.textContent).toBe('対象 1/5体：フェンリル');
    expect(plan('leaderBanner').closest('details')).toBeNull();
    expect(plan('leaderBanner').querySelector('.familyRecipients')?.textContent).toBe('対象 5/5体：ヤヌス・フェンリル・唐傘おばけ・バンシー・ひだまもり');
    expect(updates).toEqual([]);
  });

  it.each([
    { coreId: 15, className: 'dragonChargePlan', team: [0, 15, 2, 4, 6], count: '竜系 1体 / 必要3体' },
    { coreId: 19, className: 'materialRepairPlan', team: [0, 19, 2, 4, 6], count: '物質系 1体 / 必要3体' },
    { coreId: 24, className: 'slimeSupplyPlan', team: [0, 24, 2, 4, 6], count: '粘体系 1体 / 必要3体' },
    { coreId: 29, className: 'demonPressurePlan', team: [0, 29, 2, 4, 6], count: '悪魔系 1体 / 必要3体' },
    { coreId: 32, className: 'undeadCashoutPlan', team: [0, 32, 2, 4, 6], count: '不死系 2体 / 必要3体' },
    { coreId: 36, className: 'extraordinaryResponsePlan', team: [0, 36, 12, 2, 13], count: '所属系統 2種類 / 必要4種類' },
  ])('keeps the nonleader core $coreId visible when its threshold fails', async ({ coreId, className, team, count }) => {
    await mount({ initial: team });
    expect(team[0]).not.toBe(coreId);
    expect(plan(className).closest('details')).toBeNull();
    expect(plan(className).dataset.active).toBe('false');
    expect(plan(className).textContent).toContain('編成中');
    expect(plan(className).textContent).toContain(count);
    expect(disclosure()?.querySelector('summary')?.textContent ?? '').not.toContain(monsters[coreId].name);
    expect(updates).toEqual([]);
  });

  it.each([
    { className: 'dragonChargePlan', team: [0, 5, 16, 17, 6] },
    { className: 'materialRepairPlan', team: [0, 20, 21, 22, 6] },
    { className: 'slimeSupplyPlan', team: [0, 25, 26, 27, 6] },
    { className: 'demonPressurePlan', team: [0, 1, 8, 30, 6] },
    { className: 'undeadCashoutPlan', team: [0, 4, 33, 34, 6] },
    { className: 'extraordinaryResponsePlan', team: [12, 20, 4, 26, 6] },
  ])('collapses absent-core $className even when the family count alone reaches the threshold', async ({ className, team }) => {
    await mount({ initial: team });
    expect(plan(className).closest('details')).toBe(disclosure());
    expect(plan(className).dataset.active).toBe('false');
    expect(plan(className).textContent).toContain('未編成');
    await click(summary());
    expect(disclosure().open).toBe(true);
    expect(updates).toEqual([]);
  });

  it('retains the legacy-party relevant help and does not add unrelated zero-member panels', async () => {
    await mount({ initial: initialTeam });
    expect(initialTeam).toEqual([0, 2, 3, 4, 6]);
    expect(summary().textContent).toBe('未編成の中核・条件を見る（2件）ドラウグル・ヤヌス');
    expect(disclosure().open).toBe(false);
    expect(party().querySelector('.dragonChargePlan, .materialRepairPlan, .slimeSupplyPlan, .demonPressurePlan')).toBeNull();
    expect(plan('undeadCashoutPlan').textContent).toContain('使用者：なし');
    expect(plan('extraordinaryResponsePlan').querySelector('.familyRecipients')?.textContent).toBe('対象 0/5体：なし');
    expect(plan('leaderBanner').querySelector('.familyRecipients')?.textContent).toBe('対象 5/5体：妖狐・バステト・ドリュアス・バンシー・ガルーダ');
  });

  it('uses a native, focusable summary with wrapping CSS and no duplicated keyboard behavior', async () => {
    await mount();
    const details = disclosure();
    const control = summary();
    expect(details.tagName).toBe('DETAILS');
    expect(details.firstElementChild).toBe(control);
    expect(control.tagName).toBe('SUMMARY');
    expect(control.getAttribute('role')).toBeNull();
    expect(control.getAttribute('tabindex')).toBeNull();
    expect(control.querySelector('button, a, input')).toBeNull();
    control.focus(); expect(document.activeElement).toBe(control);
    const before = details.textContent;
    for (const expected of [true, false, true, false]) {
      await click(control);
      expect(details.open).toBe(expected);
      expect(details.textContent).toBe(before);
    }
    expect(css).toContain('.teamBuilder .familyPlanDisclosure > summary:focus-visible');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('white-space: normal');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('min-width: 0');
    expect(css).not.toMatch(/text-overflow|max-height|nowrap|overflow:\s*hidden/);
    expect(updates).toEqual([]);
    expect(latestTeam).toEqual(acceptanceTeam);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBeNull();
  });

  it('keeps a removed core and its lost condition prominent without changing the current party or leader comparison', async () => {
    const original = [19, 20, 21, 6, 2];
    await mount({ initial: original });
    await click(slot(0)); await click(candidate(22));
    const impact = document.querySelector<HTMLElement>('.candidateImpact')!;
    expect(plan('materialRepairPlan').dataset.active).toBe('true');
    expect(plan('materialRepairPlan').closest('details')).toBeNull();
    expect(plan('materialRepairPlan', impact).dataset.active).toBe('false');
    expect(plan('materialRepairPlan', impact).closest('details')).toBeNull();
    expect(summary(impact).textContent).not.toContain('タロス');
    expect(disclosure(impact).open).toBe(false);
    await click(summary(impact));
    expect(plan('materialRepairPlan', impact).querySelector('.familyRecipients')?.textContent).toBe('対象 3/5体：巡る三脚鼎・唐傘おばけ・ぬりかべ');
    expect(plan('materialRepairPlan', impact).textContent).toContain('先頭以外でも有効');
    expect(plan('projectedLeader', impact).closest('details')).toBeNull();
    const comparison = document.querySelector('.leaderComparison')!;
    expect(comparison.closest('.familyPlanDisclosure')).toBeNull();
    expect(comparison.querySelector('.leaderComparisonSummary')?.closest('details')).toBeNull();
    expect(comparison.textContent).toContain('タロス → 巡る三脚鼎');
    await click(label('編成1に保存'));
    expect(JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!)[0].team).toEqual(original);
    expect(updates).toEqual([]);
    await cancel();
    expect(latestTeam).toEqual(original);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    await click(slot(0)); await click(candidate(22));
    expect(disclosure(document.querySelector('.candidateImpact')!).open).toBe(false);
    const commit = confirm();
    await act(async () => { commit.click(); commit.click(); });
    expect(updates).toEqual([[22, 20, 21, 6, 2]]);
    expect(plan('materialRepairPlan').closest('details')).toBe(disclosure());
    expect(plan('materialRepairPlan').dataset.active).toBe('false');
  });

  it.each([
    { coreId: 15, className: 'dragonChargePlan', count: '竜系 0体 / 必要3体' },
    { coreId: 19, className: 'materialRepairPlan', count: '物質系 0体 / 必要3体' },
    { coreId: 24, className: 'slimeSupplyPlan', count: '粘体系 0体 / 必要3体' },
    { coreId: 29, className: 'demonPressurePlan', count: '悪魔系 0体 / 必要3体' },
    { coreId: 32, className: 'undeadCashoutPlan', count: '不死系 0体 / 必要3体' },
    { coreId: 36, className: 'extraordinaryResponsePlan', count: '所属系統 2種類 / 必要4種類' },
  ])('keeps the removed $coreId core loss visible even when no member of its family remains', async ({ coreId, className, count }) => {
    const original = [coreId, 0, 2, 6];
    await mount({ initial: original }); await click(slot(0)); await click(candidate(3));
    const impact = document.querySelector<HTMLElement>('.candidateImpact')!;
    const removed = plan(className, impact);
    expect(removed.closest('details')).toBeNull();
    expect(removed.dataset.active).toBe('false');
    expect(removed.textContent).toContain('未編成');
    expect(removed.textContent).toContain(count);
    if ([19, 24, 36].includes(coreId)) expect(removed.querySelector('.familyRecipients')?.textContent).toBe('対象 0/4体：なし');
    if (coreId === 32) expect(removed.textContent).toContain('使用者：なし。使用対象外：ドリュアス・妖狐・バステト・ガルーダ');
    expect(disclosure(impact)?.querySelector('summary')?.textContent ?? '').not.toContain(monsters[coreId].name);
    expect(plan(className).closest('details')).toBeNull();
    expect(plan(className).textContent).toContain('編成中');
    expect(latestTeam).toEqual(original);
    expect(updates).toEqual([]);
    await click(confirm());
    expect(updates).toEqual([[3, 0, 2, 6]]);
    if (coreId === 36) expect(plan(className).closest('details')).toBe(disclosure());
    else expect(plan(className)).toBeNull();
  });

  it('promotes a newly selected below-threshold core immediately and preserves leader-move intent', async () => {
    await mount({ initial: [0, 20, 2, 4, 6] }); await click(slot(1)); await click(candidate(19));
    const impact = document.querySelector<HTMLElement>('.candidateImpact')!;
    expect(plan('materialRepairPlan', impact).closest('details')).toBeNull();
    expect(plan('materialRepairPlan', impact).dataset.active).toBe('false');
    expect(plan('materialRepairPlan', impact).textContent).toContain('物質系 1体 / 必要3体');
    expect(summary(impact).textContent).not.toContain('タロス');
    expect(plan('materialRepairPlan').closest('details')).toBe(disclosure());
    expect(document.querySelector('.leaderComparisonPath')?.textContent).toBe('妖狐 → 唐傘おばけ');
    expect(confirm().disabled).toBe(false);
    await click(label('唐傘おばけをリーダーにする'));
    expect(updates).toEqual([[20, 0, 2, 4, 6]]);
    expect(latestTeam).not.toContain(19);
    expect(plan('materialRepairPlan').closest('details')).toBe(disclosure());
  });

  it('keeps over-budget candidates disabled after opening absent-core help', async () => {
    await mount(); await click(summary()); await click(slot(2));
    expect(candidate(19).disabled).toBe(true);
    expect(candidate(19).closest('.candidateCard')?.textContent).toContain('COST 3超過');
    await click(candidate(19));
    expect(confirm()).toBeNull();
    expect(document.querySelector('.candidateImpact')).toBeNull();
    expect(latestTeam).toEqual(acceptanceTeam);
    expect(updates).toEqual([]);
  });

  it('updates after saved loads and external changes, and removes empty disclosures', async () => {
    const saved = [19, 20, 21, 6, 2];
    await mount({ saved: [{ team: saved, rule: 'standard' }, null, null] });
    await click(summary());
    await click(slot(0)); await click(candidate(0));
    const staleCommit = confirm();
    await click(label('編成1を呼び出す'));
    expect(latestTeam).toEqual(saved);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(plan('materialRepairPlan').closest('details')).toBeNull();
    expect(summary().textContent).toBe('未編成の中核・条件を見る（1件）ヤヌス');
    await click(staleCommit);
    expect(updates).toEqual([saved]);
    await act(async () => replaceTeam([36, 12, 13, 2, 6]));
    expect(disclosure()).toBeNull();
    expect(plan('extraordinaryResponsePlan').dataset.active).toBe('false');
    expect(plan('extraordinaryResponsePlan').closest('details')).toBeNull();
    await act(async () => replaceTeam([...acceptanceTeam]));
    expect(disclosure().open).toBe(false);
    expect(summary().textContent).toContain('タロス・うつろ泉・ドラウグル');
    expect(latestTeam).toEqual(acceptanceTeam);
  });
});
