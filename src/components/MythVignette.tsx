import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clampMythTime, MYTH_DURATION, MYTH_STILLS, mythBeat, mythScene, type MythScene } from '../mythVignettes';
import { mythSceneSvg } from '../mythSceneSvg';
import './mythVignette.css';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

function MythPlayer({ scene, onClose }: { scene: MythScene; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [still, setStill] = useState(0);
  const [hiddenPause, setHiddenPause] = useState(false);
  const timeRef = useRef(0);
  const player = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId(), descriptionId = useId();
  const sample = reduced ? MYTH_STILLS[still] : time;
  const beat = reduced ? still : mythBeat(time);
  const ended = !reduced && time >= MYTH_DURATION;
  function seek(next: number) { const value = clampMythTime(next); timeRef.current = value; setTime(value); }

  useLayoutEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    // Layout cleanup releases inert before an enclosing profile's passive focus
    // restoration, including when both dialogs unmount in the same commit.
    // The scene is a top-level portal. Make the existing profile and page inert
    // while preserving every pre-existing inert state for nested dismissal.
    const background = [...document.body.children].filter(node => node !== portal.current) as HTMLElement[];
    const inertStates = background.map(node => [node, node.hasAttribute('inert')] as const);
    background.forEach(node => node.setAttribute('inert', ''));
    if (overflow !== 'hidden') document.body.style.overflow = 'hidden';
    close.current?.focus({ preventScroll: true });
    return () => {
      inertStates.forEach(([node, wasInert]) => { if (!wasInert) node.removeAttribute('inert'); });
      if (overflow !== 'hidden') document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => () => {
    // Restore after React's commit selection handling, which may otherwise
    // restore surviving BODY focus over the trigger during portal removal.
    if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
  }, []);

  useEffect(() => { if (reduced) { setPlaying(false); setStill(0); } }, [reduced]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) { setPlaying(false); setHiddenPause(true); }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0, stopped = false, previous: number | undefined, painted: number | undefined;
    const tick = (now: number) => {
      if (stopped) return;
      // A hidden document never jumps ahead or secretly consumes the scene.
      if (document.hidden) { setPlaying(false); setHiddenPause(true); return; }
      if (previous !== undefined) timeRef.current = clampMythTime(timeRef.current + Math.max(0, now - previous));
      previous = now;
      if (painted === undefined || now - painted >= 1000 / 30 || timeRef.current >= MYTH_DURATION) {
        setTime(timeRef.current); painted = now;
      }
      if (timeRef.current >= MYTH_DURATION) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [playing, reduced]);

  useLayoutEffect(() => {
    // Disabled terminal controls can drop native focus to BODY. The topmost
    // portal must own these keys before any profile/page fallback, regardless
    // of the event target. An inert player yields to a newer nested dialog.
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !portal.current || portal.current.closest('[inert]')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(player.current?.querySelectorAll<HTMLElement>('button, a[href], summary') ?? [])].filter(node => {
        if (node.matches(':disabled')) return false;
        const disclosure = node.closest('details');
        return !disclosure || disclosure.open || node.tagName === 'SUMMARY';
      });
      if (!controls.length) return;
      event.preventDefault(); event.stopPropagation();
      const current = controls.indexOf(document.activeElement as HTMLElement);
      const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!portal.current || portal.current.closest('[inert]')) return;
    const active = document.activeElement;
    // Repair only control-state transitions, never poll or refocus each frame.
    // This covers both native BODY fallback and DOMs retaining disabled focus.
    if (!player.current?.contains(active) || active?.matches(':disabled')) close.current?.focus({ preventScroll: true });
  }, [ended, reduced, still]);

  return createPortal(<div ref={portal} className="mythOverlay" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <section ref={player} className="mythPlayer" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} style={{ '--myth-colour': scene.colour } as React.CSSProperties}>
      <header className="mythHeader"><div><span>{scene.name} · 小さな物語</span><h2 id={titleId}>{scene.title}</h2></div><button ref={close} type="button" className="mythClose" onClick={onClose} aria-label="物語を閉じて詳細に戻る">×</button></header>
      <div className="mythContent">
        <p className="mythSetting">{scene.setting}</p>
        <div className="mythStage" role="img" aria-label={scene.description} data-scene={scene.id} data-time={Math.round(sample)} dangerouslySetInnerHTML={{ __html: mythSceneSvg(scene.id, sample) }} />
        <p id={descriptionId} className="mythCaption" aria-live="polite" aria-atomic="true">{scene.beats[beat]}</p>
        <div className="mythBeats" aria-label={`場面 ${beat + 1} / 3`}>{scene.beats.map((_,index) => <span key={index} className={index <= beat ? 'reached' : ''} aria-hidden="true" />)}</div>
        {reduced ? <>
          <p className="mythPlaybackStatus" role="status">動きを抑えて、3枚の場面で表示しています。</p>
          <div className="mythControls">
            <button type="button" disabled={still === 0} onClick={() => setStill(value => Math.max(0, value - 1))}>前の場面</button>
            <span className="mythStillCount">{still + 1} / 3</span>
            <button type="button" disabled={still === 2} onClick={() => setStill(value => Math.min(2, value + 1))}>次の場面</button>
            <button type="button" onClick={() => setStill(0)}>はじめから</button>
          </div>
        </> : <>
          <div className="mythProgress" role="progressbar" aria-label="物語の再生位置" aria-valuemin={0} aria-valuemax={9} aria-valuenow={Math.round(time / 1000)}><span style={{ width: `${time / MYTH_DURATION * 100}%` }} /></div>
          <p className="mythPlaybackStatus" role="status">{ended ? 'おしまい。もう一度、見ることもできます。' : playing ? '9秒の物語 · 音声なし' : hiddenPause ? '画面を離れたため一時停止しました。' : '一時停止中'}</p>
          <div className="mythControls">
            <button type="button" className="mythPrimary" onClick={() => { setHiddenPause(false); if (ended) seek(0); setPlaying(value => ended || !value); }}>{ended ? 'もう一度見る' : playing ? '一時停止' : '続きから'}</button>
            <button type="button" onClick={() => { seek(0); setHiddenPause(false); setPlaying(true); }}>はじめから</button>
            <button type="button" disabled={ended} onClick={() => { seek(MYTH_DURATION); setPlaying(false); setHiddenPause(false); }}>結末へ</button>
          </div>
        </>}
        <details className="mythSource"><summary>物語のもとになったもの</summary><p>{scene.adaptation}</p>{scene.source && <a href={scene.source.url} target="_blank" rel="noopener noreferrer">{scene.source.title}（新しいタブ） ↗</a>}</details>
        <button type="button" className="mythReturn" onClick={onClose}>詳細に戻る</button>
      </div>
    </section>
  </div>, document.body);
}

/** Only the eight existing family cores have stories. No rarity or gameplay change. */
export default function MythVignette({ id }: { id: number }) {
  const scene = mythScene(id);
  const [openedId, setOpenedId] = useState<number | null>(null);
  useEffect(() => { setOpenedId(null); }, [id]);
  if (!scene) return null;
  return <div className="mythEntry"><button type="button" className="mythPlay" onClick={event => { event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }); setOpenedId(id); }} aria-haspopup="dialog"><span aria-hidden="true">▷</span><span>小さな物語を見る<small>{scene.title} · 約9秒</small></span></button>{openedId === id && <MythPlayer key={id} scene={scene} onClose={() => setOpenedId(null)} />}</div>;
}
