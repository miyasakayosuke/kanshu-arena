// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamBuilder from './TeamBuilder';
import { cost, monsters } from './engine';
import { initialTeam, type RuleId, type TeamSlot } from './strategy';

let root: Root;
let updates: number[][];
let onFocus: ReturnType<typeof vi.fn>;
let latestTeam: number[];
const byLabel = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const byText = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === text)!;
const candidateButton = (id: number) => byLabel(`${monsters[id].name}を候補に選ぶ`);
const slotButton = (slot: number) => document.querySelectorAll<HTMLButtonElement>('.builderSlots .teamUnit')[slot];
const confirmButton = () => document.querySelector<HTMLButtonElement>('.confirmReplacement')!;
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function chooseSelect(label: string, value: string) {
  await act(async () => {
    const select = document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function search(value: string) {
  await act(async () => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function disclose(selector: string) {
  await click(document.querySelector<HTMLElement>(`${selector} > summary`)!);
}
function Harness({ startingTeam = initialTeam, startingRule = 'standard', startingSlots = [null, null, null], practice = false }: { startingTeam?: number[]; startingRule?: RuleId; startingSlots?: (TeamSlot | null)[]; practice?: boolean }) {
  const [team, setTeam] = useState([...startingTeam]);
  const [rule, setRule] = useState(startingRule);
  const [slots, setSlots] = useState(startingSlots);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState<number | null>(null);
  latestTeam = team;
  return <>
    <TeamBuilder team={team} setTeam={next => { updates.push([...next]); setTeam(next); }} rule={rule} setRule={setRule}
      slots={slots} setSlots={setSlots} notice={notice} setNotice={setNotice} practice={practice} leavePractice={() => {}}
      onFocus={id => { onFocus(id); setDetail(id); }} />
    {detail !== null && <div role="dialog" aria-modal="true" aria-label={`${monsters[detail].name}の詳細`}><p>読み取り専用の詳細</p><button onClick={() => setDetail(null)}>詳細を閉じる</button></div>}
  </>;
}
async function mount(props: React.ComponentProps<typeof Harness> = {}) { await act(async () => root.render(<Harness {...props} />)); }
beforeEach(() => {
  localStorage.clear();
  updates = [];
  onFocus = vi.fn();
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });

describe('slot-first team workshop', () => {
  it('starts with five slots and progressively disclosed rules, saves, and bestiary', async () => {
    await mount();
    expect(document.querySelectorAll('.builderSlots .teamUnit')).toHaveLength(5);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.querySelector<HTMLDetailsElement>('.ruleDisclosure')!.open).toBe(false);
    expect(document.querySelector<HTMLDetailsElement>('.savedTeams')!.open).toBe(false);
    expect(document.querySelector('.leaderBanner')!.textContent).toContain('素早さ +8%');
    expect(document.querySelector('.partyCard')!.textContent).toContain('COST 15/17');
    expect(document.body.textContent).not.toContain('編成から外す');
  });

  it('brings the editor and selected preview into view without resetting candidate list scroll', async () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    await mount();
    await click(slotButton(0));
    expect(document.activeElement).toBe(document.querySelector('#candidate-heading'));
    expect(scroll.mock.contexts).toContain(document.querySelector('#candidate-heading'));
    expect(document.querySelector('.comparisonGrid')).toBeNull();
    const list = document.querySelector<HTMLElement>('.candidateList')!;
    list.scrollTop = 210;
    await click(candidateButton(7));
    const preview = document.querySelector('.candidatePreview');
    expect(document.activeElement).toBe(preview);
    expect(scroll.mock.contexts).toContain(preview);
    expect(list.scrollTop).toBe(210);
    const callCount = scroll.mock.calls.length;
    await click(byLabel('セルキーの詳細'));
    await click(byText('詳細を閉じる'));
    expect(scroll.mock.calls.length).toBe(callCount);
    expect(list.scrollTop).toBe(210);
  });

  it('previews current and candidate role, stats and budget, then replaces atomically', async () => {
    const source = [...initialTeam];
    await mount({ startingTeam: source });
    await click(slotButton(0));
    await click(candidateButton(1));
    expect(updates).toEqual([]);
    expect(latestTeam).toEqual(source);
    expect(document.querySelector('.comparisonGrid')!.textContent).toContain('狐火の速攻役');
    expect(document.querySelector('.comparisonGrid')!.textContent).toContain('岩山の守り手');
    expect(document.querySelectorAll('.comparisonStats dd')).toHaveLength(8);
    expect(document.querySelector('.candidateImpact')!.textContent).toContain('15 → 14/17');
    expect(document.querySelector('.candidateImpact')!.textContent).toContain('残り 3');
    expect(document.querySelector('.candidateImpact')!.textContent).toContain('新リーダー効果：味方全員の最大HP +12%');
    const confirm = confirmButton();
    await click(confirm);
    await click(confirm);
    expect(updates).toEqual([[1, 2, 3, 4, 6]]);
    expect(source).toEqual(initialTeam);
    expect(new Set(latestTeam).size).toBe(5);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.querySelector('.leaderBanner')!.textContent).toContain('最大HP +12%');
  });

  it('cancels without changing members or leader and returns focus to the original slot', async () => {
    await mount();
    const selected = slotButton(0);
    await click(selected);
    await click(candidateButton(7));
    await click(byText('キャンセル'));
    expect(updates).toEqual([]);
    expect(latestTeam).toEqual(initialTeam);
    expect(document.activeElement).toBe(selected);
    await click(slotButton(0));
    expect(confirmButton()).toBeNull();
    expect(document.querySelector('.currentMemberBrief')!.textContent).toContain('妖狐');
  });

  it('uses Escape to cancel a preview or close the bestiary, without dismissing behind a detail dialog', async () => {
    await mount();
    await click(slotButton(0));
    await click(candidateButton(7));
    await click(byLabel('セルキーの詳細'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(confirmButton().textContent).toBe('セルキーに入れ替える');
    expect(updates).toEqual([]);
    await click(byText('詳細を閉じる'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(updates).toEqual([]);
    await click(document.querySelector<HTMLButtonElement>('.browseBestiary')!);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.browseBestiary'));
  });

  it('disables duplicate and over-budget candidates with an explicit reason, while details stay available', async () => {
    await mount({ startingRule: 'light' });
    await click(slotButton(4));
    expect(candidateButton(2).disabled).toBe(true);
    expect(document.getElementById('candidate-reason-2')!.textContent).toBe('編成済み（2枠）');
    expect(candidateButton(6).disabled).toBe(true);
    expect(document.getElementById('candidate-reason-6')!.textContent).toBe('この枠のメンバー');
    expect(candidateButton(7).disabled).toBe(true);
    expect(document.getElementById('candidate-reason-7')!.textContent).toBe('COST 2超過');
    await click(candidateButton(2));
    await click(candidateButton(7));
    expect(confirmButton()).toBeNull();
    await click(byLabel('セルキーの詳細'));
    expect(onFocus).toHaveBeenLastCalledWith(7);
    expect(updates).toEqual([]);
  });

  it('rechecks budget at confirmation after changing the rule', async () => {
    await mount();
    await click(slotButton(4));
    await click(candidateButton(7));
    expect(confirmButton().disabled).toBe(false);
    await disclose('.ruleDisclosure');
    await click([...document.querySelectorAll<HTMLButtonElement>('.ruleTabs button')].find(button => button.textContent?.includes('軽量戦'))!);
    expect(confirmButton().disabled).toBe(true);
    expect(document.querySelector('.candidateImpact')!.textContent).toContain('COST 2超過');
    await click(confirmButton());
    expect(updates).toEqual([]);
    expect(latestTeam).toEqual(initialTeam);
  });

  it('can fill an older incomplete team without ever dropping existing members', async () => {
    await mount({ startingTeam: [0, 2, 3] });
    expect(document.querySelectorAll('.builderSlots .teamUnit')).toHaveLength(5);
    expect(document.querySelectorAll('.emptySlot')).toHaveLength(2);
    expect(slotButton(3).disabled).toBe(false);
    expect(slotButton(4).disabled).toBe(true);
    expect(document.getElementById('empty-slot-reason-4')!.textContent).toBe('前の枠から');
    await click(slotButton(4));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(updates).toEqual([]);
    await click(slotButton(3));
    await click(candidateButton(4));
    await click(confirmButton());
    expect(latestTeam).toEqual([0, 2, 3, 4]);
    expect(slotButton(4).disabled).toBe(false);
    expect(document.getElementById('empty-slot-reason-4')).toBeNull();
    await click(slotButton(4));
    await click(candidateButton(6));
    await click(confirmButton());
    expect(updates).toEqual([[0, 2, 3, 4], [0, 2, 3, 4, 6]]);
    expect(document.querySelectorAll('.emptySlot')).toHaveLength(0);
    expect(cost(latestTeam)).toBeLessThanOrEqual(17);
  });

  it('changes the leader inline while preserving five unique members and total cost', async () => {
    await mount();
    await click(slotButton(1));
    await click(byLabel('バステトをリーダーにする'));
    expect(updates).toEqual([[2, 0, 3, 4, 6]]);
    expect(new Set(latestTeam)).toEqual(new Set(initialTeam));
    expect(cost(latestTeam)).toBe(cost(initialTeam));
    expect(document.querySelector('.leaderBanner')!.textContent).toContain('最大HP +12%');
    expect(document.querySelector('.candidatePanel')).toBeNull();
  });

  it('preserves candidate, search, filters, sort and list scroll when read-only detail is dismissed', async () => {
    await mount();
    await click(slotButton(0));
    await click(candidateButton(7));
    await disclose('.filterDisclosure');
    await click(byText('回復'));
    await chooseSelect('リーダー効果で絞り込み', 'hp');
    await chooseSelect('コストで絞り込み', '4');
    await chooseSelect('並べ替え', 'speed');
    await search('セルキー');
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(1);
    const list = document.querySelector<HTMLElement>('.candidateList')!;
    list.scrollTop = 125;
    await click(byLabel('セルキーの詳細'));
    expect(document.querySelector('[role=dialog]')).toBeTruthy();
    await click(byText('詳細を閉じる'));
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.querySelector('.candidateList')).toBe(list);
    expect(list.scrollTop).toBe(125);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="検索"]')!.value).toBe('セルキー');
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="並べ替え"]')!.value).toBe('speed');
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="コストで絞り込み"]')!.value).toBe('4');
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="リーダー効果で絞り込み"]')!.value).toBe('hp');
    expect(byText('回復').getAttribute('aria-pressed')).toBe('true');
    expect(candidateButton(7).getAttribute('aria-pressed')).toBe('true');
    expect(confirmButton().textContent).toBe('セルキーに入れ替える');
    expect(slotButton(0).getAttribute('aria-pressed')).toBe('true');
    expect(updates).toEqual([]);
    await click(byLabel('絞り込みをリセット'));
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(12);
  });

  it('filters by replacement eligibility rather than requiring an empty team slot', async () => {
    await mount({ startingRule: 'light' });
    await click(slotButton(0));
    await disclose('.filterDisclosure');
    await chooseSelect('コストで絞り込み', 'fit');
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(7);
    expect([...document.querySelectorAll<HTMLButtonElement>('.candidateSelect')].every(button => !button.disabled)).toBe(true);
    await click(candidateButton(7));
    await click(confirmButton());
    expect(latestTeam).toEqual([7, 2, 3, 4, 6]);
    expect(cost(latestTeam)).toBe(15);
  });

  it('opens the bestiary as a read-only auxiliary view and returns without editing the team', async () => {
    await mount();
    await click(document.querySelector<HTMLButtonElement>('.browseBestiary')!);
    expect(document.querySelector('#candidate-heading')!.textContent).toBe('モンスター図鑑');
    expect(document.querySelectorAll('.candidateCard')).toHaveLength(12);
    expect(document.querySelector('.candidateSelect')).toBeNull();
    await click(byLabel('アヌビスの詳細'));
    await click(byText('詳細を閉じる'));
    await click(byText('図鑑を閉じる'));
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(updates).toEqual([]);
  });

  it('saves three teams and clears a pending comparison when loading a different rule, including practice warning', async () => {
    await mount({ practice: true, startingSlots: [{ team: [2, 0, 3, 4, 6], rule: 'light' }, null, null] });
    await disclose('.savedTeams');
    await click(byLabel('編成2に保存'));
    expect(JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!)[1]).toEqual({ team: initialTeam, rule: 'standard' });
    await click(slotButton(0));
    await click(candidateButton(1));
    await click(byLabel('編成1を呼び出す'));
    expect(latestTeam).toEqual([2, 0, 3, 4, 6]);
    expect(document.querySelector('.candidatePanel')).toBeNull();
    expect(document.querySelector('.teamNotice')!.textContent).toContain('同じ相手・同じシードの再戦を解除');
    expect(document.querySelector('.ruleTabs [aria-pressed=true]')!.textContent).toContain('軽量戦');
  });
});
