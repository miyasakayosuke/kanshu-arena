import { useEffect, useRef, useState } from 'react';
import { monsters, cost, leaderFor, type Monster } from './engine';
import { rules, monsterRole, saveTeamSlots, isValidTeam, type RuleId, type TeamSlot } from './strategy';
import './teamBuilder.css';

type Props = {
  slots: (TeamSlot | null)[];
  setSlots: (slots: (TeamSlot | null)[]) => void;
  team: number[];
  setTeam: (team: number[]) => void;
  rule: RuleId;
  setRule: (rule: RuleId) => void;
  onFocus: (id: number) => void;
  notice: string;
  setNotice: (message: string) => void;
  practice: boolean;
  leavePractice: () => void;
};

const roleOptions = [
  ['all', 'すべて'], ['fast', '先制'], ['anchor', 'アンカー'], ['heal', '回復'],
  ['area', '全体'], ['poison', '毒'], ['protect', '味方を守る'],
  ['cleanse', '毒解除'], ['break', '防御解除'], ['guard', '防御'],
];

function MemberSummary({ monster, label }: { monster?: Monster; label: string }) {
  return <div className="memberComparison">
    <small className="comparisonLabel">{label}</small>
    {monster ? <>
      <strong><span aria-hidden="true">{monster.icon}</span> {monster.name}</strong>
      <span className="comparisonRole">{monsterRole(monster.id).name}</span>
      <dl className="comparisonStats">
        <div><dt>HP</dt><dd>{monster.hp}</dd></div>
        <div><dt>MP</dt><dd>{monster.mp}</dd></div>
        <div><dt>攻撃</dt><dd>{monster.atk}</dd></div>
        <div><dt>素早さ</dt><dd>{monster.speed}</dd></div>
      </dl>
      <span className="comparisonCost">COST {monster.cost}</span>
    </> : <p className="comparisonEmpty">{label === '現在のメンバー' ? '空き枠' : '下の候補から選択'}</p>}
  </div>;
}

export default function TeamBuilder({ slots, setSlots, team, setTeam, rule, setRule, onFocus, notice, setNotice, practice, leavePractice }: Props) {
  const [filter, setFilter] = useState('');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('id');
  const [leaderFilter, setLeaderFilter] = useState('all');
  const [costFilter, setCostFilter] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const slotButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const browseButton = useRef<HTMLButtonElement | null>(null);
  const restoreBrowseFocus = useRef(false);
  const editorHeading = useRef<HTMLHeadingElement | null>(null);
  const preview = useRef<HTMLDivElement | null>(null);
  const budget = rules[rule].budget;
  const total = cost(team);
  const leader = team.length ? leaderFor(team[0]) : null;
  const currentId = selectedSlot === null ? undefined : team[selectedSlot];
  const current = currentId === undefined ? undefined : monsters[currentId];
  const candidate = candidateId === null ? undefined : monsters[candidateId];
  const editing = selectedSlot !== null;

  const replacement = (id: number) => {
    const next = [...team];
    if (selectedSlot !== null && selectedSlot < next.length) next[selectedSlot] = id;
    else next.push(id);
    return next;
  };
  const unavailableReason = (id: number) => {
    if (!editing) return '先に入れ替える枠を選んでください';
    if (id === currentId) return 'この枠のメンバー';
    const occupied = team.indexOf(id);
    if (occupied !== -1) return `編成済み（${occupied + 1}枠）`;
    const next = replacement(id);
    if (next.length > 5 || new Set(next).size !== next.length) return '5体・重複なしで編成してください';
    const over = cost(next) - budget;
    if (over > 0) return `COST ${over}超過`;
    return '';
  };
  const revealPreview = () => {
    preview.current?.focus({ preventScroll: true });
    preview.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  useEffect(() => {
    if (selectedSlot !== null || browsing) {
      editorHeading.current?.focus({ preventScroll: true });
      editorHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [selectedSlot, browsing]);
  useEffect(() => {
    if (candidateId !== null) revealPreview();
  }, [candidateId]);
  const candidateReason = candidate ? unavailableReason(candidate.id) : '';
  const projectedCost = candidate ? cost(replacement(candidate.id)) : total;
  const visible = monsters.filter(m => {
    const trait = leaderFor(m.id);
    const query = filter.trim().toLocaleLowerCase();
    return (!query || `${m.name} ${trait.name} ${trait.description} ${m.skills.map(s => s.name).join(' ')}`.toLocaleLowerCase().includes(query))
      && (role === 'all' || m.skills.some(s => role === 'fast' ? s.priority >= 2 : role === 'anchor' ? s.priority < 0 : role === 'area' ? s.all : role === 'break' ? s.breaksGuard : s.kind === role))
      && (leaderFilter === 'all' || trait.stat === leaderFilter)
      && (costFilter === 'all' || (costFilter === 'fit' ? !unavailableReason(m.id) : m.cost === Number(costFilter)));
  }).sort((a, b) => sort === 'speed' ? b.speed - a.speed : sort === 'hp' ? b.hp - a.hp : sort === 'atk' ? b.atk - a.atk : sort === 'cost' ? a.cost - b.cost : a.id - b.id);

  const pickSlot = (index: number) => {
    setSelectedSlot(index);
    setCandidateId(null);
    setBrowsing(false);
    setNotice('');
  };
  const closeEditor = () => {
    const previousSlot = selectedSlot;
    setSelectedSlot(null);
    setCandidateId(null);
    if (previousSlot !== null) slotButtons.current[previousSlot]?.focus({ preventScroll: true });
  };
  const closeBestiary = () => {
    restoreBrowseFocus.current = true;
    setBrowsing(false);
  };
  useEffect(() => {
    if (!browsing && restoreBrowseFocus.current) {
      browseButton.current?.focus({ preventScroll: true });
      restoreBrowseFocus.current = false;
    }
  }, [browsing]);
  const confirmReplacement = () => {
    if (!candidate || selectedSlot === null || unavailableReason(candidate.id)) return;
    const next = replacement(candidate.id);
    // One parent update commits the whole replacement. Preview never removes a member.
    setTeam(next);
    setNotice(current ? `${current.name}を${candidate.name}に入れ替えました` : `${candidate.name}を編成に加えました`);
    closeEditor();
  };
  const makeLeader = () => {
    if (currentId === undefined || selectedSlot === 0) return;
    setTeam([currentId, ...team.filter(id => id !== currentId)]);
    setNotice(`${monsters[currentId].name}をリーダーにしました`);
    closeEditor();
  };
  const save = (index: number) => {
    if (!isValidTeam(team, budget)) return;
    const next = slots.map((slot, i) => i === index ? { team: [...team], rule } : slot);
    setSlots(next);
    let stored = false;
    try { stored = saveTeamSlots(localStorage, next); } catch { /* Storage is optional. */ }
    setNotice(stored ? `編成${index + 1}に保存しました` : 'このブラウザでは保存できません。再読み込みするまでは呼び出せます。');
  };
  const load = (index: number) => {
    const slot = slots[index];
    if (!slot) return;
    setRule(slot.rule);
    setTeam([...slot.team]);
    setSelectedSlot(null);
    setCandidateId(null);
    setBrowsing(false);
    setNotice(`編成${index + 1}を呼び出しました${practice && slot.rule !== rule ? '。ルールを変更したため、同じ相手・同じシードの再戦を解除しました。' : ''}`);
  };
  const resetFilters = () => {
    setFilter(''); setRole('all'); setLeaderFilter('all'); setCostFilter('all'); setSort('id');
  };
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      // App owns detail dialogs. The same Escape must not also discard this preview.
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('.overlay, [role="dialog"][aria-modal="true"]')) return;
      if (selectedSlot !== null) {
        event.preventDefault();
        closeEditor();
      } else if (browsing) {
        event.preventDefault();
        closeBestiary();
      }
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [selectedSlot, browsing]);
  const filterCount = Number(role !== 'all') + Number(leaderFilter !== 'all') + Number(costFilter !== 'all');

  return <main className="home teamBuilder">
    <div className="intro"><span className="eyebrow">PARTY WORKSHOP</span><h2>編成</h2><p>変えたい枠を選んで、候補を比べよう。</p></div>
    {practice && <div className="practiceNotice">同じ相手・同じ条件で再挑戦 <button onClick={leavePractice}>通常の対戦へ</button></div>}
    <section className="partyCard" aria-label="出場パーティ">
      <div className="sectionTitle">出場パーティ <span>{team.length}/5体 <b className={total > budget ? 'overBudget' : ''}>COST {total}/{budget}</b></span></div>
      <div className="team builderSlots">
        {Array.from({ length: 5 }, (_, index) => {
          const monster = team[index] === undefined ? undefined : monsters[team[index]];
          const waitingForEarlierSlot = !monster && index > team.length;
          return <button key={index} ref={node => { slotButtons.current[index] = node; }}
            className={`teamUnit ${index === 0 && monster ? 'teamLeader' : ''} ${!monster ? 'emptySlot' : ''}`}
            aria-label={monster ? `${index + 1}枠・${monster.name}を入れ替える` : `${index + 1}枠・空き枠に追加`}
            data-monster-id={monster?.id} aria-pressed={selectedSlot === index} aria-controls="team-candidates" disabled={waitingForEarlierSlot} aria-describedby={waitingForEarlierSlot ? `empty-slot-reason-${index}` : undefined} onClick={() => pickSlot(index)}>
            <small>{index === 0 ? 'LEADER' : `0${index + 1}`}</small>
            <span aria-hidden="true">{monster?.icon ?? '＋'}</span>
            <strong>{monster?.name ?? '空き枠'}</strong>
            <i id={waitingForEarlierSlot ? `empty-slot-reason-${index}` : undefined}>{monster ? `C${monster.cost}` : waitingForEarlierSlot ? '前の枠から' : '追加'}</i>
          </button>;
        })}
      </div>
      {leader && <div className="leaderBanner"><span>✦ {leader.name}</span><small>{leader.description}</small></div>}
      <p className="hint">先頭がリーダー。枠を選ぶと、入れ替えやリーダー変更ができます。</p>
      {total > budget && <p className="budgetWarning" role="status">あとCOST {total - budget}減らすと出場できます。</p>}
      {team.length < 5 && <p className="hint">空き枠からあと{5 - team.length}体を追加してください。</p>}
    </section>
    <p className="saveNotice teamNotice" role="status">{notice}</p>

    {(editing || browsing) && <section className="candidatePanel" id="team-candidates" aria-labelledby="candidate-heading">
      <div className="candidateHeading">
        <div><span className="eyebrow">{editing ? 'CHOOSE & COMPARE' : 'BESTIARY'}</span>
          <h3 id="candidate-heading" ref={editorHeading} tabIndex={-1}>{editing ? `${selectedSlot + 1}枠の${current ? '入れ替え' : '追加'}` : 'モンスター図鑑'}</h3>
        </div>
        <button className="secondary" onClick={editing ? closeEditor : closeBestiary}>
          {editing ? 'キャンセル' : '図鑑を閉じる'}
        </button>
      </div>
      {editing && <div className="candidatePreview" ref={preview} tabIndex={-1} aria-label="編成の変更プレビュー">
        {candidate ? <div className="comparisonGrid" aria-label="現在と候補の比較">
          <MemberSummary monster={current} label="現在のメンバー" />
          <MemberSummary monster={candidate} label="入れ替え候補" />
        </div> : <div className="currentMemberBrief">
          <span aria-hidden="true">{current?.icon ?? '＋'}</span>
          <div><small>現在のメンバー</small><strong>{current ? `${current.name} · COST ${current.cost}` : '空き枠'}</strong><small>{current ? monsterRole(current.id).name : '下の候補から選択'}</small></div>
        </div>}
        <div className="memberActions">
          {current && <button className="detailButton" aria-label={`現在の${current.name}の詳細`} onClick={() => onFocus(current.id)}>現在の詳細</button>}
          {current && selectedSlot !== 0 && <button className="secondary" aria-label={`${current.name}をリーダーにする`} onClick={makeLeader}>リーダーにする</button>}
          {candidate && <button className="detailButton" aria-label={`比較中の${candidate.name}の詳細`} onClick={() => onFocus(candidate.id)}>候補の詳細</button>}
        </div>
        {candidate && <div className="candidateImpact" role="status">
          <p>合計COST <strong>{total} → {projectedCost}/{budget}</strong><span className={projectedCost > budget ? 'overBudget' : ''}>残り {budget - projectedCost}</span></p>
          {selectedSlot === 0 && <small>新リーダー効果：{leaderFor(candidate.id).description}</small>}
          <small>{monsterRole(candidate.id).strength}</small>
          <small>気をつけたいこと：{monsterRole(candidate.id).tradeoff}</small>
          {candidateReason && <p className="budgetWarning">{candidateReason}</p>}
        </div>}
        {candidate && <button className="primary confirmReplacement" disabled={!!candidateReason} onClick={confirmReplacement}>
          {`${candidate.name}${current ? 'に入れ替える' : 'を編成に加える'}`}
        </button>}
      </div>}
      <div className="sectionTitle">{editing ? '候補を選ぶ' : '全モンスター'} <span>{visible.length} / {monsters.length}体</span></div>
      <div className="tools">
        <input aria-label="検索" placeholder="名前・特技・リーダーを検索" value={filter} onChange={e => setFilter(e.target.value)} />
        <select aria-label="並べ替え" value={sort} onChange={e => setSort(e.target.value)}><option value="id">図鑑順</option><option value="speed">素早さ順</option><option value="hp">HP順</option><option value="atk">攻撃力順</option><option value="cost">低コスト順</option></select>
      </div>
      <details className="builderDisclosure filterDisclosure">
        <summary>詳しく絞り込む{filterCount > 0 ? `（${filterCount}件）` : ''}</summary>
        <div className="filterChips" aria-label="特技で絞り込み">{roleOptions.map(([value, label]) => <button key={value} aria-pressed={role === value} onClick={() => setRole(value)}>{label}</button>)}</div>
        <div className="advancedFilters">
          <select aria-label="リーダー効果で絞り込み" value={leaderFilter} onChange={e => setLeaderFilter(e.target.value)}><option value="all">全リーダー効果</option><option value="hp">HPアップ</option><option value="atk">攻撃アップ</option><option value="speed">素早さアップ</option></select>
          <select aria-label="コストで絞り込み" value={costFilter} onChange={e => setCostFilter(e.target.value)}><option value="all">全コスト</option><option value="2">COST 2</option><option value="3">COST 3</option><option value="4">COST 4</option>{editing && <option value="fit">この枠に編成可能</option>}</select>
        </div>
      </details>
      <button className="detailButton resetFilters" aria-label="絞り込みをリセット" onClick={resetFilters}>検索・絞り込みをリセット</button>
      <div className="roster candidateList" aria-label={editing ? '入れ替え候補一覧' : '図鑑一覧'} tabIndex={0}>
        {visible.map(m => {
          const reason = editing ? unavailableReason(m.id) : '';
          return <article className={`rosterItem candidateCard ${candidateId === m.id && editing ? 'selected' : ''}`} key={m.id}>
            <div className="candidateCardBody">
              <span className="avatar" aria-hidden="true">{m.icon}</span>
              <div className="rosterText"><strong>{m.name}</strong><em>{monsterRole(m.id).name}</em><small>HP {m.hp} · MP {m.mp}</small><small>攻撃 {m.atk} · 素早さ {m.speed}</small></div>
              <span className="cost">C{m.cost}</span>
            </div>
            <div className="candidateCardActions">
              {editing && <button className="candidateSelect" aria-label={`${m.name}を候補に選ぶ`} aria-pressed={candidateId === m.id} aria-describedby={reason ? `candidate-reason-${m.id}` : undefined} disabled={!!reason} onClick={() => { setCandidateId(m.id); if (candidateId === m.id) revealPreview(); }}>{candidateId === m.id ? '比較中' : '候補にする'}</button>}
              <button className="detailButton" aria-label={`${m.name}の詳細`} onClick={() => onFocus(m.id)}>詳細</button>
            </div>
            {editing && <small className="candidateReason" id={`candidate-reason-${m.id}`}>{reason || `入れ替え後 C${cost(replacement(m.id))}/${budget} · 残り ${budget - cost(replacement(m.id))}`}</small>}
          </article>;
        })}
      </div>
      {!visible.length && <p className="emptySearch">該当するモンスターがいません。検索や絞り込みを変えてみてください。</p>}
      <p className="hint">能力値はリーダー補正前。詳細を開いても編成は変わりません。</p>
    </section>}

    <details className="builderDisclosure ruleDisclosure">
      <summary>ルール：{rules[rule].name}<span>COST上限 {budget}</span></summary>
      {practice && <p className="hint">ルール変更で同条件再戦を解除します。</p>}
      <div className="ruleTabs" aria-label="対戦ルール">{Object.values(rules).map(value => <button key={value.id} aria-pressed={rule === value.id} onClick={() => setRule(value.id)}><strong>{value.name}</strong><small>COST {value.budget}</small></button>)}</div>
      <p className="hint ruleHint">{rules[rule].description}</p>
    </details>
    <details className="builderDisclosure savedTeams" aria-label="保存した編成">
      <summary>保存した編成<span>このブラウザに3枠</span></summary>
      <div className="slotGrid">{slots.map((slot, i) => <div className="teamSlot" key={i}><strong>編成 {i + 1}</strong><span className="slotIcons">{slot ? slot.team.map(id => monsters[id].icon).join('') : '未保存'}</span><small>{slot ? `${rules[slot.rule].name} · C${cost(slot.team)}` : 'リーダーも保存'}</small><div><button aria-label={`編成${i + 1}を呼び出す`} disabled={!slot} onClick={() => load(i)}>呼出</button><button aria-label={`編成${i + 1}に保存`} disabled={!isValidTeam(team, budget)} onClick={() => save(i)}>{slot ? '上書き' : '保存'}</button></div></div>)}</div>
    </details>
    {!editing && !browsing && <button className="secondary browseBestiary" ref={browseButton} onClick={() => { setBrowsing(true); if (costFilter === 'fit') setCostFilter('all'); }}>モンスター図鑑を開く <span>12体の役割・特技を見る</span></button>}
  </main>;
}
