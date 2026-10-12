/** Presentation-only formation. Array slots and combat keys never change order. */
export const FORMATION_WIDTH = 720;
export const FORMATION_HEIGHT = 460;
export type FormationArt = {spriteWidth: number; spriteHeight?: number; footAnchor?: number};
export type FormationPoint = {x: number; y: number};
export type EnemySlot = {index: number; depth: number; scale: number; point: FormationPoint; foot: FormationPoint; top: number; width: number; height: number};

/** Physical sprite proportions survive a stretched Canvas on small screens. */
export function enemyFormation(index: number, count: number, aspect = 1, art: FormationArt = {spriteWidth: 116}): EnemySlot {
  const safeAspect = Math.max(.1, Number.isFinite(aspect) ? aspect : 1);
  const spread = Math.min(118, 472 / Math.max(1, count - 1));
  const x = FORMATION_WIDTH / 2 + (index - (count - 1) / 2) * spread;
  // With five slots this is front / back / front / back / front.
  // Never pack living units after a defeat: the same slot keeps its own identity.
  const rear = count >= 3 && index % 2 === 1;
  const wantedScale = rear ? 1.66 : 1.82;
  const height = art.spriteHeight ?? art.spriteWidth * .75;
  const anchor = art.footAnchor ?? 1;
  // Reserve a small upper margin even in shallow stages and for the larger rigs.
  const floor = 358;
  const depthGap = Math.min(70 * safeAspect, 92);
  const footY = floor - (rear ? depthGap : 0);
  const maxByHeight = (footY - 26) / (height * anchor * safeAspect);
  const scale = Math.min(wantedScale, (rear ? 222 : 240) / art.spriteWidth, maxByHeight);
  return {index, depth: rear ? 0 : 1, scale,
    point: {x, y: footY - 35.5 * scale * safeAspect}, foot: {x, y: footY},
    top: footY - height * anchor * scale * safeAspect,
    width: art.spriteWidth * scale, height: height * scale * safeAspect};
}

/** Back row first; ties retain the user's original left-to-right slot order. */
export function enemyPaintOrder<T extends {depth: number; index: number}>(slots: readonly T[]): T[] {
  return [...slots].sort((a, b) => a.depth - b.depth || a.index - b.index);
}

/** The enlarged wolf keeps its existing lunge curve with room for its articulated paws.
 * Only presentation distance changes; lift, pose, event timing and all other species stay intact. */
export function enemyTravelDistance(monsterId: number, distance: number): number {
  return monsterId === 12 ? distance * .6 : distance;
}
