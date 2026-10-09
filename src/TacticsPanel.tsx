import MonsterArt from './MonsterArt';
import { autoOrders, attackFor, speedFor, battleSkill, canUseSkill, effectStatus, familyLabel, leaderFor, skillOrderLabel, type Order, type State } from './engine';
import { rules, monsterRole, type RuleId } from './strategy';

type Props = { battle: State; orders: Record<string, Order>; playing: boolean; rule: RuleId; onClose: () => void };

export default function TacticsPanel({battle, orders, playing, rule, onClose}: Props) {
  const automatic = autoOrders(battle);
  const sequence = battle.allies.filter(u => u.hp > 0)
    .map(unit => ({unit, order: orders[unit.key] ?? automatic.find(o => o.key === unit.key)}))
    .map(value => ({...value, skill: value.order ? battleSkill(value.unit.monster, value.order.skill) : undefined}))
    .sort((a, b) => (b.skill?.priority ?? 0) - (a.skill?.priority ?? 0) || speedFor(b.unit, battle.turn) - speedFor(a.unit, battle.turn));
  return <div className="overlay" onClick={onClose}>
    <section className="modal tacticsModal" role="dialog" aria-modal="true" aria-label="対戦の作戦情報" onClick={e => e.stopPropagation()}>
      <button className="close" aria-label="作戦情報を閉じる" onClick={onClose}>×</button>
      <span className="eyebrow">READ THE MATCHUP</span><h2>作戦と行動順</h2>
      <p className="hint">{rules[rule].name} · 両軍COST上限{rules[rule].budget}。確認中も入力時間は進みます。</p>
      <div className="tacticsLeaders"><p>味方 ✦ {leaderFor(battle.allies[0].monster.id).description}</p><p>敵 ✦ {leaderFor(battle.enemies[0].monster.id).description}</p></div>
      <h3>味方のHP・MP・状態</h3>
      <div className="allyIntel">{battle.allies.map(unit => <p key={unit.key}>
        <strong><MonsterArt monster={unit.monster} portrait /> {unit.monster.name} · {familyLabel(unit.monster)}</strong>
        <small>HP {unit.hp}/{unit.monster.hp} · MP {unit.mp}/{unit.monster.mp} · ATK {attackFor(unit)} · SPD {speedFor(unit, battle.turn)}</small>
        <span>{unit.hp <= 0 ? '戦闘不能' : effectStatus(unit) || '状態異常なし'}</span>
      </p>)}</div>
      <h3>味方の行動順の目安</h3>
      <p className="hint">守護 → 先制 → 防御 → 通常 → アンカー。同じ区分は素早さ順。同速は抽選。</p>
      <p className="hint">敵の行動は未公開。この間に割り込みます。未入力は現時点のおまかせ案です。</p>
      {playing ? <p className="hint">演出中です。次のターンに新しい指示を確認できます。</p> : <ol className="initiativeList">{sequence.map(({unit, skill}) => <li key={unit.key}>
        <span><MonsterArt monster={unit.monster} portrait /> {unit.monster.name}</span>
        <small>{skill?.name} · {skill ? `${skillOrderLabel(skill)} · MP ${skill.mpCost}` : '未定'} · SPD {speedFor(unit, battle.turn)}{!orders[unit.key] ? ' / 自動案' : ''}</small>
      </li>)}</ol>}
      <h3>相手の編成と得意技</h3>
      <div className="enemyIntel">{battle.enemies.map(unit => <details key={unit.key}>
        <summary><span><MonsterArt monster={unit.monster} portrait /> {unit.monster.name}</span><small>HP {unit.hp}/{unit.monster.hp} · MP {unit.mp}/{unit.monster.mp} · SPD {speedFor(unit, battle.turn)}</small><small className="intelStatus">{unit.hp <= 0 ? '戦闘不能' : effectStatus(unit) || '状態異常なし'}</small></summary>
        <p className="intelRole">{monsterRole(unit.monster.id).name} · {monsterRole(unit.monster.id).tradeoff}</p>
        <div className="intelSkills">{unit.monster.skills.map(skill => <p key={skill.name}>
          <strong>{skill.name}<span className={`skillMp ${unit.hp > 0 && !canUseSkill(unit, skill) ? 'insufficient' : ''}`}>MP {skill.mpCost}{unit.hp > 0 && !canUseSkill(unit, skill) ? ' · MP不足' : ''}</span></strong>
          <small>{skillOrderLabel(skill)} · {skill.kind === 'protect' ? '味方を守る' : skill.kind === 'cleanse' ? '毒解除＋回復' : skill.randomHits ? `ランダム${skill.randomHits}回・命中後に守り/群気解除` : skill.breaksGuard ? '防御解除' : skill.kind === 'heal' ? '回復' : skill.kind === 'guard' ? '防御' : skill.kind === 'poison' ? '全体＋毒' : skill.all ? '全体攻撃' : '単体攻撃'}</small>
        </p>)}</div>
      </details>)}</div>
      <h3>MPと効果のタイミング</h3>
      <p className="counterGuide">MPは特技の発動時に消費。指示の選択・取消では消費しません。戦闘中の自然回復はなく、再戦を含む対戦開始時に全回復します。MPが足りないときは「たたかう」「ぼうぎょ」が使えます。</p>
      <p className="counterGuide">「守り:今T」はこのターンの終了まで有効。「毒:残N回」は残りのダメージ回数です。毒は付与したターンを含むターン終了時に3回発動し、最後のダメージ後に消えます。毒解除はその後の毒ダメージを止めます。</p>
      <h3>読み合いのヒント</h3>
      <p className="counterGuide">フェンリルの連牙は敵を毎回抽選。守りは命中後に解除するため、最初の一撃は半減。先制技で先に倒す・回復で粘る・防御で初撃をしのぐ選択があります。</p>
      <p className="counterGuide">速い攻撃には「味方を守る」。守りを固める相手には「防御解除」。毒を受けたら「毒解除＋回復」。守護と防御の直接ダメージ軽減は重なりません。毒の継続ダメージは軽減できません。どれも1回の行動を使います。</p>
    </section>
  </div>;
}
