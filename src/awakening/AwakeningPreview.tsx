import { useId, useState } from 'react';
import { deriveAwakeningMonster, nextStatChange } from './domain';
import './preview.css';

/** A local calculator only: never loads progress, changes combat, or writes saves. */
export default function AwakeningPreview({ base }: { base: { hp: number; atk: number; mp: number; speed: number } }) {
  const [level, setLevel] = useState(0);
  const inputId = useId();
  const resultId = useId();
  const value = deriveAwakeningMonster(base, level);
  const hpNext = nextStatChange(base.hp, level);
  const atkNext = nextStatChange(base.atk, level);
  const next = (label: string, change: ReturnType<typeof nextStatChange>) => change
    ? `${label}は覚醒${change.level}で${change.value}` : `${label}はこの先変化なし`;
  return <details className="awakeningPreview">
    <summary>覚醒の能力を試算する</summary>
    <p>試算専用です。所持状況・保存データ・戦闘には反映されません。</p>
    <label htmlFor={inputId}>試算する覚醒段階：{level} / 99</label>
    <input id={inputId} type="range" min="0" max="99" step="1" value={level} aria-describedby={resultId} onChange={event => setLevel(Number(event.target.value))} />
    <div className="awakeningControls" role="group" aria-label="試算する覚醒段階">
      <button type="button" disabled={level === 0} onClick={() => setLevel(n => Math.max(0, n - 1))}>−1</button>
      {[0, 4, 99].map(n => <button type="button" key={n} aria-pressed={level === n} onClick={() => setLevel(n)}>覚醒{n}</button>)}
      <button type="button" disabled={level === 99} onClick={() => setLevel(n => Math.min(99, n + 1))}>＋1</button>
    </div>
    <div id={resultId} className="awakeningResult" aria-live="polite" aria-atomic="true">
      <strong>覚醒{level}の試算（リーダー補正前）</strong>
      <dl>{([['HP', base.hp, value.hp], ['攻撃', base.atk, value.atk]] as const).map(([label, before, after]) => <div key={label}><dt>{label}</dt><dd>{before} → <b>{after}</b>（+{after - before}）</dd></div>)}</dl>
      <p>{level === 99 ? '最大段階の試算です。' : `${next('HP', hpNext)}。${next('攻撃', atkNext)}。`}</p>
    </div>
    <p>MP {base.mp}・素早さ {base.speed}は変わりません。防御力は現在未導入です。</p>
    <p>成長率は覚醒0 / 4 / 99で95 / 98 / 100。段階間を直線でつなぎ、四捨五入します。覚醒0の現在値を維持するため、表示値は現在値×成長率÷95です。段階が上がっても整数の能力値が変わらない場合があります。</p>
    <small>素材の入手量・必要量は試行中です。育成はホーム・闘技場から行えます。この画面で素材やモンスターを消費する操作はありません。</small>
  </details>;
}
