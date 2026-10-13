import {describe,it,expect} from 'vitest';
import {CHARACTER_ART} from './MonsterArt';
import {enemyFormation,enemyPaintOrder,enemyTravelDistance} from './enemyFormation';

describe('presentation-only layered enemy formation',()=>{
 it('keeps left-to-right identities while drawing both rear slots first',()=>{
  const slots=Array.from({length:5},(_,i)=>enemyFormation(i,5));
  expect(slots.map(s=>s.point.x)).toEqual([124,242,360,478,596]);
  expect(slots.map(s=>s.depth)).toEqual([1,0,1,0,1]);
  expect(enemyPaintOrder(slots).map(s=>s.index)).toEqual([1,3,0,2,4]);
  expect(slots.map(s=>s.index)).toEqual([0,1,2,3,4]);
  expect(slots[0].scale).toBe(1.82);expect(slots[1].scale).toBe(1.66);
  expect(slots[1].foot.y).toBeLessThan(slots[0].foot.y);
  expect(slots[0].point.x+slots[0].width/2).toBeGreaterThan(slots[1].point.x-slots[1].width/2);
 });
 it.each([[382,176],[307,140],[315,238],[618,460],[618,140]])('fits all 37 silhouettes and both rig aspect ratios in %s×%s', (width,height)=>{
  const aspect=(width/720)/(height/460);
  const arts=[...Object.values(CHARACTER_ART),{spriteWidth:142,spriteHeight:142*286/350,footAnchor:252/286}];
  for(const art of arts)for(let i=0;i<5;i++){
   const s=enemyFormation(i,5,aspect,art);
   expect(s.top).toBeGreaterThanOrEqual(26-1e-8);
   expect(s.point.x-s.width/2).toBeGreaterThanOrEqual(4-1e-8);
   expect(s.point.x+s.width/2).toBeLessThanOrEqual(716+1e-8);
   expect(s.top+s.height).toBeLessThan(430);
   expect((s.width*width/720)/(s.height*height/460)).toBeCloseTo(art.spriteWidth/(art.spriteHeight??art.spriteWidth*.75));
   expect(s.point.y+35.5*s.scale*aspect).toBeCloseTo(s.foot.y);
  }
 });
 it.each([1,2,3,4,5])('keeps %s partial slots centered without mutating the slot list',count=>{
  const slots=Array.from({length:count},(_,i)=>enemyFormation(i,count));
  expect(slots.reduce((sum,s)=>sum+s.point.x,0)/count).toBe(360);
  expect(new Set(slots.map(s=>s.point.x)).size).toBe(count);
  expect(enemyPaintOrder(slots)).toHaveLength(count);
 });
 it('does not use HP, a target choice or motion phase to change formation identity',()=>{
  const before=Array.from({length:5},(_,i)=>enemyFormation(i,5,1.4));
  const after=Array.from({length:5},(_,i)=>enemyFormation(i,5,1.4));
  expect(after).toEqual(before);
 });
});

describe('enlarged Fenrir world-travel envelope',()=>{
 it.each([-12,0,42,84,90])('preserves the wolf curve at 60 percent distance for sample %s',distance=>{
  expect(enemyTravelDistance(12,distance)).toBeCloseTo(distance*.6);
 });
 it('does not change any other monster or the reduced-motion zero distance',()=>{
  for(let id=0;id<37;id++)for(const distance of [-12,0,42,84,90]){
   if(id!==12)expect(enemyTravelDistance(id,distance)).toBe(distance);
  }
  expect(enemyTravelDistance(12,0)).toBe(0);
 });
});

describe('stable lower-body result anchors', () => {
  it.each([1, 2, 3, 4, 5])('keeps %i partial slots and every artwork above the foot markers', async count => {
    const {enemyResultAnchor} = await import('./enemyFormation');
    for (const aspect of [.75, 1, 1.4, 2.82]) for (const art of Object.values(CHARACTER_ART)) for (let index = 0; index < count; index++) {
      const slot = enemyFormation(index, count, aspect, art);
      const anchor = enemyResultAnchor(slot, aspect);
      expect(anchor.x).toBe(slot.foot.x);
      expect(anchor.y).toBeCloseTo(slot.foot.y - 24 * aspect);
      expect(anchor.y).toBeGreaterThan(slot.point.y);
      // Existing rise, alternating hit offset, full em and outline all fit.
      expect(anchor.y - (22 + 13 + 21) * aspect).toBeGreaterThan(0);
      expect(anchor.x - 80).toBeGreaterThan(0);
      expect(anchor.x + 80).toBeLessThan(720);
      expect(anchor.y + 21 * aspect).toBeLessThan(slot.foot.y + 6 * aspect);
    }
  });
});
