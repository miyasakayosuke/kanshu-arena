import React, { useEffect, useRef, useState } from 'react';
import { monsters, cost, start, advanceWithEvents, autoOrders, battleSkill, BASIC_ATTACK, DEFEND, MAX_SPECIAL_SKILLS, leaderFor, skillTargetsAllies, skillOrderLabel, canUseSkill, effectStatus, type State, type Order, type BattleEvent, type Skill } from './engine';
import { applyBattleEvents, buildTimeline, effectType } from './playback';
import BattleStage from './BattleStage';
import TeamBuilder from './TeamBuilder';
import TacticsPanel from './TacticsPanel';
import { rules, opponentTeams, isValidTeam, initialTeam, monsterLore, monsterRole, skillLore, resultSummary, type RuleId } from './strategy';
import './style.css';

const COMMAND_SECONDS = 30;
const initial = initialTeam;
const skillHint = (s: Skill) => `MP ${s.mpCost} · ${skillOrderLabel(s)} · ${s.kind === 'heal' ? '味方1体を回復' : s.kind === 'cleanse' ? '味方1体の毒解除＋回復' : s.kind === 'protect' ? '味方1体を守る・このターン直接ダメージ半減' : s.kind === 'guard' ? '自分を守る・このターン直接ダメージ半減' : s.all ? '敵全体' : '敵1体'}${s.kind === 'poison' ? ' · 毒：ターン終了時に3回（付与したターンを含む）' : ''}${s.breaksGuard ? ' · 防御を解除して攻撃' : ''}`;
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
  const [rule, setRule] = useState<RuleId>('standard');
  const [practice, setPractice] = useState(false);
  const [encounter, setEncounter] = useState<{ enemy:number[]; seed:number; rule:RuleId } | null>(null);
  const [showTactics, setShowTactics] = useState(false);
  const [round, setRound] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [effect, setEffect] = useState<{ text: string; type: string; tick: number } | null>(null);
  const [impact, setImpact] = useState<BattleEvent | null>(null);
  const [visualCast, setVisualCast] = useState<BattleEvent | null>(null);
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
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFocus(null); setShowLog(false); setShowTactics(false); setPendingSkill(null); if (pendingSkill === null) setShowSkills(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pendingSkill]);
  const choose = (id: number) => {
    if (team.includes(id)) { setTeam(team.filter(x => x !== id)); setFocus(null); return; }
    if (team.length >= 5 || cost([...team, id]) > rules[rule].budget) return;
    setTeam([...team, id]); setFocus(null);
  };
  const begin = (retry = false) => {
    if (!isValidTeam(team, rules[rule].budget)) return;
    const nextEncounter = (retry || practice) && encounter && encounter.rule === rule ? encounter : { enemy: opponentTeams(rule)[round % opponentTeams(rule).length], seed: round + 20261008, rule };
    setEncounter(nextEncounter);
    clearTimers(); commandDeadline.current = null; playingLock.current = false; latestResult.current = null;
    setTimedOut(false);
    setBattle(start(team, nextEncounter.enemy, nextEncounter.seed, { leaders: true }));
    setOrders({}); setAutomaticKeys([]); setActiveKey('a0'); setPendingSkill(null); setShowSkills(false); setEffect(null); setVisualCast(null); setImpact(null); setImpacts([]);
    setPlaying(false); setShowLog(false); setShowTactics(false); setPage('battle'); setNotice('');
  };
  const living = battle?.allies.filter(u => u.hp > 0) ?? [];
  const active = living.find(u => u.key === activeKey) ?? living[0];
  const selectedSkill = pendingSkill !== null && active ? battleSkill(active.monster, pendingSkill) : null;
  const targets = battle && selectedSkill ? (skillTargetsAllies(selectedSkill) ? battle.allies : battle.enemies).filter(u => u.hp > 0) : [];
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
    const selected = battleSkill(active.monster, skill);
    if (!selected || !canUseSkill(active, selected)) return;
    const next = { ...orders, [active.key]: { key: active.key, skill, target } };
    setOrders(next); setPendingSkill(null); setShowSkills(false);
    setAutomaticKeys(keys => automatic ? [...keys.filter(key => key !== active.key), active.key] : keys.filter(key => key !== active.key));
    const unselected = living.find(u => !next[u.key]);
    if (unselected) setActiveKey(unselected.key);
  };
  const selectSkill = (index: number) => {
    if (commandsExpired() || !active || battle?.winner || playingLock.current) return;
    const skill = battleSkill(active.monster, index);
    if (!skill || !canUseSkill(active, skill)) return;
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
    setEffect(null); setVisualCast(null); setImpact(null); setImpacts([]); setPlaying(false); playingLock.current = false;
    setReplayProgress(''); latestResult.current = null;
  };
  const execute = (timeout = false) => {
    const expired = timeout || (commandDeadline.current !== null && Date.now() >= commandDeadline.current);
    if (page !== 'battle' || !battle || battle.winner || playingLock.current || commandDeadline.current === null || (!expired && pendingSkill !== null)) return;
    // Lock synchronously: a manual click and the deadline can resolve this turn only once.
    playingLock.current = true; commandDeadline.current = null;
    setTimedOut(expired); setFocus(null); setShowLog(false); setShowTactics(false);
    const automatic = autoOrders(battle);
    const cmds = living.map(u => orders[u.key] ?? automatic.find(o => o.key === u.key)!);
    const result = advanceWithEvents(battle, cmds);
    latestResult.current = result.state;
    setPlaying(true); setOrders({}); setAutomaticKeys([]); setPendingSkill(null); setShowSkills(false); setImpact(null); setImpacts([]);
    clearTimers();
    const timeline = buildTimeline(result.events);
    const id = ++playbackId.current;
    let castIndex = 0;
    const total = result.events.filter(e => e.kind === 'cast').length;
    for (const cue of timeline.cues) {
      const tick = cue.cast && !cue.impacts.length ? ++castIndex : castIndex;
      timers.current.push(setTimeout(() => {
        if (id !== playbackId.current) return;
        // Resource spend and phase expiry are authoritative, including cues without a visual.
        const updates = [...(cue.updates ?? []), ...cue.impacts];
        if (updates.length) setBattle(prev => prev ? applyBattleEvents(prev, updates) : prev);
        if (!cue.cast && !cue.impacts.length && cue.updates?.length) return;
        if (!cue.impacts.length) {
          setVisualCast(cue.cast); setImpacts([]); setImpact(cue.cast);
          if (cue.cast) {
            setEffect({ text: cue.cast.skill ?? '攻撃', type: effectType(cue.cast.skill ?? '', cue.cast.effect), tick: id * 100 + tick });
            setReplayProgress(`${Math.min(tick, total)} / ${total}`);
          } else { setEffect({ text: '毒のダメージ', type: 'shadow', tick: id * 100 + tick }); }
        } else {
          setImpact(cue.impacts.find(e => e.kind === 'damage' || e.kind === 'heal') ?? cue.impacts[0]);
          setImpacts(cue.impacts);
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
  const returnHome = (retry = false) => {
    commandDeadline.current = null;
    ++playbackId.current; clearTimers(); latestResult.current = null; playingLock.current = false;
    setPlaying(false); setEffect(null); setVisualCast(null); setImpact(null); setImpacts([]); setPendingSkill(null); setShowSkills(false); setShowLog(false); setShowTactics(false); setPage('home'); setPractice(retry);
    if (battle?.winner && !retry) setRound(n => n + 1);
  };
  const changeRule = (next: RuleId) => { if (next !== rule) { setRule(next); setPractice(false); setNotice(''); } };
  const ready = living.filter(u => orders[u.key]).length;
  const incomingArea = playing && visualCast?.scope === 'all' && (visualCast.targets ?? []).some(key => battle?.allies.some(unit => unit.key === key));
  const areaLanded = incomingArea && impacts.some(event => event.kind === 'damage' && event.actor === visualCast?.actor);
  const scopeLabel = visualCast?.scope === 'all' ? `${incomingArea ? '味方' : '敵'}全体 ${visualCast.targets?.length ?? 0}体` : '';
  return <div className={`app ${page === 'battle' ? 'battleMode' : ''}`}>
    <header><div className="brandMark">✦</div><div><div className="eyebrow">KANSHU ARENA · PLAYTEST 0.6</div><h1>環獣のアリーナ</h1></div>{page === 'home' && <span className="previewBadge">5 vs 5</span>}</header>
    {page === 'home' && <TeamBuilder team={team} setTeam={setTeam} rule={rule} setRule={changeRule} onFocus={setFocus} notice={notice} setNotice={setNotice} practice={practice} leavePractice={()=>{setPractice(false);setRound(n=>n+1);}} />}
    {page === 'battle' && battle && <main className="battle">
      <div className="battleTop"><button className="iconButton" onClick={()=>returnHome()} aria-label="対戦を中断して編成へ">‹ 編成</button><span><b>TURN {Math.min(battle.turn - (battle.winner ? 1 : 0), 20)}</b><small>敵 {battle.enemies.filter(u => u.hp > 0).length} / 味方 {living.length}</small>{!battle.winner && !playing && <output className={`commandClock ${commandSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`コマンド入力 残り${commandSeconds}秒`}>残り <b>{commandSeconds}</b> 秒</output>}</span><div className="battleMenu"><button className="iconButton" onClick={() => setShowTactics(true)}>作戦</button><button className="iconButton" onClick={() => setShowLog(true)}>ログ</button></div></div>
      <BattleStage allies={battle.allies} enemies={battle.enemies} effect={effect} impact={impact} impacts={impacts} playbackRate={speed} targetKeys={targetKeys} selectedTarget={active ? orders[active.key]?.target : undefined} onSelectTarget={key => { if (pendingSkill !== null && targetKeys.includes(key)) commitOrder(pendingSkill, key); }} />
      <div className="battleMessage" aria-live="polite">{battle.winner ? '対戦終了' : playing ? `${effect?.text ?? '行動開始'}${scopeLabel ? ` · ${scopeLabel}` : ''}　${replayProgress}` : selectedSkill ? `${selectedSkill.name}：下の${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : ready === living.length ? '指示がそろいました。ターンを開始できます。' : `行動を選択 ${ready}/${living.length}　未選択はおまかせ`}</div>
      {battle.winner ? <section className="result"><span className="eyebrow">BATTLE RESULT</span><h2>{battle.winner === 'win' ? 'VICTORY' : battle.winner === 'lose' ? 'DEFEAT' : 'DRAW'}</h2><p>{battle.winner === 'win' ? '見事な采配。次の相手に挑もう。' : battle.winner === 'lose' ? '先制・回復・アンカーを組み合わせて再挑戦。' : '互角の勝負。編成を変えてもう一度。'}</p><div className="resultMetrics">{resultSummary(battle).turns}ターン · 残りHP 味方 {resultSummary(battle).allyHpPercent}% / 敵 {resultSummary(battle).enemyHpPercent}%</div><div className="rematchActions"><button className="primary" onClick={()=>begin(true)}>同じ編成ですぐ再戦</button><button className="secondary" onClick={()=>returnHome(true)}>編成を見直して再戦</button><button className="detailButton" onClick={()=>returnHome()}>編成に戻る → 次の相手</button></div></section> : <section className="commandDock" aria-label="行動指示">
        <div className={`commanderRow ${incomingArea ? `partyArea area-${effect?.type ?? 'slash'} ${areaLanded ? 'landed' : 'charging'}` : ''}`} data-area-targets={incomingArea ? visualCast?.targets?.join(',') : undefined}>
          {incomingArea && <span key={`${effect?.tick}-${areaLanded}`} className="partySweep" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
          {battle.allies.map(u => {
          const feedback = impacts.find(event => event.target === u.key && (event.kind === 'damage' || event.kind === 'heal'));
          const acting = playing && impact?.kind === 'cast' && impact.actor === u.key;
          const areaTarget = incomingArea && visualCast?.targets?.includes(u.key);
          const status = u.hp <= 0 ? '戦闘不能' : effectStatus(u);
          return <button key={u.key} className={`commander ${!playing && active?.key === u.key ? 'active' : ''} ${orders[u.key] ? 'ordered' : ''} ${acting ? 'acting' : ''} ${u.hp <= 0 ? 'fallen' : ''} ${feedback ? `party-${feedback.kind}` : ''} ${areaTarget ? 'areaTarget' : ''}`} data-area-target={areaTarget ? 'true' : undefined} disabled={playing || u.hp <= 0} aria-label={`${u.monster.name}の行動を選択`} aria-pressed={!playing && active?.key === u.key} aria-describedby={`party-hp-${u.key} party-mp-${u.key} party-status-${u.key}`} onClick={() => { setActiveKey(u.key); setPendingSkill(null); setShowSkills(false); }}>
            <span aria-hidden="true">{u.monster.icon}</span>
            {areaTarget && <span key={`${effect?.tick}-${areaLanded}`} className="partyAura" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
            <small className="commanderHp" id={`party-hp-${u.key}`}>HP {u.hp}/{u.monster.hp}</small>
            <div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div>
            <small className="commanderMp" id={`party-mp-${u.key}`}>MP {u.mp}/{u.monster.mp}</small>
            <div className="mpBar"><b style={{ width: `${u.monster.mp > 0 ? u.mp / u.monster.mp * 100 : 0}%` }} /></div>
            <i>{u.hp <= 0 ? '戦闘不能' : playing ? acting ? '行動中' : '待機' : orders[u.key] ? automaticKeys.includes(u.key) ? 'おまかせ ✓' : '指示済 ✓' : '未選択'}</i>
            <em className="commanderStatus" id={`party-status-${u.key}`} aria-label={status || '状態異常なし'}>{u.hp > 0 ? status : ''}</em>
            {feedback && feedback.amount !== undefined && <b className={`partyImpact ${feedback.kind}`} aria-label={`${feedback.kind === 'heal' ? '回復' : 'ダメージ'} ${feedback.amount}`}>{feedback.kind === 'heal' ? '+' : '−'}{feedback.amount}</b>}
          </button>;
        })}</div>
        {playing ? <div className="playingPanel"><div className="playPulse">✦</div><p>{timedOut ? '時間切れ · 未入力はおまかせで行動' : 'モンスターが行動中'}</p><button className="secondary" onClick={finishPlayback}>演出をスキップ</button></div> : active && <><div className="commandHeading"><span>{selectedSkill ? `${selectedSkill.name} · MP ${selectedSkill.mpCost} · ${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : <>{active.monster.name} <small>{showSkills ? `とくぎ ${Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)}/${MAX_SPECIAL_SKILLS} · MP ${active.mp}/${active.monster.mp}` : `HP ${active.hp}/${active.monster.hp} · MP ${active.mp}/${active.monster.mp}`}</small></>}</span>{selectedSkill || showSkills ? <button className="backToSkills" onClick={() => { if (pendingSkill !== null) setPendingSkill(null); else setShowSkills(false); }}>‹ {selectedSkill && showSkills ? '特技に戻る' : 'コマンドに戻る'}</button> : <button onClick={() => setFocus(active.monster.id)} className="detailButton">詳細</button>}</div>
          {selectedSkill ? <div className={`targetButtons ${skillTargetsAllies(selectedSkill) ? 'allyTargets' : 'enemyTargets'}`} aria-label={`${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}の対象を選択`}>{targets.map(u => <button key={u.key} aria-label={`${u.monster.name}を対象に選択`} onClick={() => { if (pendingSkill !== null) commitOrder(pendingSkill, u.key); }}><span aria-hidden="true">{u.monster.icon}</span><small>{u.hp}/{u.monster.hp}</small><div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div></button>)}</div> : showSkills ? <div className="skillButtons" aria-label="とくぎを選択">{active.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((s, i) => <button key={i} className={`${!automaticKeys.includes(active.key) && orders[active.key]?.skill === i ? 'chosen' : ''} skill-${effectType(s.name, s.kind)}`} disabled={!canUseSkill(active, s)} onClick={() => selectSkill(i)}><strong>{s.name}</strong><span className={`skillMp ${!canUseSkill(active, s) ? 'insufficient' : ''}`}>MP {s.mpCost}{!canUseSkill(active, s) ? ' · MP不足' : ''}</span><small>{skillOrderLabel(s)} / {s.kind === 'guard' ? '防御' : s.kind === 'protect' ? '味方を守る' : s.kind === 'cleanse' ? '毒解除＋回復' : s.kind === 'heal' ? `回復 ${s.power}` : s.breaksGuard ? '防御解除' : `${s.all ? '全体' : '単体'} ${s.power}`} </small></button>)}</div> : <div className="commandButtons" aria-label="コマンドを選択">
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === BASIC_ATTACK ? 'chosen' : ''} onClick={() => selectSkill(BASIC_ATTACK)}><strong>たたかう</strong><small>通常攻撃 · MP 0</small></button>
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === DEFEND ? 'chosen' : ''} onClick={() => commitOrder(DEFEND)}><strong>ぼうぎょ</strong><small>今ターン半減 · MP 0</small></button>
            <button className={!automaticKeys.includes(active.key) && (orders[active.key]?.skill ?? -1) >= 0 ? 'chosen' : ''} disabled={!active.monster.skills.length} onClick={() => setShowSkills(true)}><strong>とくぎ</strong><small>{Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)} / {MAX_SPECIAL_SKILLS} 習得</small></button>
            <button className={automaticKeys.includes(active.key) ? 'chosen' : ''} onClick={selectAutomatic}><strong>おまかせ</strong><small>この味方を自動選択</small></button>
          </div>}
        </>}
        <div className="turnControls"><button className="autoButton" disabled={playing} onClick={resetOrders}>全員おまかせ</button><button className="speedButton" disabled={playing} aria-label="演出速度" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>演出 ×{speed}</button></div>
        {!playing && <button className="primary turnStart" disabled={pendingSkill !== null} onClick={() => execute()}>{pendingSkill !== null ? '対象を選んでください' : 'この指示でターン開始'}</button>}
      </section>}
    </main>}
    {focus !== null && <div className="overlay" onClick={() => setFocus(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={`${monsters[focus].name}の詳細`} onClick={e => e.stopPropagation()}><button className="close" aria-label="詳細を閉じる" onClick={() => setFocus(null)}>×</button><div className="heroIcon">{monsters[focus].icon}</div><span className="eyebrow">MONSTER PROFILE · COST {monsters[focus].cost}</span><h2>{monsters[focus].name}</h2><p className="monsterLore">{monsterLore(focus)}</p><div className="roleBrief"><strong>{monsterRole(focus).name}</strong><p>{monsterRole(focus).strength}</p><small>{monsterRole(focus).tradeoff}</small></div><div className="leaderBanner"><span>リーダー効果 · {leaderFor(focus).name}</span><small>{leaderFor(focus).description}</small></div><h3>基礎能力（リーダー補正前）</h3><div className="stats">{[['HP', monsters[focus].hp], ['MP', monsters[focus].mp], ['攻撃', monsters[focus].atk], ['素早さ', monsters[focus].speed]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div><h3>特技</h3>{monsters[focus].skills.map(s => <div className="skill" key={s.name}><strong>{s.name}</strong><small>{skillHint(s)}{s.power > 0 ? ` · ${s.kind==='heal'||s.kind==='cleanse'?'回復':'威力'}${s.power}` : ''}</small><p className="skillLore">{skillLore(s.name)}</p></div>)}
      {page === 'home' && <>{team.includes(focus)&&<button className="secondary leaderChoice" disabled={team[0]===focus} onClick={()=>{setTeam([focus,...team.filter(id=>id!==focus)]);setFocus(null);setNotice(`${monsters[focus].name}をリーダーにしました`);}}>{team[0]===focus?'この編成のリーダー':'リーダーにする'}</button>}<button className="primary" disabled={!team.includes(focus) && (team.length >= 5 || cost([...team, focus]) > rules[rule].budget)} onClick={() => choose(focus)}>{team.includes(focus) ? '編成から外す' : team.length >= 5 ? '先に1体外してください' : cost([...team, focus]) > rules[rule].budget ? 'コスト上限を超えています' : '編成に加える'}</button></>}
    </section></div>}
    {showTactics && battle && <TacticsPanel battle={battle} orders={orders} playing={playing} rule={rule} onClose={()=>setShowTactics(false)} />}
    {showLog && battle && <div className="overlay" onClick={() => setShowLog(false)}><section className="modal logModal" role="dialog" aria-modal="true" aria-label="戦闘ログ" onClick={e => e.stopPropagation()}><button className="close" aria-label="戦闘ログを閉じる" onClick={() => setShowLog(false)}>×</button><h2>戦闘ログ</h2>{playing && <p className="hint">現在のターンの記録は演出後に表示されます。</p>}<div className="log">{battle.log.map((line, i) => <div key={i}>{line}</div>)}</div></section></div>}
    {page === 'home' && <footer><p>{team.length === 5 ? `第${round + 1}戦 · ${rules[rule].name} · コスト${cost(team)}/${rules[rule].budget} · 20ターン決着` : `あと${5 - team.length}体を編成してください`}</p><button className="primary" disabled={!isValidTeam(team,rules[rule].budget)} onClick={()=>begin()}>{practice?'この編成で同じ相手に再戦 →':'この編成で対戦する →'}</button></footer>}
  </div>;
}
