import MonsterArt from './MonsterArt';
import React, { useEffect, useRef, useState } from 'react';
import { monsters, cost, start, advanceWithEvents, autoOrders, barrageHits, battleSkill, BASIC_ATTACK, DEFEND, MAX_SPECIAL_SKILLS, skillTargetsAllies, skillOrderLabel, canUseSkill, effectStatus, type State, type Order, type BattleEvent } from './engine';
import { applyBattleEvents, buildTimeline, effectType } from './playback';
import BattleStage from './BattleStage';
import {NUMBER_DURATION_MS} from './battleMotion';
import TeamBuilder from './TeamBuilder';
import TacticsPanel from './TacticsPanel';
import HomeScreen, { ArenaLobby } from './HomeScreen';
import LeaveBattleDialog from './LeaveBattleDialog';
import MonsterDetails from './MonsterDetails';
import BattleResult from './BattleResult';
import { battleEventLine, battleOrderLine } from './battleInsights';
import { useScreenNavigation } from './navigation';
import { fixedDamageHint, rules, opponentTeams, isValidTeam, initialTeam, loadTeamSlots, type RuleId } from './strategy';
import './style.css';

const COMMAND_SECONDS = 30;
const initial = initialTeam;
function loadTeam() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('kanshu-team') ?? 'null');
    if (Array.isArray(saved) && saved.length === 5 && new Set(saved).size === 5 && saved.every(id => Number.isInteger(id) && monsters[id]) && cost(saved) <= 17) return saved as number[];
  } catch { /* A blocked or old save must never prevent playing. */ }
  return initial;
}
function loadWorkshop() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanshu-workshop-v1') ?? 'null');
    if (saved && ['standard', 'light'].includes(saved.rule) && Array.isArray(saved.team) && saved.team.length <= 5 && new Set(saved.team).size === saved.team.length && saved.team.every((id: unknown) => Number.isInteger(id) && monsters[id as number]) && cost(saved.team) <= 17) return saved as { team: number[]; rule: RuleId };
  } catch { /* Optional local save. */ }
  return { team: loadTeam(), rule: 'standard' as RuleId };
}
export default function App() {
  const [workshop] = useState(loadWorkshop);
  const [team, setTeam] = useState<number[]>(workshop.team);
  const [slots, setSlots] = useState(() => { try { return loadTeamSlots(localStorage); } catch { return [null, null, null] as ReturnType<typeof loadTeamSlots>; } });
  const [battle, setBattle] = useState<State | null>(null);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [activeKey, setActiveKey] = useState('a0');
  const [pendingSkill, setPendingSkill] = useState<number | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [automaticKeys, setAutomaticKeys] = useState<string[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [rule, setRule] = useState<RuleId>(workshop.rule);
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
  const leavingForPractice = useRef(false);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const discardBattle = () => {
    commandDeadline.current = null;
    ++playbackId.current; clearTimers(); latestResult.current = null; playingLock.current = false;
    setBattle(null); setPlaying(false); setOrders({}); setAutomaticKeys([]); setEffect(null); setVisualCast(null); setImpact(null); setImpacts([]);
    setPendingSkill(null); setShowSkills(false); setShowLog(false); setShowTactics(false); setFocus(null); setReplayProgress('');
    if (battle?.winner && !leavingForPractice.current) setRound(n => n + 1);
    setPractice(leavingForPractice.current); leavingForPractice.current = false;
  };
  const navigation = useScreenNavigation(!!battle && !battle.winner, discardBattle);
  const { page, navigate } = navigation;
  useEffect(() => () => { ++playbackId.current; clearTimers(); commandDeadline.current = null; }, []);
  useEffect(() => { setFocus(null); setShowLog(false); setShowTactics(false); window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    if (page !== 'battle' || !battle || battle.winner) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [page, battle?.winner]);
  useEffect(() => {
    try { localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule })); if (team.length === 5) localStorage.setItem('kanshu-team', JSON.stringify(team)); } catch { /* optional */ }
  }, [team, rule]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (navigation.pending) { navigation.cancel(); return; } setFocus(null); setShowLog(false); setShowTactics(false); setPendingSkill(null); if (pendingSkill === null) setShowSkills(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pendingSkill, navigation.pending]);
  const startLock = useRef(false);
  useEffect(() => { startLock.current = false; }, [page, battle?.winner]);
  const begin = (retry = false) => {
    if (startLock.current || (page !== 'arena' && !(page === 'battle' && battle?.winner))) return;
    if (!isValidTeam(team, rules[rule].budget)) return;
    startLock.current = true;
    ++playbackId.current;
    const nextEncounter = (retry || practice) && encounter && encounter.rule === rule ? encounter : { enemy: opponentTeams(rule)[round % opponentTeams(rule).length], seed: round + 20261008, rule };
    setEncounter(nextEncounter);
    clearTimers(); commandDeadline.current = null; playingLock.current = false; latestResult.current = null;
    setTimedOut(false);
    setBattle(start(team, nextEncounter.enemy, nextEncounter.seed, { leaders: true }));
    setOrders({}); setAutomaticKeys([]); setActiveKey('a0'); setPendingSkill(null); setShowSkills(false); setEffect(null); setVisualCast(null); setImpact(null); setImpacts([]);
    setPlaying(false); setShowLog(false); setShowTactics(false); navigate('battle'); setNotice('');
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
    if (skill.all || skill.randomHits || skill.kind === 'guard') commitOrder(index);
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
    timers.current.push(setTimeout(() => { if (id === playbackId.current) finishPlayback(); }, timeline.duration / speed));
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
  const rebuild = () => { leavingForPractice.current = true; navigate('team'); };
  const leavePractice = () => { setPractice(false); setEncounter(null); setRound(n => n + 1); setNotice('同条件での再戦を終了しました。次の相手に挑みます。'); };
  const changeRule = (next: RuleId) => { if (next !== rule) { setRule(next); setPractice(false); setEncounter(null); setNotice(practice ? 'ルールを変更したため、同じ相手・同じシードの再戦を解除しました。' : ''); } };
  const ready = living.filter(u => orders[u.key]).length;
  const incomingArea = playing && visualCast?.scope === 'all' && (visualCast.targets ?? []).some(key => battle?.allies.some(unit => unit.key === key));
  const areaLanded = incomingArea && impacts.some(event => event.kind === 'damage' && event.actor === visualCast?.actor);
  const scopeLabel = visualCast?.scope === 'random' ? `ランダム${visualCast.hits}回` : visualCast?.scope === 'all' ? `${incomingArea ? '味方' : '敵'}全体 ${visualCast.targets?.length ?? 0}体` : '';
  return <div className={`app ${page === 'battle' ? `battleMode ${battle?.winner ? 'resultMode' : ''}` : `screen-${page}`}`}>
    <header><div className="brandMark">✦</div><div><div className="eyebrow">KANSHU ARENA · PLAYTEST 0.12</div><h1>環獣のアリーナ</h1></div>{page === 'battle' ? <button className="headerHome iconButton" aria-label="ホーム" onClick={() => navigate('home')}>⌂ ホーム</button> : <span className="previewBadge">{page === 'home' ? 'HOME' : page === 'team' ? 'TEAM' : 'ARENA'}</span>}</header>
    {page === 'home' && <HomeScreen practice={practice} team={team} rule={rule} onFocus={setFocus} onArena={() => navigate('arena')} onTeam={() => navigate('team')} />}
    {page === 'arena' && <ArenaLobby notice={notice} team={team} rule={rule} onFocus={setFocus} round={round} practice={practice} onRule={changeRule} onTeam={() => navigate('team')} onLeavePractice={leavePractice} />}
    {page === 'team' && <TeamBuilder slots={slots} setSlots={setSlots} team={team} setTeam={setTeam} rule={rule} setRule={changeRule} onFocus={setFocus} notice={notice} setNotice={setNotice} practice={practice} leavePractice={leavePractice} />}
    {page === 'battle' && battle && <main className="battle">
      <div className="battleTop"><button className="iconButton" onClick={()=>navigate('arena')} aria-label="闘技場に戻る">‹ 闘技場</button><span><b>TURN {Math.min(battle.turn - (battle.winner ? 1 : 0), 20)}</b><small>敵 {battle.enemies.filter(u => u.hp > 0).length} / 味方 {living.length}</small>{!battle.winner && !playing && <output className={`commandClock ${commandSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`コマンド入力 残り${commandSeconds}秒`}>残り <b>{commandSeconds}</b> 秒</output>}</span><div className="battleMenu"><button className="iconButton" onClick={() => setShowTactics(true)}>作戦</button><button className="iconButton" onClick={() => setShowLog(true)}>ログ</button></div></div>
      {!battle.winner && <BattleStage allies={battle.allies} enemies={battle.enemies} effect={effect} castEvent={visualCast} impact={impact} impacts={impacts} playbackRate={speed} targetKeys={targetKeys} selectedTarget={active ? orders[active.key]?.target : undefined} onSelectTarget={key => { if (pendingSkill !== null && targetKeys.includes(key)) commitOrder(pendingSkill, key); }} />}
      <div className="battleMessage" aria-live="polite">{battle.winner ? '対戦終了' : playing ? `${effect?.text ?? '行動開始'}${scopeLabel ? ` · ${scopeLabel}` : ''}　${replayProgress}` : selectedSkill ? `${selectedSkill.name}：下の${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : ready === living.length ? '指示がそろいました。ターンを開始できます。' : `行動を選択 ${ready}/${living.length}　未選択はおまかせ`}</div>
      {battle.winner ? <BattleResult battle={battle} onRematch={() => begin(true)} onRebuild={rebuild} onNext={() => navigate('arena')} onLog={() => setShowLog(true)} /> : <section className="commandDock" aria-label="行動指示">
        <div className={`commanderRow ${incomingArea ? `partyArea area-${effect?.type ?? 'slash'} ${areaLanded ? 'landed' : 'charging'}` : ''}`} style={{'--hit-duration': `${300 / speed}ms`, '--number-duration': `${NUMBER_DURATION_MS / speed}ms`, '--hp-duration': `${180 / speed}ms`} as React.CSSProperties} data-area-targets={incomingArea ? visualCast?.targets?.join(',') : undefined}>
          {incomingArea && <span key={`${effect?.tick}-${areaLanded}`} className="partySweep" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
          {battle.allies.map(u => {
          const feedback = impacts.find(event => event.target === u.key && (event.kind === 'damage' || event.kind === 'heal'));
          const acting = playing && visualCast?.actor === u.key;
          const landed = acting && impacts.some(event => event.actor === u.key);
          const areaTarget = incomingArea && visualCast?.targets?.includes(u.key);
          const status = u.hp <= 0 ? '戦闘不能' : effectStatus(u);
          return <button key={u.key} className={`commander ${!playing && active?.key === u.key ? 'active' : ''} ${orders[u.key] ? 'ordered' : ''} ${acting ? `acting ${landed ? 'recovering' : 'preparing'}` : ''} ${u.hp <= 0 ? 'fallen' : ''} ${u.ward && u.hp > 0 ? 'natureWarded' : ''} ${feedback ? `party-${feedback.kind}` : ''} ${areaTarget ? 'areaTarget' : ''}`} data-area-target={areaTarget ? 'true' : undefined} disabled={playing || u.hp <= 0} aria-label={`${u.monster.name}の行動を選択`} aria-pressed={!playing && active?.key === u.key} aria-describedby={`party-hp-${u.key} party-mp-${u.key} party-status-${u.key}`} onClick={() => { setActiveKey(u.key); setPendingSkill(null); setShowSkills(false); }}>
            <span className="commanderIcon" aria-hidden="true"><MonsterArt monster={u.monster} portrait /></span>
            {areaTarget && <span key={`${effect?.tick}-${areaLanded}`} className="partyAura" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
            <small className="commanderHp" id={`party-hp-${u.key}`}>HP {u.hp}/{u.monster.hp}</small>
            <div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div>
            <small className="commanderMp" id={`party-mp-${u.key}`}>MP {u.mp}/{u.monster.mp}</small>
            <div className="mpBar"><b style={{ width: `${u.monster.mp > 0 ? u.mp / u.monster.mp * 100 : 0}%` }} /></div>
            <i>{u.hp <= 0 ? '戦闘不能' : playing ? acting ? '行動中' : '待機' : orders[u.key] ? automaticKeys.includes(u.key) ? 'おまかせ ✓' : '指示済 ✓' : '未選択'}</i>
            <em className="commanderStatus" id={`party-status-${u.key}`} aria-label={status || '状態異常なし'}>{u.hp > 0 ? status : ''}</em>
            {feedback && feedback.amount !== undefined && <b key={`number-${effect?.tick}-${feedback.kind}-${feedback.hitIndex ?? 'single'}`} className={`partyImpact ${feedback.kind}`} aria-label={`${feedback.kind === 'heal' ? '回復' : 'ダメージ'} ${feedback.amount}`}>{feedback.kind === 'heal' ? '+' : '−'}{feedback.amount}</b>}
          </button>;
        })}</div>
        {playing ? <div className="playingPanel"><div className="playPulse">✦</div><p>{timedOut ? '時間切れ · 未入力はおまかせで行動' : 'モンスターが行動中'}</p><button className="secondary" onClick={finishPlayback}>演出をスキップ</button></div> : active && <><div className="commandHeading"><span>{selectedSkill ? `${selectedSkill.name} · MP ${selectedSkill.mpCost} · ${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : <>{active.monster.name} <small>{showSkills ? `とくぎ ${Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)}/${MAX_SPECIAL_SKILLS} · MP ${active.mp}/${active.monster.mp}` : `HP ${active.hp}/${active.monster.hp} · MP ${active.mp}/${active.monster.mp}`}</small></>}</span>{selectedSkill || showSkills ? <button className="backToSkills" onClick={() => { if (pendingSkill !== null) setPendingSkill(null); else setShowSkills(false); }}>‹ {selectedSkill && showSkills ? '特技に戻る' : 'コマンドに戻る'}</button> : <button onClick={() => setFocus(active.monster.id)} className="detailButton">詳細</button>}</div>
          {selectedSkill ? <div className={`targetButtons ${skillTargetsAllies(selectedSkill) ? 'allyTargets' : 'enemyTargets'}`} aria-label={`${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}の対象を選択`}>{targets.map(u => <button key={u.key} aria-label={`${u.monster.name}を対象に選択`} onClick={() => { if (pendingSkill !== null) commitOrder(pendingSkill, u.key); }}><span aria-hidden="true"><MonsterArt monster={u.monster} portrait /></span><small>{u.hp}/{u.monster.hp}</small><div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div></button>)}</div> : showSkills ? <div className="skillButtons" aria-label="とくぎを選択">{active.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((s, i) => <button key={i} className={`${!automaticKeys.includes(active.key) && orders[active.key]?.skill === i ? 'chosen' : ''} skill-${effectType(s.name, s.kind)}`} disabled={!canUseSkill(active, s)} title={s.fixedDamage ? `${fixedDamageHint(s, active)}。攻撃力に依存せず、乱数±10%・守り・自然障壁は有効。${s.dragonChargeFinisher ? '竜気は中核＋竜系3体以上で有効。息の発動時に全消費し、解除・中核撃破で失います。' : ''}` : undefined} onClick={() => selectSkill(i)}><strong>{s.name}</strong><span className={`skillMp ${!canUseSkill(active, s) ? 'insufficient' : ''}`}>MP {s.mpCost}{!canUseSkill(active, s) ? ' · MP不足' : ''}</span><small>{skillOrderLabel(s)} / {s.kind === 'guard' ? '防御' : s.kind === 'protect' ? '味方を守る' : s.kind === 'cleanse' ? '毒解除＋回復' : s.kind === 'heal' ? `回復 ${s.power}` : s.randomHits ? `ランダム${barrageHits(s, battle.allies)}回${s.breaksGuardAfterHit ? '・強化解除' : s.familyBonusHit && barrageHits(s, battle.allies) > s.randomHits ? '・獣5体の追撃' : ''}` : s.breaksGuard ? '防御・竜気解除' : s.fixedDamage ? `${s.all ? '全体' : '単体'}・${fixedDamageHint(s, active)}${s.dragonChargeFinisher ? '・全消費' : ''}` : `${s.all ? '全体' : '単体'} ${s.power}`} </small></button>)}</div> : <div className="commandButtons" aria-label="コマンドを選択">
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
    {focus !== null && <MonsterDetails id={focus} onClose={() => setFocus(null)} />}
    {showTactics && battle && <TacticsPanel battle={battle} orders={orders} playing={playing} rule={rule} onClose={()=>setShowTactics(false)} />}
    {showLog && battle && <div className="overlay" onClick={() => setShowLog(false)}><section className="modal logModal" role="dialog" aria-modal="true" aria-label="戦闘ログ" onClick={e => e.stopPropagation()}><button className="close" aria-label="戦闘ログを閉じる" onClick={() => setShowLog(false)}>×</button><h2>戦闘ログ</h2>{playing && <p className="hint">現在のターンの記録は演出後に表示されます。</p>}<div className="log">{battle.log.map((line, i) => <div key={i}>{line}</div>)}</div><details className="historyLedger"><summary>全ターンの指示・イベント記録</summary>{battle.history?.map(record => <details key={record.turn}><summary>TURN {record.turn} · {record.events.length}件の記録</summary><h3>確定した指示</h3><ol>{record.orders.map((order, index) => <li key={index}>{battleOrderLine(battle, order)}</li>)}</ol><h3>実際の出来事</h3><ol>{record.events.map((event, index) => <li key={index}>{battleEventLine(battle, event)}</li>)}</ol></details>)}</details></section></div>}
    {(page === 'arena' || page === 'team') && <footer className="screenAction"><p>{page === 'team' ? `${rules[rule].name} · ${team.length}/5体 · COST ${cost(team)}/${rules[rule].budget}` : team.length !== 5 ? `あと${5 - team.length}体を編成してください` : cost(team) > rules[rule].budget ? `あとCOST ${cost(team) - rules[rule].budget}減らすと出場できます` : `第${round + 1}戦 · ${rules[rule].name} · 準備完了`}</p><button className="primary" disabled={page === 'arena' && !isValidTeam(team, rules[rule].budget)} onClick={() => page === 'team' ? navigate('arena') : begin()}>{page === 'team' ? '闘技場へ →' : practice ? 'この編成で同じ相手に再戦 →' : 'この編成で対戦する →'}</button></footer>}
    {page !== 'battle' && <nav className="mainNav" aria-label="メインメニュー">{([['home', 'ホーム', '⌂'], ['team', '編成', '✦'], ['arena', '闘技場', '⚔']] as const).map(([target, label, icon]) => <button key={target} aria-label={label} aria-current={page === target ? 'page' : undefined} onClick={() => navigate(target)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>}
    {navigation.pending && <LeaveBattleDialog onCancel={navigation.cancel} onConfirm={navigation.confirm} finished={!!battle?.winner} />}

  </div>;
}
