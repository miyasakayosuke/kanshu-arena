import { useEffect, useRef } from 'react';
import { monsters, leaderFor, skillOrderLabel, type Skill } from './engine';
import { monsterLore, monsterRole, skillLore } from './strategy';

const skillHint = (skill: Skill) => `MP ${skill.mpCost} · ${skillOrderLabel(skill)} · ${skill.kind === 'heal' ? '味方1体を回復' : skill.kind === 'cleanse' ? '味方1体の毒解除＋回復' : skill.kind === 'protect' ? '味方1体を守る・今ターン直接ダメージ半減' : skill.kind === 'guard' ? '自分を守る・今ターン直接ダメージ半減' : skill.all ? '敵全体' : '敵1体'}${skill.kind === 'poison' ? ' · 毒はターン終了時に3回（付与したターンを含む）' : ''}${skill.breaksGuard ? ' · 防御を解除して攻撃' : ''}`;

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
    <div className="profileHeading"><span className="heroIcon">{monster.icon}</span><div><span className="eyebrow">MONSTER PROFILE · COST {monster.cost}</span><h2>{monster.name}</h2><small>閲覧のみ · 入れ替えは編成の枠から</small></div></div>
    <div className="roleBrief"><strong>{role.name}</strong><p>{role.strength}</p><small>{role.tradeoff}</small></div>
    <div className="leaderBanner"><span>リーダー効果 · {leaderFor(id).name}</span><small>{leaderFor(id).description}</small></div>
    <h3>特技の使いどころ</h3>{monster.skills.map(skill => <div className="skill" key={skill.name}><strong>{skill.name}</strong><small>{skillHint(skill)}{skill.power > 0 ? ` · ${skill.kind === 'heal' || skill.kind === 'cleanse' ? '回復' : '威力'}${skill.power}` : ''}</small></div>)}
    <details className="profileBackground"><summary>能力値と物語</summary><h3>基礎能力（リーダー補正前）</h3><div className="stats">{[['HP', monster.hp], ['MP', monster.mp], ['攻撃', monster.atk], ['素早さ', monster.speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div><p className="monsterLore">{monsterLore(id)}</p>{monster.skills.map(skill => <p className="skillLore" key={skill.name}><strong>{skill.name}</strong> · {skillLore(skill.name)}</p>)}</details>
    <button className="secondary closeProfile" onClick={onClose}>閉じて戻る</button>
  </section></div>;
}
