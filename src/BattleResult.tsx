import { type State } from './engine';
import { resultSummary } from './strategy';
import { resultFacts, battleFactEvidenceLines } from './battleInsights';

type Props = { battle: State; onLog: () => void };
export default function BattleResult({ battle, onLog }: Props) {
  const summary = resultSummary(battle);
  const facts = resultFacts(battle);
  return <section className="result lobbyResult" aria-label="対戦結果">
    <div role="status"><h2>前の対戦 · {battle.winner === 'win' ? 'VICTORY' : battle.winner === 'lose' ? 'DEFEAT' : 'DRAW'}</h2></div>
    <div className="resultMetrics">{summary.turns}ターン · 残りHP 味方 {summary.allyHpPercent}% / 敵 {summary.enemyHpPercent}%</div>
    <details className="resultDetails"><summary>対戦の記録</summary><div className="battleFindings"><h3>この対戦で起きたこと</h3><ul>{facts.map(fact => <li key={fact.id}><p>{fact.text}</p><details><summary>記録を確認</summary><ul>{battleFactEvidenceLines(battle, fact).map((line, index) => <li key={index}>{line}</li>)}</ul></details></li>)}</ul><button className="detailButton" onClick={onLog}>全ターンのログを見る</button></div>
    </details>
  </section>;
}
