import { describe, expect, it } from 'vitest';
import { retainPartyNumbers, MAX_PARTY_NUMBERS, partyNumberDuration } from './partyNumbers';
import type { BattleEvent } from './engine';
const hit = (target = 'a0', kind: BattleEvent['kind'] = 'damage'): BattleEvent => ({kind, actor:'e0', target, amount:12});
describe('presentation-only ally number queue', () => {
  it.each([1, 2])('retains repeated and alternating recipients for their own lifetime at %sx', speed => {
    const first = retainPartyNumbers([], [hit()], ['a0','a1'], 7, 1, 1, 0, speed);
    const next = retainPartyNumbers(first, [hit('a1'),hit()], ['a0','a1'], 7, 1, 2, 180/speed, speed);
    expect(next).toHaveLength(3); expect(next[0]).toBe(first[0]);
    expect(next[0].expires).toBe(partyNumberDuration(speed));
    expect(retainPartyNumbers(next, [], [], 7, 1, 3, partyNumberDuration(speed), speed)).toHaveLength(2);
  });
  it('bounds labels per recipient, retains stable lanes, and deduplicates replayed cues', () => {
    let queue = retainPartyNumbers([], [hit(),hit('a1')], ['a0','a1'], 1, 1, 0, 0, 1);
    for(let i=1;i<8;i++) queue = retainPartyNumbers(queue,[hit()],['a0','a1'],1,1,i,i,1);
    expect(queue.filter(item=>item.event.target==='a0')).toHaveLength(MAX_PARTY_NUMBERS);
    expect(queue.find(item=>item.event.target==='a1')?.lane).toBe(0);
    expect(new Set(queue.filter(item=>item.event.target==='a0').map(item=>item.lane)).size).toBe(4);
    expect(retainPartyNumbers(queue,[hit()],['a0','a1'],1,1,7,8,1)).toHaveLength(5);
  });
  it('preserves simultaneous HP/MP, filters nonnumbers and enemies, and does not mutate source events', () => {
    const events = [hit(),hit('a0','resource-loss'),hit('a1','heal'),hit('a1','resource-gain'),hit('e0'),{kind:'defeat',target:'a0',hp:0} as BattleEvent];
    const snapshot=structuredClone(events);
    const queue = retainPartyNumbers([],events,['a0','a1'],1,2,3,0,1);
    expect(queue).toHaveLength(4); expect(events).toEqual(snapshot);
    expect(queue.map(item=>item.id)).toHaveLength(new Set(queue.map(item=>item.id)).size);
  });
});
