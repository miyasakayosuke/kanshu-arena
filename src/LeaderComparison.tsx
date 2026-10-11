import { leaderFor, monsters } from './engine';
import { compareLeaders, leaderStatKeys } from './leaderComparison';

const statLabels = { hp: 'HP', mp: 'MP', atk: '攻撃 (ATK)', speed: '素早さ (SPD)' };
const signed = (value: number) => value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '±0';
const names = (ids: number[]) => ids.map(id => monsters[id].name).join('・') || 'なし';

export default function LeaderComparison({ beforeTeam, afterTeam, idPrefix }: {
  beforeTeam: readonly number[];
  afterTeam: readonly number[];
  idPrefix: string;
}) {
  const comparison = compareLeaders(beforeTeam, afterTeam);
  const { before, after, members, totalDelta, changedCount } = comparison;
  const retainedCount = members.filter(member => member.kind === 'retained').length;
  const added = members.filter(member => member.kind === 'added');
  const removed = members.filter(member => member.kind === 'removed');
  const hasMembershipChange = added.length > 0 || removed.length > 0;
  const leaderName = (id: number | null) => id === null ? '未選択' : monsters[id].name;
  const recipientCount = (snapshot: typeof before) => snapshot.members.filter(member => member.receivesLeader).length;

  return <section className="leaderComparison" aria-labelledby={`${idPrefix}-heading`}>
    <h4 id={`${idPrefix}-heading`}>リーダー変更の比較</h4>
    <p className="leaderComparisonPath">{leaderName(before.leaderId)} → {leaderName(after.leaderId)}</p>
    <div className="leaderComparisonSummary" id={`${idPrefix}-summary`} role="status" aria-atomic="true">
      <p>能力が変わる継続メンバー {changedCount}/{retainedCount}体 · 効果対象 {recipientCount(before)}/{before.members.length}体 → {recipientCount(after)}/{after.members.length}体</p>
      {hasMembershipChange && <p>追加 {added.length}体・離脱 {removed.length}体（合計には入れ替え分も含みます）</p>}
      <dl className="leaderTotalDeltas" aria-label="編成合計の変化">
        {leaderStatKeys.map(stat => <div key={stat} data-stat={stat} data-delta={totalDelta[stat]}>
          <dt>{statLabels[stat]}合計</dt><dd>{signed(totalDelta[stat])}</dd>
        </div>)}
      </dl>
    </div>
    <details className="leaderMemberDisclosure" key={`${beforeTeam.join(',')}:${afterTeam.join(',')}`}>
      <summary>メンバー別の能力・効果対象を見る</summary>
      <p>変更前：{before.leaderId === null ? 'リーダーなし' : leaderFor(before.leaderId).description}</p>
      <p>変更後：{after.leaderId === null ? 'リーダーなし' : leaderFor(after.leaderId).description}</p>
      <p className="leaderRecipientChanges">継続メンバーで新たに対象：{names(comparison.gainedRecipientIds)}<br />対象から外れる：{names(comparison.lostRecipientIds)}</p>
      <ul className="leaderMemberList">
        {members.map(member => <li key={member.id} data-monster-id={member.id} data-membership={member.kind}>
          <h5>{monsters[member.id].name}<span>{member.kind === 'added' ? `追加 · ${member.after!.slot + 1}枠へ` : member.kind === 'removed' ? `離脱 · 旧${member.before!.slot + 1}枠` : `${member.before!.slot + 1}枠 → ${member.after!.slot + 1}枠`}</span></h5>
          <p className="leaderMemberRecipient">リーダー効果：{member.before ? member.before.receivesLeader ? '対象' : '対象外' : '編成外'} → {member.after ? member.after.receivesLeader ? '対象' : '対象外' : '編成外'}</p>
          <dl className="leaderMemberStats">
            {leaderStatKeys.map(stat => <div key={stat} data-stat={stat}>
              <dt>{statLabels[stat]}</dt>
              <dd>{member.delta ? <>{member.before!.stats[stat]} → {member.after!.stats[stat]} <span>{member.delta[stat] === 0 ? '変化なし' : `(${signed(member.delta[stat])})`}</span></> : <>{(member.after ?? member.before)!.stats[stat]} <span>（{member.kind === 'added' ? '追加後' : '離脱前'}）</span></>}</dd>
            </div>)}
          </dl>
        </li>)}
      </ul>
      {hasMembershipChange && <p>追加・離脱は別のメンバーです。個体同士の能力差としては比較しません。</p>}
    </details>
    <p className="leaderComparisonNote">HP・MPは最大値（開戦時は全回復）。攻撃・素早さもリーダー補正後の値です。開幕のオーラは別効果で、この数値に含めません。</p>
    <p className="leaderComparisonNote">行動順は技の優先度が先、その次に素早さ。同じ優先度・同速は抽選です。相手の技や速さも関わるため、先手や勝利を保証する表示ではありません。</p>
  </section>;
}
