import { monsters, cost, leaderFor } from './engine';
import { rules, type RuleId } from './strategy';

type PartyProps = { team: number[]; rule: RuleId; onFocus: (id: number) => void };
export function PartySummary({ team, rule, onFocus }: PartyProps) {
  const leader = team.length ? leaderFor(team[0]) : null;
  return <section className="partyCard partySummary" aria-label="現在のパーティ">
    <div className="sectionTitle">出場パーティ <span>{team.length}/5体 <b className={cost(team) > rules[rule].budget ? 'overBudget' : ''}>COST {cost(team)}/{rules[rule].budget}</b></span></div>
    <div className="team">{team.map((id, i) => <button className={`teamUnit ${i === 0 ? 'teamLeader' : ''}`} key={id} onClick={() => onFocus(id)} aria-label={`${monsters[id].name}の詳細`}><small>{i === 0 ? 'LEADER' : `0${i + 1}`}</small><span>{monsters[id].icon}</span><i>{monsters[id].name}</i></button>)}{Array.from({ length: 5 - team.length }, (_, i) => <div className="empty" key={i}>＋</div>)}</div>
    {leader && <div className="leaderBanner"><span>✦ {leader.name}</span><small>{leader.description}</small></div>}
  </section>;
}
export default function HomeScreen(props: PartyProps & { onArena: () => void; onTeam: () => void }) {
  return <main className="gameHome" aria-label="ゲームホーム">
    <section className="homeHero"><div className="homeSigil" aria-hidden="true">✦</div><span className="eyebrow">YOUR NEXT STRATEGY</span><h2>次の勝ち筋を、<br />見つけよう。</h2><p>12体の環獣と、5体の可能性。</p></section>
    <PartySummary {...props} />
    <div className="homeDestinations"><button className="arenaGate" onClick={props.onArena}><span className="gateIcon" aria-hidden="true">⚔</span><span><strong>闘技場へ</strong><small>5 vs 5 · CPU対戦</small></span><b aria-hidden="true">›</b></button><button className="workshopLink" onClick={props.onTeam}><span><strong>編成・図鑑</strong><small>組み替え / 3枠保存 / 12体の詳細</small></span><b aria-hidden="true">›</b></button></div>
  </main>;
}
export function ArenaLobby(props: PartyProps & { round: number; practice: boolean; onRule: (rule: RuleId) => void; onTeam: () => void; onLeavePractice: () => void }) {
  return <main className="arenaLobby" aria-label="闘技場の受付">
    <div className="screenIntro"><span className="eyebrow">BATTLE ARENA</span><h2>闘技場</h2><p>{props.practice ? '同じ相手に、もう一度。' : `第${props.round + 1}戦 · 次の相手に挑もう。`}</p></div>
    <div className="ruleTabs" aria-label="対戦ルール">{Object.values(rules).map(rule => <button key={rule.id} aria-pressed={props.rule === rule.id} onClick={() => props.onRule(rule.id)}><strong>{rule.name}</strong><small>COST {rule.budget}</small></button>)}</div>
    <p className="hint ruleHint">相手の編成は対戦開始時に公開。</p>
    {props.practice && <div className="practiceNotice">同じ相手・同じ条件で再挑戦 <button onClick={props.onLeavePractice}>通常の対戦へ</button></div>}
    <PartySummary {...props} />
    <button className="secondary editParty" onClick={props.onTeam}>編成を見直す</button>
    <details className="arenaRules"><summary>ルールを確認</summary><p>5体・重複なし。両軍ともCOST {rules[props.rule].budget}以内。</p><p>各ターン30秒。未入力はおまかせ。最大20ターンで決着。</p><p>MPは特技の発動時に消費。戦闘中の自然回復はなく、対戦・再戦の開始時に全回復。</p></details>
  </main>;
}
