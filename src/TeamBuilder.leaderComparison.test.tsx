// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import TeamBuilder from './TeamBuilder';
import { monsters } from './engine';
import { compareLeaders } from './leaderComparison';
import { type RuleId, type TeamSlot } from './strategy';
// Static CSS and semantic checks only; this does not measure a browser layout.
const css = readFileSync('src/teamBuilder.css', 'utf8');

const demonTeam = [29, 8, 30, 7, 2];
let root: Root;
let updates: number[][];
let latestTeam: number[];
let replaceTeam: (team: number[]) => void;
const label = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const slot = (index: number) => document.querySelectorAll<HTMLButtonElement>('.builderSlots .teamUnit')[index];
const candidate = (id: number) => label(`${monsters[id].name}を候補に選ぶ`);
const comparison = () => document.querySelector<HTMLElement>('.leaderComparison')!;
const member = (id: number) => comparison().querySelector<HTMLElement>(`.leaderMemberList [data-monster-id="${id}"]`)!;
const cancel = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'キャンセル')!;
const confirm = () => document.querySelector<HTMLButtonElement>('.confirmReplacement')!;
const disclosure = () => comparison().querySelector<HTMLDetailsElement>('details')!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function escape() { await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); }
function Harness({ initial = demonTeam, saved = [null, null, null] }: { initial?: number[]; saved?: (TeamSlot | null)[] }) {
  const [team, setTeam] = useState([...initial]);
  const [rule, setRule] = useState<RuleId>('standard');
  const [slots, setSlots] = useState(saved);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(false);
  latestTeam = team;
  replaceTeam = setTeam;
  return <>
    <TeamBuilder team={team} setTeam={next => { updates.push([...next]); setTeam(next); }}
      rule={rule} setRule={setRule} slots={slots} setSlots={setSlots} notice={notice} setNotice={setNotice}
      onFocus={() => setDetail(true)} practice={false} leavePractice={() => {}} />
    {detail && <div role="dialog" aria-modal="true"><button onClick={() => setDetail(false)}>閉じる</button></div>}
  </>;
}
async function mount(props: React.ComponentProps<typeof Harness> = {}) { await act(async () => root.render(<Harness {...props} />)); }
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear(); updates = [];
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });

describe('leader change preview', () => {
  it('shows the exact Mammon-to-Kobold move before committing once, including unchanged cleansers', async () => {
    await mount();
    const selected = slot(2);
    await click(selected);
    expect(latestTeam).toEqual(demonTeam);
    expect(updates).toEqual([]);
    expect(localStorage.getItem('kanshu-team-slots-v1')).toBeNull();
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('マモン → コボルト');
    expect(comparison().querySelector('.leaderComparisonSummary')?.textContent).toContain('能力が変わる継続メンバー 3/5体');
    expect(comparison().querySelector('.leaderComparisonSummary')?.textContent).toContain('効果対象 3/5体 → 3/5体');
    expect(comparison().querySelector('.leaderTotalDeltas [data-stat="hp"] dd')?.textContent).toBe('−54');
    expect(disclosure().open).toBe(false);
    await click(disclosure().querySelector('summary')!);
    expect(disclosure().open).toBe(true);
    expect(member(29).querySelector('[data-stat="speed"] dd')?.textContent).toBe('61 → 63 (+2)');
    expect(member(30).querySelector('[data-stat="hp"] dd')?.textContent).toBe('152 → 138 (−14)');
    for (const [id, speed] of [[7, 61], [2, 57]]) {
      expect(member(id).querySelector('[data-stat="speed"] dd')?.textContent).toBe(`${speed} → ${speed} 変化なし`);
      expect(member(id).querySelector('.leaderMemberRecipient')?.textContent).toBe('リーダー効果：対象外 → 対象外');
      expect(member(id).textContent?.match(/変化なし/g)).toHaveLength(4);
    }
    const commit = label('コボルトをリーダーにする');
    expect(commit.getAttribute('aria-describedby')).toBe('leader-move-summary');
    await act(async () => { commit.click(); commit.click(); });
    expect(updates).toEqual([[30, 29, 8, 7, 2]]);
    expect(latestTeam).toEqual([30, 29, 8, 7, 2]);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.activeElement).toBe(selected);
  });

  it('labels added and removed identities in slot-zero replacement rather than comparing them as one monster', async () => {
    await mount(); await click(slot(0));
    expect(document.querySelector('.leaderComparison')).toBeNull();
    await click(candidate(13));
    expect(document.activeElement).toBe(document.querySelector('.candidatePreview'));
    expect(comparison().querySelector('.leaderComparisonSummary')?.textContent).toContain('追加 1体・離脱 1体');
    expect(member(13).dataset.membership).toBe('added');
    expect(member(29).dataset.membership).toBe('removed');
    expect(member(13).querySelector('[data-stat="hp"] dd')?.textContent).toBe('130 （追加後）');
    expect(member(29).querySelector('[data-stat="hp"] dd')?.textContent).toBe('231 （離脱前）');
    expect(member(13).querySelector('[data-stat="hp"] dd')?.textContent).not.toContain('→');
    expect(member(29).querySelector('[data-stat="hp"] dd')?.textContent).not.toContain('→');
    expect(member(7).querySelector('.leaderMemberRecipient')?.textContent).toBe('リーダー効果：対象外 → 対象');
    expect(comparison().querySelector('.leaderRecipientChanges')?.textContent).toContain('新たに対象：セルキー・バステト');
    const expected = compareLeaders(demonTeam, [13, 8, 30, 7, 2]);
    expect(comparison().querySelector('.leaderTotalDeltas [data-stat="hp"]')?.getAttribute('data-delta')).toBe(String(expected.totalDelta.hp));
    expect(confirm().getAttribute('aria-describedby')).toBe('leader-replacement-summary');
    expect(updates).toEqual([]);
    await click(confirm());
    expect(updates).toEqual([[13, 8, 30, 7, 2]]);
  });

  it('names members losing an all-family effect when moving a family-only leader and shows ATK gains', async () => {
    await mount({ initial: [13, 12, 2, 6, 10] }); await click(slot(1));
    expect(comparison().querySelector('.leaderComparisonSummary')?.textContent).toContain('効果対象 5/5体 → 3/5体');
    expect(comparison().querySelector('.leaderRecipientChanges')?.textContent).toContain('対象から外れる：ガルーダ・ナーガ');
    expect(member(6).querySelector('.leaderMemberRecipient')?.textContent).toBe('リーダー効果：対象 → 対象外');
    expect(member(12).querySelector('[data-stat="atk"] dd')?.textContent).toBe('54 → 58 (+4)');
    expect(comparison().textContent).toContain('開幕のオーラは別効果');
    expect(comparison().textContent).toContain('技の優先度が先');
    expect(comparison().textContent).toContain('同じ優先度・同速は抽選');
    expect(updates).toEqual([]);
  });

  it('shows actual MP losses when a slime MP leader is replaced by another existing member', async () => {
    await mount({ initial: [24, 25, 28, 2, 10] }); await click(slot(1));
    expect(member(24).querySelector('[data-stat="mp"] dd')?.textContent).toBe('70 → 64 (−6)');
    expect(member(2).querySelector('[data-stat="mp"] dd')?.textContent).toBe('72 → 72 変化なし');
    expect(comparison().querySelector('.leaderTotalDeltas [data-stat="mp"] dd')?.textContent).toBe('−15');
    expect(updates).toEqual([]);
  });

  it('cancels and reopens without a stale candidate or expanded details, restoring slot focus', async () => {
    await mount(); const original = slot(0); await click(original); await click(candidate(13));
    await click(disclosure().querySelector('summary')!);
    await click(cancel());
    expect(document.activeElement).toBe(original);
    expect(updates).toEqual([]); expect(latestTeam).toEqual(demonTeam);
    await click(original);
    expect(document.querySelector('.leaderComparison')).toBeNull(); expect(confirm()).toBeNull();
    await click(candidate(0));
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('マモン → 妖狐');
    expect(disclosure().open).toBe(false);
    await click(disclosure().querySelector('summary')!); await click(candidate(13));
    expect(disclosure().open).toBe(false);
    await escape(); expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.activeElement).toBe(original); expect(updates).toEqual([]);
  });

  it('keeps comparison, focus behavior and list scroll through read-only detail, with Escape scoped to its owner', async () => {
    await mount(); await click(slot(2));
    await click(disclosure().querySelector('summary')!);
    const list = document.querySelector<HTMLElement>('.candidateList')!; list.scrollTop = 120;
    await click(label('現在のコボルトの詳細')); await escape();
    expect(document.querySelector('.candidatePanel')).not.toBeNull();
    expect(disclosure().open).toBe(true);
    await click(document.querySelector('[role="dialog"] button')!);
    expect(list.scrollTop).toBe(120); expect(disclosure().open).toBe(true);
    expect(updates).toEqual([]);
    await escape(); expect(document.querySelector('.candidatePanel')).toBeNull();
  });

  it('clears pending previews on saved-team loads and external team updates', async () => {
    const savedTeam = [24, 25, 28, 2, 10];
    await mount({ saved: [{ team: savedTeam, rule: 'standard' }, null, null] });
    await click(slot(0)); await click(candidate(13));
    const staleConfirm = confirm();
    await click(label('編成1を呼び出す'));
    expect(latestTeam).toEqual(savedTeam); expect(document.querySelector('.candidatePanel')).toBeNull();
    await click(staleConfirm); expect(updates).toEqual([savedTeam]);
    await click(slot(1));
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('うつろ泉 → ひも雫');
    const staleLeader = label('ひも雫をリーダーにする');
    await act(async () => replaceTeam([0, 2, 3, 4, 6]));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    await click(staleLeader); expect(latestTeam).toEqual([0, 2, 3, 4, 6]);
    await click(slot(1));
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('妖狐 → バステト');
    expect(updates).toEqual([savedTeam]);
  });

  it('saves only the current formation while previewing, then saves the confirmed leader', async () => {
    await mount(); await click(slot(2));
    await click(label('編成1に保存'));
    expect(JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!)[0].team).toEqual(demonTeam);
    expect(updates).toEqual([]);
    await click(label('コボルトをリーダーにする'));
    await click(label('編成2に保存'));
    expect(JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!)[1].team).toEqual([30, 29, 8, 7, 2]);
  });

  it('keeps leader-move and replacement intentions separate when selecting a nonleader candidate', async () => {
    await mount(); await click(slot(2)); await click(candidate(13));
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('マモン → コボルト');
    expect(document.querySelectorAll('.leaderComparison')).toHaveLength(1);
    expect(confirm().textContent).toBe('ラタトスクに入れ替える');
    await click(label('コボルトをリーダーにする'));
    expect(updates).toEqual([[30, 29, 8, 7, 2]]);
    expect(latestTeam).not.toContain(13);
  });

  it('handles empty and incomplete teams, and ignores repeated candidate clicks until confirmation', async () => {
    await mount({ initial: [] }); await click(slot(0)); await click(candidate(24));
    const button = candidate(24);
    await act(async () => { button.click(); button.click(); });
    expect(comparison().querySelector('.leaderComparisonPath')?.textContent).toBe('未選択 → うつろ泉');
    expect(comparison().textContent).toContain('能力が変わる継続メンバー 0/0体');
    expect(member(24).dataset.membership).toBe('added');
    expect(updates).toEqual([]); expect(latestTeam).toEqual([]);
    const commit = confirm(); await act(async () => { commit.click(); commit.click(); });
    expect(updates).toEqual([[24]]);
    expect(label('編成1に保存').disabled).toBe(true);
    await click(slot(1)); await click(candidate(25));
    expect(document.querySelector('.leaderComparison')).toBeNull();
    await click(confirm()); await click(slot(1));
    expect(comparison().textContent).toContain('能力が変わる継続メンバー 2/2体');
    expect(updates).toEqual([[24], [24, 25]]);
  });

  it('offers a native keyboard disclosure, explicit labels and wrapping CSS without relying on color or a wide table', async () => {
    await mount(); await click(slot(2));
    expect(disclosure().open).toBe(false);
    const summary = disclosure().querySelector('summary')!;
    summary.focus(); expect(document.activeElement).toBe(summary);
    expect(summary.textContent).toContain('メンバー別の能力・効果対象');
    const section = comparison();
    expect(document.getElementById(section.getAttribute('aria-labelledby')!)?.textContent).toBe('リーダー変更の比較');
    expect(section.querySelector('[role="status"] .leaderMemberList')).toBeNull();
    expect(section.querySelectorAll('.leaderMemberList>li')).toHaveLength(5);
    expect(section.querySelectorAll('.leaderMemberStats dt')).toHaveLength(20);
    expect(section.querySelector('table')).toBeNull();
    expect(css).toContain('.teamBuilder .leaderMemberStats{grid-template-columns:1fr}');
    expect(css).toContain('.teamBuilder .leaderMemberDisclosure>summary:focus-visible');
    expect(css).toContain('overflow-wrap:anywhere');
    expect(updates).toEqual([]);
  });
});
