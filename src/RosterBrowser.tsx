import { useLayoutEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from 'react';
import MonsterArt from './MonsterArt';
import CatalogArt from './CatalogArt';
import { monsters, familyLabel, leaderFor } from './engine';
import { monsterRole } from './strategy';
import { activeFamilyOptions } from './families';
import './teamBuilder.css';

export type RosterFilters = {
  filter: string; role: string; sort: string; leaderFilter: string;
  familyFilter: string; costFilter: string; expanded: boolean;
};
export const createRosterFilters = (): RosterFilters => ({
  filter: '', role: 'all', sort: 'id', leaderFilter: 'all',
  familyFilter: 'all', costFilter: 'all', expanded: false,
});
type Props = {
  gallery?: boolean;
  filters: RosterFilters;
  setFilters: Dispatch<SetStateAction<RosterFilters>>;
  onFocus: (id: number, visibleIds?: number[]) => void;
  scrollPosition?: RefObject<number>;
  editing?: {
    candidateId: number | null;
    unavailableReason: (id: number) => string;
    projectedCost: (id: number) => number;
    budget: number;
    onSelect: (id: number) => void;
  };
};

const roleOptions = [
  ['all', 'すべて'], ['fast', '先制'], ['anchor', 'アンカー'], ['heal', '回復'],
  ['random', 'ランダム連撃'], ['area', '全体'], ['poison', '毒'], ['protect', '味方を守る'],
  ['poisonCashout', '毒交換'], ['mpDamage', 'MP削り'], ['restoreMp', 'MP補給'], ['cleanse', '毒解除'], ['break', '防御解除'], ['guard', '防御'],
];

const familyOptions = activeFamilyOptions(monsters);

/** One roster for both the read-only catalog and explicit team replacements. */
export default function RosterBrowser({ filters, setFilters, onFocus, scrollPosition, editing, gallery = false }: Props) {
  const { filter, role, sort, leaderFilter, familyFilter, costFilter } = filters;
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = list.current;
    if (node && scrollPosition) node.scrollTop = scrollPosition.current;
    return () => { if (node && scrollPosition) scrollPosition.current = node.scrollTop; };
  }, []);
  const update = (patch: Partial<RosterFilters>) => setFilters(previous => ({ ...previous, ...patch }));
  const resetFilters = () => setFilters(previous => ({ ...createRosterFilters(), expanded: previous.expanded }));
  const filterCount = Number(familyFilter !== 'all') + Number(role !== 'all') + Number(leaderFilter !== 'all') + Number(costFilter !== 'all');
  const visible = monsters.filter(m => {
    const trait = leaderFor(m.id);
    const query = filter.trim().toLocaleLowerCase();
    return (!query || `${m.name} ${familyLabel(m)} ${trait.name} ${trait.description} ${m.skills.map(s => s.name).join(' ')}`.toLocaleLowerCase().includes(query))
      && (role === 'all' || m.skills.some(s => role === 'poisonCashout' ? (s.poisonCashout ?? 0) > 0 : role === 'mpDamage' ? (s.mpDamage ?? 0) > 0 : role === 'cleanse' ? (s.kind === 'cleanse' || s.kind === 'responseCleanse') : role === 'protect' ? (s.kind === 'protect' || s.kind === 'responseGuard') : role === 'fast' ? s.priority >= 2 : role === 'anchor' ? s.priority < 0 : role === 'area' ? s.all : role === 'random' ? !!s.randomHits : role === 'break' ? (s.breaksGuard || s.breaksGuardAfterHit) : s.kind === role))
      && (leaderFilter === 'all' || trait.stat === leaderFilter || trait.secondary?.stat === leaderFilter)
      && (familyFilter === 'all' || (m.family ?? 'unassigned') === familyFilter)
      && (costFilter === 'all' || (costFilter === 'fit' ? !(editing?.unavailableReason(m.id) ?? '') : m.cost === Number(costFilter)));
  }).sort((a, b) => sort === 'speed' ? b.speed - a.speed : sort === 'hp' ? b.hp - a.hp : sort === 'atk' ? b.atk - a.atk : sort === 'cost' ? a.cost - b.cost : a.id - b.id);

  const applied = [familyOptions.find(([value]) => value === familyFilter)?.[1], roleOptions.find(([value]) => value === role && value !== 'all')?.[1], leaderFilter !== 'all' ? `リーダー ${({ hp: 'HP', mp: 'MP', atk: '攻撃', speed: '素早さ' } as Record<string, string>)[leaderFilter] ?? leaderFilter}` : '', costFilter !== 'all' ? `コスト ${costFilter}` : ''].filter(Boolean);
  const filtered = !!filter.trim() || filterCount > 0 || sort !== 'id';

  return <>
      {!gallery && <div className="sectionTitle">{editing ? '候補を選ぶ' : '全モンスター'} <span>{visible.length} / {monsters.length}体</span></div>}
      <div className="tools">
        <input aria-label="検索" placeholder={gallery ? '名前・特技を検索' : '名前・特技・リーダーを検索'} value={filter} onChange={e => update({ filter: e.target.value })} />
        <select aria-label="並べ替え" value={sort} onChange={e => update({ sort: e.target.value })}><option value="id">図鑑順</option><option value="speed">素早さ順</option><option value="hp">HP順</option><option value="atk">攻撃力順</option><option value="cost">低コスト順</option></select>
      </div>
      <details className="builderDisclosure filterDisclosure" open={filters.expanded}>
        <summary onClick={event => { event.preventDefault(); update({ expanded: !filters.expanded }); }}>{gallery ? '絞り込み' : '詳しく絞り込む'}{filterCount > 0 ? `（${filterCount}件）` : ''}{gallery && <span className="catalogCount" aria-live="polite">{visible.length} / {monsters.length}体</span>}</summary>
        <div className="filterChips" aria-label="特技で絞り込み">{roleOptions.map(([value, label]) => <button key={value} aria-pressed={role === value} onClick={() => update({ role: value })}>{label}</button>)}</div>
        <div className="advancedFilters">
          <select aria-label="リーダー効果で絞り込み" value={leaderFilter} onChange={e => update({ leaderFilter: e.target.value })}><option value="all">全リーダー効果</option><option value="hp">HPアップ</option><option value="mp">MPアップ</option><option value="atk">攻撃アップ</option><option value="speed">素早さアップ</option></select>
          <select aria-label="系統で絞り込み" value={familyFilter} onChange={e => update({ familyFilter: e.target.value })}><option value="all">全系統</option>{familyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select aria-label="コストで絞り込み" value={costFilter} onChange={e => update({ costFilter: e.target.value })}><option value="all">全コスト</option><option value="2">COST 2</option><option value="3">COST 3</option><option value="4">COST 4</option><option value="5">COST 5</option>{editing && <option value="fit">この枠に編成可能</option>}</select>
        </div>
      </details>
      {(!gallery || filtered) && <div className={gallery ? "catalogApplied" : undefined}>{gallery && <span>{applied.join(" · ") || (filter.trim() ? `「${filter.trim()}」` : "並べ替え中")}</span>}<button className="detailButton resetFilters" aria-label="絞り込みをリセット" onClick={resetFilters}>{gallery ? "リセット" : "検索・絞り込みをリセット"}</button></div>}
      <div ref={list} onScroll={event => { if (scrollPosition) scrollPosition.current = event.currentTarget.scrollTop; }} className={`roster candidateList${gallery ? ' catalogGallery' : ''}`} aria-label={editing ? '入れ替え候補一覧' : '図鑑一覧'} tabIndex={0}>
        {visible.map(m => {
          const reason = editing?.unavailableReason(m.id) ?? '';
          if (gallery) return <article className="rosterItem catalogCard" data-family={m.family} key={m.id}>
            <button className="catalogCardOpen" aria-label={`${m.name}の詳細`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); onFocus(m.id, visible.map(monster => monster.id)); }}>
              <span className="catalogArtStage" aria-hidden="true"><span className="catalogNumber">{String(m.id + 1).padStart(3, '0')}</span><CatalogArt monster={m} /></span>
              <span className="catalogCardCaption rosterText"><strong>{m.name}</strong><span>{familyLabel(m)}</span></span>
            </button>
          </article>;
          return <article className={`rosterItem candidateCard ${editing?.candidateId === m.id && editing ? 'selected' : ''}`} key={m.id}>
            <div className="candidateCardBody">
              <span className="avatar" aria-hidden="true"><MonsterArt monster={m} portrait /></span>
              <div className="rosterText"><strong>{m.name}</strong><em>{familyLabel(m)} · {monsterRole(m.id).name}</em><small>HP {m.hp} · MP {m.mp}</small><small>攻撃 {m.atk} · 素早さ {m.speed}</small></div>
              <span className="cost">C{m.cost}</span>
            </div>
            <div className="candidateCardActions">
              {editing && <button className="candidateSelect" aria-label={`${m.name}を候補に選ぶ`} aria-pressed={editing?.candidateId === m.id} aria-describedby={reason ? `candidate-reason-${m.id}` : undefined} disabled={!!reason} onClick={() => editing.onSelect(m.id)}>{editing?.candidateId === m.id ? '比較中' : '候補にする'}</button>}
              <button className="detailButton" aria-label={`${m.name}の詳細`} onClick={() => onFocus(m.id)}>詳細</button>
            </div>
            {editing && <small className="candidateReason" id={`candidate-reason-${m.id}`}>{reason || `入れ替え後 C${editing.projectedCost(m.id)}/${editing.budget} · 残り ${editing.budget - editing.projectedCost(m.id)}`}</small>}
          </article>;
        })}
      </div>
      {!visible.length && <p className="emptySearch">該当するモンスターがいません。検索や絞り込みを変えてみてください。</p>}
      {!gallery && <p className="hint">{editing ? '候補一覧・個体の能力値はリーダー補正前。「リーダー変更の比較」だけ補正後です。' : '能力値はリーダー補正前です。'}</p>}
  </>;
}
