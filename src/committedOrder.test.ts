import { describe, expect, it } from 'vitest';
import { BASIC_ATTACK, DEFEND, start } from './engine';
import { committedOrderLabel } from './committedOrder';

describe('stored command wording', () => {
  it('keeps side, original slot and duplicate name even with earlier fallen slots', () => {
    const state = start([2, 2, 0, 0, 0], [2, 2, 0, 0, 0], 1);
    state.allies[0].hp = state.enemies[0].hp = 0;
    const actor = state.allies[1];
    expect(committedOrderLabel(state, actor, { key: actor.key, skill: BASIC_ATTACK, target: 'e1' })).toBe('通常攻撃 → 敵2 バステト');
    expect(committedOrderLabel(state, actor, { key: actor.key, skill: 1, target: 'a1' })).toBe('生命の雫 → 味方2 バステト');
    state.enemies[1].hp = 0;
    expect(committedOrderLabel(state, actor, { key: actor.key, skill: BASIC_ATTACK, target: 'e1' })).toBe('通常攻撃 → 敵2 バステト');
  });
  it.each([
    [0, DEFEND, 'ぼうぎょ → 自分'],
    [1, 2, '鉄壁の構え → 自分'],
    [0, 2, '炎嵐 → 生存敵全体'],
    [36, 0, '境目の清め → 生存味方全体'],
    [36, 1, '合流の扉 → 生存味方全体'],
    [24, 0, '蓄え分け → 生存味方の粘体系'],
    [12, 0, '破縛の連牙 → 生存敵からランダム'],
    [13, 0, '木の実の連弾 → 生存敵からランダム'],
  ])('represents scope without inventing recipients (%s/%s)', (id, skill, expected) => {
    const state = start([id as number], [1], 1);
    expect(committedOrderLabel(state, state.allies[0], { key: 'a0', skill: skill as number, target: 'e0' })).toBe(expected);
  });
  it('reads only the saved skill and preserves automatic selection without mutation', () => {
    const state = start([29], [19], 1);
    const order = { key: 'a0', skill: 0, target: 'e0' };
    const snapshot = JSON.stringify({ state, order });
    expect(committedOrderLabel(state, state.allies[0], order, true)).toBe('おまかせ · 空勘の爪 → 敵1 タロス');
    expect(JSON.stringify({ state, order })).toBe(snapshot);
  });
  it('does not expose dead, absent or invalid saved commands or invent absent targets', () => {
    const state = start([0], [1], 1); const actor = state.allies[0];
    expect(committedOrderLabel(state, actor, undefined)).toBeNull();
    expect(committedOrderLabel(state, actor, { key: 'a1', skill: 0 })).toBeNull();
    expect(committedOrderLabel(state, actor, { key: 'a0', skill: 99 })).toBeNull();
    expect(committedOrderLabel(state, actor, { key: 'a0', skill: 0 })).toBe('狐火 → 対象未指定');
    actor.hp = 0;
    expect(committedOrderLabel(state, actor, { key: 'a0', skill: 0 })).toBeNull();
  });
});
