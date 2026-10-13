import MonsterArt from './MonsterArt';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { monsters, isExtraordinaryResponse, mpDamageFor, cost, start, advanceWithEvents, automaticOrders, AUTO, barrageHits, battleSkill, BASIC_ATTACK, DEFEND, MAX_SPECIAL_SKILLS, skillTargetsAllies, skillOrderLabel, canUseSkill, skillUnavailableReason, skillUnavailableLabel, effectStatus, type State, type Order, type BattleEvent } from './engine';
import { applyBattleEvents, buildTimeline, effectType } from './playback';
import BattleStage, {type CompactCastCaption} from './BattleStage';
import { partyNumberDuration, retainPartyNumbers, type PartyNumber } from './partyNumbers';
import { partyGuardCues, type PartyGuardCue } from './partyGuardCues';
import PartyGuardShield from './PartyGuardShield';
import TeamBuilder from './TeamBuilder';
import CatalogScreen from './CatalogScreen';
import { createRosterFilters } from './RosterBrowser';
import TacticsPanel from './TacticsPanel';
import HomeScreen, { ArenaLobby } from './HomeScreen';
import FamilyTrialPicker from './FamilyTrialPicker';
import { FAMILY_DEFINITIONS } from './families';
import LeaveBattleDialog from './LeaveBattleDialog';
import MonsterDetails from './MonsterDetails';
import BattleResult from './BattleResult';
import BattleLogDialog from './BattleLogDialog';
import { useScreenNavigation } from './navigation';
import { fixedDamageHint, poisonCashoutHint, rules, isValidTeam, initialTeam, type RuleId } from './strategy';
import { familyEncounterForSeed, familyTrialPresets, type FamilyTrialPreset, type FamilyEncounter } from './familyTrials';
import { poisonSkillDetail, poisonSkillHint } from './poisonDescription';
import { loadTeamWorkshop, currentTeam, updateCurrentTeam, selectWorkshopTeam, useWorkshopDraft, restorePreviousTeam, assignDraftToTeam, saveTeamWorkshop, migrateTeamWorkshop, parseTeamWorkshop, TEAM_WORKSHOP_KEY } from './teamWorkshop';
import { committedOrderLabel } from './committedOrder';
import './style.css';
import './tabCopy.css';

const COMMAND_SECONDS = 30;
export default function App() {
  const [workshop, setWorkshop] = useState(() => { try { return loadTeamWorkshop(localStorage); } catch { return migrateTeamWorkshop({ team: initialTeam, rule: 'standard' }, [null, null, null]); } });
  const [teamSaved, setTeamSaved] = useState(true);
  const remoteTeamPending = useRef(false);
  const teamPersistence = useRef(true);
  const latestWorkshop = useRef(workshop); latestWorkshop.current = workshop;
  const { team, rule } = currentTeam(workshop);
  const setTeam = (team: number[]) => setWorkshop(previous => updateCurrentTeam(previous, { team }));
  const setRule = (rule: RuleId) => setWorkshop(previous => updateCurrentTeam(previous, { rule }));
  const [catalogFilters, setCatalogFilters] = useState(createRosterFilters);
  const catalogScroll = useRef(0);
  const [catalogDetailIds, setCatalogDetailIds] = useState<number[]>([]);
  const [battle, setBattle] = useState<State | null>(null);
  const [lastBattle, setLastBattle] = useState<State | null>(null);
  const focusArenaOnReturn = useRef(false);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const turnStartButton = useRef<HTMLButtonElement>(null);
  const focusTurnStart = useRef(false);
  const [activeKey, setActiveKey] = useState('a0');
  const [pendingSkill, setPendingSkill] = useState<number | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const commandDock = useRef<HTMLElement>(null);
  const targetEntry = useRef<HTMLButtonElement | null>(null);
  const targetDockHeight = useRef<number | undefined>(undefined);
  const targetConsumed = useRef(false);
  const targetGeneration = useRef(0);
  const heldActivation = useRef(false);
  const suppressActivation = useRef(false);
  const targetEntrySkill = useRef<number | null>(null);
  const focusNextActor = useRef(false);
  const restoreTargetFocus = useRef(false);
  const cancelTarget = () => { ++targetGeneration.current; targetConsumed.current = true; restoreTargetFocus.current = true; setPendingSkill(null); };
  // A key held while focus changes must not activate a recipient or turn start.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.repeat && event.target instanceof Element && event.target.closest('.commandDock')) event.preventDefault();
      heldActivation.current = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (suppressActivation.current) event.preventDefault();
      heldActivation.current = false; suppressActivation.current = false;
    };
    const blur = () => { heldActivation.current = false; suppressActivation.current = false; };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', blur); };
  }, []);
  const [automaticKeys, setAutomaticKeys] = useState<string[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [enemyFocus, setEnemyFocus] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [encounter, setEncounter] = useState<FamilyEncounter | null>(null);
  const [showTactics, setShowTactics] = useState(false);
  const [showFamilyTrials, setShowFamilyTrials] = useState(false);
  const arenaHeading = useRef<HTMLHeadingElement>(null);
  const trialApplied = useRef(false);
  const [round, setRound] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [effect, setEffect] = useState<{ text: string; type: string; tick: number } | null>(null);
  const [impact, setImpact] = useState<BattleEvent | null>(null);
  const [visualCast, setVisualCast] = useState<BattleEvent | null>(null);
  const [compactCastCaption, setCompactCastCaption] = useState<CompactCastCaption | null>(null);
  const [impacts, setImpacts] = useState<BattleEvent[]>([]);
  const [partyNumbers, setPartyNumbers] = useState<PartyNumber[]>([]);
  const [partyGuards, setPartyGuards] = useState<PartyGuardCue[]>([]);
  useEffect(() => {
    if (!partyGuards.length) return;
    const expireGuards = () => setPartyGuards(previous => previous.filter(item => item.expires > Date.now()));
    window.addEventListener('focus', expireGuards);
    document.addEventListener('visibilitychange', expireGuards);
    return () => { window.removeEventListener('focus', expireGuards); document.removeEventListener('visibilitychange', expireGuards); };
  }, [partyGuards.length]);
  const [playing, setPlaying] = useState(false);
  const [commandPlayback, setCommandPlayback] = useState<{ current: string | null; completed: string[] }>({ current: null, completed: [] });
  const resetCommandPlayback = () => setCommandPlayback({ current: null, completed: [] });
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
  const discardBattle = () => {
    ++targetGeneration.current; targetConsumed.current = true;
    resetCommandPlayback();
    commandDeadline.current = null;
    ++playbackId.current; clearTimers(); latestResult.current = null; playingLock.current = false;
    setBattle(null); setPlaying(false); setOrders({}); setAutomaticKeys([]); setEffect(null); setVisualCast(null); setCompactCastCaption(null); setImpact(null); setImpacts([]); setPartyGuards([]); setPartyNumbers([]);
    setPendingSkill(null); setShowSkills(false); setShowLog(false); setShowTactics(false); setFocus(null); setEnemyFocus(null); setReplayProgress('');
    if (battle?.winner) { setLastBattle(battle); setRound(n => n + 1); }
    setPractice(false); setEncounter(null);
  };
  const navigation = useScreenNavigation(!!battle && !battle.winner, discardBattle);
  const { page, navigate } = navigation;
  useEffect(() => () => { ++playbackId.current; clearTimers(); commandDeadline.current = null; }, []);
  useEffect(() => {
    if (page !== 'battle' || !battle?.winner || playing) return;
    // Only the fully committed result can leave the battlefield. In particular,
    // the final impact and recovery cues must finish before ordinary playback exits.
    // Retry if a browser Back restoration is still settling when the match ends.
    const completedPlayback = playbackId.current;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const returnToArena = () => {
      if (completedPlayback !== playbackId.current) return;
      focusArenaOnReturn.current = true;
      if (!navigate('arena', true)) retry = setTimeout(returnToArena, 50);
    };
    returnToArena();
    return () => clearTimeout(retry);
  }, [page, battle?.winner, playing]);
  useLayoutEffect(() => {
    if (page === 'arena' && focusArenaOnReturn.current) {
      focusArenaOnReturn.current = false;
      arenaHeading.current?.focus({ preventScroll: true });
    } else if (page !== 'battle') focusArenaOnReturn.current = false;
  }, [page]);
  useEffect(() => { setFocus(null); setShowLog(false); setShowTactics(false); setShowFamilyTrials(false); window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    if (page === 'arena' && !showFamilyTrials && trialApplied.current) {
      trialApplied.current = false; arenaHeading.current?.focus();
    }
  }, [page, showFamilyTrials]);
  useEffect(() => {
    if (page !== 'battle' || !battle || battle.winner) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [page, battle?.winner]);
  useEffect(() => {
    try { teamPersistence.current = saveTeamWorkshop(localStorage, workshop); } catch { teamPersistence.current = false; }
    setTeamSaved(teamPersistence.current);
    try { localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team, rule })); if (team.length === 5) localStorage.setItem('kanshu-team', JSON.stringify(team)); } catch { /* optional */ }
  }, [workshop]);
  useEffect(() => {
    const syncTeams = (event?: StorageEvent) => {
      if (event && (event.key !== TEAM_WORKSHOP_KEY || !event.newValue)) return;
      // Never discard edits that only exist in this tab after a storage failure.
      if (!teamPersistence.current) return;
      if (page === 'battle') { remoteTeamPending.current = true; return; }
      if (!event && !remoteTeamPending.current) return;
      remoteTeamPending.current = false;
      // Team changes commit atomically; a remote change clears stale picker previews.
      try {
        const next = parseTeamWorkshop(JSON.parse(localStorage.getItem(TEAM_WORKSHOP_KEY) ?? 'null'));
        if (!next) return;
        if (currentTeam(next).rule !== currentTeam(latestWorkshop.current).rule) { setPractice(false); setEncounter(null); }
        setWorkshop(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      } catch { /* A denied storage area cannot block the in-memory party. */ }
    };
    // A battle retains its chosen party and same-condition retry; catch up when leaving.
    if (page !== 'battle') syncTeams();
    window.addEventListener('storage', syncTeams);
    return () => window.removeEventListener('storage', syncTeams);
  }, [page]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (navigation.pending) { e.preventDefault(); navigation.cancel(); return; }
      // Fallback for Escape outside the focused dialog. Claim the event before
      // its unmount can expose the catalog/editor to another window listener.
      if (enemyFocus !== null) { e.preventDefault(); setEnemyFocus(null); return; }
      if (focus !== null) { e.preventDefault(); setFocus(null); return; }
      setShowLog(false); setShowTactics(false);
      if (pendingSkill !== null) { e.preventDefault(); cancelTarget(); }
      if (pendingSkill === null) setShowSkills(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [focus, enemyFocus, pendingSkill, navigation.pending]);
  const startLock = useRef(false);
  useEffect(() => { startLock.current = false; }, [page, battle?.winner]);
  const begin = () => {
    if (startLock.current || page !== 'arena') return;
    if (!isValidTeam(team, rules[rule].budget)) return;
    startLock.current = true;
    ++playbackId.current;
    // A new match begins only on an explicit lobby action and uses a fresh draw.
    const nextEncounter = familyEncounterForSeed(rule, Math.floor(Math.random() * 0x100000000));
    setLastBattle(null);
    setEncounter(nextEncounter);
    clearTimers(); commandDeadline.current = null; playingLock.current = false; latestResult.current = null;
    resetCommandPlayback();
    setTimedOut(false); setEnemyFocus(null);
    setBattle(start(team, nextEncounter.enemy, nextEncounter.seed, { leaders: true }));
    setOrders({}); setAutomaticKeys([]); setActiveKey('a0'); setPendingSkill(null); setShowSkills(false); setEffect(null); setVisualCast(null); setCompactCastCaption(null); setImpact(null); setImpacts([]); setPartyGuards([]); setPartyNumbers([]);
    setPlaying(false); setShowLog(false); setShowTactics(false); navigate('battle'); setNotice('');
  };
  const living = battle?.allies.filter(u => u.hp > 0) ?? [];
  const active = living.find(u => u.key === activeKey) ?? living[0];
  const committedCommand = battle && active ? committedOrderLabel(battle, active, orders[active.key], automaticKeys.includes(active.key)) : null;
  const selectedSkill = pendingSkill !== null && active ? battleSkill(active.monster, pendingSkill) : null;
  const targets = battle && selectedSkill ? (skillTargetsAllies(selectedSkill) ? battle.allies : battle.enemies).filter(u => u.hp > 0) : [];
  const targetKeys = targets.map(u => u.key);
  const renderedTargetGeneration = targetGeneration.current;
  const allyTargeting = !!selectedSkill && skillTargetsAllies(selectedSkill);
  const targetContext = useRef({ activeKey: active?.key, pendingSkill, page, battle, blocked: false });
  targetContext.current = { activeKey: active?.key, pendingSkill, page, battle,
    blocked: playing || !!navigation.pending || focus !== null || enemyFocus !== null || showLog || showTactics };
  useLayoutEffect(() => {
    if (pendingSkill !== null && allyTargeting && page === 'battle' && !playing && !navigation.pending && focus === null && enemyFocus === null && !showLog && !showTactics) {
      // Start at explicit cancellation, away from recipients and held-key defaults.
      commandDock.current?.querySelector<HTMLButtonElement>('.backToSkills')?.focus({ preventScroll: true });
    } else if (restoreTargetFocus.current) {
      restoreTargetFocus.current = false;
      if (page === 'battle' && !playing && !navigation.pending && focus === null && enemyFocus === null && !showLog && !showTactics
        && commandDeadline.current !== null && Date.now() < commandDeadline.current) (commandDock.current?.querySelector<HTMLButtonElement>(`[data-skill-index="${targetEntrySkill.current}"]`) ?? targetEntry.current)?.focus({ preventScroll: true });
    }
    if (pendingSkill === null) targetDockHeight.current = undefined;
  }, [pendingSkill, allyTargeting, page, playing, navigation.pending]);
  // A delayed browser timer must not accept a command after the real deadline.
  const commandsExpired = () => {
    if (commandDeadline.current !== null && Date.now() >= commandDeadline.current) {
      timeoutAction.current();
      return true;
    }
    return false;
  };
  const inspectionAllowed = page === 'battle' && !!battle && !battle.winner && !playing && pendingSkill === null && !navigation.pending && focus === null && !showLog && !showTactics;
  const latestInspection = useRef({ allowed: inspectionAllowed, battle });
  latestInspection.current = { allowed: inspectionAllowed, battle };
  const inspectEnemy = (key: string) => {
    // Recheck current state and the wall-clock deadline even for a queued click.
    if (!latestInspection.current.allowed || playingLock.current || commandsExpired()) return;
    if (!latestInspection.current.battle?.enemies.some(unit => unit.key === key)) return;
    setEnemyFocus(key);
  };
  useEffect(() => { setEnemyFocus(null); }, [page, battle?.turn, battle?.winner, navigation.pending]);
  const inspectedEnemy = inspectionAllowed && enemyFocus !== null ? battle?.enemies.find(unit => unit.key === enemyFocus) : undefined;
  const commitOrder = (skill: number, target?: string, automatic = false) => {
    if (commandsExpired() || !active || battle?.winner || playingLock.current) return;
    const selected = battleSkill(active.monster, skill);
    if (skill !== AUTO && (!selected || !canUseSkill(active, selected, battle?.allies))) return;
    const next = { ...orders, [active.key]: { key: active.key, skill, target } };
    setOrders(next); setPendingSkill(null); setShowSkills(false);
    setAutomaticKeys(keys => automatic ? [...keys.filter(key => key !== active.key), active.key] : keys.filter(key => key !== active.key));
    const unselected = living.find(u => !next[u.key]);
    if (unselected) { setActiveKey(unselected.key); focusNextActor.current = true; }
    else focusTurnStart.current = true;
  };
  const selectSkill = (index: number) => {
    if (commandsExpired() || !active || battle?.winner || playingLock.current) return;
    const skill = battleSkill(active.monster, index);
    if (!skill || !canUseSkill(active, skill, battle?.allies)) return;
    if (skill.all || skill.randomHits || skill.kind === 'guard') commitOrder(index);
    else {
      targetConsumed.current = false;
      ++targetGeneration.current;
      suppressActivation.current = heldActivation.current;
      targetEntrySkill.current = index;
      targetEntry.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
      targetDockHeight.current = skillTargetsAllies(skill) ? commandDock.current?.getBoundingClientRect().height : undefined;
      setPendingSkill(index);
    }
  };
  const selectTarget = (key: string, event?: React.MouseEvent) => {
    const latest = targetContext.current;
    if (targetConsumed.current || renderedTargetGeneration !== targetGeneration.current || latest.activeKey !== active?.key || latest.pendingSkill !== pendingSkill
      || latest.battle !== battle || latest.page !== 'battle' || latest.blocked || pendingSkill === null
      || !targetKeys.includes(key) || (event && (event.detail > 1 || (event.detail === 0 && suppressActivation.current)))) return;
    targetConsumed.current = true;
    commitOrder(pendingSkill, key);
  };
  useLayoutEffect(() => {
    if (!focusNextActor.current) return;
    focusNextActor.current = false;
    if (page === 'battle' && !playing && !navigation.pending && pendingSkill === null && focus === null && enemyFocus === null && !showLog && !showTactics
      && commandDeadline.current !== null && Date.now() < commandDeadline.current)
      commandDock.current?.querySelector<HTMLButtonElement>('.commander.active')?.focus({ preventScroll: true });
  }, [orders, activeKey, page, playing, pendingSkill, navigation.pending]);
  const selectAutomatic = () => {
    if (commandsExpired() || !battle || !active || battle.winner || playingLock.current) return;
    commitOrder(AUTO, undefined, true);
  };
  useLayoutEffect(() => {
    if (!focusTurnStart.current) return;
    // Consume the request in this commit. A later dialog dismissal, turn, or
    // navigation must not resurrect it or take focus away from an overlay.
    focusTurnStart.current = false;
    if (page !== 'battle' || !battle || battle.winner || playing || playingLock.current || pendingSkill !== null
      || focus !== null || enemyFocus !== null || showLog || showTactics || navigation.pending || !living.length || living.some(unit => !orders[unit.key])
      || commandDeadline.current === null || Date.now() >= commandDeadline.current) return;
    const button = turnStartButton.current;
    if (!button || button.disabled) return;
    button.focus({ preventScroll: true });
    button.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
  }, [orders, page, battle, playing, pendingSkill, focus, enemyFocus, showLog, showTactics, navigation.pending]);
  const finishPlayback = () => {
    resetCommandPlayback();
    clearTimers();
    const next = latestResult.current;
    if (next) { setBattle(next); setActiveKey(next.allies.find(u => u.hp > 0)?.key ?? 'a0'); }
    setEffect(null); setVisualCast(null); setCompactCastCaption(null); setImpact(null); setImpacts([]); setPartyGuards([]); setPartyNumbers([]); setPlaying(false); playingLock.current = false;
    setReplayProgress(''); latestResult.current = null;
  };
  const execute = (timeout = false) => {
    const expired = timeout || (commandDeadline.current !== null && Date.now() >= commandDeadline.current);
    if (page !== 'battle' || !battle || battle.winner || playingLock.current || commandDeadline.current === null || (!expired && pendingSkill !== null)) return;
    // Lock synchronously: a manual click and the deadline can resolve this turn only once.
    playingLock.current = true; commandDeadline.current = null;
    setTimedOut(expired); setFocus(null); setEnemyFocus(null); setShowLog(false); setShowTactics(false);
    const cmds = automaticOrders(battle, Object.values(orders));
    const result = advanceWithEvents(battle, cmds);
    latestResult.current = result.state;
    resetCommandPlayback();
    setPlaying(true); setOrders({}); setAutomaticKeys([]); setPendingSkill(null); setShowSkills(false); setImpact(null); setImpacts([]); setPartyGuards([]); setPartyNumbers([]);
    clearTimers();
    const timeline = buildTimeline(result.events);
    const id = ++playbackId.current;
    const playbackStartedAt = Date.now();
    for (const command of timeline.commands) {
      timers.current.push(setTimeout(() => {
        if (id === playbackId.current) setCommandPlayback(previous => ({ ...previous, current: command.actor }));
      }, command.start / speed));
      timers.current.push(setTimeout(() => {
        if (id === playbackId.current) setCommandPlayback(previous => ({
          current: previous.current === command.actor ? null : previous.current,
          completed: [...new Set([...previous.completed, command.actor])],
        }));
      }, command.end / speed));
    }
    let castIndex = 0;
    let visualIndex = 0;
    const total = result.events.filter(e => e.kind === 'cast').length;
    for (const [cueIndex, cue] of timeline.cues.entries()) {
      const starts = !!cue.cast && !cue.impacts.length;
      const tick = starts ? ++visualIndex : visualIndex;
      const command = starts && !cue.passive ? ++castIndex : castIndex;
      timers.current.push(setTimeout(() => {
        if (id !== playbackId.current) return;
        // Resource spend and phase expiry are authoritative, including cues without a visual.
        const updates = [...(cue.updates ?? []), ...cue.impacts];
        if (updates.length) setBattle(prev => prev ? applyBattleEvents(prev, updates) : prev);
        if (!cue.cast && !cue.impacts.length && cue.updates?.length) return;
        if (!cue.impacts.length) {
          setVisualCast(cue.cast); setImpacts([]); setPartyGuards([]); setImpact(cue.cast);
          if (cue.cast) {
            setEffect({ text: cue.cast.skill ?? '攻撃', type: cue.cast.effect === 'responseCleanse' ? 'portal' : cue.cast.effect === 'responseGuard' ? 'lattice' : effectType(cue.cast.skill ?? '', cue.cast.effect), tick: id * 100 + tick });
            setReplayProgress(cue.updates?.some(event => event.kind === 'fallback') ? `${Math.min(command, total)} / ${total} · MP不足で通常攻撃` : cue.passive ? '特性 · 一度だけ' : `${Math.min(command, total)} / ${total}`);
          } else { setEffect({ text: '毒のダメージ', type: 'shadow', tick: id * 100 + tick }); }
        } else {
          setImpact(cue.impacts.find(e => e.kind === 'damage' || e.kind === 'heal' || e.kind === 'resource-gain' || e.kind === 'resource-loss') ?? cue.impacts[0]);
          setImpacts(cue.impacts);
          const now = Date.now();
          const guards = partyGuardCues(cue.impacts, battle.allies.map(unit => unit.key), id, cueIndex,
            playbackStartedAt + cue.at / speed, speed, now);
          setPartyGuards(guards);
          if (guards.length) timers.current.push(setTimeout(() => {
            if (id === playbackId.current) setPartyGuards(previous => previous.filter(item => item.expires > Date.now()));
          }, Math.max(0, guards[0].expires - now)));
          setPartyNumbers(previous => retainPartyNumbers(previous, cue.impacts, battle.allies.map(unit => unit.key), id, tick, cueIndex, now, speed));
          // Independent expiry: a later hit/cast must not erase a still-readable number.
          timers.current.push(setTimeout(() => {
            if (id === playbackId.current) setPartyNumbers(previous => previous.filter(item => item.expires > Date.now()));
          }, partyNumberDuration(speed)));

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
  const leavePractice = () => { setPractice(false); setEncounter(null); setRound(n => n + 1); setNotice('同条件での再戦を終了しました。次の相手に挑みます。'); };
  const changeRule = (next: RuleId) => { if (next !== rule) { setRule(next); setPractice(false); setEncounter(null); setNotice(practice ? 'ルールを変更したため、同じ相手・同じシードの再戦を解除しました。' : ''); } };
  const chooseFamilyTrial = (selection: FamilyTrialPreset) => {
    const preset = familyTrialPresets.find(item => item.id === selection.id);
    if (!preset || !isValidTeam(preset.team, 17)) return;
    const nextRule = cost([...preset.team]) > rules[rule].budget ? 'standard' : rule;
    trialApplied.current = true;
    setWorkshop(previous => useWorkshopDraft(previous, { team: [...preset.team], rule: nextRule })); setPractice(false); setEncounter(null);
    setShowFamilyTrials(false);
    setNotice(`${preset.name}を選びました。保存した3枠はそのままです。`);
    navigate('arena');
  };
  const logBattle = page === 'battle' ? battle : lastBattle;
  const opponentLabel = encounter ? `対戦相手：${FAMILY_DEFINITIONS[encounter.family].label}` : '';
  const ready = living.filter(u => orders[u.key]).length;
  const incomingArea = playing && visualCast?.scope === 'all' && (visualCast.targets ?? []).some(key => battle?.allies.some(unit => unit.key === key));
  const areaLanded = incomingArea && impacts.some(event => (event.kind === 'damage' || event.kind === 'heal' || event.kind === 'resource-gain' || event.kind === 'resource-loss' || event.kind === 'cleanse' || event.kind === 'guard' || event.kind === 'poison') && event.actor === visualCast?.actor);
  const scopeLabel = ['responseCleanse', 'responseGuard'].includes(visualCast?.effect ?? '') ? `生存する${incomingArea ? '味方' : '敵側の仲間'}全員 ${visualCast?.targets?.length ?? 0}体` : visualCast?.effect === 'restoreMp' ? `生存する粘体系 ${visualCast.targets?.length ?? 0}体` : visualCast?.passive === 'material-repair' ? `生存する物質系 ${visualCast.targets?.length ?? 0}体` : visualCast?.scope === 'random' ? `ランダム${visualCast.hits}回` : visualCast?.scope === 'all' ? `${incomingArea ? '味方' : '敵'}全体 ${visualCast.targets?.length ?? 0}体` : '';
  const visibleCastCaption = playing && compactCastCaption?.event === visualCast ? compactCastCaption : null;
  return <div className={`app ${page === 'battle' ? `battleMode ${battle?.winner ? 'resultMode' : ''}` : `screen-${page}`}`}>
    <h1 className="srOnly">環獣のアリーナ</h1>
    {page === 'battle' && <header className="battleNavigation"><button className="headerHome iconButton" aria-label="ホーム" onClick={() => navigate('home')}>⌂ ホーム</button></header>}
    {showFamilyTrials && <FamilyTrialPicker presets={familyTrialPresets} rule={rule} onChoose={chooseFamilyTrial} onClose={() => setShowFamilyTrials(false)} />}
    {page === 'home' && <HomeScreen team={team} rule={rule} onFocus={setFocus} />}
    {page === 'arena' && <ArenaLobby headingRef={arenaHeading} onFamilyTrial={() => setShowFamilyTrials(true)} notice={notice} team={team} rule={rule} onFocus={setFocus} round={round} practice={practice} onRule={changeRule} onTeam={() => navigate('team')} onLeavePractice={leavePractice} result={lastBattle ? <BattleResult battle={lastBattle} onLog={() => setShowLog(true)} /> : null} />}
    {page === 'catalog' && <CatalogScreen filters={catalogFilters} setFilters={setCatalogFilters} scrollPosition={catalogScroll} onFocus={(id, ids) => { setCatalogDetailIds(ids ?? []); setFocus(id); }} />}
    {page === 'team' && <TeamBuilder detailsOpen={focus !== null} onCatalog={() => navigate('catalog')} workshop={workshop} saved={teamSaved} onSelectTeam={index => {
      const next = workshop.teams[index];
      if (next.rule !== rule) { setPractice(false); setEncounter(null); }
      setWorkshop(previous => selectWorkshopTeam(previous, index));
      setNotice(`チーム${index + 1}に切り替えました${practice && next.rule !== rule ? '。ルールを変更したため、同じ相手・同じシードの再戦を解除しました。' : ''}`);
    }} onResumeDraft={() => { setWorkshop(previous => previous.draft ? { ...previous, selected: null } : previous); setPractice(false); setEncounter(null); setNotice('一時編成に戻しました'); }} onRestoreDraft={() => { setWorkshop(restorePreviousTeam); setPractice(false); setEncounter(null); setNotice('前回の編成を復元しました。3チームはそのままです。'); }} onAssignDraft={index => { setWorkshop(previous => assignDraftToTeam(previous, index)); setNotice(`チーム${index + 1}に保存しました`); }} team={team} setTeam={setTeam} rule={rule} setRule={changeRule} onFocus={setFocus} notice={notice} setNotice={setNotice} practice={practice} leavePractice={leavePractice} />}
    {page === 'battle' && battle && <main tabIndex={-1} className={`battle${visibleCastCaption ? ' hasCompactCastCaption' : ''}`}>
      <div className="battleTop"><button className="iconButton" onClick={() => { ++targetGeneration.current; navigate('arena'); }} aria-label="闘技場に戻る">‹ 闘技場</button><span><b>TURN {Math.min(battle.turn - (battle.winner ? 1 : 0), 20)}</b><small>敵 {battle.enemies.filter(u => u.hp > 0).length} / 味方 {living.length}</small>{!battle.winner && !playing && <output className={`commandClock ${commandSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`コマンド入力 残り${commandSeconds}秒`}>残り <b>{commandSeconds}</b> 秒</output>}</span><div className="battleMenu"><button className="iconButton" onClick={() => { ++targetGeneration.current; setShowTactics(true); }}>作戦</button><button className="iconButton" onClick={event => { ++targetGeneration.current; event.currentTarget.focus({ preventScroll: true }); setShowLog(true); }}>ログ</button></div></div>
      {!battle.winner && <BattleStage onCompactCastCaption={setCompactCastCaption} allies={battle.allies} enemies={battle.enemies} effect={effect} castEvent={visualCast} impact={impact} impacts={impacts} playbackRate={speed} targetKeys={targetKeys} onInspectEnemy={inspectionAllowed ? inspectEnemy : undefined} selectedTarget={active ? orders[active.key]?.target : undefined} onSelectTarget={key => selectTarget(key)} />}
      <div className="battleMessage" aria-live="polite"><span className={visibleCastCaption ? 'castCaptionAnnouncement' : undefined}>{battle.winner ? `${opponentLabel} · 対戦終了` : playing ? `${effect?.text ?? '行動開始'}${scopeLabel ? ` · ${scopeLabel}` : ''}　${replayProgress}` : selectedSkill ? `${selectedSkill.name}：下の${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : ready === living.length ? '指示がそろいました。ターンを開始できます。' : `${opponentLabel} · 行動を選択 ${ready}/${living.length}　未選択はおまかせ`}</span>{visibleCastCaption && <span className="battleCastCaption" aria-hidden="true">{visibleCastCaption.lines.map((line, index) => <span key={index}>{line}</span>)}<span>{replayProgress}</span></span>}</div>
      {!battle.winner && <section ref={commandDock} onClickCapture={event => { if (event.detail > 1) { event.preventDefault(); event.stopPropagation(); } }} className={`commandDock${allyTargeting ? ' choosingAlly' : ''}`} style={allyTargeting && targetDockHeight.current ? { minHeight: targetDockHeight.current } : undefined} aria-label="行動指示">
        <div className={`commanderRow ${playing ? 'retainingNumbers' : ''} ${incomingArea ? `partyArea area-${effect?.type ?? 'slash'} ${areaLanded ? 'landed' : 'charging'}` : ''}`} style={{'--hit-duration': `${300 / speed}ms`, '--number-duration': `${partyNumberDuration(speed)}ms`, '--hp-duration': `${180 / speed}ms`} as React.CSSProperties} data-area-targets={incomingArea ? visualCast?.targets?.join(',') : undefined}>
          {incomingArea && <span key={`${effect?.tick}-${areaLanded}`} className="partySweep" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
          {battle.allies.map((u, slot) => {
          const response = impacts.find(event => event.target === u.key && (event.effect === 'extraordinary-response-cleanse' || event.effect === 'extraordinary-response-guard'));
          const cashout = impacts.find(event => event.target === u.key && event.kind === 'poison-cashout');
          const feedbacks = impacts.filter(event => event.target === u.key && (event.kind === 'damage' || event.kind === 'heal' || event.kind === 'resource-gain' || event.kind === 'resource-loss'));
          const feedback = feedbacks[0];
          const numbers = partyNumbers.filter(item => item.event.target === u.key);
          const guardCue = playing && u.hp > 0 ? partyGuards.find(item => item.target === u.key && item.expires > Date.now()) : undefined;
          const acting = playing && commandPlayback.current === u.key;
          const completed = playing && commandPlayback.completed.includes(u.key) && !acting && u.hp > 0;
          const landed = acting && impacts.some(event => event.actor === u.key);
          const areaTarget = incomingArea && visualCast?.targets?.includes(u.key);
          const status = u.hp <= 0 ? '戦闘不能' : effectStatus(u);
          return <button key={u.key} className={`commander ${allyTargeting && u.hp > 0 ? 'allyRecipient' : ''} ${!playing && !allyTargeting && active?.key === u.key ? 'active' : ''} ${orders[u.key] ? 'ordered' : ''} ${acting ? `acting ${landed ? 'recovering' : 'preparing'}` : ''} ${completed ? 'actionCompleted' : ''} ${u.hp <= 0 ? 'fallen' : ''} ${u.ward && u.hp > 0 ? 'natureWarded' : ''} ${feedback ? `party-${feedback.kind}` : ''} ${areaTarget ? 'areaTarget' : ''}`} data-area-target={areaTarget ? 'true' : undefined} disabled={playing || u.hp <= 0} aria-label={allyTargeting ? `味方${slot + 1} ${u.monster.name}を${selectedSkill!.name}の対象に選択` : `${u.monster.name}の行動を選択`} aria-pressed={allyTargeting ? undefined : !playing && active?.key === u.key} aria-describedby={`party-hp-${u.key} party-mp-${u.key} party-status-${u.key} party-command-${u.key}`} onClick={event => { if (event.detail > 1) return; if (allyTargeting) { selectTarget(u.key, event); return; } if (commandsExpired() || playingLock.current || navigation.pending) return; ++targetGeneration.current; setActiveKey(u.key); setPendingSkill(null); setShowSkills(false); }}>
            <div className="commanderVisual">
            <span className="commanderIcon" aria-hidden="true"><MonsterArt monster={u.monster} portrait /></span>
            {guardCue && <PartyGuardShield key={guardCue.id} cue={guardCue} />}
            {numbers.map(({ id, event: feedback, lane }) => <b style={{top: 2 + lane * 14}} key={id} data-number-id={id} className={`partyImpact ${feedback.kind}`} aria-label={`${feedback.kind === 'resource-loss' ? 'MP減少' : feedback.kind === 'resource-gain' ? 'MP補給' : feedback.kind === 'heal' ? '回復' : 'ダメージ'} ${feedback.amount}`}>{feedback.kind === 'resource-loss' ? 'MP−' : feedback.kind === 'resource-gain' ? 'MP+' : feedback.kind === 'heal' ? '+' : '−'}{feedback.amount}</b>)}
            </div>
            {areaTarget && <span key={`${effect?.tick}-${areaLanded}`} className="partyAura" aria-hidden="true" style={{animationDuration: `${(areaLanded ? 650 : 800) / speed}ms`}} />}
            <small className="commanderHp" id={`party-hp-${u.key}`}>HP {u.hp}/{u.monster.hp}</small>
            <div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div>
            <small className="commanderMp" id={`party-mp-${u.key}`}>MP {u.mp}/{u.monster.mp}</small>
            <div className="mpBar"><b style={{ width: `${u.monster.mp > 0 ? u.mp / u.monster.mp * 100 : 0}%` }} /></div>
            <i id={`party-command-${u.key}`}>{u.hp <= 0 ? '戦闘不能' : allyTargeting ? '＋ 対象に選択' : playing ? acting ? '行動中' : completed ? '行動済' : '待機' : orders[u.key] ? automaticKeys.includes(u.key) ? 'おまかせ ✓' : '指示済 ✓' : '未選択'}</i>
            <div className="commanderBadges">
            <em className="commanderStatus" id={`party-status-${u.key}`} aria-label={status || '状態異常なし'}>{u.hp > 0 ? status : ''}</em>
            {response && <em className="partyResponse" role="status">{response.kind === 'cleanse' ? '現在の毒を解除' : '守り:今T'}</em>}
            </div>
            {cashout && <em className="partyCashout" role="status">毒{cashout.poisonTicksConsumed}回消費</em>}

          </button>;
        })}</div>
        {playing ? <div className="playingPanel"><div className="playPulse">✦</div><p>{timedOut ? '時間切れ · 未入力はおまかせで行動' : 'モンスターが行動中'}</p><button className="secondary" onClick={finishPlayback}>演出をスキップ</button></div> : active && <><div className={`commandHeading${!showSkills && !selectedSkill && committedCommand ? ' hasCommittedOrder' : ''}`}><span>{selectedSkill ? `${allyTargeting ? `${active.monster.name}：` : ''}${selectedSkill.name} · MP ${selectedSkill.mpCost} · ${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}を選択` : <>{active.monster.name} {!showSkills && committedCommand ? <span className="committedOrder"> / {committedCommand}</span> : <small>{showSkills ? `とくぎ ${Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)}/${MAX_SPECIAL_SKILLS} · MP ${active.mp}/${active.monster.mp}` : `HP ${active.hp}/${active.monster.hp} · MP ${active.mp}/${active.monster.mp}`}</small>}</>}</span>{selectedSkill || showSkills ? <button className="backToSkills" onClick={event => { if (event.detail === 0 && suppressActivation.current) return; if (pendingSkill !== null) cancelTarget(); else setShowSkills(false); }}>‹ {selectedSkill && showSkills ? '特技に戻る' : 'コマンドに戻る'}</button> : <button onClick={() => setFocus(active.monster.id)} className="detailButton">詳細</button>}</div>
          {selectedSkill ? allyTargeting ? null : <div className={`targetButtons ${skillTargetsAllies(selectedSkill) ? 'allyTargets' : 'enemyTargets'}`} aria-label={`${skillTargetsAllies(selectedSkill) ? '味方' : '敵'}の対象を選択`}>{targets.map(u => <button key={u.key} aria-label={`${u.monster.name}を対象に選択`} onClick={event => selectTarget(u.key, event)}><span aria-hidden="true"><MonsterArt monster={u.monster} portrait /></span><small>{u.hp}/{u.monster.hp}</small>{selectedSkill.poisonCashout && <em className="cashoutTargetHint" title={poisonCashoutHint(active, selectedSkill, u)}>{poisonCashoutHint(active, selectedSkill, u, true)}</em>}<div className="hpBar"><b style={{ width: `${u.hp / u.monster.hp * 100}%` }} /></div></button>)}</div> : showSkills ? <div className="skillButtons" aria-label="とくぎを選択">{active.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((s, i) => <button key={i} data-skill-index={i} className={`${!automaticKeys.includes(active.key) && orders[active.key]?.skill === i ? 'chosen' : ''} skill-${effectType(s.name, s.kind)}`} disabled={!canUseSkill(active, s, battle.allies)} title={s.kind === 'poison' ? poisonSkillDetail(s, active) : isExtraordinaryResponse(s) ? '生存味方全員が対象。二つで共通の1回、発動時にMP24と回数を消費。HP回復・蘇生・毒予防なし。' : s.poisonCashout ? poisonCashoutHint(active, s) + '。今後の毒を失い、守り・自然障壁で追加分も軽減。' : s.fixedDamage ? `${fixedDamageHint(s, active)}。攻撃力に依存せず、乱数±10%・守り・自然障壁は有効。${s.dragonChargeFinisher ? '竜気は中核＋竜系3体以上で有効。息の発動時に全消費し、解除・中核撃破で失います。' : ''}` : undefined} onClick={() => selectSkill(i)}><strong>{s.name}</strong><span className={`skillMp ${!canUseSkill(active, s, battle.allies) ? 'insufficient' : ''}`}>MP {s.mpCost}{!canUseSkill(active, s, battle.allies) ? ` · ${skillUnavailableLabel(skillUnavailableReason(active, s, battle.allies)!)}` : ''}</span><small>{skillOrderLabel(s)} / {s.kind === 'poison' ? poisonSkillHint(s, active) : s.poisonCashout ? poisonCashoutHint(active, s) : s.kind === 'responseCleanse' ? `生存味方全員の現在毒解除・HP回復0・共通1回` : s.kind === 'responseGuard' ? `生存味方全員の守り:今T・共通1回` : s.kind === 'restoreMp' ? `MP補給+${s.power} · 粘体系・一度だけ` : s.kind === 'guard' ? '防御' : s.kind === 'protect' ? '味方を守る' : s.kind === 'cleanse' ? '毒解除＋回復' : s.kind === 'heal' ? '味方1体を回復' : s.randomHits ? `ランダム${barrageHits(s, battle.allies)}回${s.breaksGuardAfterHit ? '・強化解除' : s.familyBonusHit && barrageHits(s, battle.allies) > s.randomHits ? '・獣5体の追撃' : ''}` : s.breaksGuard ? '守り・蓄積・修復待ち解除' : s.fixedDamage ? `${s.all ? '全体' : '単体'}・${fixedDamageHint(s, active)}${s.dragonChargeFinisher ? '・全消費' : ''}` : `${s.all ? '全体' : '単体'}攻撃${s.mpDamage ? ` · 相手MP−${mpDamageFor(active, s)}` : ''}`} </small></button>)}</div> : <div className="commandButtons" aria-label="コマンドを選択">
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === BASIC_ATTACK ? 'chosen' : ''} onClick={() => selectSkill(BASIC_ATTACK)}><strong>たたかう</strong><small>通常攻撃 · MP 0</small></button>
            <button className={!automaticKeys.includes(active.key) && orders[active.key]?.skill === DEFEND ? 'chosen' : ''} onClick={() => commitOrder(DEFEND)}><strong>ぼうぎょ</strong><small>今ターン半減 · MP 0</small></button>
            <button className={!automaticKeys.includes(active.key) && (orders[active.key]?.skill ?? -1) >= 0 ? 'chosen' : ''} disabled={!active.monster.skills.length} onClick={() => setShowSkills(true)}><strong>とくぎ</strong><small>{Math.min(active.monster.skills.length, MAX_SPECIAL_SKILLS)} / {MAX_SPECIAL_SKILLS} 習得</small></button>
            <button className={automaticKeys.includes(active.key) ? 'chosen' : ''} onClick={selectAutomatic}><strong>おまかせ</strong><small>行動時に判断</small></button>
          </div>}
        </>}
        <div className="turnControls"><button className="speedButton" disabled={playing} aria-label="演出速度" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>演出 ×{speed}</button></div>
        {!playing && <button ref={turnStartButton} className="primary turnStart" disabled={pendingSkill !== null} onKeyDown={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }} onClick={() => execute()}>{pendingSkill !== null ? '対象を選んでください' : 'この指示でターン開始'}</button>}
      </section>}
    </main>}
    {inspectedEnemy && battle && <MonsterDetails key={`enemy-${inspectedEnemy.key}`} id={inspectedEnemy.monster.id} initialTab="skills" onClose={() => setEnemyFocus(null)} battleContext={{ label: `敵${battle.enemies.findIndex(unit => unit.key === inspectedEnemy.key) + 1} ${inspectedEnemy.monster.name}${inspectedEnemy.hp <= 0 ? ' · 戦闘不能' : ''}`, seconds: commandSeconds }} fallbackFocus={() => document.querySelector<HTMLElement>('main.battle, .mainNav button[aria-current="page"]')} />}
    {focus !== null && <MonsterDetails id={focus} onClose={() => setFocus(null)} navigation={page === 'catalog' ? { ids: catalogDetailIds, onSelect: setFocus } : undefined} />}
    {showTactics && battle && <TacticsPanel battle={battle} orders={orders} playing={playing} rule={rule} onClose={()=>setShowTactics(false)} />}
    {showLog && logBattle && !navigation.pending && <BattleLogDialog battle={logBattle} playing={playing} onClose={() => setShowLog(false)} fallbackFocus={() => arenaHeading.current ?? document.querySelector<HTMLButtonElement>('.battleMenu button:last-child, .mainNav button[aria-current="page"]')} />}
    {(page === 'arena' || page === 'team') && <footer className="screenAction"><p>{page === 'team' ? `${rules[rule].name} · ${team.length}/5体 · COST ${cost(team)}/${rules[rule].budget}` : team.length !== 5 ? `あと${5 - team.length}体を編成してください` : cost(team) > rules[rule].budget ? `あとCOST ${cost(team) - rules[rule].budget}減らすと出場できます` : `第${round + 1}戦 · ${rules[rule].name} · 準備完了`}</p><button className="primary" disabled={page === 'arena' && !isValidTeam(team, rules[rule].budget)} onClick={() => page === 'team' ? navigate('arena') : begin()}>{page === 'team' ? '闘技場へ →' : practice ? 'この編成で同じ相手に再戦 →' : 'この編成で対戦する →'}</button></footer>}
    {page !== 'battle' && <nav className="mainNav" aria-label="メインメニュー">{([['home', 'ホーム', '⌂'], ['catalog', '図鑑', '▤'], ['team', '編成', '✦'], ['arena', '闘技場', '⚔']] as const).map(([target, label, icon]) => <button key={target} aria-label={label} aria-current={page === target ? 'page' : undefined} onClick={() => navigate(target)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>}
    {navigation.pending && <LeaveBattleDialog onCancel={navigation.cancel} onConfirm={navigation.confirm} finished={!!battle?.winner} />}

  </div>;
}
