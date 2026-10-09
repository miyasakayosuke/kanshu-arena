import { type State } from './engine';
import { resultSummary } from './strategy';
import { resultFacts, battleFactEvidenceLines } from './battleInsights';

type Props = { battle: State; onRematch: () => void; onRebuild: () => void; onNext: () => void; onLog: () => void };
export default function BattleResult({ battle, onRematch, onRebuild, onNext, onLog }: Props) {
  const summary = resultSummary(battle);
  const facts = resultFacts(battle);
  return <section className="result" aria-label="対戦結果">
    <span className="eyebrow">BATTLE RESULT</span><h2>{battle.winner === 'win' ? 'VICTORY' : battle.winner === 'lose' ? 'DEFEAT' : 'DRAW'}</h2>
    <div className="resultMetrics">{summary.turns}ターン · 残りHP 味方 {summary.allyHpPercent}% / 敵 {summary.enemyHpPercent}%</div>
    <div className="battleFindings"><h3>この対戦で起きたこと</h3><ul>{facts.map(fact => <li key={fact.id}><p>{fact.text}</p><details><summary>記録を確認</summary><ul>{battleFactEvidenceLines(battle, fact).map((line, index) => <li key={index}>{line}</li>)}</ul></details></li>)}</ul><button className="detailButton" onClick={onLog}>全ターンのログを見る</button></div>
    <p className="resultPrompt">次は、指示か編成を変えて確かめよう。</p>
    <div className="rematchActions"><button className="primary" onClick={onRebuild}>編成を見直して再戦</button><button className="secondary" onClick={onRematch}>同じ編成ですぐ再戦</button><button className="detailButton" onClick={onNext}>闘技場に戻る → 次の相手</button></div>
    <p className="retryContract">再戦は同じ相手・シード・ルール。HP / MPは全回復。<br />指示を変えると乱数の使われ方も変わります。</p>
  </section>;
}
