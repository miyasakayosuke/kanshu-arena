import type { RefObject } from 'react';
import MonsterArt from './MonsterArt';
import { monsters, cost, leaderFor } from './engine';
import { rules, isValidTeam, type RuleId } from './strategy';
import { pureFamilyOpponentPresets } from './familyTrials';
import { FAMILY_DEFINITIONS } from './families';

type PartyProps = { team: number[]; rule: RuleId; onFocus: (id: number) => void };
export function PartySummary({ team, rule, onFocus, compact = false }: PartyProps & { compact?: boolean }) {
  const leader = team.length ? leaderFor(team[0]) : null;
  const ready = Boolean(isValidTeam(team, rules[rule].budget));
  return <section className={`partyCard partySummary ${compact ? 'compactParty' : ''}`} aria-label="現在のパーティ">
    <div className="sectionTitle">{compact ? '現在のパーティ' : '出場パーティ'} <span>{team.length}/5体{!compact && <b className={cost(team) > rules[rule].budget ? 'overBudget' : ''}>COST {cost(team)}/{rules[rule].budget}</b>}</span></div>
    <div className="team">{team.map((id, i) => <button className={`teamUnit ${i === 0 ? 'teamLeader' : ''}`} key={id} data-monster-id={id} onClick={() => onFocus(id)} aria-label={`${monsters[id].name}の詳細`}><small>{i === 0 ? 'LEADER' : `0${i + 1}`}</small><span><MonsterArt monster={monsters[id]} portrait /></span><i>{monsters[id].name}</i></button>)}{Array.from({ length: 5 - team.length }, (_, i) => <div className="empty" key={i}>＋</div>)}</div>
    {leader && <div className="leaderBanner"><span>✦ {compact ? monsters[team[0]].name : leader.name}</span><small>{leader.description}</small></div>}
    {compact && <p className={`homeReadiness ${ready ? '' : 'overBudget'}`}>{ready ? `${rules[rule].name}に出場できます` : team.length < 5 ? `あと${5 - team.length}体を編成しよう` : `${rules[rule].name}の上限までCOST ${cost(team) - rules[rule].budget}調整が必要`}</p>}
  </section>;
}
export default function HomeScreen(props: PartyProps & { onArena: () => void; onTeam: () => void; onFamilyTrial: () => void; practice: boolean }) {
  return <main className="gameHome" aria-label="ゲームホーム">
    <section className="homeHero"><div className="homeSigil" aria-hidden="true">✦</div><span className="eyebrow">BUILD · BATTLE · LEARN</span><h2>次の一手を、試そう。</h2><p>5体を組む。対戦で確かめる。また組み直す。</p></section>
    <PartySummary {...props} compact />
    <div className="homeDestinations"><button className="arenaGate" onClick={props.onArena}><span className="gateIcon" aria-hidden="true">⚔</span><span><strong>闘技場へ</strong><small>{props.practice ? '同じ相手への再挑戦を準備中' : '受付でルールを確認して対戦'}</small></span><b aria-hidden="true">›</b></button><button className="workshopLink familyTrialGate" onClick={props.onFamilyTrial} aria-label="系統パーティを試す"><span><strong>系統パーティを試す</strong><small>おすすめ5体を選んで受付へ · 保存枠はそのまま</small></span><b aria-hidden="true">›</b></button><button className="workshopLink" onClick={props.onTeam}><span><strong>編成へ</strong><small>5枠の入れ替え / リーダー / 保存</small></span><b aria-hidden="true">›</b></button></div>
    <div className="homeCredits"><a href={`${import.meta.env.BASE_URL}credits.html`} target="_blank" rel="noopener noreferrer">クレジット・権利情報<span className="srOnly">（新しいタブ）</span></a></div>
  </main>;
}
export function ArenaLobby(props: PartyProps & { headingRef?: RefObject<HTMLHeadingElement | null>; round: number; practice: boolean; notice: string; onRule: (rule: RuleId) => void; onTeam: () => void; onFamilyTrial: () => void; onLeavePractice: () => void }) {
  const ready = Boolean(isValidTeam(props.team, rules[props.rule].budget));
  const opponents = pureFamilyOpponentPresets(props.rule);
  const opponentHint = props.practice ? '同じ相手との再戦です。ルールを変えると同条件での再戦を解除します。' : opponents.length > 1 ? `相手は${opponents.length}系統の純5体からランダム。相手の編成は対戦開始時に公開します。` : `このルールの純5体の相手は${opponents.map(preset => FAMILY_DEFINITIONS[preset.family].label).join('・')}のみ。ほかの系統とは標準戦で対戦できます。`;
  return <main className="arenaLobby" aria-label="闘技場の受付">
    <div className="screenIntro"><span className="eyebrow">BATTLE RECEPTION</span><h2 ref={props.headingRef} tabIndex={-1}>闘技場の受付</h2><p>{props.practice ? '編成や指示を変えて、同じ相手で確かめよう。' : `第${props.round + 1}戦 · 条件を選んで出場しよう。`}</p></div>
    <div className="ruleTabs" aria-label="対戦ルール">{Object.values(rules).map(rule => <button key={rule.id} aria-pressed={props.rule === rule.id} onClick={() => props.onRule(rule.id)}><strong>{rule.name}</strong><small>COST {rule.budget}</small></button>)}</div>
    <p className="hint ruleHint">{opponentHint}</p>
    {props.practice && <div className="practiceNotice"><span>同じ相手・同じシード・同じルールを保持中</span><button onClick={props.onLeavePractice}>次の相手へ</button></div>}
    {props.notice && <p className="transitionNotice" role="status">{props.notice}</p>}
    <PartySummary {...props} />
    <p className={`entryStatus ${ready ? '' : 'overBudget'}`} role="status">{ready ? '出場準備完了 · 5体 / 重複なし / コスト以内' : props.team.length < 5 ? `出場にはあと${5 - props.team.length}体必要です` : `あとCOST ${cost(props.team) - rules[props.rule].budget}減らすと出場できます`}</p>
    <button className="secondary editParty familyTrialGate" onClick={props.onFamilyTrial}>系統パーティを試す</button>
    <button className="secondary editParty" onClick={props.onTeam}>編成を見直す</button>
    <details className="arenaRules"><summary>対戦ルールと操作を確認</summary><p>5体・重複なし。両軍ともCOST {rules[props.rule].budget}以内。</p><p>各ターン30秒。未入力はおまかせ。最大20ターンで決着。</p><p>MPは特技の発動時に消費。戦闘中の自然回復はなく、対戦・再戦の開始時に全回復。</p><p>作戦・詳細・ログを開いても入力時間は進みます。同じ相手でも指示を変えると乱数の使われ方と結果が変わることがあります。</p></details>
  </main>;
}
