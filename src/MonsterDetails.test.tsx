// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonsterDetails from './MonsterDetails';

let root: Root;
let opener: HTMLButtonElement;
const closeButton = () => document.querySelector<HTMLButtonElement>('.profileModal .close')!;
const sourceLink = () => document.querySelector<HTMLAnchorElement>('.profileStory .loreSource')!;
const selectedTab = () => document.querySelector<HTMLButtonElement>('.profileTabs [aria-selected=true]')!;
const panel = () => document.querySelector<HTMLElement>('.profilePanel:not([hidden])')!;
async function selectTab(id: string) { await act(async () => document.querySelector<HTMLButtonElement>(`[data-detail-tab=${id}]`)!.click()); }
async function mount(id = 0) { await act(async () => root.render(<MonsterDetails id={id} onClose={() => root.render(null)} />)); }
async function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  await act(async () => document.activeElement!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
}

beforeEach(() => {
  document.body.innerHTML = '<button id="opener">詳細を開く</button><div id="test-root"></div><button>背景の操作</button>';
  document.body.style.overflow = 'auto';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  opener = document.getElementById('opener') as HTMLButtonElement;
  opener.focus();
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('read-only monster profile keyboard focus', () => {
  it('keeps Close and the group selector outside the bounded reader', async () => {
    await mount(5);
    const modal = document.querySelector('.profileModal')!;
    const header = modal.querySelector(':scope > .profileHeader')!;
    const body = modal.querySelector(':scope > .profileBody')!;
    expect(header.contains(closeButton())).toBe(true);
    expect(body.contains(closeButton())).toBe(false);
    expect(modal.querySelector(':scope > .profileTabs')).toBeTruthy();
    for (const selector of ['.profileHeading', '.profileStory', '.leaderBanner', '.familyExplanation', '.skill', '.stats']) expect(body.querySelector(selector)).toBeTruthy();
    expect(body.querySelector('.roleBrief')).toBeNull();
    expect(modal.getAttribute('aria-label')).toBe('ケツァルコアトルの詳細');
  });

  it.each(['.close', '.loreSource', '[role=tab][aria-selected=true]', '.profilePanel:not([hidden])'])('owns Escape from %s and restores focus without bubbling to the page', async selector => {
    const pageKeydown = vi.fn();
    window.addEventListener('keydown', pageKeydown);
    try {
      await mount(5);
      if (selector === '.loreSource') await selectTab('story');
      const control = document.querySelector<HTMLElement>(`.profileModal ${selector}`)!;
      control.focus();
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      await act(async () => control.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);
      expect(document.querySelector('.profileModal')).toBeNull();
      expect(pageKeydown).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(opener);
      expect(document.body.style.overflow).toBe('auto');
    } finally { window.removeEventListener('keydown', pageKeydown); }
  });

  it('cycles only the active tab, panel and visible controls in both directions', async () => {
    await mount();
    expect(document.activeElement).toBe(closeButton());
    await tab(); expect(document.activeElement).toBe(selectedTab());
    await tab(); expect(document.activeElement).toBe(panel());
    await tab(); expect(document.activeElement).toBe(closeButton());
    await tab(true); expect(document.activeElement).toBe(panel());
    await tab(true); expect(document.activeElement).toBe(selectedTab());
    await tab(true); expect(document.activeElement).toBe(closeButton());
    await selectTab('story');
    closeButton().focus();
    await tab(); expect(document.activeElement).toBe(selectedTab());
    await tab(); expect(document.activeElement).toBe(panel());
    await tab(); expect(document.activeElement).toBe(sourceLink());
    await tab(); expect(document.activeElement).toBe(closeButton());
    await tab(true); expect(document.activeElement).toBe(sourceLink());
  });

  it('does not focus controls in hidden ability pages or hidden skills', async () => {
    await mount(36);
    await selectTab('abilities');
    const hidden = document.querySelector<HTMLElement>('.detailPage[hidden]')!;
    const inside = document.createElement('button'); inside.textContent = '非表示の操作'; hidden.append(inside);
    closeButton().focus();
    for (let step = 0; step < 12; step++) { await tab(); expect(document.activeElement).not.toBe(inside); expect(document.activeElement?.closest('[hidden]')).toBeNull(); }
  });

  it('restores the opener and its prior body scrolling when closed', async () => {
    await mount();
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () => closeButton().click());
    expect(document.querySelector('.profileModal')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('auto');
  });
});

describe('family monster profiles', () => {
  it('explains Ratatoskr target-free three or four hits and its opening-party condition', async () => {
    await mount(13);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')!.textContent).toBe('獣系');
    expect(profile.textContent).toContain('敵ランダム3回（対象指定なし）');
    expect(profile.textContent).toContain('開戦時の5体すべてが獣系なら+1回（合計4回）');
    expect(profile.textContent).toContain('戦闘不能でも条件は変わらない');
    expect(profile.querySelector('.leaderBanner')!.textContent).toContain('味方全員の素早さ +8%');
    expect(profile.querySelectorAll('.skill')).toHaveLength(2);
    expect(profile.textContent).toContain('先制攻撃');
    expect(profile.textContent).not.toContain('未知の役割');
  });

  it('explains Genbu eligibility, duration, strongest-only defense, poison bypass and removal timing', async () => {
    await mount(14);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')!.textContent).toBe('自然系');
    for (const phrase of ['自然系だけ 最大HP +15%', '先頭以外でも', '自然障壁を2ターン', '直接ダメージを10%軽減', '強い軽減だけ', '毒の継続ダメージは軽減しません', '破城の拳・冥府の断罪は命中前', '破縛の連牙は各命中後', '解除後の再付与はなく']) {
      expect(profile.textContent).toContain(phrase);
    }
    expect(profile.querySelectorAll('.skill')).toHaveLength(3);
    expect(profile.textContent).toContain('MP 22 · アンカー · 敵全体');
    expect(profile.textContent).toContain('MP 20 · 通常順 · 味方1体を回復');
    expect(profile.textContent).not.toContain('未知の役割');
    expect(document.activeElement).toBe(closeButton());
    await tab(true);
    expect(document.activeElement?.closest('[hidden]')).toBeNull();
    expect(document.activeElement?.closest('.profileModal')).toBeTruthy();
  });

  it('keeps pre-hit breakers distinct from Fenrir post-hit removal', async () => {
    await mount(8);
    expect(document.querySelector('.profileModal')!.textContent).toContain('命中前に防御・守護・自然障壁・竜気・修復待ちを解除して攻撃');
    await act(async () => root.render(<MonsterDetails id={12} onClose={() => root.render(null)} />));
    expect(document.querySelector('.profileModal')!.textContent).toContain('各命中の後に守り（防御・守護）・群気・自然障壁・竜気・修復待ちを解除');
    expect(document.querySelector('.profileModal')!.textContent).toContain('自然障壁だけなら10%軽減');
  });
});

describe('dragon profiles', () => {
  it('explains charge qualification, cast timing, fixed basis, and precise counterplay', async () => {
    await mount(15);
    const text = document.querySelector('.profileModal')!.textContent!;
    for (const phrase of ['竜系3体以上', '先頭でなくても', '連撃も1回分', '竜気は0〜5', '発動時にMPを払い、竜気を全消費', '指示した時点では消費せず', '条件未成立でも息は使えます', '防御解除は命中前', 'フェンリルは命中後', '解除後は再び溜められます', '本人の戦闘不能後は増えません', '竜気を溜めるほど強まる息', '乱数±10%', '防御力・賢さ・属性相性は現在の戦闘では未導入']) expect(text).toContain(phrase);
    expect(document.querySelectorAll('.skill')).toHaveLength(3);
    expect(text).not.toContain('未知の役割');
    expect(text).not.toContain('MPと竜気を全消費');
  });

  it.each([16, 17, 18])('has independent lore and no placeholder abilities for dragon %s', async id => {
    await mount(id);
    const text = document.querySelector('.profileModal')!.textContent!;
    expect(text).toContain('竜系');
    expect(text).not.toContain('まだ物語の記されていない');
    expect(text).not.toContain('未知の役割');
    expect(document.querySelectorAll('.skill').length).toBeLessThanOrEqual(4);
    if (id === 16) expect(text).toContain('長い蛇の体を持つ竜');
    if (id === 17) { expect(text).toContain('体の両はしに頭'); expect(text).toContain('敵ランダム2回（対象指定なし）'); }
    if (id === 18) { expect(text).toContain('青緑の翼'); expect(text).toContain('攻撃力に依存しない一撃'); expect(text).toContain('最終ダメージは乱数±10%'); }
  });

  it('keeps the existing breath attack-based instead of claiming all breaths use fixed damage', async () => {
    await mount(5);
    const text = document.querySelector('.legacyBreathExplanation')!.textContent!;
    expect(text).toContain('従来の攻撃力を使う計算を維持');
    expect(text).toContain('攻撃力が高まるほど強くなり');
    expect(text).toContain('一体あたりへの衝撃は薄まります');
    expect(document.querySelector('.fixedBasisExplanation')).toBeNull();
  });
});

describe('material profiles', () => {
  it('explains Talos qualification, poison-first timing, living-only repair and exact cancellation', async () => {
    await mount(19);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')?.textContent).toBe('物質系');
    expect(profile.querySelector('.leaderBanner')?.textContent).toContain('味方の物質系だけ 最大HP +10%');
    for (const phrase of ['タロスを含む物質系3体以上', '先頭以外でも', '開始時の条件は変わりません', '1ターン目の終了時', '両軍の毒ダメージを受けた後', '一度だけ', '本人が生存', '生存する味方の物質系', '最大HPに応じて', '小数点以下は切り捨て、最大HPまで', 'MPも行動も使わず', '蘇生ではありません', '防御解除は命中前', 'フェンリルの連牙は命中後', '再付与や2ターン目の再発動はありません']) expect(profile.textContent).toContain(phrase);
    expect(profile.querySelectorAll('.skill')).toHaveLength(3);
    expect([...profile.querySelectorAll('.detailSkillPicker button')].map(node => node.textContent)).toEqual(['炉心の槌', '環銅の衝撃', '鋳輪の備え']);
    expect(profile.textContent).toContain('防御力・賢さ・属性相性は現在の戦闘では未導入');
    expect(document.activeElement).toBe(closeButton());
    await tab(true); expect(document.activeElement?.closest('[hidden]')).toBeNull();
    expect(document.activeElement?.closest('.profileModal')).toBeTruthy();
  });

  it.each([20, 21, 22, 23])('gives material companion %s distinct lore and real abilities without adding the passive as a command', async id => {
    await mount(id);
    const profile = document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')?.textContent).toBe('物質系');
    expect(profile.textContent).toContain('タロスを含む物質系3体以上');
    expect(profile.textContent).not.toContain('まだ物語の記されていない');
    expect(profile.textContent).not.toContain('未知の役割');
    expect(profile.querySelector('.materialExplanation')).toBeNull();
    expect(profile.querySelectorAll('.skill').length).toBeGreaterThanOrEqual(2);
    expect(profile.querySelectorAll('.skill').length).toBeLessThanOrEqual(4);
    expect([...profile.querySelectorAll('.detailSkillPicker button')].map(node => node.textContent)).not.toContain('炉心の修復');
    if (id === 20) expect(profile.textContent).toContain('味方1体の毒解除＋回復');
    if (id === 21) expect(profile.textContent).toContain('味方1体を守る');
    if (id === 22) expect(profile.textContent).toContain('命中前に防御・守護・自然障壁・竜気・修復待ちを解除');
    if (id === 23) expect(profile.textContent).toContain('MP 22 · アンカー');
  });
});

describe('slime profiles',()=>{
  it('distinguishes a finite MP action from passive HP recovery and natural regeneration',async()=>{
    await mount(24);const profile=document.querySelector('.profileModal')!;
    expect(profile.querySelector('.familyTag')?.textContent).toBe('粘体系');
    for(const phrase of ['最大MP・開戦時MP+10%','毎ターンMP+2とは別','粘体系3体以上','通常順の行動を使い','各MP+8','戦闘中1回だけ','全員満タンなら使えず','指示・取消でも回数は減りません','HP回復・毒解除・蘇生はしません','防御解除で消えません','本人が倒れると失います','名称・設定は本作用の創作'])expect(profile.textContent).toContain(phrase);
    expect([...profile.querySelectorAll('.detailSkillPicker button')].map(n=>n.textContent)).toEqual(['蓄え分け','押し流し','水面のかばい']);expect(profile.textContent).toContain('攻撃力に依存しない一撃');expect(profile.querySelector('.fixedBasisExplanation')?.textContent).toContain('「攻撃力に依存しない一撃」と竜気を使う息');
  });
  it.each([25,26,27,28])('gives new companion %s authored lore and only implemented roles',async id=>{
    await mount(id);const profile=document.querySelector('.profileModal')!;expect(profile.querySelector('.familyTag')?.textContent).toBe('粘体系');expect(profile.textContent).not.toContain('未知の役割');expect(profile.textContent).not.toContain('まだ物語の記されていない');expect(profile.querySelector('.slimeExplanation')).toBeNull();expect(profile.querySelectorAll('.skill').length).toBeLessThanOrEqual(4);expect(profile.textContent).toContain('防御力・賢さ・属性相性は現在の戦闘では未導入');
  });
});

describe('demon profiles',()=>{
 it('explains MP loss, qualification, mitigation and fallback without claiming lockout',async()=>{
  await mount(29);const profile=document.querySelector('.profileModal')!;
  for(const phrase of ['悪魔系','MP16','MPを6削り','悪魔系3体以上','10になり','先頭以外','守りならMP削りも半減','本人へは戻りません','元の行動順で通常攻撃','宗教上の分類'])expect(profile.textContent).toContain(phrase);
  expect(profile.querySelector('.demonExplanation')).toBeTruthy();expect(profile.querySelector('.heroIcon svg[data-home-art]')).toBeTruthy();
 });
 it.each([30,31])('shows original art and authored role for %s',async id=>{
  await mount(id);const profile=document.querySelector('.profileModal')!;expect(profile.querySelector('.heroIcon svg[data-home-art]')).toBeTruthy();expect(profile.textContent).not.toContain('まだ物語の記されていない');expect(profile.textContent).not.toContain('未知の役割');expect(profile.querySelectorAll('.skill').length).toBeLessThanOrEqual(4);
 });
});

describe('undead profiles are finite and game-authored',()=>{
 it('explains exact poison tradeoff, starting condition and counters without a revival promise',async()=>{
   await mount(32);const text=[...document.querySelectorAll('.undeadExplanation')].map(node => node.textContent).join('');
   for(const phrase of ['MP18','毒残0〜3回','残り毒が多いほど一撃を強め','さらに強まり','先頭以外でも有効','残回数ぶん','毒0','最大3回','残りMP8','HP回復・MP獲得・追加行動はありません','清め','新しく残3'])expect(text).toContain(phrase);
   expect(document.querySelectorAll('.profileModal .skill')).toHaveLength(2);expect(document.querySelector('.heroIcon svg[data-home-art]')).toBeTruthy();
 });
 it.each([33,34,35])('gives ID%i independent art, lore and at most four skills',async id=>{
   await mount(id);expect(document.querySelector('.heroIcon svg[data-home-art]')).toBeTruthy();expect(document.querySelectorAll('.profileModal .skill').length).toBeLessThanOrEqual(4);expect(document.querySelector('.monsterLore')?.textContent).not.toContain('まだ物語');
 });
 it('keeps Banshee’s old three skills and adds only a minimal family explanation',async()=>{
   await mount(4);expect(document.querySelector('.familyTag')?.textContent).toBe('不死系');expect([...document.querySelectorAll('.profileModal .detailSkillPicker button')].map(n=>n.textContent)).toEqual(['悲鳴','毒霧','影縫い']);expect(document.querySelector('.familyExplanation')?.textContent).toContain('従来の能力値・特技は変わりません');
 });
});

describe('extraordinary core profile',()=>{
 it('explains the shared response with four assigned families, precise ally scope and independent story',async()=>{
  await mount(36);const profile=document.querySelector('.profileModal')!,text=profile.textContent!;expect(profile.querySelector('.familyTag')?.textContent).toBe('超常系');expect(profile.querySelectorAll('.skill')).toHaveLength(4);expect(profile.querySelector('.heroIcon svg')?.getAttribute('data-home-art')).toBe('36');for(const phrase of ['所属系統4種類以上','重複・未所属は数えず','5種類でも追加効果はありません','先頭以外でも有効','HP回復0・予防なし','生存する味方全員が対象','二つを一回ずつ使うことはできません','実行時も変化がなければ','粘体専用補給の対象外','無料の本人防御','最大HP +8%'])expect(text).toContain(phrase);expect(text).not.toContain('まだ物語の記されていない');expect(text).not.toContain('未知の役割');expect([...profile.querySelectorAll('.skill')].slice(0,2).every(n=>!n.textContent?.includes('敵全体'))).toBe(true);
 });
});
