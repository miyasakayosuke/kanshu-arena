export const DURATION = 1500;
export const IMPACT = 800;
export const SKILL = Object.freeze({ name: '月下の一咬', power: 55, mp: 10 });
// Deliberately discrete key exposures. Missing in-betweens remain visible.
export const EXPOSURES = Object.freeze([
  [0, 'original'], [140, 'preload'], [360, 'drive'], [550, 'open'],
  [760, 'bite'], [890, 'contact'], [1040, 'recover'], [1350, 'original'],
]);
export const CONTINUITY_EXPOSURES = Object.freeze([
  [0, 'original'], [140, 'preload'], [360, 'drive'], [550, 'open'],
  [760, 'bite'], [940, 'contact'], [1040, 'recover'], [1130, 'rise'],
  [1240, 'near'], [1380, 'original'],
]);
export const RETURN_EXPOSURES = Object.freeze([
  [0, 'original'], [140, 'preload'], [360, 'drive'], [550, 'open'],
  [760, 'bite'], [890, 'contact'], [1040, 'recover'], [1130, 'returnHalf'],
  [1240, 'returnNear'], [1380, 'original'],
]);
export function frameAt(ms, continuity = false, returnRepair = false) {
  if (!Number.isFinite(ms) || ms < 0 || ms >= DURATION) return 'original';
  return (returnRepair ? RETURN_EXPOSURES : continuity ? CONTINUITY_EXPOSURES : EXPOSURES).findLast(([start]) => start <= ms)[1];
}
// Rigid whole-body airborne displacement only. Grounded keys never translate.
// Recoil returns to the planted contact anchor before the contact drawing appears.
export function flightAt(ms) {
  if (ms < 550 || ms >= 940 || !Number.isFinite(ms)) return [0, 0];
  if (ms < 760) {
    const t = (ms - 550) / 210, e = 1 - (1 - t) ** 3;
    return [-.28 * e, -.06 * Math.sin(Math.PI * t) - .02 * e];
  }
  if (ms < 840) return [-.28, -.02];
  const t = (ms - 840) / 100, e = t * t * (3 - 2 * t);
  return [-.28 * (1 - e), -.02 * (1 - e)];
}
export function makeController({ continuity = false, returnRepair = false } = {}) {
  let cast = null, assetsReady = false, hidden = false;
  return {
    assets(value) { assetsReady = !!value; },
    start(id, now, { speed = 1, reduced = false } = {}) {
      if (typeof id !== 'string' || !id || !Number.isFinite(now)) throw Error('Invalid cast');
      if (![1, 2].includes(speed)) throw Error('Speed must be 1 or 2');
      hidden = false;
      cast = { id, now, speed, reduced, readyAtStart: assetsReady };
    },
    cancel({ defeat = false } = {}) { cast = null; hidden = defeat; },
    sample(now) {
      if (!cast) return { frame: 'original', ms: 0, active: false, impact: false, hidden, id: null };
      const ms = Math.max(0, (now - cast.now) * cast.speed);
      const active = ms < DURATION;
      return { frame: active && cast.readyAtStart && !cast.reduced ? frameAt(ms, continuity, returnRepair) : 'original',
        ms: Math.min(ms, DURATION), active, impact: ms >= IMPACT && active, hidden: false, id: cast.id };
    },
  };
}
