import MonsterArt from './MonsterArt';
import { useEffect, useRef } from 'react';
import { monsters, DRAGON_CORE_ID, DRAGON_CHARGE_CAP, DRAGON_CHARGE_PER_POINT, NATURE_WARD_PERCENT, familyLabel, leaderFor, skillOrderLabel, type Skill } from './engine';
import { fixedDamageHint, monsterLore, monsterRole, skillLore } from './strategy';

const skillHint = (skill: Skill) => `MP ${skill.mpCost} · ${skillOrderLabel(skill)} · ${skill.kind === 'heal' ? '味方1体を回復' : skill.kind === 'cleanse' ? '味方1体の毒解除＋回復' : skill.kind === 'protect' ? '味方1体を守る・今ターン直接ダメージ半減' : skill.kind === 'guard' ? '自分を守る・今ターン直接ダメージ半減' : skill.randomHits ? `敵ランダム${skill.randomHits}回（対象指定なし）` : skill.all ? '敵全体' : '敵1体'}${skill.kind === 'poison' ? ' · 毒はターン終了時に3回（付与したターンを含む）' : ''}${skill.familyBonusHit ? ' · 開戦時の5体すべてが獣系なら+1回（合計4回）。戦闘不能でも条件は変わらない' : ''}${skill.breaksGuard ? ' · 命中前に防御・守護・自然障壁・竜気を解除して攻撃' : ''}${skill.breaksGuardAfterHit ? ` · 各命中の後に守り（防御・守護）・群気・自然障壁・竜気を解除。守り中の初撃は半減、自然障壁だけなら${NATURE_WARD_PERCENT}%軽減` : ''}`;

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
    <button ref={close} className="close" aria-label="詳細を閉じる" onClick={onClose}>×</button>
    <div className="profileHeading"><span className="heroIcon"><MonsterArt monster={monster} /></span><div><span className="eyebrow">MONSTER PROFILE · COST {monster.cost}</span><h2>{monster.id === 12 ? <><small className="profileEpithet">破縛の魔狼</small>フェンリル</> : monster.name}</h2><span className="familyTag">{familyLabel(monster)}</span><small>閲覧のみ · 入れ替えは編成の枠から</small></div></div>
    <div className="roleBrief"><strong>{role.name}</strong><p>{role.strength}</p><small>{role.tradeoff}</small></div>
    <div className="leaderBanner"><span>リーダー効果 · {leaderFor(id).name}</span><small>{leaderFor(id).description}</small></div>
    {monster.id === 12 && <p className="familyExplanation">獣系は本作の哺乳類モチーフの分類です。リーダー効果は先頭にいる時だけ。さらに編成中は「群れの遠吠え」が開幕に一度だけ発動し、味方の獣系へ攻撃/素早さ+5%の群気を2ターン付与。素早さが行動順へ反映されるのは2ターン目。重複せず、連牙で解除可能。獣系以外にはかかりません。先制で狙われると脆く、MP60で連牙は4回まで。連牙は自然障壁と竜気も命中後に解除します。リーダー効果や毒は解除しません。</p>}
    {monster.id === 13 && <p className="familyExplanation">低コストの獣系アタッカー。木の実の連弾は敵ランダム3回、開戦時の5体すべてが獣系なら4回に増えます。戦闘不能の仲間も条件に数え、途中で回数条件は変わりません。HPが低く、回復・守護は持ちません。枝渡りの一突きは相手を選べる先制攻撃です。</p>}
    {monster.id === 14 && <p className="familyExplanation">自然系は本作独自の分類です。先頭なら自然系だけ最大HP+15%。先頭以外でも「森羅の甲羅」が開幕に一度だけ発動し、自然系へ自然障壁を2ターン付与。直接ダメージを{NATURE_WARD_PERCENT}%軽減し、防御・守護と重なった時は強い軽減だけが有効です。毒の継続ダメージは軽減しません。破城の拳・冥府の断罪は命中前、破縛の連牙は各命中後に解除。解除後の再付与はなく、リーダー効果は残ります。</p>}
    {monster.family === 'dragon' && <p className="familyExplanation">竜系は本作の編成用分類です。ヴリトラを含む竜系3体以上で開戦すると「竜気」が有効。先頭でなくてもよく、仲間が倒れても開始時の条件は変わりません。MPを払う竜系の攻撃特技が終わるたび、生存するヴリトラへ+1。連撃も1回分で、通常攻撃・回復・守護・毒・渇天の息は蓄積対象外です。</p>}
    {monster.id === DRAGON_CORE_ID && <p className="familyExplanation dragonExplanation">竜気は0〜{DRAGON_CHARGE_CAP}。渇天の息は発動時にMPを払い、竜気を全消費し、1体あたりの固定基礎に竜気1につき{DRAGON_CHARGE_PER_POINT}を加えます。指示した時点では消費せず、先に動く仲間の攻撃も加算できます。条件未成立でも息は使えますが蓄積はできません。防御解除は命中前、フェンリルは命中後に竜気を0に戻します。解除後は再び溜められますが、本人の戦闘不能後は増えません。</p>}
    {monster.skills.some(skill => skill.fixedDamage) && <p className="familyExplanation fixedBasisExplanation">「固定基礎」の息は攻撃力・群気に依存せず、全体攻撃の半減補正も受けません。最終ダメージは乱数±10%と守り・自然障壁で変わります。守りの半減や自然障壁の軽減は有効です。</p>}
    {monster.id === 5 && <p className="familyExplanation legacyBreathExplanation">嵐の息吹は従来の攻撃力を使う計算を維持しています。威力に補正後攻撃力の38%を加え、全体攻撃は半分が基礎です。技名が「息」でも固定基礎にはならず、「固定基礎」と明記された新しい息だけが別の計算です。</p>}
    <h3>特技の使いどころ</h3>{monster.skills.map(skill => <div className="skill" key={skill.name}><strong>{skill.name}</strong><small>{skillHint(skill)}{skill.fixedDamage ? ` · ${fixedDamageHint(skill)}${skill.dragonChargeFinisher ? ' · 発動時に竜気を全消費' : ''}` : skill.randomHits ? ` · 1発は${skill.power ? `威力${skill.power}＋` : ''}補正後攻撃力の38%が基準（乱数±10%）` : skill.power > 0 ? ` · ${skill.kind === 'heal' || skill.kind === 'cleanse' ? '回復' : '威力'}${skill.power}` : ''}</small></div>)}
    <details className="profileBackground"><summary>能力値と物語</summary><h3>基礎能力（リーダー補正前）</h3><div className="stats">{[['HP', monster.hp], ['MP', monster.mp], ['攻撃', monster.atk], ['素早さ', monster.speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>{(monster.id === 12 || monster.id === 14 || monster.family === 'dragon') && <p className="hint">防御力・賢さ・属性相性は現在の戦闘では未導入。耐久はHPと守りで表現しています。</p>}<p className="monsterLore">{monsterLore(id)}</p>{monster.skills.map(skill => <p className="skillLore" key={skill.name}><strong>{skill.name}</strong> · {skillLore(skill.name)}</p>)}</details>
    <button className="secondary closeProfile" onClick={onClose}>閉じて戻る</button>
  </section></div>;
}
