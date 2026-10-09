import type {BattleEvent} from './engine';
import {ACTION_DURATION_MS, CAST_IMPACT_MS, effectType} from './playback';

/** Presentation-only timing. None of these phases changes combat resolution. */
export const ANTICIPATION_MS = 340;
export const RELEASE_MS = 610;
export const HIT_HOLD_MS = 90;
export const RECOVERY_MS = 460;
export const NUMBER_DURATION_MS = 680;
export type MotionKind = 'strike' | 'spell' | 'area' | 'support';
export type MotionPhase = 'prepare' | 'release' | 'impact' | 'recover' | 'rest';
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const out = (value: number) => 1 - (1 - clamp(value)) ** 3;
const smooth = (value: number) => {const p = clamp(value); return p * p * (3 - 2 * p);};

export function motionKind(event: BattleEvent): MotionKind {
  if (['guard', 'protect', 'heal', 'cleanse'].includes(event.effect ?? '')) return 'support';
  if (event.scope === 'all') return 'area';
  const type = effectType(event.skill ?? '', event.effect);
  return type === 'slash' || type === 'wind' && /斬|翼|降下/.test(event.skill ?? '') ? 'strike' : 'spell';
}

/** Recovery begins at the observed impact, never before a delayed damage cue. */
export function actionAge(elapsed: number, sinceImpact?: number): number {
  return sinceImpact === undefined ? Math.min(Math.max(0, elapsed), CAST_IMPACT_MS - 1) : CAST_IMPACT_MS + Math.max(0, sinceImpact);
}

export function sampleActionMotion(kind: MotionKind, age: number, reduced = false) {
  const sinceImpact = age - CAST_IMPACT_MS;
  const phase: MotionPhase = age < ANTICIPATION_MS ? 'prepare' : age < CAST_IMPACT_MS ? 'release' : sinceImpact < HIT_HOLD_MS ? 'impact' : sinceImpact < HIT_HOLD_MS + RECOVERY_MS ? 'recover' : 'rest';
  const charge = smooth(age / ANTICIPATION_MS);
  const releaseAt = kind === 'strike' ? RELEASE_MS : 430;
  const release = smooth((age - releaseAt) / (CAST_IMPACT_MS - releaseAt));
  const returnHome = sinceImpact < 0 ? 1 : 1 - out((sinceImpact - HIT_HOLD_MS) / RECOVERY_MS);
  const ready = phase === 'rest' ? 0 : sinceImpact < 0 ? charge * (1 - release) : 0;
  const strike = kind === 'strike';
  return {
    phase,
    travel: reduced ? 0 : strike ? (-9 * ready + 66 * release) * returnHome : 0,
    lift: reduced ? 0 : (strike ? 6 * Math.sin(release * Math.PI) : 7 * charge) * returnHome,
    tilt: reduced || phase === 'rest' ? 0 : strike ? (.035 * ready - .12 * release) * returnHome : 0,
    scaleX: reduced ? 1 : 1 + (strike ? -.035 * ready + .055 * release : -.018 * charge) * returnHome,
    scaleY: reduced ? 1 : 1 + (strike ? .035 * ready - .045 * release : .025 * charge) * returnHome,
    camera: reduced || kind === 'support' ? 0 : (.004 * charge + .010 * release) * returnHome,
    focus: phase === 'rest' ? 0 : charge * returnHome,
    titleAlpha: Math.min(1, Math.max(0, age / 90), Math.max(0, (ACTION_DURATION_MS - 60 - age) / 180)),
  };
}

/** A single directional kick with a short settle; poison and support never shake. */
export function sampleHitMotion(age: number, reduced = false, harmful = true) {
  if (reduced || !harmful || age < 0 || age >= 300) return {recoil: 0, squash: 1, shake: 0};
  const kick = age < HIT_HOLD_MS ? 1 : 1 - out((age - HIT_HOLD_MS) / 210);
  return {recoil: 7 * kick, squash: 1 - .065 * kick, shake: Math.sin(age * .065) * 2.2 * (1 - clamp(age / 180))};
}

/** Damage numbers rise quickly, then stay readable before their short fade. */
export function sampleNumberMotion(age: number, reduced = false) {
  const fade = 1 - clamp((age - NUMBER_DURATION_MS + 130) / 130);
  return {rise: reduced ? 0 : 22 * out(age / 210), scale: reduced ? 1 : 1 + .16 * Math.sin(clamp(age / 170) * Math.PI), alpha: fade};
}
