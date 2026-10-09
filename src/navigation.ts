import { useEffect, useRef, useState } from 'react';

export type Screen = 'home' | 'team' | 'arena' | 'battle';
const hashes: Record<Screen, string> = { home: '#home', team: '#team', arena: '#arena', battle: '#arena/battle' };
function readScreen(): Screen {
  return (Object.keys(hashes) as Screen[]).find(screen => hashes[screen] === window.location.hash) ?? 'home';
}
type Entry = { session: string; index: number };
type Pending = { target: Screen; delta: number | null };

/** Only the three non-battle screens are durable. A battle URL never starts a match. */
export function useScreenNavigation(blocked: boolean, onLeaveBattle: () => void) {
  const [page, setPage] = useState<Screen>(() => readScreen() === 'battle' ? 'arena' : readScreen());
  const [pending, setPending] = useState<Pending | null>(null);
  const current = useRef(page);
  const pendingRef = useRef<Pending | null>(null);
  const options = useRef({ blocked, onLeaveBattle });
  options.current = { blocked, onLeaveBattle };
  const session = useRef(`kanshu-${Date.now()}-${Math.random()}`);
  const index = useRef(0);
  const restoring = useRef(false);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmAfterRestore = useRef(false);
  const entry = (): Entry => ({ session: session.current, index: index.current });
  const replace = (screen: Screen) => window.history.replaceState({ kanshuNavigation: entry() }, '', hashes[screen]);
  const transition = (next: Screen) => {
    if (next === current.current) return;
    if (current.current === 'battle') options.current.onLeaveBattle();
    current.current = next;
    setPage(next);
  };
  const ask = (value: Pending) => { pendingRef.current = value; setPending(value); };
  const clearPending = () => { confirmAfterRestore.current = false; pendingRef.current = null; setPending(null); };
  const confirm = () => {
    const target = pendingRef.current;
    if (!target) return;
    if (restoring.current) { confirmAfterRestore.current = true; return; }
    clearPending();
    transition(target.target);
    if (target.delta !== null) {
      index.current += target.delta;
      window.history.go(target.delta);
    } else {
      index.current += 1;
      window.history.pushState({ kanshuNavigation: entry() }, '', hashes[target.target]);
    }
  };
  const navigate = (next: Screen, replaceEntry = false) => {
    if (current.current === next || restoring.current) return;
    if (current.current === 'battle' && options.current.blocked) { ask({ target: next, delta: null }); return; }
    clearPending();
    transition(next);
    if (!replaceEntry) index.current += 1;
    window.history[replaceEntry ? 'replaceState' : 'pushState']({ kanshuNavigation: entry() }, '', hashes[next]);
  };
  useEffect(() => {
    replace(current.current);
    const clearRestoreTimer = () => {
      if (restoreTimer.current !== null) clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    };
    const finishRestore = () => {
      clearRestoreTimer();
      restoring.current = false;
      if (confirmAfterRestore.current) confirm();
    };
    const reconcileRestore = () => {
      clearRestoreTimer();
      // A second Back can run before our first compensating traversal. Coalesce
      // popstate/hashchange and use the latest position rather than a stale delta.
      restoreTimer.current = setTimeout(() => {
        restoreTimer.current = null;
        if (!restoring.current) return;
        const saved = window.history.state?.kanshuNavigation as Entry | undefined;
        if (saved?.session === session.current) {
          const delta = index.current - saved.index;
          if (delta) window.history.go(delta);
          else finishRestore();
        } else {
          // A hand-entered hash has no reliable history offset.
          if (pendingRef.current) ask({ ...pendingRef.current, delta: null });
          replace(current.current);
          finishRestore();
        }
      }, 0);
    };
    const onHistory = () => {
      const saved = window.history.state?.kanshuNavigation as Entry | undefined;
      const known = saved?.session === session.current;
      if (restoring.current) {
        if (known && saved.index === index.current) finishRestore();
        else reconcileRestore();
        return;
      }
      let target = readScreen();
      // Forward into a discarded match, or a hand-entered battle link, returns to reception.
      if (target === 'battle' && current.current !== 'battle') target = 'arena';
      if (target === current.current) {
        if (known) index.current = saved.index;
        if (window.location.hash !== hashes[target]) replace(target);
        return;
      }
      if (current.current === 'battle' && options.current.blocked) {
        const delta = known ? saved.index - index.current : 0;
        ask({ target, delta: delta || null });
        if (delta) {
          restoring.current = true;
          window.history.go(-delta);
        } else replace(current.current);
        return;
      }
      clearPending();
      transition(target);
      if (known) index.current = saved.index;
      if (!known || window.location.hash !== hashes[target]) replace(target);
    };
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    return () => {
      clearRestoreTimer();
      window.removeEventListener('popstate', onHistory);
      window.removeEventListener('hashchange', onHistory);
    };
  }, []);
  return { page, navigate, pending, cancel: clearPending, confirm };
}
