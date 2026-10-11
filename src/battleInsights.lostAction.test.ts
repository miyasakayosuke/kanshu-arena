import { describe, expect, it } from 'vitest';
import { advanceWithEvents, BASIC_ATTACK, DEFEND, type BattleEvent, type BattleTurnRecord, type Monster, type Skill, type SpecialSkills, type State, type Unit } from './engine';
import { battleFactEvidenceLines, resultFacts } from './battleInsights';

const hit: Skill = { name: '遅い一撃', kind: 'hit', power: 25, priority: -2, mpCost: 0 };
const cleanse: Skill = { name: '二度目の清め', kind: 'cleanse', power: 35, priority: 0, mpCost: 10 };
const idle: Skill = { name: '休息', kind: 'heal', power: 0, priority: 0, mpCost: 0 };
const lethal: Skill = { name: '先の一撃', kind: 'hit', power: 2000, priority: 4, mpCost: 0 };
const response: Skill = { name: '境目の清め', kind: 'responseCleanse', power: 0, priority: 0, mpCost: 24, all: true };
const supply: Skill = { name: '蓄え分け', kind: 'restoreMp', power: 8, priority: 0, mpCost: 0, all: true };
function unit(key: string, skills: SpecialSkills, options: Partial<Monster> = {}): Unit {
  const monster: Monster = { id: 0, name: '同名', icon: '⚔️', cost: 1, hp: 300, mp: 100, atk: 10, speed: 50, skills, ...options };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0 };
}
function initial(skill = hit): State {
  return { turn: 1, seed: 42, allies: [unit('a0', [skill])], enemies: [unit('e0', [idle, lethal], { hp: 5000 })], winner: null, log: [], history: [] };
}
function lostSecond(skill = hit, firstSkill = 0): State {
  let state = initial(skill);
  state = advanceWithEvents(state, [{ key: 'a0', skill: firstSkill }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
  return advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
}
const lost = (state: State) => resultFacts(state).find(fact => fact.kind === 'lost-action');
const recorded = (state: State) => lost(state)!.evidence.map(ref => ({ ref, event: state.history!.find(turn => turn.turn === ref.turn)!.events[ref.eventIndex] }));

// Synthetic units, real resolver records: none of these fixtures alter production rules.
describe('one reserved observation for a lost allied queued action', () => {
  it.each([hit, cleanse, { ...cleanse, power: 0 }])('records an earlier cast and a later lost $kind (power $power)', skill => {
    const state = lostSecond(skill);
    const fact = lost(state)!;
    expect(fact.text).toBe(`TURN 2：味方1 同名は「${skill.name}」の発動前に戦闘不能。それまでの発動記録：1回。`);
    expect(recorded(state).filter(({ event }) => event.kind === 'cast')).toEqual([expect.objectContaining({ ref: expect.objectContaining({ turn: 1 }), event: expect.objectContaining({ actor: 'a0', skill: skill.name }) })]);
    const lines = battleFactEvidenceLines(state, fact).join('\n');
    expect(lines).toContain('TURN 1・指示 1');
    expect(lines).toContain('TURN 2・指示 1');
    expect(lines).toContain(`味方1 同名「${skill.name}」を発動`);
    expect(lines).toContain('味方1 同名が戦闘不能（敵1 同名の攻撃）');
    expect(lines.match(/行動前確認/g)).toHaveLength(2);
    expect(lines.match(/行動終了/g)).toHaveLength(2);
    for (const { ref, event } of recorded(state)) {
      expect(event.actor).toBe(ref.actor); expect(event.target).toBe(ref.target);
      if (ref.orderIndex !== undefined) expect(state.history![ref.turn - 1].orders[ref.orderIndex].accepted).toBe(true);
    }
  });

  it.each([BASIC_ATTACK, DEFEND])('counts an earlier universal command %s as one action', skill => {
    const state = lostSecond(hit, skill);
    expect(lost(state)?.text).toContain('1回');
    expect(recorded(state).filter(({ event }) => event.kind === 'cast')).toHaveLength(1);
  });

  it('counts a multi-hit cast once, without counting damage hits or automatic repair', () => {
    let state = initial({ ...hit, randomHits: 3 });
    Object.assign(state.allies[0], { repairReady: true, monster: { ...state.allies[0].monster, id: 19, family: 'material' } });
    state.allies[0].hp = 100;
    state = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    expect(state.history![0].events.filter(event => event.kind === 'damage' && event.actor === 'a0')).toHaveLength(3);
    expect(state.history![0].events.some(event => event.kind === 'passive' && event.actor === 'a0')).toBe(true);
    state = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
    expect(lost(state)?.text).toContain('1回');
    expect(recorded(state).some(({ event }) => event.kind === 'passive')).toBe(false);
  });

  it.each([response, { ...response, name: '合流の扉', kind: 'responseGuard' as const, priority: 3 }, supply])('covers the actually accepted finite $kind order', skill => {
    let state = initial(skill);
    Object.assign(state.allies[0], skill.kind === 'restoreMp'
      ? { supplyReady: true, monster: { ...state.allies[0].monster, id: 24, family: 'slime' } }
      : { responseReady: true, monster: { ...state.allies[0].monster, id: 36, family: 'extraordinary' } });
    if (skill.kind === 'responseCleanse') state.allies[0].poison = 2;
    if (skill.kind === 'restoreMp') state.allies[0].mp = 30;
    state = advanceWithEvents(state, [{ key: 'a0', skill: BASIC_ATTACK }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    state = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
    expect(state.history![1].orders[0]).toMatchObject({ accepted: true, skillName: skill.name });
    expect(lost(state)?.text).toContain(`「${skill.name}」の発動前に戦闘不能。それまでの発動記録：1回`);
  });

  it('preserves the reserved row against three competing family aggregates', () => {
    let state = initial(cleanse);
    state.allies.push(
      { ...unit('a1', [{ ...response, kind: 'responseGuard', priority: 3 }], { id: 36, family: 'extraordinary' }), responseReady: true },
      { ...unit('a2', [supply], { id: 24, family: 'slime' }), supplyReady: true },
      { ...unit('a3', [idle], { id: 19, family: 'material' }), repairReady: true },
    );
    state.allies[2].mp = 30;
    state.allies[3].hp = 100;
    state = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: 0 })), { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    expect(resultFacts(state).map(fact => fact.kind)).toEqual(['response', 'supply', 'repair']);
    state = advanceWithEvents(state, state.allies.map(unit => ({ key: unit.key, skill: unit.key === 'a0' ? 0 : DEFEND })), { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
    expect(resultFacts(state).map(fact => fact.kind)).toEqual(['lost-action', 'response', 'supply']);
    expect(lost(state)?.text).toContain('1回');
    expect(resultFacts(state)).toEqual(resultFacts(structuredClone(state)));
  });

  it('selects the first accepted ally order in the earliest qualifying turn, even for mirror names', () => {
    const state = initial(hit);
    state.allies.push(unit('a1', [cleanse]));
    state.enemies[0].monster = { ...state.enemies[0].monster, skills: [{ ...lethal, all: true }] };
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0 }, { key: 'a1', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    expect(lost(resolved)?.text).toContain('味方1 同名は「遅い一撃」');
    expect(resultFacts(resolved).filter(fact => fact.kind === 'lost-action')).toHaveLength(1);
  });

  it('does not promote an enemy-only lost action into an ally observation', () => {
    const state = initial(cleanse);
    state.allies[0].monster = { ...state.allies[0].monster, skills: [lethal] };
    state.enemies[0].hp = 100;
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    expect(resolved.history![0].events.some(event => event.kind === 'defeat' && event.target === 'e0')).toBe(true);
    expect(lost(resolved)).toBeUndefined();
  });
});

describe('no absence-based inference from incomplete or unrelated evidence', () => {
  const corruptions: [string, (state: State) => void][] = [
    ['missing history', state => { delete state.history; }],
    ['missing prefix', state => { state.history!.shift(); }],
    ['missing middle turn', state => { state.history![1].turn = 3; state.turn = 4; }],
    ['duplicate turn', state => { state.history![1].turn = 1; }],
    ['out-of-order turns', state => { state.history!.reverse(); }],
    ['missing tail', state => { state.turn++; }],
    ['missing turn-start', state => { state.history![0].events.shift(); }],
    ['missing turn-end', state => { state.history![1].events = state.history![1].events.filter(event => event.phase !== 'turn-end'); }],
    ['missing before-action', state => { state.history![1].events = state.history![1].events.filter(event => !(event.kind === 'phase' && event.phase === 'before-action' && event.actor === 'a0')); }],
    ['missing action-end', state => { state.history![1].events = state.history![1].events.filter(event => !(event.kind === 'phase' && event.phase === 'action-end' && event.actor === 'a0')); }],
    ['missing prior cast', state => { state.history![0].events = state.history![0].events.filter(event => !(event.kind === 'cast' && event.actor === 'a0')); }],
    ['missing prior order', state => { state.history![0].orders.shift(); }],
    ['missing lost order', state => { state.history![1].orders.shift(); }],
    ['rejected order', state => { state.history![1].orders[0].accepted = false; }],
    ['conflicting rejection', state => { state.history![1].orders[0].rejection = 'invalid-target'; }],
    ['wrong side', state => { state.history![1].orders[0].side = 'enemies'; }],
    ['missing skill name', state => { delete state.history![1].orders[0].skillName; }],
    ['missing defeat', state => { state.history![1].events = state.history![1].events.filter(event => event.kind !== 'defeat'); }],
    ['cast during supposedly lost action', state => { state.history![1].events.splice(-2, 0, { kind: 'cast', phase: 'before-action', actor: 'a0', skill: hit.name }); }],
    ['presentation passive cast', state => { state.history![0].events.find(event => event.kind === 'cast' && event.actor === 'a0')!.passive = 'material-repair'; }],
    ['duplicate prior cast', state => { const events = state.history![0].events; const index = events.findIndex(event => event.kind === 'cast' && event.actor === 'a0'); events.splice(index, 0, { ...events[index] }); }],
    ['malformed turn', state => { state.history![0] = null as unknown as BattleTurnRecord; }],
    ['missing event array', state => { state.history![0].events = undefined as unknown as BattleEvent[]; }],
  ];
  it.each(corruptions)('omits the row for %s rather than implying a complete count', (_name, corrupt) => {
    const state = lostSecond(); corrupt(state);
    expect(lost(state)).toBeUndefined();
  });

  it('does not count a missing whole earlier action as a recorded zero', () => {
    const state = lostSecond();
    state.history![0].events = state.history![0].events.filter(event => event.actor !== 'a0');
    state.history![0].orders = state.history![0].orders.filter(order => order.key !== 'a0');
    expect(lost(state)).toBeUndefined();
  });

  it('does not infer an action loss from a spent allowance or final HP', () => {
    const state = initial(response); state.allies[0].responseReady = false;
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
    expect(resolved.allies[0].hp).toBe(0);
    expect(resolved.history![0].orders[0].accepted).toBe(false);
    expect(lost(resolved)).toBeUndefined();
  });

  it('does not misreport a successful MP fallback cast followed by poison defeat', () => {
    const state = initial({ ...hit, mpCost: 10 });
    state.allies[0].mp = 10; state.allies[0].hp = 5; state.allies[0].poison = 1;
    state.enemies[0].monster = { ...state.enemies[0].monster, atk: 0, skills: [{ ...hit, priority: 3, power: 1, mpDamage: 10 }] };
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0 }], { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] }).state;
    expect(resolved.history![0].events.some(event => event.kind === 'fallback' && event.actor === 'a0')).toBe(true);
    expect(resolved.history![0].events.some(event => event.kind === 'cast' && event.actor === 'a0' && event.skill === '通常攻撃')).toBe(true);
    expect(resolved.allies[0].hp).toBe(0);
    expect(lost(resolved)).toBeUndefined();
  });

  it('does not confuse a defeated target and surviving queued actor with a lost action', () => {
    const state = initial(hit);
    state.enemies[0].hp = 100;
    state.allies.push(unit('a1', [lethal]));
    const resolved = advanceWithEvents(state, [{ key: 'a0', skill: 0, target: 'e0' }, { key: 'a1', skill: 0, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
    expect(resolved.allies[0].hp).toBeGreaterThan(0);
    expect(resolved.history![0].events.some(event => event.kind === 'cast' && event.actor === 'a0')).toBe(false);
    expect(lost(resolved)).toBeUndefined();
  });
});
