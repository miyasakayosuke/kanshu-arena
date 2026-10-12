import type {BattleEvent} from './engine';
import {ANTICIPATION_MS, HIT_HOLD_MS, RECOVERY_MS, motionKind, sampleActionMotion} from './battleMotion';
import {CAST_IMPACT_MS} from './playback';

/**
 * Presentation-only choreography for the first twelve original drawings.
 * Each profile describes a pose, not combat power or event timing. The observed
 * impact remains the only boundary used by BattleStage to start recovery.
 */
const poses = [
  {back: 8, forward: 39, crouch: 5, rise: 8, lean: -.09, squash: .035}, // fox: tucked tails, dart
  {back: 4, forward: 22, crouch: 11, rise: 2, lean: -.055, squash: .085}, // troll: heavy brace
  {back: 5, forward: 31, crouch: 4, rise: 11, lean: -.11, squash: .025}, // cat: lifted paw
  {back: 2, forward: 15, crouch: 6, rise: 3, lean: -.045, squash: .055}, // dryad: root and spear
  {back: 3, forward: 12, crouch: 1, rise: 12, lean: .045, squash: .018}, // banshee: gathered veil
  {back: 5, forward: 24, crouch: 4, rise: 8, lean: -.065, squash: .045}, // feathered serpent: wing sweep
  {back: 7, forward: 44, crouch: 1, rise: 18, lean: -.16, squash: .025}, // garuda: high dive
  {back: 4, forward: 20, crouch: 3, rise: 7, lean: -.07, squash: .045}, // selkie: flipper arc
  {back: 7, forward: 32, crouch: 9, rise: 4, lean: -.095, squash: .065}, // ifrit: fist compression
  {back: 5, forward: 37, crouch: 5, rise: 13, lean: -.13, squash: .02}, // tengu: cutting stoop
  {back: 3, forward: 25, crouch: 7, rise: 4, lean: -.055, squash: .06}, // naga: coiled jab
  {back: 6, forward: 29, crouch: 3, rise: 5, lean: -.08, squash: .025}, // anubis: measured blade
] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {const p = clamp(n); return p * p * (3 - 2 * p);};

export function sampleOriginalRosterMotion(id: number, event: BattleEvent, age: number, reduced = false) {
  const classified = motionKind(event);
  // Existing fire/shadow naming describes the effect color, not necessarily the
  // body action: a fist or blade still has a physical windup and release.
  const physical = classified !== 'support' && event.scope !== 'all' && /通常攻撃|拳|牙|爪|槌|一撃|刃|斬|降下|翼|風切り|樹海の槍/.test(event.skill ?? '');
  const kind = physical ? 'strike' : classified;
  const base = sampleActionMotion(kind, age, reduced);
  const pose = poses[id];
  if (!pose || reduced || base.phase === 'rest') return base;
  const windup = smooth(age / ANTICIPATION_MS);
  const release = smooth((age - 470) / (CAST_IMPACT_MS - 470));
  const settle = age < CAST_IMPACT_MS ? 1 : 1 - smooth((age - CAST_IMPACT_MS - HIT_HOLD_MS) / RECOVERY_MS);
  const held = windup * (1 - release);
  const support = kind === 'support';
  const strike = kind === 'strike';
  return {
    ...base,
    travel: strike ? (-pose.back * held + pose.forward * release) * settle : 0,
    lift: support ? (3 + pose.rise * .25) * windup * settle
      : (-pose.crouch * held + pose.rise * Math.sin(release * Math.PI) + (strike ? 0 : 3 * release)) * settle,
    tilt: support ? 0 : (pose.lean * release - pose.lean * .35 * held) * settle,
    scaleX: 1 + (support ? -.014 * windup : -pose.squash * held + pose.squash * .6 * release) * settle,
    scaleY: 1 + (support ? .025 * windup : -pose.squash * .7 * held + pose.squash * .3 * release) * settle,
    camera: support ? 0 : base.camera * .6,
  };
}
