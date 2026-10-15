// Pure placement proposal for the opt-in fixture; no production imports.
export const intersects = (a, b, gap = 0) =>
  a.x < b.x + b.width + gap && a.x + a.width > b.x - gap &&
  a.y < b.y + b.height + gap && a.y + a.height > b.y - gap;

export function proposeSkipPin({ viewport, battle, skip, essential, safeBottom = 0 }) {
  if (skip.y >= 0 && skip.y + skip.height <= viewport.height)
    return { pinned: false, reason: 'ordinary-button-fits' };
  const width = Math.max(116, skip.width), height = 44;
  const bottom = Math.max(8, safeBottom);
  const center = Math.min(viewport.width, battle.x + battle.width) - width / 2 - 8;
  const box = { x: center - width / 2, y: viewport.height - bottom - height, width, height };
  const statusBox = { x: Math.max(8, battle.x + 12), y: box.y, width: 0, height };
  statusBox.width = box.x - 8 - statusBox.x;
  const band = { x: statusBox.x, y: box.y, width: box.x + width - statusBox.x, height };
  if (statusBox.width < 120 || box.x < 8 || box.x + width > viewport.width - 8 || box.y < 8 || essential.some(x => intersects(band, x.box, 8)))
    return { pinned: false, reason: 'insufficient-unobscured-bottom-band', proposed: box };
  return { pinned: true, reason: 'offscreen-button-bottom-band', box, statusBox, band, bottom, center };
}
