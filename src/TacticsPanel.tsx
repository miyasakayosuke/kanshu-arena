import MonsterArt from './MonsterArt';
import { DEFAULT_RESERVE_POISON, completeOrders, EXTRAORDINARY_CORE_ID, assignedFamilyCount, UNDEAD_CORE_ID, DEMON_CORE_ID, mpDamageFor, NATURE_WARD_PERCENT, SLIME_CORE_ID, SLIME_SUPPLY, skillUnavailableReason, skillUnavailableLabel, MATERIAL_CORE_ID, DRAGON_CORE_ID, DRAGON_CHARGE_CAP, barrageHits, attackFor, speedFor, battleSkill, canUseSkill, effectStatus, familyLabel, leaderFor, skillOrderLabel, type Order, type State } from './engine';
import { rules, monsterRole, fixedDamageHint, poisonCashoutHint, type RuleId } from './strategy';

import { POISON_TIMING_HINT, poisonSkillDetail } from './poisonDescription';

type Props = { battle: State; orders: Record<string, Order>; playing: boolean; rule: RuleId; onClose: () => void };

export default function TacticsPanel({battle, orders, playing, rule, onClose}: Props) {
  const completed = completeOrders(battle, Object.values(orders));
  const sequence = battle.allies.filter(u => u.hp > 0)
    .map(unit => ({unit, order: completed.find(o => o.key === unit.key)}))
    .map(value => ({...value, skill: value.order ? battleSkill(value.unit.monster, value.order.skill) : undefined}))
    .sort((a, b) => (b.skill?.priority ?? 0) - (a.skill?.priority ?? 0) || speedFor(b.unit, battle.turn) - speedFor(a.unit, battle.turn));
  return <div className="overlay" onClick={onClose}>
    <section className="modal tacticsModal" role="dialog" aria-modal="true" aria-label="対戦の作戦情報" onClick={e => e.stopPropagation()}>
      <button className="close" aria-label="作戦情報を閉じる" onClick={onClose}>×</button>
      <h2>作戦と行動順</h2>
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
      {[{ label: '味方', friends: battle.allies }, { label: '敵', friends: battle.enemies }].map(({ label, friends }) => {
        const core = friends.find(unit => unit.monster.id === MATERIAL_CORE_ID);
        if (!core && !friends.some(unit => unit.monster.family === 'material')) return null;
        return <p className="counterGuide materialTactics" key={label}><strong>{label}の炉心の修復：</strong>{!core ? '中核なし' : core.hp <= 0 ? '中核が戦闘不能・発動なし' : core.repairReady === undefined ? '条件未成立' : core.repairReady ? '修復待ち・1T末の毒後' : '発動済み、または解除済み'}。対象は生存する物質系のみ。開戦時にタロスを含む物質系3体以上が必要です。</p>;
      })}
      {[{ label: '味方', friends: battle.allies }, { label: '敵', friends: battle.enemies }].map(({ label, friends }) => {
        const core = friends.find(unit => unit.monster.id === SLIME_CORE_ID);
        if (!core && !friends.some(unit => unit.monster.family === 'slime')) return null;
        return <p className="counterGuide slimeTactics" key={label}><strong>{label}の蓄え分け：</strong>{!core ? '中核なし' : core.hp <= 0 ? '中核が戦闘不能・使用不可' : core.supplyReady === undefined ? '条件未成立' : !core.supplyReady ? '使用済み・残0回' : friends.some(unit => unit.hp > 0 && unit.monster.family === 'slime' && unit.mp < unit.monster.mp) ? '残1回・使用可能' : '残1回・対象のMPが全員満タン'}。開戦時にうつろ泉を含む粘体系3体以上が必要。生存する味方粘体系のみが対象です。</p>;
      })}
      {([['味方', battle.allies], ['敵', battle.enemies]] as const).map(([label, units]) => {
        const core = units.find(unit => unit.monster.id === DEMON_CORE_ID);
        return core ? <p className="counterGuide" key={`pressure-${label}`}>{label}の空勘の爪：MP削り{mpDamageFor(core, core.monster.skills[0]!)} · {core.mpDamageBonus ? '開戦時の悪魔3体条件成立' : '条件未成立'}。{core.hp <= 0 ? '本人は戦闘不能。' : 'HP命中後の生存相手が対象。守り・自然障壁で軽減。'}</p> : null;
      })}
      {([{label: '味方', units: battle.allies, targets: battle.enemies}, {label: '敵', units: battle.enemies, targets: battle.allies}]).map(({label, units, targets}) => {
        const core = units.find(unit => unit.monster.id === UNDEAD_CORE_ID);
        if (!core) return null;
        const skill = core.monster.skills[0]!;
        return <div className="counterGuide undeadTactics" key={`cashout-${label}`}><strong>{label}の毒交換：残り毒で一撃を強化 · {core.poisonCashoutBonus ? '開戦時の不死3体条件成立' : '条件未成立'}</strong><p>ドラウグルだけが使用。{core.hp <= 0 ? '本人は戦闘不能' : canUseSkill(core, skill, units) ? `現在MP ${core.mp}・使用可能` : `現在MP ${core.mp}・MP不足`}。MP18と通常順の一手を使い、命中時に毒を全消費します。</p>{targets.filter(unit => unit.hp > 0).map(target => <small key={target.key}>{target.monster.name}：{poisonCashoutHint(core, skill, target)}</small>)}</div>;
      })}
      {([{ label: '味方', friends: battle.allies }, { label: '敵', friends: battle.enemies }]).map(({ label, friends }) => {
        const core = friends.find(unit => unit.monster.id === EXTRAORDINARY_CORE_ID);
        if (!core) return null;
        return <div className="counterGuide extraordinaryTactics" key={`response-${label}`}><strong>{label}の門口の応答：所属系統{assignedFamilyCount(friends)}種類 · {core.hp <= 0 ? '本人が戦闘不能' : core.responseReady === undefined ? '開戦時の条件未成立' : core.responseReady ? '共通の残1回' : '共通の使用済み・残0回'}</strong><p>現在MP {core.mp} / 必要24 · 毒のある生存者{friends.filter(unit => unit.hp > 0 && unit.poison > 0).length}体 · 生存対象{friends.filter(unit => unit.hp > 0).length}体。先頭以外でも有効、条件は開戦時固定です。</p>{core.monster.skills.slice(0, 2).map(skill => <small key={skill.name}>{skill.name}：{skillUnavailableReason(core, skill, friends) ? skillUnavailableLabel(skillUnavailableReason(core, skill, friends)!) : '使用可能'} · {skillOrderLabel(skill)}</small>)}<small>対象：{friends.filter(unit => unit.hp > 0).map(unit => unit.monster.name).join('・') || 'なし'}。清めは現在毒のみ・HP回復0、扉は今ターンの守りだけ。</small></div>;
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
          <strong>{skill.name}<span className={`skillMp ${unit.hp > 0 && !canUseSkill(unit, skill, battle.enemies) ? 'insufficient' : ''}`}>MP {skill.mpCost}{unit.hp > 0 && !canUseSkill(unit, skill, battle.enemies) ? ` · ${skillUnavailableLabel(skillUnavailableReason(unit, skill, battle.enemies)!)}` : ''}</span></strong>
          <small>{skillOrderLabel(skill)} · {skill.poisonCashout ? poisonCashoutHint(unit, skill) : skill.mpDamage ? `単体攻撃＋相手MP−${mpDamageFor(unit, skill)}（守り・自然障壁で軽減）` : skill.kind === 'responseCleanse' ? '生存する味方全員の現在毒だけ解除・HP回復0・共通1回' : skill.kind === 'responseGuard' ? '生存する味方全員に守り:今T・共通1回' : skill.kind === 'restoreMp' ? `生存する味方粘体系へMP+${SLIME_SUPPLY.amount}・戦闘中1回` : skill.kind === 'protect' ? '味方を守る' : skill.kind === 'cleanse' ? '毒解除＋回復' : skill.randomHits ? `ランダム${barrageHits(skill, battle.enemies)}回${skill.breaksGuardAfterHit ? '・命中後に守り/群気/自然障壁/竜気/修復待ち解除' : skill.familyBonusHit ? '・獣5体なら追撃' : ''}` : skill.breaksGuard ? '命中前に守り/自然障壁/竜気/修復待ち解除' : skill.kind === 'heal' ? '回復' : skill.kind === 'guard' ? '防御' : skill.kind === 'poison' ? poisonSkillDetail(skill, unit) : skill.fixedDamage ? `${skill.all ? '全体' : '単体'}・${fixedDamageHint(skill, unit)}${skill.dragonChargeFinisher ? '・発動時に全消費' : ''}` : skill.all ? '全体攻撃' : '単体攻撃'}</small>
        </p>)}</div>
      </details>)}</div>
      <h3>MPと効果のタイミング</h3>
      <p className="counterGuide">MPは特技の発動時に消費。指示の選択・取消では消費しません。戦闘中の自然回復はなく、再戦を含む対戦開始時に全回復します。MPが足りないときは「たたかう」「ぼうぎょ」が使えます。</p>
      <p className="counterGuide">「守り:今T」はこのターンの終了まで有効。「毒:残N回」は残りのダメージ回数です。{POISON_TIMING_HINT}</p>
      <p className="counterGuide">「自然障壁:残NT」は直接ダメージを{NATURE_WARD_PERCENT}%軽減し、ターン終了に残りが1減ります。守りと重ねても半減まで。玄武が倒れても残り期間は続き、毒は防げません。防御解除は命中前、フェンリルの連牙は命中後に自然障壁を消します。</p>
      <p className="counterGuide">竜気は中核だけが持つ0〜{DRAGON_CHARGE_CAP}の資源。味方の竜系がMPを払う攻撃特技を使い終えるたび+1で、連撃も1回分です。通常攻撃・支援・毒・渇天の息では増えません。開始時の人数条件は仲間が倒れても維持されます。渇天の息は発動時に全消費し、蓄えが多いほど息が強まります。先に動いた味方が溜めた分も使えます。</p>
      <p className="counterGuide">竜気を消すには、通常の防御解除を命中前に当てるか、フェンリルの連牙を命中させます（命中後に解除）。解除後は再蓄積できます。中核を倒せば竜気も消え、以後は溜まりません。アンカーの息に合わせて守護・防御を使う対策もあります。</p>
      <p className="counterGuide">固定基礎の攻撃は攻撃力・群気・全体半減に依存しません。乱数±10%と守り・自然障壁は適用されます。ケツァルコアトルの嵐の息吹は従来どおり攻撃力を使い、全体半減も適用されます。防御力・賢さ・属性相性は未導入です。</p>
      <p className="counterGuide">炉心の修復は1ターン目終了時、両軍の毒ダメージ後に一度だけ。タロスが生存し修復待ちなら、生存する物質系を最大HPに応じて傷を少し修復します。MP・行動を使わず、戦闘不能の仲間は戻りません。通常の防御解除は命中前、フェンリルは命中後に修復待ちを消します。中核を倒す、毒で回復前に倒す、解除を当てる対策があります。</p>
      <p className="counterGuide">蓄え分けは通常順の行動を1回使い、生存する味方粘体系へ各MP+{SLIME_SUPPLY.amount}（最大MPまで）。本人も対象です。戦闘中1回だけで、指示・取消では回数を使わず、発動時に消費します。全員満タンでは選べません。HP回復・蘇生・毒解除はしません。回数は防御解除で消えず、中核の撃破で失います。先制で傷ついた仲間を倒す、守護を強いて手番とMPを使わせる対策があります。</p>
      <p className="counterGuide">空勘の爪はHP命中後、生存した相手のMPを削ります。MP回復ではありません。受理済みの特技が敵のMP削りで発動前に不足すると、元の行動順で通常攻撃に切り替わり、余分な一手は発生しません。実際に先行したMP補給で足りれば元の特技を使います。指示時に不足している特技は予約できません。MP0でも通常攻撃・防御は可能です。</p>
      <p className="counterGuide">毒交換は今後の毒ダメージを失う代わりに、単体攻撃の基礎へ追加します。追加分も乱数・守り・自然障壁の対象。毒0なら追加0で、HP回復・MP獲得・追加行動はありません。ドラウグルを含む開戦時の不死系3体条件は先頭以外でも有効で、仲間の撃破で変わりません。仲間の攻撃には追加されません。</p>
      <p className="counterGuide">対策は、毒役や中核を先に倒す、命中前に清める、守護・防御で受ける、MP削りで特技を通常攻撃へ切り替えさせること。清めが毒付与より先なら、後からの毒を予防しません。毒消費後に別の有料毒技が当たれば残3へ再付与されます。</p>
      <p className="counterGuide">門口の応答は二つで共通の1回。MP24と回数は有効な発動時に消費し、毒解除・守りは命中時に反映します。選択・取消・実行時に変化なし・MP不足で通常攻撃へ切替の場合は回数を使いません。先に毒を清めても再付与を予防せず、守りは毒を減らさずターン末で消えます。通常の解除が通り、自然障壁とは強い軽減だけが有効。集中攻撃やMP削りで中核の応答を阻めます。本人の無料防御は共通回数とは別で、ヤヌスは粘体専用MP補給を受けません。</p>
      <h3>読み合いのヒント</h3>
      <p className="counterGuide">自然障壁と毒の混成には、編成画面の「物質系の反攻」「悪魔系のMP圧力」も試せます。玄武の障壁は自然系だけ。ねりこぶしなど対象外の仲間も、現在HPと状態を見て攻撃先を選びます。清めを繰り返すだけでなく、守護で手番をつなぎ、単体攻撃や解除を使い分けましょう。</p>
      <p className="counterGuide">毒は同時に重ねても継続ダメージが増えません。{(battle.reservePoison ?? DEFAULT_RESERVE_POISON) ? '自動指示は同じターンの重複予定を控えますが、予定した仲間が先に倒れる場合もあります。' : 'この対戦の自動指示は、同じターンの他の毒の予定を考慮しません。'}相手の残りMPや行動順を見て、手動で合法な指示へ変えられます。</p>
      <p className="counterGuide">フェンリルの連牙は敵を毎回抽選。守りは命中後に解除するため、最初の一撃は半減。先制技で先に倒す・回復で粘る・防御で初撃をしのぐ選択があります。</p>
      <p className="counterGuide">速い攻撃には「味方を守る」。守りを固める相手には「防御解除」。毒を受けたら「毒解除＋回復」。守護と防御の直接ダメージ軽減は重なりません。毒の継続ダメージは軽減できません。どれも1回の行動を使います。</p>
    </section>
  </div>;
}
