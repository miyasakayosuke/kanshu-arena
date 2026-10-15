// Source-pixel support landmarks, measured on the unchanged RGBA sheets.
// This is rigid whole-sprite registration, not anatomy interpolation.
// A shared source-frame origin for the new sequential set. This intentionally
// does NOT independently re-register each claw: the known local toe drift stays visible.
const sequential = source => ({ source, anchor: [334.5, 1196], scale: 1 / 1312,
  registration: 'shared-source-grid-not-perfect-foot-plant' });
export const BASELINE = {
  seqContact: sequential('seqContact'), seqCompress: sequential('seqCompress'),
  seqLand: sequential('seqLand'), seqMid: sequential('seqMid'), seqRise: sequential('seqRise'),
  original: { source: 'reference', anchor: [300, 1170], scale: 1 / 1312 },
  preload: { source: 'correction', seed: [350, 550], anchor: [230, 814], scale: 1 / 729 },
  drive: { source: 'bridges', seed: [400, 430], anchor: [210, 630], scale: 1 / 729, lift: 16 },
  open: { source: 'keys', seed: [1190, 200], anchor: [1110, 420], scale: 1 / 486, lift: 16 },
  bite: { source: 'keys', seed: [200, 720], anchor: [155, 949], scale: 1 / 486, lift: 5 },
  contact: { source: 'bridges', seed: [1150, 650], anchor: [970, 945], scale: 1 / 729 },
  recover: { source: 'correction', seed: [1200, 550], anchor: [1044, 828], scale: 1 / 729 },
  rise: { source: 'continuity', seed: [400, 800], anchor: [226, 1019], scale: 1 / 729 },
  near: { source: 'continuity', seed: [1160, 800], anchor: [987, 1021], scale: 1 / 729 },
  // Original-derived singles use the original physical source-pixel scale.
  // They are not scaled to their canvas size or fitted to a bounding box.
  returnHalf: { source: 'returnHalf', anchor: [339, 1183], scale: 1 / 1312 },
  returnNear: { source: 'returnNear', anchor: [307, 1216], scale: 1 / 1312 },
};
export const SUPPORT = {
  original: [304.5, 1179], preload: [207, 833], drive: [770, 746],
  contact: [975, 956], recover: [1005.5, 842],
  rise: [226, 1019], near: [987, 1021],
  returnHalf: [339, 1183], returnNear: [307, 1216],
};
const referenceOffset = SUPPORT.original.map((value, i) =>
  (value - BASELINE.original.anchor[i]) * BASELINE.original.scale);
export const REGISTERED = Object.fromEntries(Object.entries(BASELINE).map(([name, spec]) => {
  if (!SUPPORT[name] || name === 'original') return [name, spec];
  const anchor = SUPPORT[name].map((value, i) => value - referenceOffset[i] / spec.scale);
  // Drive is supported by a rear foot. Keep its lateral staging, correct only its height.
  if (name === 'drive') anchor[0] = spec.anchor[0];
  return [name, { ...spec, anchor, lift: 0 }];
}));
export function supportPosition(name, width = 142, baseline = false) {
  const spec = (baseline ? BASELINE : REGISTERED)[name], point = SUPPORT[name];
  if (!point) return null;
  return point.map((value, i) => (value - spec.anchor[i]) * spec.scale * width
    - (i === 1 ? (spec.lift || 0) * width / 142 : 0));
}
