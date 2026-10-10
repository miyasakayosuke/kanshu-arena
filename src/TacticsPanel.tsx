import MonsterArt from './MonsterArt';
import { autoOrders, NATURE_WARD_PERCENT, DRAGON_CORE_ID, DRAGON_CHARGE_CAP, DRAGON_CHARGE_PER_POINT, barrageHits, attackFor, speedFor, battleSkill, canUseSkill, effectStatus, familyLabel, leaderFor, skillOrderLabel, type Order, type State } from './engine';
import { rules, monsterRole, fixedDamageHint, type RuleId } from './strategy';

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
      {[{ label: '味方', friends: battle.allies }, { label: '敵', friends: battle.enemies }].map(({ label, friends }) => {
        const core = friends.find(unit => unit.monster.id === DRAGON_CORE_ID);
        if (!core && !friends.some(unit => unit.monster.family === 'dragon')) return null;
        return <p className="counterGuide dragonTactics" key={label}><strong>{label}の竜気：</strong>{!core ? '中核なし' : core.hp <= 0 ? '中核が戦闘不能・蓄積停止' : core.dragonCharge === undefined ? '条件未成立・蓄積なし' : `有効 · ${core.dragonCharge}/${DRAGON_CHARGE_CAP}`}。開戦時にヴリトラ＋竜系3体以上で有効になります。</p>;
      })}
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
          <small>{skillOrderLabel(skill)} · {skill.kind === 'protect' ? '味方を守る' : skill.kind === 'cleanse' ? '毒解除＋回復' : skill.randomHits ? `ランダム${barrageHits(skill, battle.enemies)}回${skill.breaksGuardAfterHit ? '・命中後に守り/群気/自然障壁/竜気解除' : skill.familyBonusHit ? '・獣5体なら追撃' : ''}` : skill.breaksGuard ? '命中前に守り/自然障壁/竜気解除' : skill.kind === 'heal' ? '回復' : skill.kind === 'guard' ? '防御' : skill.kind === 'poison' ? '全体＋毒' : skill.fixedDamage ? `${skill.all ? '全体' : '単体'}・${fixedDamageHint(skill, unit)}${skill.dragonChargeFinisher ? '・発動時に全消費' : ''}` : skill.all ? '全体攻撃' : '単体攻撃'}</small>
        </p>)}</div>
      </details>)}</div>
      <h3>MPと効果のタイミング</h3>
      <p className="counterGuide">MPは特技の発動時に消費。指示の選択・取消では消費しません。戦闘中の自然回復はなく、再戦を含む対戦開始時に全回復します。MPが足りないときは「たたかう」「ぼうぎょ」が使えます。</p>
      <p className="counterGuide">「守り:今T」はこのターンの終了まで有効。「毒:残N回」は残りのダメージ回数です。毒は付与したターンを含むターン終了時に3回発動し、最後のダメージ後に消えます。毒解除はその後の毒ダメージを止めます。</p>
      <p className="counterGuide">「自然障壁:残NT」は直接ダメージを{NATURE_WARD_PERCENT}%軽減し、ターン終了に残りが1減ります。守りと重ねても半減まで。玄武が倒れても残り期間は続き、毒は防げません。防御解除は命中前、フェンリルの連牙は命中後に自然障壁を消します。</p>
      <p className="counterGuide">竜気は中核だけが持つ0〜{DRAGON_CHARGE_CAP}の資源。味方の竜系がMPを払う攻撃特技を使い終えるたび+1で、連撃も1回分です。通常攻撃・支援・毒・渇天の息では増えません。開始時の人数条件は仲間が倒れても維持されます。渇天の息は発動時に全消費し、固定基礎に1点あたり{DRAGON_CHARGE_PER_POINT}を加えます。先に動いた味方が溜めた分も使えます。</p>
      <p className="counterGuide">竜気を消すには、通常の防御解除を命中前に当てるか、フェンリルの連牙を命中させます（命中後に解除）。解除後は再蓄積できます。中核を倒せば竜気も消え、以後は溜まりません。アンカーの息に合わせて守護・防御を使う対策もあります。</p>
      <p className="counterGuide">固定基礎の息は攻撃力・群気・全体半減に依存しません。乱数±10%と守り・自然障壁は適用されます。ケツァルコアトルの嵐の息吹は従来どおり攻撃力を使い、全体半減も適用されます。防御力・賢さ・属性相性は未導入です。</p>
      <h3>読み合いのヒント</h3>
      <p className="counterGuide">フェンリルの連牙は敵を毎回抽選。守りは命中後に解除するため、最初の一撃は半減。先制技で先に倒す・回復で粘る・防御で初撃をしのぐ選択があります。</p>
      <p className="counterGuide">速い攻撃には「味方を守る」。守りを固める相手には「防御解除」。毒を受けたら「毒解除＋回復」。守護と防御の直接ダメージ軽減は重なりません。毒の継続ダメージは軽減できません。どれも1回の行動を使います。</p>
    </section>
  </div>;
}
