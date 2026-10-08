import {describe,it,expect} from 'vitest';import {start,advance,cost} from './engine';
describe('battle',()=>{const a=[0,2,3,4,6],e=[1,5,8,10,6];
it('cost',()=>expect(cost(a)).toBeLessThanOrEqual(17));
it('5v5',()=>expect(start(a,e).allies).toHaveLength(5));
it('deterministic',()=>{const b=start(a,e);expect(advance(b,[])).toEqual(advance(b,[]))});
it('immutable',()=>{const b=start(a,e);advance(b,[]);expect(b.turn).toBe(1)});
it('damage',()=>{const b=advance(start(a,e),[]);expect(b.enemies.some(x=>x.hp<x.monster.hp)).toBe(true)});
});