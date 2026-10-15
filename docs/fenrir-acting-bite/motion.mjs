export const DURATION = 1500;
export const IMPACT = 800;
export const SKILL = Object.freeze({ name: '月下の一咬', power: 55, mp: 10 });
// Deliberately discrete key exposures. Missing in-betweens remain visible.
export const EXPOSURES = Object.freeze([
  [0, 'original'], [140, 'preload'], [360, 'drive'], [550, 'open'],
  [760, 'bite'], [890, 'contact'], [1040, 'recover'], [1350, 'original'],
]);
export function frameAt(ms) {
  if (!Number.isFinite(ms) || ms < 0 || ms >= DURATION) return 'original';
  return EXPOSURES.findLast(([start]) => start <= ms)[1];
}
export function makeController() {
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
      return { frame: active && cast.readyAtStart && !cast.reduced ? frameAt(ms) : 'original',
        ms: Math.min(ms, DURATION), active, impact: ms >= IMPACT && active, hidden: false, id: cast.id };
    },
  };
}
