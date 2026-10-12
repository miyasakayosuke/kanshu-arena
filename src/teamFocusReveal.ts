type VerticalRect = Pick<DOMRect, 'top' | 'bottom' | 'height'>;

/** Minimal page scroll for a focused slot, excluding the fixed bottom docks. */
export function teamFocusScrollDelta(slot: VerticalRect, visibleTop: number, visibleBottom: number): number {
  const band = visibleBottom - visibleTop;
  if (band <= 0 || slot.height <= 0) return 0;
  const inset = Math.min(12, band / 4);
  const top = visibleTop + inset;
  const bottom = visibleBottom - inset;
  // At extreme zoom/short landscape the entire card may not fit. Keep its
  // operable center in the uncovered band rather than hiding it under a dock.
  if (slot.height > bottom - top) return (slot.top + slot.bottom) / 2 - (top + bottom) / 2;
  if (slot.top < top) return slot.top - top;
  if (slot.bottom > bottom) return slot.bottom - bottom;
  return 0;
}

export function revealFocusedTeamSlot(slot: HTMLButtonElement): void {
  if (!slot.isConnected || slot.closest('[hidden]')) return;
  const rect = slot.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const visual = window.visualViewport;
  const top = visual?.offsetTop ?? 0;
  const viewportBottom = top + (visual?.height ?? window.innerHeight);
  let bottom = viewportBottom;
  const app = slot.closest('.app') ?? document;
  for (const dock of app.querySelectorAll<HTMLElement>('.screenAction, .mainNav')) {
    const bounds = dock.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0 && bounds.right > rect.left && bounds.left < rect.right
      && bounds.bottom > top && bounds.top < viewportBottom) bottom = Math.min(bottom, Math.max(top, bounds.top));
  }
  const delta = teamFocusScrollDelta(rect, top, bottom);
  // Synchronous layout-effect correction: no animation, timer, retained
  // callback, or candidate-list scroll to interfere with dismissal/navigation.
  if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, left: 0, behavior: 'instant' });
}
