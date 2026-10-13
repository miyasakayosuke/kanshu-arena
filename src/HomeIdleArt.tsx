import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { homeIdleSvg } from './homeIdleMotion';

type Visibility = { running: boolean; reduced: boolean };

/** One observer/listener set for the pasture, never one loop or timer per creature. */
export function useHomeIdleVisibility(ref: RefObject<HTMLElement | null>): Visibility {
  const [state, setState] = useState<Visibility>({ running: false, reduced: true });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let visible = typeof IntersectionObserver === 'undefined';
    const update = () => {
      const reduced = media?.matches ?? false;
      setState(previous => {
        const running = visible && !document.hidden && !reduced;
        return previous.running === running && previous.reduced === reduced ? previous : { running, reduced };
      });
    };
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
      const entry = entries.find(entry => entry.target === element);
      if (entry) { visible = entry.isIntersecting; update(); }
    });
    observer?.observe(element);
    document.addEventListener('visibilitychange', update);
    media?.addEventListener?.('change', update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); media?.removeEventListener?.('change', update); };
  }, [ref]);
  return state;
}

/** Native SVG animation touches only body parts. Static first paint needs no image loading. */
export default function HomeIdleArt({ id, running, reduced, fallback }: { id: number; fallback?: ReactNode } & Visibility) {
  const instance = useId(), ref = useRef<HTMLSpanElement>(null);
  // Removing native tracks on reduced motion also discards their SMIL instance-time
  // history. Re-enabling can never inherit an old end time or a half-closed eye.
  const hasFallback = fallback !== undefined;
  const markup = useMemo(() => {
    try { return homeIdleSvg(id, instance, reduced ? 0 : undefined); }
    catch (error) { if (!hasFallback) throw error; return null; }
  }, [id, instance, reduced, hasFallback]);
  const started = useRef(false);
  useEffect(() => {
    const svg = ref.current?.querySelector('svg');
    const tracks = [...(svg?.querySelectorAll('animateTransform') ?? [])] as SVGAnimationElement[];
    // Unsupported/older SVG implementations retain the already-visible neutral drawing.
    if (!svg || !tracks.length || typeof svg.pauseAnimations !== 'function' || typeof svg.unpauseAnimations !== 'function' || !tracks.every(track => typeof track.beginElement === 'function')) return;
    if (running && !reduced) {
      if (!started.current) { tracks.forEach(track => track.beginElement()); started.current = true; }
      svg.unpauseAnimations();
    } else svg.pauseAnimations();
  }, [markup, running, reduced]);
  useEffect(() => {
    const svg = ref.current?.querySelector('svg');
    return () => { svg?.pauseAnimations?.(); started.current = false; };
  }, [markup]);
  if (markup === null) return fallback;
  return <span ref={ref} className="monsterArt homeIdleArt" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}
