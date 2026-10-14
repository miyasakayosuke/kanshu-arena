import { useState } from 'react';
import { monsters } from '../engine';
import { deriveAwakeningMonster, previewUpgrade } from './domain';
import { rosterIds, trialRules } from './playSession';
import type { AwakeningController } from './useAwakening';
import './progression.css';

export default function AwakeningPanel({ control }: { control: AwakeningController }) {
  const [species, setSpecies] = useState('0');
  const [confirmation, setConfirmation] = useState<{ token: string; level: number; species: string } | null>(null);
  const [discard, setDiscard] = useState<{ token: string; sequence: number } | null>(null);
  const { snapshot, session, loading, busy, message } = control;
  const progress = snapshot?.progress;
  const base = monsters.find(monster => String(monster.id) === species)!;
  const owned = progress?.monsters[species];
  const value = deriveAwakeningMonster(base, owned?.level ?? 0);
  const quote = progress && owned && owned.level < 99 && !progress.activeBattle ? previewUpgrade(progress, species, owned.level, rosterIds, trialRules) : null;
  const next = deriveAwakeningMonster(base, Math.min(99, (owned?.level ?? 0) + 1));
  return <section className="awakeningPanel" aria-label="育成と対戦報酬">
    <h2>覚醒育成 <small>試行版</small></h2>
    {message && <p role="status">{message}</p>}
    {session && <button type="button" disabled={busy || loading} onClick={() => { setConfirmation(null); setDiscard(null); void control.retry(); }}>保存を再確認</button>}
    {loading && <p>読み込みが終わるまでお待ちください。</p>}
    {progress && <>
      <p>共通素材 <b>{progress.common}</b> · 累計 <b>{progress.wins}勝</b> · 選択報酬 <b>{progress.selections.length}回分</b></p>
      {progress.receipt && <p>直近の対戦：共通素材 +{progress.receipt.common}{progress.receipt.selection ? ' · 選択報酬を獲得' : ''}（保存済み）</p>}
      {progress.activeBattle && <div role="status"><p>未終了の対戦が保存されています。ほかのタブで対戦中なら、そちらで終了してください。</p>
        {!discard ? <button disabled={busy} onClick={() => setDiscard({ token: snapshot!.token, sequence: progress.activeBattle!.sequence })}>未終了の対戦を整理する</button> : <><p>この対戦を報酬なしで終了します。続行できなくなります。</p><button disabled={busy} onClick={() => { void control.run(() => session!.discardInterrupted(discard.token, discard.sequence), '未終了の対戦を報酬なしで終了しました。'); setDiscard(null); }}>報酬なしで終了する</button><button onClick={() => setDiscard(null)}>戻る</button></>}
      </div>}
      <details><summary>素材を使って育成する</summary>
        <label>育成するモンスター<select value={species} onChange={event => { setSpecies(event.target.value); setConfirmation(null); }}>{monsters.map(monster => <option key={monster.id} value={String(monster.id)}>{monster.name}</option>)}</select></label>
        <p>{base.name}：覚醒 {owned?.level ?? 0} / 99 · 専用素材 {owned?.essence ?? 0}</p>
        <p>現在の能力（リーダー補正前）：HP {value.hp} · 攻撃 {value.atk} · MP {value.mp} · 素早さ {value.speed}</p>
        {quote && <><p>覚醒{quote.toLevel}：HP {value.hp} → {next.hp} · 攻撃 {value.atk} → {next.atk}。専用素材 {quote.essence} + 共通素材 {quote.common}を消費します。</p>
          {value.hp === next.hp && value.atk === next.atk && <p>この1段階では整数の能力値は変わりません。</p>}
          {!confirmation ? <button disabled={!quote.affordable || busy} onClick={() => setConfirmation({ token: snapshot!.token, level: quote.fromLevel, species })}>1段階の覚醒を確認</button> : <><p>上の素材を消費して覚醒しますか？</p><button disabled={busy} onClick={() => { const current = confirmation; setConfirmation(null); void control.command(current.token, { kind: 'upgrade', speciesId: current.species, expectedLevel: current.level }); }}>素材を消費して覚醒する</button><button onClick={() => setConfirmation(null)}>やめる</button></>}
        </>}
        {owned?.level === 99 && <p>最大の覚醒段階です。</p>}
        {progress.selections.length > 0 && <div><p>選択報酬は受取期限なし。選んだモンスター用の素材10個を受け取れます。</p><button disabled={busy || !!progress.activeBattle || !owned || owned.level === 99 || owned.essence + progress.selections[0].amount > (99 - owned.level) * 10} onClick={() => { setConfirmation(null); void control.command(snapshot!.token, { kind: 'claim', speciesId: species, selectionId: progress.selections[0].id }); }}>{base.name}の素材を受け取る（1回分）</button></div>}
      </details>
    </>}
    <details><summary>素材の集め方と試行中の数値</summary><p>対戦完了で共通素材1個、勝利なら追加4個。累計10勝ごとに好きな1体の素材10個を受け取れます。1段階につき素材10個、99段階まで同じ消費量です。</p><p>日課・連続ログイン条件・受取期限はありません。途中終了は報酬なし。保存できない対戦の報酬は後から付与されません。編成や図鑑で選ぶだけでは素材は増えません。</p><p>覚醒0 / 4 / 99の成長率は95 / 98 / 100。現在の覚醒0の能力を維持し、HPと攻撃だけが少しずつ成長します。MP・素早さは変わりません。敵は覚醒0です。数値は遊び心地を見て調整予定です。</p></details>
  </section>;
}
