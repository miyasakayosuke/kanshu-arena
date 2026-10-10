import type {BattleEvent} from './engine';
import {ACTION_DURATION_MS, CAST_IMPACT_MS, effectType, MULTIHIT_INTERVAL_MS, barrageDuration} from './playback';

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

/** Original wolf choreography: low stance, forward pounce, linked strikes, settle. */
export function sampleFenrirMotion(age: number, hits = 5, reduced = false) {
  const lastHit = CAST_IMPACT_MS + Math.max(0, hits - 1) * MULTIHIT_INTERVAL_MS;
  const effectiveAge = age < CAST_IMPACT_MS ? age : age < lastHit ? CAST_IMPACT_MS : CAST_IMPACT_MS + age - lastHit;
  const base = sampleActionMotion('strike', effectiveAge, reduced);
  const charge = smooth(age / ANTICIPATION_MS);
  const release = smooth((age - 460) / (CAST_IMPACT_MS - 460));
  const preparing = age < CAST_IMPACT_MS;
  const returning = age >= lastHit ? 1 - out((age - lastHit - HIT_HOLD_MS) / RECOVERY_MS) : 1;
  const pulse = age >= CAST_IMPACT_MS && age < lastHit ? Math.sin((age - CAST_IMPACT_MS) / MULTIHIT_INTERVAL_MS * Math.PI) : 0;
  return {
    ...base,
    travel: reduced ? 0 : (preparing ? -12 * charge * (1 - release) + 84 * release : 84 + pulse * 6) * returning,
    lift: reduced ? 0 : (preparing ? -6 * charge * (1 - release) + 12 * Math.sin(release * Math.PI) : Math.abs(pulse) * 3) * returning,
    tilt: reduced || !returning ? 0 : (preparing ? .045 * charge * (1 - release) - .1 * release : -.1) * returning,
    scaleX: reduced ? 1 : 1 + (preparing ? .08 * charge * (1 - release) + .04 * release : .04) * returning,
    scaleY: reduced ? 1 : 1 + (preparing ? -.12 * charge * (1 - release) - .025 * release : -.025) * returning,
    titleAlpha: Math.min(1, Math.max(0, age / 90), Math.max(0, (barrageDuration(hits) - 60 - age) / 180)),
  };
}

/** A nimble branch-hop, then one small throwing kick per authoritative seed hit. */
export function sampleRatatoskrMotion(age: number, hits = 3, reduced = false) {
  const lastHit = CAST_IMPACT_MS + Math.max(0, hits - 1) * MULTIHIT_INTERVAL_MS;
  const effectiveAge = age < CAST_IMPACT_MS ? age : age < lastHit ? CAST_IMPACT_MS : CAST_IMPACT_MS + age - lastHit;
  const base = sampleActionMotion('spell', effectiveAge, reduced);
  const ready = smooth(age / 220);
  const hop = smooth((age - 220) / 380);
  const airborne = hop === 1 ? 0 : Math.sin(hop * Math.PI);
  const returnHome = age >= lastHit ? 1 - out((age - lastHit - HIT_HOLD_MS) / RECOVERY_MS) : 1;
  const pulse = age >= CAST_IMPACT_MS && age < lastHit ? Math.sin((age - CAST_IMPACT_MS) / MULTIHIT_INTERVAL_MS * Math.PI) : 0;
  return {
    ...base,
    travel: reduced ? 0 : (-5 * ready * (1 - hop) + 15 * hop - Math.abs(pulse) * 3) * returnHome,
    lift: reduced ? 0 : (-3 * ready * (1 - hop) + 30 * airborne + Math.abs(pulse) * 3) * returnHome,
    tilt: reduced || !returnHome ? 0 : (-.12 * airborne + .045 * pulse) * returnHome,
    scaleX: reduced ? 1 : 1 + (.035 * ready * (1 - hop) - .04 * airborne) * returnHome,
    scaleY: reduced ? 1 : 1 + (-.07 * ready * (1 - hop) + .06 * airborne) * returnHome,
    camera: reduced ? 0 : .004 * ready * returnHome,
    titleAlpha: Math.min(1, Math.max(0, age / 90), Math.max(0, (barrageDuration(hits) - 60 - age) / 180)),
  };
}

/** A heavy shell-set stays planted; the field effect carries the released force. */
export function sampleGenbuMotion(age: number, reduced = false) {
  const base = sampleActionMotion('area', age, reduced);
  const charge = smooth(age / (CAST_IMPACT_MS - 70));
  const returnHome = age < CAST_IMPACT_MS ? 1 : 1 - out((age - CAST_IMPACT_MS - HIT_HOLD_MS) / RECOVERY_MS);
  return {
    ...base,
    travel: 0,
    lift: reduced || !returnHome ? 0 : -5 * charge * returnHome,
    tilt: 0,
    scaleX: reduced ? 1 : 1 + .04 * charge * returnHome,
    scaleY: reduced ? 1 : 1 - .07 * charge * returnHome,
    camera: reduced ? 0 : .007 * charge * returnHome,
  };
}

/** A tightened coil opens into a stationary storm exhale, then settles. */
export function sampleVritraMotion(age: number, spentCharge = 0, reduced = false) {
  const base = sampleActionMotion('area', age, reduced);
  const spent = Number.isFinite(spentCharge) ? Math.max(0, Math.min(5, Math.floor(spentCharge))) : 0;
  const compression = smooth(age / (CAST_IMPACT_MS - 100));
  // Body expansion, like the breath field, cannot begin before the actual hit.
  const exhale = smooth((age - CAST_IMPACT_MS) / 120);
  const settle = age < CAST_IMPACT_MS ? 1 : 1 - out((age - CAST_IMPACT_MS - 150) / 400);
  const coil = compression * (1 - exhale) * settle;
  const breath = exhale * settle;
  return {
    ...base,
    travel: 0,
    lift: reduced ? 0 : -6 * coil + 3 * breath,
    tilt: reduced ? 0 : .045 * coil - .025 * breath,
    scaleX: reduced ? 1 : 1 - .13 * coil + .09 * breath,
    scaleY: reduced ? 1 : 1 - .075 * coil + .07 * breath,
    camera: reduced ? 0 : .003 * coil + (.005 + spent * .0006) * breath,
    /** Presentation strength only; caller supplies captured cast metadata. */
    stormScale: .8 + spent * .11,
    spentCharge: spent,
  };
}

/** The two ends take turns twisting forward; no wolf pounce or continuous spin. */
export function sampleAmphisbaenaMotion(age: number, hits = 2, reduced = false) {
  const lastHit = CAST_IMPACT_MS + Math.max(0, hits - 1) * MULTIHIT_INTERVAL_MS;
  const effectiveAge = age < CAST_IMPACT_MS ? age : age < lastHit ? CAST_IMPACT_MS : CAST_IMPACT_MS + age - lastHit;
  const base = sampleActionMotion('strike', effectiveAge, reduced);
  const ready = smooth(age / ANTICIPATION_MS);
  const release = smooth((age - 580) / (CAST_IMPACT_MS - 580));
  const settle = age < lastHit ? 1 : 1 - out((age - lastHit - HIT_HOLD_MS) / RECOVERY_MS);
  const index = Math.max(0, Math.min(hits - 1, Math.floor((age - CAST_IMPACT_MS) / MULTIHIT_INTERVAL_MS)));
  const side = index % 2 ? 1 : -1;
  return {
    ...base,
    travel: reduced ? 0 : (-4 * ready * (1 - release) + 19 * release) * settle,
    lift: reduced ? 0 : 2 * release * settle,
    tilt: reduced || !settle ? 0 : side * .09 * release * settle,
    scaleX: reduced ? 1 : 1 + (.035 * release - .04 * ready * (1 - release)) * settle,
    scaleY: reduced ? 1 : 1 - .025 * release * settle,
    camera: reduced ? 0 : .003 * release * settle,
    titleAlpha: Math.min(1, Math.max(0, age / 90), Math.max(0, (barrageDuration(hits) - 60 - age) / 180)),
  };
}

/** A two-legged brace stays low; only its economical bite moves forward. */
export function sampleLindwurmMotion(age: number, protecting = false, reduced = false) {
  const base = sampleActionMotion(protecting ? 'support' : 'strike', age, reduced);
  const brace = smooth(age / ANTICIPATION_MS);
  const release = smooth((age - 620) / (CAST_IMPACT_MS - 620));
  const settle = age < CAST_IMPACT_MS ? 1 : 1 - out((age - CAST_IMPACT_MS - HIT_HOLD_MS) / RECOVERY_MS);
  return {...base,
    travel: reduced || protecting ? 0 : 24 * release * settle,
    lift: reduced || !settle ? 0 : -4 * brace * settle,
    tilt: reduced || !settle ? 0 : (protecting ? -.035 : -.05 * release) * settle,
    scaleX: reduced ? 1 : 1 + .035 * brace * settle,
    scaleY: reduced ? 1 : 1 - .06 * brace * settle,
    camera: 0,
  };
}

/** A light wing rise presents the carried water; support never moves the camera. */
export function sampleZilantMotion(age: number, reduced = false) {
  const base = sampleActionMotion('support', age, reduced);
  const rise = smooth(age / 520);
  const settle = age < CAST_IMPACT_MS ? 1 : 1 - out((age - CAST_IMPACT_MS - HIT_HOLD_MS) / RECOVERY_MS);
  return {...base,
    travel: 0,
    lift: reduced ? 0 : 9 * rise * settle,
    tilt: reduced || !settle ? 0 : -.035 * rise * settle,
    scaleX: 1,
    scaleY: 1,
    camera: 0,
  };
}
