import { useEffect, useId, useRef } from 'react';
import { cost, monsters } from './engine';
import { FAMILY_DEFINITIONS, type Family } from './families';
import MonsterArt from './MonsterArt';
import { rules, type RuleId } from './strategy';
import './familyTrialPicker.css';

/** Structural input contract; the preset source owns the teams and their notes. */
export type FamilyTrialPickerPreset = {
  id: Family;
  name: string;
  family: Family;
  team: readonly number[];
  kind: 'pure' | 'mixed';
  note: string;
};

export default function FamilyTrialPicker({ presets, rule, onChoose, onClose }: {
  presets: readonly FamilyTrialPickerPreset[];
  rule: RuleId;
  onChoose: (preset: FamilyTrialPickerPreset) => void;
  onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) close.current?.focus();
    };
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('focusin', containFocus);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const dismiss = () => {
    if (settled.current) return;
    settled.current = true;
    onClose();
  };
  const choose = (preset: FamilyTrialPickerPreset) => {
    if (settled.current) return;
    settled.current = true;
    onChoose(preset);
  };
  const renderPreset = (preset: FamilyTrialPickerPreset) => {
    const leader = monsters[preset.team[0]];
    const teamCost = cost([...preset.team]);
    const needsStandard = teamCost > rules[rule].budget;
    const action = needsStandard
      ? '標準戦 COST17に切り替えて受付へ'
      : rule === 'light' ? '軽量戦 COST15のまま受付へ' : 'この編成で受付へ';
    return <article className="familyTrialCard" key={preset.id} data-family={preset.family} data-kind={preset.kind} aria-labelledby={`${id}-${preset.id}-name`}>
      <div className="familyTrialIdentity">
        <span className="familyTrialPortrait" aria-hidden="true"><MonsterArt monster={leader} portrait /></span>
        <div>
          <p className="familyTrialFamily">{FAMILY_DEFINITIONS[preset.family].label} · {preset.kind === 'pure' ? '純系統5体' : '混成'}</p>
          <h4 id={`${id}-${preset.id}-name`}>{preset.name}</h4>
          <p className="familyTrialCost">COST {teamCost} <span>· {needsStandard ? '標準戦へ切り替え' : `${rules[rule].name}で使用可能`}</span></p>
        </div>
      </div>
      <ol className="familyTrialMembers" aria-label={`${preset.name}のメンバー`}>
        {preset.team.map((memberId, index) => <li key={memberId}>
          {index === 0 && <strong>リーダー </strong>}{monsters[memberId].name}
        </li>)}
      </ol>
      <p className="familyTrialNote">{preset.note}</p>
      <button type="button" className="familyTrialChoose" aria-label={`${preset.name}：${action}`} onClick={() => choose(preset)}>{action}</button>
    </article>;
  };

  return <div className="familyTrialOverlay" onClick={dismiss}>
    <div className="familyTrialDialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description ${id}-saves ${id}-practice ${id}-rules`} ref={dialog} onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <div className="familyTrialHeader">
        <h2 id={`${id}-title`}>系統パーティを試す</h2>
        <button type="button" className="familyTrialClose" ref={close} onClick={dismiss} aria-label="編成を変えずに閉じる">閉じる</button>
      </div>
      <div className="familyTrialScroll">
        <div className="familyTrialIntro">
          <p id={`${id}-description`}>選ぶと現在の編成を入れ替えて受付へ進みます。対戦はまだ始まりません。</p>
          <p id={`${id}-saves`}>保存した3枠は上書きしません。</p>
          <p id={`${id}-practice`}>同条件の練習中は、新しいパーティを選んだ時点でその練習を終了します。</p>
          <p id={`${id}-rules`}>対戦開始時に、標準戦は7つの純系統から相手を抽選します。軽量戦の純系統5体の相手は自然系のみです。</p>
          <p className="familyTrialCurrentRule">現在：{rules[rule].name} COST{rules[rule].budget}</p>
        </div>
        <section className="familyTrialSection" aria-labelledby={`${id}-pure`}>
          <h3 id={`${id}-pure`}>純系統のパーティ</h3>
          <p className="familyTrialSectionHint">同じ系統の5体で、連携を試せます。</p>
          <div className="familyTrialGrid">{presets.filter(preset => preset.kind === 'pure').map(renderPreset)}</div>
        </section>
        <section className="familyTrialSection familyTrialMixed" aria-labelledby={`${id}-mixed`}>
          <h3 id={`${id}-mixed`}>ヤヌスの混成パーティ</h3>
          <p className="familyTrialSectionHint">異なる系統を組み合わせる、別タイプの編成です。</p>
          <div className="familyTrialGrid">{presets.filter(preset => preset.kind === 'mixed').map(renderPreset)}</div>
        </section>
        <button type="button" className="familyTrialCancel" onClick={dismiss}>キャンセルして編成を変えずに戻る</button>
      </div>
    </div>
  </div>;
}
