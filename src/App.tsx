import React, { useEffect, useRef, useState } from 'react';
import { monsters, cost, start, advanceWithEvents, autoOrders, battleSkill, BASIC_ATTACK, DEFEND, MAX_SPECIAL_SKILLS, type State, type Order, type BattleEvent, type Skill } from './engine';
import { buildTimeline, effectType } from './playback';
import BattleStage from './BattleStage';
import './style.css';

const COMMAND_SECONDS = 30;
const initial = [0, 2, 3, 4, 6];
const opponents = [[1, 5, 8, 10, 6], [11, 9, 4, 7, 10], [0, 3, 1, 6, 2]];
const skillHint = (s: Skill) => `${s.priority > 0 ? '先制 · ' : s.priority < 0 ? 'アンカー · ' : ''}${s.kind === 'heal' ? '味方1体を回復' : s.kind === 'guard' ? '自分の被ダメージ半減' : s.all ? '敵全体' : '敵1体'}${s.kind === 'poison' ? ' · 毒3ターン' : ''}`;
function loadTeam() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('kanshu-team') ?? 'null');
    if (Array.isArray(saved) && saved.length === 5 && new Set(saved).size === 5 && saved.every(id => Number.isInteger(id) && monsters[id]) && cost(saved) <= 17) return saved as number[];
  } catch { /* A blocked or old save must never prevent playing. */ }
  return initial;
}
export default function App() {
  const [team, setTeam] = useState<number[]>(loadTeam);
  const [page, setPage] = useState<'home' | 'battle'>('home');
  const [battle, setBattle] = useState<State | null>(null);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [activeKey, setActiveKey] = useState('a0');
  const [pendingSkill, setPendingSkill] = useState<number | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [automaticKeys, setAutomaticKeys] = useState<string[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('id');
  const [round, setRound] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [effect, setEffect] = useState<{ text: string; type: string; tick: number } | null>(null);
  const [impact, setImpact] = useState<BattleEvent | null>(null);
  const [impacts, setImpacts] = useState<BattleEvent[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState('');
  const [replayProgress, setReplayProgress] = useState('');
  const [commandSeconds, setCommandSeconds] = useState(COMMAND_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const commandDeadline = useRef<number | null>(null);
  const timeoutAction = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playbackId = useRef(0);
  const playingLock = useRef(false);
  const latestResult = useRef<State | null>(null);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (team.length === 5) try { localStorage.setItem('kanshu-team', JSON.stringify(team)); } catch { /* optional */ }
  }, [team]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFocus(null); setShowLog(false); setPendingSkill(null); if (pendingSkill === null) setShowSkills(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pendingSkill]);
  const choose = (id: number) => {
    if (team.includes(id)) { setTeam(team.filter(x => x !== id)); setFocus(null); return; }
    if (team.length >= 5 || cost([...team, id]) > 17) return;
    setTeam([...team, id]); setFocus(null);
  };
  const begin = () => {
    clearTimers(); commandDeadline.current = null; playingLock.current = false; latestResult.current = null;
    setTimedOut(false);
    setBattle(start(team, opponents[round % opponents.length], round + 20261008));
    setOrders({}); setAutomaticKeys([]); setActiveKey('a0'); setPendingSkill(null); setShowSkills(false); setEffect(null); setImpact(null); setImpacts([]);
    setPlaying(false); setShowLog(false); setPage('battle'); setNotice('');
  };
  const living = battle?.allies.filter(u => u.hp > 0) ?? [];
  const active = living.find(u => u.key === activeKey) ?? living[0];
  const selectedSkill = pendingSkill !== null && active ? battleSkill(active.monster, pendingSkill) : null;
  const targets = battle && selectedSkill ? (selectedSkill.kind === 'heal' ? battle.allies : battle.enemies).filter(u => u.hp > 0) : [];
  const targetKeys = targets.map(u => u.key);
  // A delayed browser timer must not accept a command after the real deadline.
  const commandsExpired = () => {
    if (commandDeadline.current !== null && Date.now() >= commandDeadline.current) {
      timeoutAction.current();
      return true;
    }
    return false;
  };
  const commitOrder = (skill: number, target?: string, automatic = false) => {
    if (commandsExpired() || !active || battle?.winner || playingLock.current) return;
    const next = { ...orders, [active.key]: { key: active.key, skill, target } };
    setOrders(next); setPendingSkill(null); setShowSkills(false);
    setAutomaticKeys(keys => automatic ? [...keys.filter(key => key !== active.key), active.key] : keys.filter(key => key !== active.key));
    const unselected = living.find(u => !next[u.key]);
    if (unselected) setActiveKey(unselected.key);
  };
  const selectSkill = (index: number) => {
    if (commandsExpired() || !active || battle?.winner || playingLock.current) return;
    const skill = battleSkill(active.monster, index);
    if (!skill) return;
    if (skill.all || skill.kind === 'guard') commitOrder(index);
    else setPendingSkill(index);
  };
  const selectAutomatic = () => {
    if (commandsExpired() || !battle || !active || battle.winner || playingLock.current) return;
    const order = autoOrders(battle).find(order => order.key === active.key);
    if (order) commitOrder(order.skill, order.target, true);
  };
  const resetOrders = () => {
    if (commandsExpired() || !battle || battle.winner || playingLock.current) return;
    setOrders({}); setAutomaticKeys([]); setPendingSkill(null); setShowSkills(false); setActiveKey(living[0]?.key ?? 'a0');
  };
  const finishPlayback = () => {
    clearTimers();
    const next = latestResult.current;
    if (next) { setBattle(next); setActiveKey(next.allies.find(u => u.hp > 0)?.key ?? 'a0'); }
    setEffect(null); setImpact(null); setImpacts([]); setPlaying(false); playingLock.current = false;
    setReplayProgress(''); latestResult.current = null;
  };
  const execute = (timeout = false) => {
    const expired = timeout || (commandDeadline.current !== null && Date.now() >= commandDeadline.current);
    if (page !== 'battle' || !battle || battle.winner || playingLock.current || commandDeadline.current === null || (!expired && pendingSkill !== null)) return;
    // Lock synchronously: a manual click and the deadline can resolve this turn only once.
    playingLock.current = true; commandDeadline.current = null;
    setTimedOut(expired); setFocus(null); setShowLog(false);
    const automatic = autoOrders(battle);
    const cmds = living.map(u => orders[u.key] ?? automatic.find(o => o.key === u.key)!);
    const result = advanceWithEvents(battle, cmds);
    latestResult.current = result.state;
    setPlaying(true); setOrders({}); setAutomaticKeys([]); setPendingSkill(null); setShowSkills(false); setImpact(null); setImpacts([]);
    setBattle(prev => prev ? { ...prev, allies: prev.allies.map(u => ({ ...u, guard: false })), enemies: prev.enemies.map(u => ({ ...u, guard: false })) } : prev);
    clearTimers();
    const timeline = buildTimeline(result.events);
    const id = ++playbackId.current;
    let castIndex = 0;
    const total = result.events.filter(e => e.kind === 'cast').length;
    for (const cue of timeline.cues) {
      const tick = cue.impacts.length === 0 ? ++castIndex : castIndex;
      timers.current.push(setTimeout(() => {
        if (id !== playbackId.current) return;
        if (!cue.impacts.length) {
          setImpacts([]); setImpact(cue.cast);
          if (cue.cast) {
            setEffect({ text: cue.cast.skill ?? '攻撃', type: effectType(cue.cast.skill ?? '', cue.cast.effect), tick: id * 100 + tick });
            setReplayProgress(`${Math.min(tick, total)} / ${total}`);
          } else { setEffect({ text: '毒のダメージ', type: 'shadow', tick: id * 100 + tick }); }
        } else {
          setImpact(cue.impacts.find(e => e.kind === 'damage' || e.kind === 'heal') ?? cue.impacts[0]);
          setImpacts(cue.impacts);
          setBattle(prev => {
            if (!prev) return prev;
            const update = (u: State['allies'][number]) => {
              const evs = cue.impacts.filter(e => e.target === u.key);
              const hp = evs.filter(e => e.hp !== undefined).at(-1)?.hp ?? u.hp;
              return { ...u, hp, guard: u.guard || evs.some(e => e.kind === 'guard'), poison: evs.some(e => e.kind === 'poison') ? 3 : u.poison };
            };
            return { ...prev, allies: prev.allies.map(update), enemies: prev.enemies.map(update) };
          });
        }
      }, cue.at / speed));
    }
    timers.current.push(setTimeout(finishPlayback, timeline.duration / speed));
  };
  timeoutAction.current = () => execute(true);
  useEffect(() => {
    if (page !== 'battle' || !battle || battle.winner || playing) return;
    const deadline = Date.now() + COMMAND_SECONDS * 1000;
    commandDeadline.current = deadline;
    setCommandSeconds(COMMAND_SECONDS);
    const updateClock = () => {
      if (commandDeadline.current !== deadline) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCommandSeconds(remaining);
      if (!remaining) { clearInterval(interval); timeoutAction.current(); }
    };
    const interval = setInterval(updateClock, 200);
    // Background tabs throttle timers; focus/visibility resume against the original deadline.
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateClock);
      document.removeEventListener('visibilitychange', updateClock);
      if (commandDeadline.current === deadline) commandDeadline.current = null;
    };
  }, [page, battle?.turn, battle?.winner, playing]);
  const returnHome = () => {
    commandDeadline.current = null;
    ++playbackId.current; clearTimers(); latestResult.current = null; playingLock.current = false;
    setPlaying(false); setEffect(null); setImpact(null); setImpacts([]); setPendingSkill(null); setShowSkills(false); setShowLog(false); setPage('home');
    if (battle?.winner) setRound(n => n + 1);
  };
  const visible = monsters.filter(m => (m.name.includes(filter) || m.skills.some(s => s.name.includes(filter))) && (role === 'all' || m.skills.some(s => role === 'fast' ? s.priority > 0 : role === 'anchor' ? s.priority < 0 : role === 'area' ? s.all : s.kind === role))).sort((a, b) => sort === 'speed' ? b.speed - a.speed : sort === 'hp' ? b.hp - a.hp : sort === 'atk' ? b.atk - a.atk : sort === 'cost' ? a.cost - b.cost : a.id - b.id);
  const ready = living.filter(u => orders[u.key]).length;
  return <div className={`app ${page === 'battle' ? 'battleMode' : ''}`}>
    <header><div className="brandMark">✦</div><div><div className="eyebrow">KANSHU ARENA · PLAYTEST 0.3</div><h1>環獣のアリーナ</h1></div>{page === 'home' && <span className="previewBadge">5 vs 5</span>}</header>
    {page === 'home' && <main className="home">
      <div className="intro"><span className="eyebrow">BUILD YOUR STRATEGY</span><h2>勝負は、編成から。</h2><p>5体の個性を組み合わせ、闘技場を制する。</p></div>
      <section className="partyCard"><div className="sectionTitle">出場パーティ <span>{team.length}/5体 <b>COST {cost(team)}/17</b></span></div>
        <div className="team">{team.map((id, index) => <button key={id} className="teamUnit" aria-label={`${monsters[id].name}の詳細`} onClick={() => setFocus(id)}><small>0{index + 1}</small><span>{monsters[id].icon}</span><i>C{monsters[id].cost}</i></button>)}{Array.from({ length: 5 - team.length }, (_, i) => <div className="empty" key={i}>＋</div>)}</div>
        <p className="hint">アイコンで詳細を確認。入れ替えるときは、まず1体外します。</p></section>
      <div className="sectionTitle">モンスター図鑑 <span>{visible.length} / {monsters.length}体</span></div>
      <div className="tools"><input aria-label="検索" placeholder="名前・特技を検索" value={filter} onChange={e => setFilter(e.target.value)} /><select aria-label="並べ替え" value={sort} onChange={e => setSort(e.target.value)}><option value="id">図鑑順</option><option value="speed">素早さ順</option><option value="hp">HP順</option><option value="atk">攻撃力順</option><option value="cost">低コスト順</option></select></div>
      <div className="filterChips" aria-label="特技で絞り込み">{[['all', 'すべて'], ['fast', '先制'], ['anchor', 'アンカー'], ['heal', '回復'], ['area', '全体'], ['poison', '毒'], ['guard', '防御']].map(([value, label]) => <button key={value} aria-pressed={role === value} onClick={() => setRole(value)}>{label}</button>)}</div>
      <div className="roster">{visible.map(m => <button className={`rosterItem ${team.includes(m.id) ? 'selected' : ''}`} key={m.id} aria-label={`${m.name}の詳細`} onClick={() => setFocus(m.id)}><span className="avatar">{m.icon}</span><span className="rosterText"><strong>{m.name}</strong><small>HP {m.hp} · ATK {m.atk} · SPD {m.speed}</small><em>{m.skills.some(s => s.priority > 0) ? '先制' : m.skills.some(s => s.priority < 0) ? 'アンカー' : m.skills.some(s => s.kind === 'heal') ? '回復' : '全体・妨害'}</em></span><span className="cost">C{m.cost}<br />{team.includes(m.id) ? '✓' : '＋'}</span></button>)}</div>
      {!visible.length && <p className="emptySearch">該当するモンスターがいません。検索や絞り込みを変えてみてください。</p>}
    </main>}
    {page === 'battle' && battle && <main className="battle">
      <div className="battleTop"><button className="iconButton" onClick={returnHome} aria-label="対戦を中断して編成へ">‹ 編成</button><span><b>TURN {Math.min(battle.turn - (battle.winner ? 1 : 0), 20)}</b><small>敵 {battle.enemies.filter(u => u.hp > 0).length} / 味方 {living.length}</small>{!battle.winner && !playing && <output className={`commandClock ${commandSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`コマンド入力 残り${commandSeconds}秒`}>残り <b>{commandSeconds}</b> 秒</output>}</span><button className="iconButton" onClick={() => setShowLog(true)}>ログ</button></div>
      <BattleStage allies={battle.allies} enemies={battle.enemies} effect={effect} impact={impact} impacts={impacts} activeActorKey={active?.key} playbackRate={speed} targetKeys={targetKeys} selectedTarget={active ? orders[active.key]?.target : undefined} onSelectTarget={key => { if (pendingSkill !== null && targetKeys.includes(key)) commitOrder(pendingSkill, key); }} />
      <div className="battleMessage" aria-live="polite">{battle.winner ? '対戦終了' : playing ? `${effect?.text ?? '行動開始'}　${replayProgress}` : selectedSkill ? `${selectedSkill.name}：下の${selectedSkill.kind === 'heal' ? '味方' : '敵'}を選択` : ready === living.length ? '指示がそろいました。ターンを開始できます。' : `行動を選択 ${ready}/${living.length}　未選択はおまかせ`}</div>
      {battle.winner ? <section className="result"><span className="eyebrow">BATTLE RESULT</span><h2>{battle.winner === 'win' ? 'VICTORY' : battle.winner === 'lose' ? 'DEFEAT' : 'DRAW'}</h2><p>{battle.winner === 'win' ? '見事な采配。次の相手に挑もう。' : battle.winner === 'lose' ? '先制・回復・アンカーを組み合わせて再挑戦。' : '互角の勝負。編成を変えてもう一度。'}</p><button className="primary" onClick={returnHome}>編成に戻る →</button></section> : <section className="commandDock" aria-label="行動指示">
        <div className="commanderRow">{battle.allies.map(u => <button key={u.key} className={`commander ${active?.key === u.key ? 'active' : ''} ${orders[u.key] ? 'ordered' : ''}`} disabled={playing || u.hp <= 0} aria-label={`${u.monster.name}の行動を選択`} aria-pressed={active?.key === u.key} onClick={() => { setActiveKey(u.key); setPendingSkill(null); setShowSkills(false); }}><span>{u.monster.icon}</span><i>{u.hp <= 0 ? '戦闘不能' : orders[u.key] ? automaticKeys.includes(u.key) ? 'おまかせ ✓' : '指示済 ✓' : '未選択'}</i><div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div></button>)}</div>
        {playing ? <div className="playingPanel"><div className="playPulse">✦</div><p>{timedOut ? '時間切れ · 未入力はおまかせで行動' : 'モンスターが行動中'}</p><button className="secondary" onClick={finishPlayback}>演出をスキップ</button></div> : active && <><div className="commandHeading"><span>{selectedSkill ? `${selectedSkill.name} · ${selectedSkill.kind === 'heal' ? '味方' : '敵'}を選択` : <>{active.monster.name} <small>{showSkills ? `とくぎ ${Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)}/${MAX_SPECIAL_SKILLS}` : `HP ${active.hp}/${active.monster.hp}`}</small></>}</span>{selectedSkill || showSkills ? <button className="backToSkills" onClick={() => { if (pendingSkill !== null) setPendingSkill(null); else setShowSkills(false); }}>‹ {selectedSkill && showSkills ? '特技に戻る' : 'コマンドに戻る'}</button> : <button onClick={() => setFocus(active.monster.id)} className="detailButton">詳細</button>}</div>
          {selectedSkill ? <div className={`targetButtons ${selectedSkill.kind === 'heal' ? 'allyTargets' : 'enemyTargets'}`} aria-label={`${selectedSkill.kind === 'heal' ? '味方' : '敵'}の対象を選択`}>{targets.map(u => <button key={u.key} aria-label={`${u.monster.name}を対象に選択`} onClick={() => { if (pendingSkill !== null) commitOrder(pendingSkill, u.key); }}><span aria-hidden="true">{u.monster.icon}</span><small>{u.hp}/{u.monster.hp}</small><div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div></button>)}</div> : showSkills ? <div className="skillButtons" aria-label="とくぎを選択">{active.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((s, i) => <button key={i} className={`${!automaticKeys.includes(active.key) && orders[active.key]?.skill === i ? 'chosen' : ''} skill-${effectType(s.name, s.kind)}`} onClick={() => selectSkill(i)}><strong>{s.name}</strong><small>{s.priority > 0 ? '先制 / ' : s.priority < 0 ? 'アンカー / ' : ''}{s.kind === 'guard' ? '防御' : s.kind === 'heal' ? `回復 ${s.power}` : `${s.all ? '全体' : '単体'} ${s.power}`}</small></button>)}</div> : <div className="commandButtons" aria-label="コマンドを選択">
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === BASIC_ATTACK ? 'chosen' : ''} onClick={() => selectSkill(BASIC_ATTACK)}><strong>たたかう</strong><small>通常攻撃</small></button>
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === DEFEND ? 'chosen' : ''} onClick={() => commitOrder(DEFEND)}><strong>ぼうぎょ</strong><small>被ダメージ半減</small></button>
            <button className={!automaticKeys.includes(active.key) && (orders[active.key]?.skill ?? -1) >= 0 ? 'chosen' : ''} disabled={!active.monster.skills.length} onClick={() => setShowSkills(true)}><strong>とくぎ</strong><small>{Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)} / {MAX_SPECIAL_SKILLS} 習得</small></button>
            <button className={automaticKeys.includes(active.key) ? 'chosen' : ''} onClick={selectAutomatic}><strong>おまかせ</strong><small>この味方を自動選択</small></button>
          </div>}
        </>}
        <div className="turnControls"><button className="autoButton" disabled={playing} onClick={resetOrders}>全員おまかせ</button><button className="speedButton" disabled={playing} aria-label="演出速度" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>演出 ×{speed}</button></div>
        {!playing && <button className="primary turnStart" disabled={pendingSkill !== null} onClick={() => execute()}>{pendingSkill !== null ? '対象を選んでください' : 'この指示でターン開始'}</button>}
      </section>}
    </main>}
    {focus !== null && <div className="overlay" onClick={() => setFocus(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={`${monsters[focus].name}の詳細`} onClick={e => e.stopPropagation()}><button className="close" aria-label="詳細を閉じる" onClick={() => setFocus(null)}>×</button><div className="heroIcon">{monsters[focus].icon}</div><span className="eyebrow">MONSTER PROFILE · COST {monsters[focus].cost}</span><h2>{monsters[focus].name}</h2><div className="stats">{[['HP', monsters[focus].hp], ['攻撃', monsters[focus].atk], ['素早さ', monsters[focus].speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div><h3>特技</h3>{monsters[focus].skills.map(s => <div className="skill" key={s.name}><strong>{s.name}</strong><small>{skillHint(s)}{s.power > 0 ? ` · 威力${s.power}` : ''}</small></div>)}
      {page === 'home' && <><button className="primary" disabled={!team.includes(focus) && (team.length >= 5 || cost([...team, focus]) > 17)} onClick={() => choose(focus)}>{team.includes(focus) ? '編成から外す' : team.length >= 5 ? '先に1体外してください' : cost([...team, focus]) > 17 ? 'コスト上限を超えています' : '編成に加える'}</button></>}
    </section></div>}
    {showLog && battle && <div className="overlay" onClick={() => setShowLog(false)}><section className="modal logModal" role="dialog" aria-modal="true" aria-label="戦闘ログ" onClick={e => e.stopPropagation()}><button className="close" aria-label="戦闘ログを閉じる" onClick={() => setShowLog(false)}>×</button><h2>戦闘ログ</h2>{playing && <p className="hint">現在のターンの記録は演出後に表示されます。</p>}<div className="log">{battle.log.map((line, i) => <div key={i}>{line}</div>)}</div></section></div>}
    {page === 'home' && <footer><p>{team.length === 5 ? `第${round + 1}戦 · コスト${cost(team)}/17 · 20ターン決着` : `あと${5 - team.length}体を編成してください`}</p><button className="primary" disabled={team.length !== 5} onClick={begin}>この編成で対戦する →</button>{notice && <small>{notice}</small>}</footer>}
  </div>;
}
