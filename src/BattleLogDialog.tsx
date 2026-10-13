import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { State } from './engine';
import { revealFocusedPageControl } from './teamFocusReveal';
import { battleEventLine, battleOrderLine } from './battleInsights';

type Props = { battle: State; playing: boolean; onClose: () => void; fallbackFocus: () => HTMLElement | null };

export default function BattleLogDialog({ battle, playing, onClose, fallbackFocus }: Props) {
  const overlay = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const fallback = useRef(fallbackFocus); fallback.current = fallbackFocus;

  useLayoutEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const background = [...document.body.children].filter(node => node !== overlay.current);
    const inertStates = background.map(node => [node, node.hasAttribute('inert')] as const);
    background.forEach(node => node.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    close.current?.focus({ preventScroll: true });
    return () => {
      // Release the background before restoring focus, including navigation unmounts.
      inertStates.forEach(([node, wasInert]) => { if (!wasInert) node.removeAttribute('inert'); });
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => () => {
    const available = (node: HTMLElement | null): node is HTMLElement => {
      if (!node?.isConnected || node === document.body || node.matches(':disabled') || node.closest('[inert], [hidden]')) return false;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector(':scope > summary')?.contains(node)) return false;
      }
      return true;
    };
    const target = available(previousFocus.current) ? previousFocus.current : fallback.current();
    if (available(target)) {
      target.focus({ preventScroll: true });
      // History can restore page scroll under the fixed bottom docks. Reveal
      // only the restored control, and yield if another modal took focus.
      if (document.activeElement === target && !target.closest('.srOnly, .screenAction, .mainNav, [role="dialog"], [role="alertdialog"]')) revealFocusedPageControl(target);
    }
  }, []);

  useLayoutEffect(() => {
    const isTop = () => !!overlay.current && !overlay.current.closest('[inert]');
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isTop()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button, summary') ?? [])].filter(node => {
        if (node.matches(':disabled') || (node.hasAttribute('tabindex') && node.tabIndex < 0) || node.closest('[hidden], [inert]')) return false;
        for (let parent = node.parentElement; parent && parent !== dialog.current; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector(':scope > summary')?.contains(node)) return false;
        }
        return true;
      });
      event.preventDefault(); event.stopPropagation();
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      (controls[next] ?? close.current)?.focus();
    };
    const focus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.current?.contains(event.target)) close.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focus);
    return () => { window.removeEventListener('keydown', key, true); document.removeEventListener('focusin', focus); };
  }, [onClose]);

  return createPortal(<div ref={overlay} className="overlay" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className="modal logModal" role="dialog" aria-modal="true" aria-label="戦闘ログ">
      <button ref={close} className="close" aria-label="戦闘ログを閉じる" onClick={onClose}>×</button><h2>戦闘ログ</h2>
      {playing && <p className="hint">現在のターンの記録は演出後に表示されます。</p>}
      <div className="log">{battle.log.map((line, i) => <div key={i}>{line}</div>)}</div>
      <details className="historyLedger"><summary>全ターンの指示・イベント記録</summary>{battle.history?.map(record => <details key={record.turn}><summary>TURN {record.turn} · {record.events.length}件の記録</summary><h3>確定した指示</h3><ol>{record.orders.map((order, index) => <li key={index}>{battleOrderLine(battle, order)}</li>)}</ol><h3>実際の出来事</h3><ol>{record.events.map((event, index) => <li key={index}>{battleEventLine(battle, event)}</li>)}</ol></details>)}</details>
    </section>
  </div>, document.body);
}
