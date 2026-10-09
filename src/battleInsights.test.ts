import { describe, expect, it } from 'vitest';
import { advanceWithEvents, BASIC_ATTACK, DEFEND, start } from './engine';
import type { BattleEvent, Monster, Skill, SpecialSkills, State, Unit } from './engine';
import { battleEventLine, battleFactEvidenceLines, battleOrderLine, battleUnitLabel, resultFacts } from './battleInsights';

const guard: Skill = { name: '守り', kind: 'guard', power: 0, priority: 1, mpCost: 0 };
const hit: Skill = { name: '攻撃', kind: 'hit', power: 50, priority: 0, mpCost: 0 };
const heal: Skill = { name: '回復', kind: 'heal', power: 35, priority: 0, mpCost: 10 };
const idle: Skill = { ...heal, name: '休息', power: 0, mpCost: 0 };
const protect: Skill = { name: '守護', kind: 'protect', power: 0, priority: 3, mpCost: 5 };
function unit(key: string, skills: SpecialSkills = [idle], options: Partial<Monster> = {}): Unit {
  const monster: Monster = { id: 0, name: key, icon: '⚔️', cost: 1, hp: 100, mp: 100, atk: 0, speed: 50, skills, ...options };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0 };
}
function battle(allies: Unit[], enemies: Unit[]): State {
  return { turn: 1, seed: 42, allies, enemies, winner: null, log: [], history: [] };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
function assertEvidence(state: State) {
  for (const fact of resultFacts(state)) {
    expect(fact.evidence.length).toBeGreaterThan(0);
    for (const evidence of fact.evidence) {
      const turn = state.history!.find(record => record.turn === evidence.turn)!;
      const event = turn.events[evidence.eventIndex];
      expect(event).toBeDefined();
      expect(event.actor).toBe(evidence.actor);
      expect(event.target).toBe(evidence.target);
      if (evidence.orderIndex !== undefined) expect(turn.orders[evidence.orderIndex]).toBeDefined();
    }
    expect(battleFactEvidenceLines(state, fact).length).toBeGreaterThanOrEqual(fact.evidence.length);
  }
}

describe('evidence-only battle result facts', () => {
  it('does not invent events from final HP, winner, text logs, or a healer in the roster', () => {
    const state = start([2, 3, 7], [1]);
    state.allies.forEach(actor => { actor.hp = 0; });
    state.winner = 'lose';
    state.log = ['毒で999ダメージ', '回復が間に合わなかった'];
    expect(resultFacts(state)).toEqual([]);
    delete state.history;
    expect(resultFacts(state)).toEqual([]);
  });

  it('totals only actual poison HP loss across both sides and turns, including capped lethal ticks', () => {
    let state = battle([unit('a0', [guard], { hp: 200 }), unit('a1', [guard])], [unit('e0', [guard], { hp: 200 }), unit('e1', [guard])]);
    state.allies[0].poison = 3; state.allies[1].poison = 2; state.allies[1].hp = 3;
    state.enemies[0].poison = 3; state.enemies[1].poison = 1; state.enemies[1].hp = 4;
    state = advanceWithEvents(state, [{ key: 'a0', skill: DEFEND }, { key: 'a1', skill: DEFEND }]).state;
    state = advanceWithEvents(state, [{ key: 'a0', skill: DEFEND }]).state;
    const fact = resultFacts(state).find(fact => fact.kind === 'poison')!;
    expect(fact.text).toContain('味方 27／敵 28');
    expect(fact.evidence).toHaveLength(6);
    expect(new Set(fact.evidence.map(evidence => evidence.turn))).toEqual(new Set([1, 2]));
    expect(resultFacts(state).some(fact => fact.kind === 'protection')).toBe(false);
    assertEvidence(state);
  });

  it('proves an explicitly planned heal was prevented by defeat before the action', () => {
    const initial = battle([unit('a0', [heal], { name: 'バステト', hp: 20, speed: 1 })], [unit('e0', [{ ...hit, power: 1000, priority: 2 }], { name: 'バステト' })]);
    const state = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]).state;
    const fact = resultFacts(state).find(fact => fact.kind === 'missed-heal')!;
    expect(fact.text).toBe('TURN 1：味方1 バステトは「回復」の発動前に戦闘不能。');
    expect(state.allies[0].mp).toBe(initial.allies[0].mp);
    const lines = battleFactEvidenceLines(state, fact).join('\n');
    expect(lines).toContain('指示：「回復」');
    expect(lines).toContain('味方1 バステトが戦闘不能（敵1 バステトの攻撃）');
    expect(lines).toContain('行動前確認');
    expect(lines).toContain('行動終了');
    assertEvidence(state);
  });

  it('also records the actual automatic heal plan before an actor is defeated', () => {
    const initial = battle([unit('a0', [heal], { speed: 1 })], [unit('e0', [{ ...hit, power: 1000, priority: 2 }])]);
    initial.allies[0].hp = 20;
    const state = advanceWithEvents(initial, []).state;
    expect(state.history![0].orders[0]).toMatchObject({ skillKind: 'heal', source: 'automatic', accepted: true });
    expect(resultFacts(state).some(fact => fact.kind === 'missed-heal')).toBe(true);
  });

  it.each(['attack', 'invalid-target', 'insufficient-mp', 'already-cast', 'zero-heal'] as const)('does not claim a missed heal for %s', condition => {
    const initial = battle([unit('a0', [condition === 'zero-heal' ? idle : heal], { hp: 20, speed: condition === 'already-cast' ? 200 : 1 })], [unit('e0', [{ ...hit, power: 1000 }])]);
    if (condition === 'insufficient-mp') initial.allies[0].mp = 0;
    const state = advanceWithEvents(initial, [{ key: 'a0', skill: condition === 'attack' ? BASIC_ATTACK : 0, target: condition === 'invalid-target' ? 'e0' : condition === 'attack' ? 'e0' : 'a0' }]).state;
    expect(resultFacts(state).some(fact => fact.kind === 'missed-heal')).toBe(false);
  });

  it('does not confuse poison defeat at turn-end with defeat before a scheduled heal', () => {
    const initial = battle([unit('a0', [{ ...heal, power: 1 }])], [unit('e0')]);
    initial.allies[0].hp = 1; initial.allies[0].poison = 1;
    const state = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]).state;
    expect(state.allies[0].hp).toBe(0);
    expect(resultFacts(state).some(fact => fact.kind === 'missed-heal')).toBe(false);
  });

  it('counts guarded direct hits and excludes poison ticks, guard break, and unused guard casts', () => {
    const initial = battle([unit('a0', [protect]), unit('a1')], [unit('e0', [hit])]);
    initial.allies[1].hp = 50; initial.allies[1].poison = 2;
    const orders = [{ key: 'a0', skill: 0, target: 'a1' }, { key: 'a1', skill: 0, target: 'a1' }];
    const protectedState = advanceWithEvents(initial, orders).state;
    const fact = resultFacts(protectedState).find(fact => fact.kind === 'protection')!;
    expect(fact.text).toContain('味方 1回／敵 0回');
    const evidence = fact.evidence.map(ref => protectedState.history![0].events[ref.eventIndex]);
    expect(evidence.some(event => event.kind === 'guard')).toBe(true);
    expect(evidence.filter(event => event.kind === 'damage')).toHaveLength(1);
    expect(evidence.some(event => event.effect === 'poison')).toBe(false);
    assertEvidence(protectedState);

    initial.enemies[0].monster = { ...initial.enemies[0].monster, skills: [{ ...hit, breaksGuard: true }] };
    expect(resultFacts(advanceWithEvents(initial, orders).state).some(fact => fact.kind === 'protection')).toBe(false);
    initial.enemies[0].monster = { ...initial.enemies[0].monster, skills: [idle] };
    expect(resultFacts(advanceWithEvents(initial, orders).state).some(fact => fact.kind === 'protection')).toBe(false);
  });

  it('finds the largest whole action across turns using actual capped HP loss and all targets', () => {
    let state = battle([unit('a0', [{ ...hit, power: 2 }, { ...hit, name: '全体攻撃', power: 80, all: true }])], [unit('e0'), unit('e1')]);
    state.enemies[0].hp = 4;
    state = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e1' }]).state;
    state = advanceWithEvents(state, [{ key: 'a0', skill: 1 }]).state;
    const expected = state.history![1].events.filter(event => event.kind === 'damage' && event.actor === 'a0').reduce((sum, event) => sum + event.amount!, 0);
    const fact = resultFacts(state).find(fact => fact.kind === 'largest-action')!;
    expect(fact.text).toContain(`TURN 2、味方1 a0の「全体攻撃」が合計 ${expected} ダメージ（2体）`);
    expect(fact.evidence).toHaveLength(3);
    expect(resultFacts(state)).toHaveLength(2);
    assertEvidence(state);
  });

  it('reports actual healing rather than skill power or zero-HP restoration', () => {
    const initial = battle([unit('a0', [heal])], [unit('e0')]);
    initial.allies[0].hp = 95;
    const state = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]).state;
    expect(resultFacts(state).find(fact => fact.kind === 'healing')?.text).toContain('味方 5／敵 0');
    initial.allies[0].hp = 100;
    expect(resultFacts(advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }]).state)).toEqual([]);
  });

  it('returns no more than three stable facts without mutating history or adding causal blame', () => {
    const initial = battle([unit('a0', [heal], { hp: 20, speed: 1 }), unit('a1', [guard])], [unit('e0', [{ ...hit, power: 1000, priority: 2 }])]);
    initial.allies[1].poison = 2;
    const state = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }, { key: 'a1', skill: 0 }]).state;
    const snapshot = structuredClone(state);
    freeze(state);
    const facts = resultFacts(state);
    expect(facts).toHaveLength(3);
    expect(resultFacts(state)).toEqual(facts);
    expect(state).toEqual(snapshot);
    expect(facts.map(fact => fact.text).join('')).not.toMatch(/勝因|敗因|原因|だから|すべき/);
    assertEvidence(state);
  });
});

describe('inspectable Japanese evidence', () => {
  it('labels sides and slots even when names are identical, and exposes cancelled commands', () => {
    const state = battle([unit('a0', [heal], { name: '同名' })], [unit('e0', [heal], { name: '同名' })]);
    expect(battleUnitLabel(state, 'a0')).toBe('味方1 同名');
    expect(battleUnitLabel(state, 'e0')).toBe('敵1 同名');
    expect(battleOrderLine(state, { key: 'a0', skill: 0, side: 'allies', source: 'explicit', accepted: false, rejection: 'insufficient-mp', skillName: '回復' })).toContain('取り消し：MP不足');
    expect(battleEventLine(state, { kind: 'cleanse', actor: 'a0', target: 'a0' })).toContain('浄化（毒は0）');
  });

  it('formats every kind of authoritative event, with stable evidence indexes', () => {
    const state = advanceWithEvents(start([0, 2, 3, 4, 6], [1, 5, 8, 10, 6]), []).state;
    const kinds: BattleEvent['kind'][] = ['cast', 'damage', 'heal', 'guard', 'poison', 'cleanse', 'break', 'defeat', 'resource', 'expire', 'phase'];
    for (const kind of kinds) expect(battleEventLine(state, { kind, actor: 'a0', target: 'e0', amount: 1, phase: 'action' })).toEqual(expect.any(String));
    assertEvidence(state);
  });
});
