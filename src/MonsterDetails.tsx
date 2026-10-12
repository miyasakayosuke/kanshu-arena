import MonsterArt from './MonsterArt';
import { useEffect, useRef } from 'react';
import { monsters, EXTRAORDINARY_CORE_ID, UNDEAD_CORE_ID, UNDEAD_CASHOUT, DEMON_CORE_ID, DEMON_PRESSURE, SLIME_CORE_ID, SLIME_SUPPLY, MATERIAL_CORE_ID, MATERIAL_REPAIR_PERCENT, DRAGON_CORE_ID, DRAGON_CHARGE_CAP, DRAGON_CHARGE_PER_POINT, NATURE_WARD_PERCENT, familyLabel, leaderFor, skillOrderLabel, type Skill } from './engine';
import { fixedDamageHint, monsterLore, monsterRole, skillLore } from './strategy';

import { poisonSkillDetail } from './poisonDescription';

const skillHint = (skill: Skill) => `MP ${skill.mpCost} · ${skillOrderLabel(skill)} · ${skill.kind === 'poison' ? poisonSkillDetail(skill) : skill.kind === 'responseCleanse' ? '生存する味方全員の現在の毒だけ解除・HP回復0・両技で共通1回' : skill.kind === 'responseGuard' ? '生存する味方全員を守る・今ターン直接ダメージ半減・両技で共通1回' : skill.kind === 'restoreMp' ? `生存する味方粘体系へMP+${SLIME_SUPPLY.amount}・戦闘中1回・通常の行動を使用` : skill.kind === 'heal' ? '味方1体を回復' : skill.kind === 'cleanse' ? '味方1体の毒解除＋回復' : skill.kind === 'protect' ? '味方1体を守る・今ターン直接ダメージ半減' : skill.kind === 'guard' ? '自分を守る・今ターン直接ダメージ半減' : skill.randomHits ? `敵ランダム${skill.randomHits}回（対象指定なし）` : skill.all ? '敵全体' : '敵1体'}${skill.poisonCashout ? ` · 命中時の毒残0〜3回×${UNDEAD_CASHOUT.base}（不死3体で${UNDEAD_CASHOUT.base + UNDEAD_CASHOUT.bonus}）を基礎へ追加し、毒を全消費。追加分も乱数・守り・自然障壁の対象` : ''}${skill.mpDamage ? ` · 命中後、生存する相手のMPを${skill.mpDamage}削る（悪魔3体の条件成立で${skill.mpDamage + DEMON_PRESSURE.bonus}）。守り・自然障壁で軽減、自己回復なし` : ''}${skill.familyBonusHit ? ' · 開戦時の5体すべてが獣系なら+1回（合計4回）。戦闘不能でも条件は変わらない' : ''}${skill.breaksGuard ? ' · 命中前に防御・守護・自然障壁・竜気・修復待ちを解除して攻撃' : ''}${skill.breaksGuardAfterHit ? ` · 各命中の後に守り（防御・守護）・群気・自然障壁・竜気・修復待ちを解除。守り中の初撃は半減、自然障壁だけなら${NATURE_WARD_PERCENT}%軽減` : ''}`;

/** All entry points inspect the same read-only profile; editing belongs to the five slots. */
export default function MonsterDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const monster = monsters[id];
  const role = monsterRole(id);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus({ preventScroll: true }); };
  }, []);
  return <div className="overlay" onClick={onClose}><section ref={dialog} className="modal profileModal" role="dialog" aria-modal="true" aria-label={`${monster.name}の詳細`} onClick={event => event.stopPropagation()} onKeyDown={event => {
    if (event.defaultPrevented) return;
    // Own dismissal before it can reach the catalog or other page-level handlers.
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex]') ?? [])].filter(element => {
      if (element.matches(':disabled') || (element.hasAttribute('tabindex') && element.tabIndex < 0)) return false;
      for (let ancestor: HTMLElement | null = element; ancestor && ancestor !== dialog.current; ancestor = ancestor.parentElement) {
        if (ancestor.hidden || ancestor.hasAttribute('inert')) return false;
        // A closed disclosure exposes only its summary, not its other descendants.
        if (ancestor instanceof HTMLDetailsElement && !ancestor.open && !ancestor.querySelector(':scope > summary')?.contains(element)) return false;
      }
      return true;
    });
    if (!controls.length) return;
    event.preventDefault();
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus();
  }}>
    <div className="profileHeader"><strong>{monster.name}の詳細</strong><button ref={close} className="close" aria-label="詳細を閉じる" onClick={onClose}>×</button></div>
    <div className="profileBody">
    <div className="profileHeading"><span className="heroIcon"><MonsterArt monster={monster} /></span><div><span className="eyebrow">MONSTER PROFILE · COST {monster.cost}</span><h2>{monster.id === 12 ? <><small className="profileEpithet">破縛の魔狼</small>フェンリル</> : monster.name}</h2><span className="familyTag">{familyLabel(monster)}</span><small>閲覧のみ · 入れ替えは編成の枠から</small></div></div>
    <div className="roleBrief"><strong>{role.name}</strong><p>{role.strength}</p><small>{role.tradeoff}</small></div>
    <div className="leaderBanner"><span>リーダー効果 · {leaderFor(id).name}</span><small>{leaderFor(id).description}</small></div>
    {monster.id === 12 && <p className="familyExplanation">獣系は本作の哺乳類モチーフの分類です。リーダー効果は先頭にいる時だけ。さらに編成中は「群れの遠吠え」が開幕に一度だけ発動し、味方の獣系へ攻撃/素早さ+5%の群気を2ターン付与。素早さが行動順へ反映されるのは2ターン目。重複せず、連牙で解除可能。獣系以外にはかかりません。先制で狙われると脆く、MP60で連牙は4回まで。連牙は自然障壁・竜気・修復待ちも命中後に解除します。リーダー効果や毒は解除しません。</p>}
    {monster.id === 13 && <p className="familyExplanation">低コストの獣系アタッカー。木の実の連弾は敵ランダム3回、開戦時の5体すべてが獣系なら4回に増えます。戦闘不能の仲間も条件に数え、途中で回数条件は変わりません。HPが低く、回復・守護は持ちません。枝渡りの一突きは相手を選べる先制攻撃です。</p>}
    {monster.id === 14 && <p className="familyExplanation">自然系は本作独自の分類です。先頭なら自然系だけ最大HP+15%。先頭以外でも「森羅の甲羅」が開幕に一度だけ発動し、自然系へ自然障壁を2ターン付与。直接ダメージを{NATURE_WARD_PERCENT}%軽減し、防御・守護と重なった時は強い軽減だけが有効です。毒の継続ダメージは軽減しません。破城の拳・冥府の断罪は命中前、破縛の連牙は各命中後に解除。解除後の再付与はなく、リーダー効果は残ります。</p>}
    {monster.family === 'dragon' && <p className="familyExplanation">竜系は本作の編成用分類です。ヴリトラを含む竜系3体以上で開戦すると「竜気」が有効。先頭でなくてもよく、仲間が倒れても開始時の条件は変わりません。MPを払う竜系の攻撃特技が終わるたび、生存するヴリトラへ+1。連撃も1回分で、通常攻撃・回復・守護・毒・渇天の息は蓄積対象外です。</p>}
    {monster.id === DRAGON_CORE_ID && <p className="familyExplanation dragonExplanation">竜気は0〜{DRAGON_CHARGE_CAP}。渇天の息は発動時にMPを払い、竜気を全消費し、1体あたりの固定基礎に竜気1につき{DRAGON_CHARGE_PER_POINT}を加えます。指示した時点では消費せず、先に動く仲間の攻撃も加算できます。条件未成立でも息は使えますが蓄積はできません。防御解除は命中前、フェンリルは命中後に竜気を0に戻します。解除後は再び溜められますが、本人の戦闘不能後は増えません。</p>}
    {monster.family === 'material' && <p className="familyExplanation">物質系は本作で道具・建造物・金属製の造物をまとめた編成用分類です。タロスを含む物質系3体以上で開戦すると「炉心の修復」が有効。タロスは先頭以外でもよく、途中で仲間が倒れても開始時の条件は変わりません。</p>}
    {monster.id === MATERIAL_CORE_ID && <p className="familyExplanation materialExplanation">1ターン目の終了時、両軍の毒ダメージを受けた後に一度だけ判定。本人が生存し「修復待ち」が残っていれば、生存する味方の物質系を各最大HPの{MATERIAL_REPAIR_PERCENT}%回復します。小数点以下は切り捨て、最大HPまで。MPも行動も使わず、蘇生ではありません。防御解除は命中前、フェンリルの連牙は命中後に修復待ちを消します。戦闘不能でも失い、再付与や2ターン目の再発動はありません。</p>}
    {monster.id === EXTRAORDINARY_CORE_ID && <p className="familyExplanation extraordinaryExplanation">ヤヌスを含む所属系統4種類以上で開戦すると、門口の応答を共通で1回使えます。重複・未所属は数えず、5種類でも追加効果はありません。先頭以外でも有効で、開始時の条件は仲間の戦闘不能で変わりません。境目の清めは現在の毒だけを除去し、HP回復0・予防なし。合流の扉は今ターンの既存の守りを付け、自然障壁とは強い方だけ。どちらも生存する味方全員が対象で、MP24と通常の一手を使います。二つを一回ずつ使うことはできません。毒のある生存味方がいない清め、全員守り中の扉は使えず、実行時も変化がなければMPと回数は使いません。MP削りによる通常攻撃への切替でも回数を残します。門番の構えは無料の本人防御で共通回数とは独立。本人撃破で回数を失い、防御解除では消えません。蘇生・全快・MP回復はなく、粘体専用補給の対象外です。分類は本作の編成用で、宗教上の優劣を表しません。</p>}
    {monster.family === 'undead'  && <p className="familyExplanation">不死系は本作の編成用分類です。バンシーも参加し、従来の能力値・特技は変わりません。伝承の共通の系譜や、死亡後に行動できる能力を表しません。</p>}
    {monster.id === UNDEAD_CORE_ID && <p className="familyExplanation undeadExplanation">塚底の取り立てはMP18の指定単体攻撃。実際の命中時に相手の毒残0〜3回を読み、1回につき基礎14を追加して毒を全消費します。自身を含む不死系3体以上で開戦すると22になり、先頭以外でも有効。開始時の条件は戦闘不能や防御解除で変わりません。毒を残した場合の最大HP6%×残回数の経過ダメージを捨てる選択です。毒0でも使用可能ですが追加0。MP62で補給なしなら最大3回、残りMP8です。毒交換にHP回復・MP獲得・追加行動はありません。清めで先に毒を消す、守護・防御で追加分ごと軽減する、中核のMPを削る対策が有効。後から別の毒技が当たれば新しく残3になります。</p>}
    {monster.family === 'demon' && <p className="familyExplanation">悪魔系は異界の巨人・精霊・幻をまとめた本作のゲーム分類です。宗教上の分類を主張するものではありません。トロルとイフリートもこの編成に参加し、従来の能力・技は変わりません。</p>}
    {monster.id === DEMON_CORE_ID && <p className="familyExplanation demonExplanation">空勘の爪はMP16を使う単体攻撃。HPへの一撃後、相手が生き残っていればMPを6削ります。自身を含む悪魔系3体以上で開戦すると10になり、先頭以外でも有効です。開始時の条件は戦闘不能や防御解除で変わりません。守りならMP削りも半減し、自然障壁も有効。相手の現在MPを超えて減らさず、本人へは戻りません。受理済みの特技が敵のMP削りで不足すると、元の行動順で通常攻撃に切り替わります。相手を完全に行動不能にはできません。</p>}
    {monster.family === 'slime'  && <p className="familyExplanation">粘体系は形を変える流体の仲間という本作の分類。5体の名称・設定は本作用の創作です。うつろ泉を含む粘体系3体以上で開戦すると、本人に補給1回が備わります。先頭以外でも有効で、味方が倒れても開始時の条件は変わりません。リーダーの最大MP補正は先頭にいる時だけです。</p>}
    {monster.id === SLIME_CORE_ID && <p className="familyExplanation slimeExplanation">先頭なら味方粘体系の最大MP・開戦時MP+10%。自然回復はありません。蓄え分けは通常順の行動を使い、生存する味方粘体系へ各MP+{SLIME_SUPPLY.amount}、最大MPまで戻します。本人も対象で、戦闘中1回だけ。全員満タンなら使えず、指示・取消でも回数は減りません。発動時に回数を使い、HP回復・毒解除・蘇生はしません。補給回数は防御解除で消えませんが、本人が倒れると失います。攻撃を止めて補給する手番を選ぶ中核です。</p>}
    {monster.skills.some(skill => skill.fixedDamage) && <p className="familyExplanation fixedBasisExplanation">「固定基礎」の攻撃は攻撃力・群気に依存せず、全体攻撃の半減補正も受けません。最終ダメージは乱数±10%と守り・自然障壁で変わります。守りの半減や自然障壁の軽減は有効です。</p>}
    {monster.id === 5 && <p className="familyExplanation legacyBreathExplanation">嵐の息吹は従来の攻撃力を使う計算を維持しています。威力に補正後攻撃力の38%を加え、全体攻撃は半分が基礎です。技名が「息」でも固定基礎にはならず、「固定基礎」と明記された技だけが別の計算です。</p>}
    <h3>特技の使いどころ</h3>{monster.skills.map(skill => <div className="skill" key={skill.name}><strong>{skill.name}</strong><small>{skillHint(skill)}{skill.kind === 'poison' ? '' : skill.fixedDamage ? ` · ${fixedDamageHint(skill)}${skill.dragonChargeFinisher ? ' · 発動時に竜気を全消費' : ''}` : skill.randomHits ? ` · 1発は${skill.power ? `威力${skill.power}＋` : ''}補正後攻撃力の38%が基準（乱数±10%）` : skill.power > 0 ? ` · ${skill.kind === 'restoreMp' ? 'MP補給' : skill.kind === 'heal' || skill.kind === 'cleanse' ? '回復' : '威力'}${skill.power}` : ''}</small></div>)}
    <details className="profileBackground"><summary>能力値と物語</summary><h3>基礎能力（リーダー補正前）</h3><div className="stats">{[['HP', monster.hp], ['MP', monster.mp], ['攻撃', monster.atk], ['素早さ', monster.speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>{(monster.id === 12 || monster.id === 14 || monster.family === 'dragon' || monster.family === 'material' || monster.family === 'slime' || monster.family === 'demon' || monster.family === 'undead' || monster.family === 'extraordinary') && <p className="hint">防御力・賢さ・属性相性は現在の戦闘では未導入。耐久はHPと守りで表現しています。</p>}<p className="monsterLore">{monsterLore(id)}</p>{monster.skills.map(skill => <p className="skillLore" key={skill.name}><strong>{skill.name}</strong> · {skillLore(skill.name)}</p>)}</details>
    <button className="secondary closeProfile" onClick={onClose}>閉じて戻る</button>
    </div>
  </section></div>;
}
