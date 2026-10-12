import './catalog.css';
import './monsterDetails.css';
import CatalogArt from './CatalogArt';
import MythVignetteEntry from './MythVignetteEntry';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { monsters, familyLabel, leaderFor } from './engine';
import { monsterStory } from './monsterLore';
import { detailRules, detailTextPages, skillDetail, skillLore } from './monsterDetailContent';

const TABS = [{ id: 'appearance', label: '姿' }, { id: 'story', label: '物語' }, { id: 'abilities', label: '能力' }, { id: 'skills', label: '特技' }] as const;
type DetailTab = typeof TABS[number]['id'];
type ReadingPage = { title: string; content: ReactNode };

function DetailPages({ pages, label }: { pages: ReadingPage[]; label: string }) {
  const [page, setPage] = useState(0);
  const contentId = useId();
  return <div className="detailPages">
    <div id={contentId} className="detailPageContent" aria-live="polite" aria-atomic="true">{pages.map((entry, index) => <div className="detailPage" key={index} hidden={index !== page}>
      <h3>{entry.title}</h3>{entry.content}
    </div>)}</div>
    {pages.length > 1 && <nav className="detailPager" aria-label={`${label}のページ`}>
      <button type="button" aria-controls={contentId} aria-disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>前へ</button>
      <span aria-live="polite" aria-atomic="true">{page + 1} / {pages.length}</span>
      <button type="button" aria-controls={contentId} aria-disabled={page === pages.length - 1} onClick={() => setPage(value => Math.min(pages.length - 1, value + 1))}>次へ</button>
    </nav>}
  </div>;
}

/** All entry points inspect the same read-only profile; editing belongs to the five slots. */
export default function MonsterDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('appearance');
  const [skillIndex, setSkillIndex] = useState(0);
  const tabPrefix = useId();
  const monster = monsters[id];
  const story = monsterStory(id);
  const rules = detailRules(id);
  const abilityPages: ReadingPage[] = [{ title: '基礎能力（リーダー補正前）', content: <>
    <div className="stats">{[['HP', monster.hp], ['MP', monster.mp], ['攻撃', monster.atk], ['素早さ', monster.speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
    <div className="leaderBanner"><span>リーダー効果 · {leaderFor(id).name}</span><small>{leaderFor(id).description}</small></div>
    <p className="detailMechanicsNote">防御力・賢さ・属性相性は現在の戦闘では未導入。耐久はHPと守りで表現しています。</p>
  </> }, ...rules.flatMap(rule => detailTextPages(rule.text).map(text => ({ title: rule.title, content: <p className={rule.className}>{text}</p> })))];
  useEffect(() => { setActiveTab('appearance'); setSkillIndex(0); }, [id]);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [activeTab, skillIndex]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus({ preventScroll: true }); };
  }, []);
  return <div className="overlay profileOverlay" onClick={onClose}><section ref={dialog} className="modal profileModal profileArtFirst profileTabbed" role="dialog" aria-modal="true" aria-label={`${monster.name}の詳細`} onClick={event => event.stopPropagation()} onKeyDown={event => {
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
    <div className="profileHeader"><strong>No. {String(monster.id + 1).padStart(3, '0')} · {monster.name}</strong><button ref={close} className="close" aria-label="詳細を閉じる" onClick={onClose}>×</button></div>
    <div className="profileTabs" role="tablist" aria-label="モンスター詳細" onKeyDown={event => {
      const index = TABS.findIndex(tab => tab.id === activeTab);
      const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); event.stopPropagation(); setActiveTab(TABS[next].id);
      dialog.current?.querySelector<HTMLElement>(`[data-detail-tab="${TABS[next].id}"]`)?.focus({ preventScroll: true });
    }}>{TABS.map(tab => <button key={tab.id} type="button" role="tab" data-detail-tab={tab.id} id={`${tabPrefix}-${tab.id}-tab`} aria-controls={`${tabPrefix}-${tab.id}-panel`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
    <div ref={body} className="profileBody">
    <section className="profilePanel profileAppearance" id={`${tabPrefix}-appearance-panel`} role="tabpanel" aria-labelledby={`${tabPrefix}-appearance-tab`} hidden={activeTab !== 'appearance'} tabIndex={0}>
      <div className="profileHeading" data-family={monster.family}>
        <span className="heroIcon"><CatalogArt monster={monster} /></span>
        <div className="profileIdentity"><h2>{monster.id === 12 ? <><small className="profileEpithet">破縛の魔狼</small>フェンリル</> : monster.name}</h2><span className="familyTag">{familyLabel(monster)}</span><span className="profileCost">コスト {monster.cost}</span><small className="catalogAccessibleTitle">閲覧のみ · 入れ替えは編成の枠から</small></div>
        <MythVignetteEntry key={id} id={id} />
      </div>
    </section>
    <section className="profilePanel" id={`${tabPrefix}-story-panel`} role="tabpanel" aria-labelledby={`${tabPrefix}-story-tab`} hidden={activeTab !== 'story'} tabIndex={0}>
      <section className="profileStory" aria-label={`${monster.name}のひとことと由来`}>
        <div><span className="storyLabel">ひとこと <small>本作の創作</small></span><p className="monsterLore">{story.flavour}</p></div>
        <div><span className="storyLabel">{story.gameOriginal ? 'ゲームオリジナル' : '伝承'}</span><p className="monsterOrigin">{story.origin}</p>{story.sourceUrl && <a className="loreSource" href={story.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${monster.name}の伝承の出典: ${story.sourceTitle}（新しいタブ）`}>出典<span aria-hidden="true"> ↗</span></a>}</div>
      </section>
    </section>
    <section className="profilePanel" id={`${tabPrefix}-abilities-panel`} role="tabpanel" aria-labelledby={`${tabPrefix}-abilities-tab`} hidden={activeTab !== 'abilities'} tabIndex={0}>
      <DetailPages key={`${id}-abilities`} pages={abilityPages} label="能力" />
    </section>
    <section className="profilePanel" id={`${tabPrefix}-skills-panel`} role="tabpanel" aria-labelledby={`${tabPrefix}-skills-tab`} hidden={activeTab !== 'skills'} tabIndex={0}>
      <div className="detailSkillPicker" aria-label="表示する特技">{monster.skills.map((skill, index) => <button key={skill.name} type="button" aria-pressed={index === skillIndex} onClick={() => setSkillIndex(index)}>{skill.name}</button>)}</div>
      {monster.skills.map((skill, index) => <div className="detailSkillReading skill" key={`${id}-${skill.name}`} hidden={index !== skillIndex}>
        <DetailPages label={skill.name} pages={[
          ...detailTextPages(skillDetail(skill)).map(text => ({ title: skill.name, content: <small className="detailSkillRule">{text}</small> })),
          { title: `${skill.name} · 物語`, content: <p className="skillLore">{skillLore(skill.name)}</p> },
        ]} />
      </div>)}
    </section>
    </div>
  </section></div>;
}
