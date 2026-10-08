import {describe,it,expect} from 'vitest';import {start,advance,advanceWithEvents,cost} from './engine';
describe('battle',()=>{const a=[0,2,3,4,6],e=[1,5,8,10,6];
it('cost',()=>expect(cost(a)).toBeLessThanOrEqual(17));
it('5v5',()=>expect(start(a,e).allies).toHaveLength(5));
it('deterministic',()=>{const b=start(a,e);expect(advance(b,[])).toEqual(advance(b,[]))it('event sequence reproduces final hp',()=>{const b=start(a,e);const result=advanceWithEvents(b,[]);expect(result.events.some(x=>x.kind==='cast')).toBe(true);expect(result.events.some(x=>x.kind==='damage')).toBe(true);for(const unit of [...result.state.allies,...result.state.enemies]){const hits=result.events.filter(x=>x.target===unit.key&&x.hp!==undefined);if(hits.length)expect(hits[hits.length-1].hp).toBe(unit.hp)}});
});
it('immutable',()=>{const b=start(a,e);advance(b,[]);expect(b.turn).toBe(1)});
it('damage',()=>{const b=advance(start(a,e),[]);expect(b.enemies.some(x=>x.hp<x.monster.hp)).toBe(true)});
});