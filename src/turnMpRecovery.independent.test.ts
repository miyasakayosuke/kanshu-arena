import { describe, expect, it } from 'vitest';
import { advanceWithEvents, canUseSkill, DEFEND, MAX_TURNS, start, type BattleEvent, type Monster, type Skill, type State, type Unit } from './engine';
import { battleEventLine, resultFacts } from './battleInsights';
import { applyBattleEvents, buildTimeline } from './playback';

const attack: Skill = { name: '監査攻撃', kind: 'hit', power: 8, priority: 0, mpCost: 3 };
const heal: Skill = { name: '監査回復', kind: 'heal', power: 10, priority: 0, mpCost: 3 };
const kill: Skill = { name: '監査強打', kind: 'hit', power: 1000, priority: 2, mpCost: 0 };
function unit(key: string, overrides: Partial<Unit> = {}, monsterOverrides: Partial<Monster> = {}): Unit {
  const monster: Monster = { id: 0, name: key, icon: '', cost: 1, hp: 100, mp: 10, atk: 0, speed: 50, skills: [attack], ...monsterOverrides };
  return { key, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0, ...overrides };
}
function battle(allies: Unit[], enemies: Unit[], overrides: Partial<State> = {}): State {
  return { turn: 1, seed: 42, allies, enemies, history: [], log: [], winner: null, ...overrides };
}
const defend = (units: Unit[]) => units.filter(u => u.hp > 0).map(u => ({ key: u.key, skill: DEFEND }));
const resolveDefend = (state: State) => advanceWithEvents(state, defend(state.allies), { enemyOrders: defend(state.enemies) });
const gains = (events: BattleEvent[]) => events.filter(e => e.effect === 'turn-mp-recovery');
const suffixIndex = (events: BattleEvent[]) => events.findIndex(e => e.kind === 'phase' && e.phase === 'next-turn-start');
const hasLostAction = (state: State) => resultFacts(state).some(f => f.kind === 'lost-action');
function lostActionFixture(terminal = false): State {
  const initial = battle([unit('a0', { hp: 10, mp: 4 }, { speed: 1, skills: [heal] }), ...(terminal ? [] : [unit('a1', { mp: 1 })])], [unit('e0', { mp: 2 }, { skills: [kill] })]);
  const state = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'a0' }, ...defend(initial.allies.filter(u => u.key !== 'a0'))], { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] }).state;
  expect(hasLostAction(state)).toBe(true);
  return state;
}

describe('independent recurring MP boundary contract', () => {
  it('does not pre-apply recovery to the first command state', () => {
    const state = start([0, 2], [1, 5]);
    expect(state.turn).toBe(1); expect(state.history).toEqual([]);
    for (const actor of [...state.allies, ...state.enemies]) expect(actor.mp).toBe(actor.monster.mp);
  });
  it('recovers both living sides, caps one missing MP, omits full/dead recipients, and repeats', () => {
    const initial = battle([unit('a0', { mp: 0 }), unit('a1', { mp: 9 }), unit('a2'), unit('a3', { hp: 0, mp: 0 })], [unit('e0', { mp: 0 }), unit('e1')]);
    const before = structuredClone(initial), first = resolveDefend(initial);
    expect(initial).toEqual(before); expect(first.state.turn).toBe(2);
    expect(gains(first.events).map(e => [e.target, e.amount, e.mp])).toEqual([['a0', 2, 2], ['a1', 1, 10], ['e0', 2, 2]]);
    expect(gains(first.events).every(e => e.actor === undefined && e.nextTurn === 2 && e.phase === 'next-turn-start')).toBe(true);
    expect(first.events.slice(suffixIndex(first.events) + 1)).toEqual(gains(first.events));
    const second = resolveDefend(first.state);
    expect(gains(second.events).map(e => [e.target, e.amount, e.mp])).toEqual([['a0', 2, 4], ['e0', 2, 4]]);
    expect(second.state.allies[3].mp).toBe(0); expect(gains(second.events).every(e => e.nextTurn === 3)).toBe(true);
  });
  it('makes recovery visible to manual affordability only at the next command boundary', () => {
    const initial = battle([unit('a0', { mp: 1 })], [unit('e0')]);
    expect(canUseSkill(initial.allies[0], attack)).toBe(false);
    const rejected = advanceWithEvents(initial, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: defend(initial.enemies) });
    expect(rejected.state.history![0].orders.find(o => o.key === 'a0')).toMatchObject({ accepted: false, rejection: 'insufficient-mp' });
    expect(rejected.events.some(e => e.kind === 'cast' && e.actor === 'a0')).toBe(false);
    expect(rejected.state.allies[0].mp).toBe(3); expect(canUseSkill(rejected.state.allies[0], attack)).toBe(true);
    const accepted = advanceWithEvents(rejected.state, [{ key: 'a0', skill: 0, target: 'e0' }], { enemyOrders: defend(rejected.state.enemies) });
    expect(accepted.state.history![1].orders.find(o => o.key === 'a0')).toMatchObject({ accepted: true });
    expect(accepted.events.find(e => e.kind === 'resource' && e.actor === 'a0')).toMatchObject({ amount: 3, mp: 0 });
    expect(accepted.state.allies[0].mp).toBe(2);
  });
  it('does not recover actors killed by turn-end poison, even when battle continues', () => {
    const result = resolveDefend(battle([unit('a0', { hp: 1, mp: 0, poison: 1 }), unit('a1', { mp: 0 })], [unit('e0', { mp: 0 })]));
    expect(result.state.winner).toBeNull(); expect(result.state.allies[0].hp).toBe(0); expect(result.state.allies[0].mp).toBe(0);
    expect(gains(result.events).map(e => e.target)).toEqual(['a1', 'e0']);
    expect(suffixIndex(result.events)).toBeGreaterThan(result.events.findIndex(e => e.kind === 'defeat' && e.target === 'a0'));
  });
  it.each(['direct', 'poison-draw', 'turn-limit'] as const)('has no recovery after terminal %s', mode => {
    const initial = battle([unit('a0', { mp: 0 })], [unit('e0', { mp: 0 })]);
    if (mode === 'direct') initial.enemies[0].monster = { ...initial.enemies[0].monster, skills: [kill] };
    if (mode === 'poison-draw') for (const actor of [...initial.allies, ...initial.enemies]) { actor.hp = 1; actor.poison = 1; }
    if (mode === 'turn-limit') initial.turn = MAX_TURNS;
    const result = mode === 'direct' ? advanceWithEvents(initial, defend(initial.allies), { enemyOrders: [{ key: 'e0', skill: 0, target: 'a0' }] }) : resolveDefend(initial);
    expect(result.state.winner).not.toBeNull(); expect(gains(result.events)).toEqual([]); expect(suffixIndex(result.events)).toBe(-1);
    expect([...result.state.allies, ...result.state.enemies].every(u => u.mp === 0)).toBe(true); expect(advanceWithEvents(result.state, []).events).toEqual([]);
  });
  it('isolates recovery after poison and expiry without a cast or command and replays idempotently', () => {
    const initial = battle([unit('a0', { mp: 2, poison: 1, ward: 1, rally: 1 })], [unit('e0', { mp: 2 })]);
    const result = resolveDefend(initial), timeline = buildTimeline(result.events), recovery = timeline.cues.filter(c => c.passive === 'turn-mp-recovery');
    expect(recovery).toHaveLength(2); expect(recovery.every(c => c.cast === null)).toBe(true);
    expect(recovery[0].updates!.some(e => e.kind === 'expire' && e.effect === 'guard')).toBe(true);
    expect(recovery[1].at).toBeGreaterThan(recovery[0].at); expect(recovery[1].impacts).toEqual(gains(result.events));
    expect(timeline.commands).toHaveLength(result.events.filter(e => e.kind === 'cast').length);
    const carried = timeline.cues.flatMap(c => [...(c.updates ?? []), ...c.impacts]);
    expect(carried).toEqual(result.events.filter(e => e.kind !== 'phase' && e.kind !== 'cast'));
    let played = initial; for (const cue of timeline.cues) played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
    expect(played.allies).toEqual(result.state.allies); expect(played.enemies).toEqual(result.state.enemies);
    expect(applyBattleEvents(played, carried).allies).toEqual(played.allies); expect(applyBattleEvents(initial, result.events).allies).toEqual(played.allies);
    for (const e of gains(result.events)) { expect(battleEventLine(result.state, e)).toContain('TURN 2 開始'); expect(battleEventLine(result.state, e)).not.toMatch(/の補給|毒/); }
    expect(resultFacts(result.state).some(f => f.kind === 'supply')).toBe(false);
  });
  it('places real material repair and all turn-end expiries before recovery', () => {
    const initial = start([19, 20, 21], [1, 2, 6]);
    for (const actor of [...initial.allies, ...initial.enemies]) actor.mp = 1;
    initial.allies[0].hp -= 50; initial.allies[0].poison = 1;
    const result = resolveDefend(initial), timeline = buildTimeline(result.events);
    const repair = result.events.findIndex(e => e.kind === 'passive' && e.effect === 'material-repair');
    const poison = result.events.findIndex(e => e.kind === 'damage' && e.effect === 'poison');
    expect(repair).toBeGreaterThan(poison); expect(suffixIndex(result.events)).toBeGreaterThan(repair);
    const carried = timeline.cues.flatMap(c => [...(c.updates ?? []), ...c.impacts]);
    expect(carried).toEqual(result.events.filter(e => e.kind !== 'phase' && e.kind !== 'cast'));
    const lastRepairCue = Math.max(...timeline.cues.filter(c => c.passive === 'material-repair').map(c => c.at));
    const firstRecoveryCue = Math.min(...timeline.cues.filter(c => c.passive === 'turn-mp-recovery').map(c => c.at));
    expect(firstRecoveryCue).toBeGreaterThan(lastRepairCue);
    expect(timeline.commands).toHaveLength(result.events.filter(e => e.kind === 'cast').length);
    let played = initial; for (const cue of timeline.cues) played = applyBattleEvents(played, [...(cue.updates ?? []), ...cue.impacts]);
    expect(played.allies).toEqual(result.state.allies); expect(played.enemies).toEqual(result.state.enemies);
  });

  it('preserves an explicit no-recovery counterfactual without adding RNG draws', () => {
    const initial = battle([unit('a0', { mp: 2 })], [unit('e0', { mp: 2 })]);
    const normal = resolveDefend(initial), disabled = resolveDefend({ ...initial, turnMpRecovery: 0 });
    expect(normal.state.seed).toBe(disabled.state.seed); expect(disabled.state.allies[0].mp).toBe(2); expect(normal.state.allies[0].mp).toBe(4);
    expect(gains(disabled.events)).toEqual([]); expect(suffixIndex(disabled.events)).toBe(-1);
  });
});

describe('independent recovery suffix evidence validation', () => {
  it('accepts genuine continuing, old-format, and terminal records', () => {
    const current = lostActionFixture(); expect(suffixIndex(current.history![0].events)).toBeGreaterThan(0);
    const historical = structuredClone(current); historical.history![0].events.splice(suffixIndex(historical.history![0].events));
    expect(hasLostAction(historical)).toBe(true); expect(hasLostAction(lostActionFixture(true))).toBe(true);
  });
  const malformed: [string, (events: BattleEvent[], boundary: number, state: State) => void][] = [
    ['duplicate boundary', (events, at) => { events.push({ ...events[at] }); }],
    ['boundary before turn end', (events, at) => { const [boundary] = events.splice(at, 1); events.splice(events.findIndex(e => e.phase === 'turn-end'), 0, boundary); }],
    ['wrong next turn', (events, at) => { events[at].nextTurn = 99; }],
    ['actor-owned boundary', (events, at) => { events[at].actor = 'a1'; }],
    ['cast in suffix', (events, at) => { events[at + 1].kind = 'cast'; }],
    ['wrong recovery source', (events, at) => { events[at + 1].effect = 'slime-supply'; }],
    ['actor-owned recovery', (events, at) => { events[at + 1].actor = 'a1'; }],
    ['wrong event phase', (events, at) => { events[at + 1].phase = 'action'; }],
    ['wrong gain turn', (events, at) => { events[at + 1].nextTurn = 99; }],
    ['fractional amount', (events, at) => { events[at + 1].amount = 1.5; }],
    ['zero amount', (events, at) => { events[at + 1].amount = 0; }],
    ['unknown recipient', (events, at) => { events[at + 1].target = 'a999'; }],
    ['duplicate recipient', (events, at) => { events.push({ ...events[at + 1] }); }],
    ['above recipient maximum', (events, at) => { events[at + 1].mp = 999; }],
    ['above configured recovery', (events, at) => { events[at + 1].amount = 3; events[at + 1].mp = 4; }],
    ['dead recipient', (events, at) => { events[at + 1].target = 'a0'; }],
    ['HP-changing recovery', (events, at) => { events[at + 1].hp = 999; }],
    ['new action phase after suffix', events => { events.push({ kind: 'phase', phase: 'before-action', actor: 'a1' }); }],
  ];
  it.each(malformed)('rejects %s instead of treating malformed history as complete evidence', (_label, mutate) => {
    const state = lostActionFixture(), events = state.history![0].events; mutate(events, suffixIndex(events), state); expect(hasLostAction(state)).toBe(false);
  });
  it('keeps earlier valid recovery readable when its recipient dies on a later turn', () => {
    const first = lostActionFixture();
    const final = advanceWithEvents(first, defend(first.allies), { enemyOrders: [{ key: 'e0', skill: 0, target: 'a1' }] }).state;
    expect(final.winner).toBe('lose'); expect(final.allies[1].hp).toBe(0); expect(hasLostAction(final)).toBe(true);
  });
  it('rejects recovery of an actor defeated in an earlier completed turn', () => {
    const second = resolveDefend(lostActionFixture()).state;
    expect(hasLostAction(second)).toBe(true);
    const events = second.history![1].events;
    events[suffixIndex(events) + 1].target = 'a0';
    expect(hasLostAction(second)).toBe(false);
  });
  it('rejects recovery appended after a terminal battle', () => {
    const state = lostActionFixture(true);
    state.history![0].events.push({ kind: 'phase', phase: 'next-turn-start', nextTurn: 2 }, { kind: 'resource-gain', phase: 'next-turn-start', nextTurn: 2, target: 'e0', amount: 2, mp: 4, effect: 'turn-mp-recovery' });
    expect(hasLostAction(state)).toBe(false);
  });
});
