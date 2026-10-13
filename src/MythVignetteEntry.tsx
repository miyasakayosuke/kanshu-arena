import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { mythScene } from './mythVignettes';

const loadPlayer = () => import('./components/MythVignette');
type Player = ComponentType<{ id: number; onOpenChange?: (open: boolean) => void }>;

/** Download scene rendering only for an opened core profile. Never auto-open a movie. */
export default function MythVignetteEntry({ id, load = loadPlayer, onOpenChange }: { id: number; load?: () => Promise<{ default: Player }>; onOpenChange?: (open: boolean) => void }) {
  const available = !!mythScene(id);
  const [PlayerComponent, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<'loading' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const restoreRetryFocus = useRef(false);
  useEffect(() => {
    if (!available) return;
    let active = true;
    setStatus('loading');
    load().then(module => {
      if (!active) return;
      restoreRetryFocus.current = !!retry.current && document.activeElement === retry.current;
      setPlayer(() => module.default);
    }).catch(() => { if (active) setStatus('failed'); });
    return () => { active = false; };
  }, [available, attempt, load]);
  useLayoutEffect(() => {
    if (PlayerComponent && restoreRetryFocus.current) {
      // Only transfer focus owned by the replaced Retry. Ordinary loading never steals it.
      if (document.activeElement === document.body) host.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      restoreRetryFocus.current = false;
    }
  }, [PlayerComponent]);
  if (!available) return null;
  return <div ref={host} className="mythEntryHost">{PlayerComponent ? <PlayerComponent id={id} onOpenChange={onOpenChange} /> : <div className="mythEntryPending">
    <span role="status">{status === 'failed' ? '物語を読み込めませんでした。' : '物語を準備中…'}</span>
    {(status === 'failed' || attempt > 0) && <button ref={retry} className="secondary" aria-disabled={status === 'loading'} onClick={() => { if (status === 'failed') setAttempt(value => value + 1); }}>もう一度読み込む</button>}
  </div>}</div>;
}
