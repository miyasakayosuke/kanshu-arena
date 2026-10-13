import { describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, autoOrders, battleSkill, completeOrders, start, BASIC_ATTACK, DEFEND, type Order, type Skill, type State } from './engine';

// Legacy snapshot-planner contracts: execute completeOrders as an explicit fixed plan.
// Gameplay automaticOrders/chooseAutomaticOrder are covered by action-time tests.
const enemies = [29, 1, 8, 30, 31];
const fixture = (team = [2, 20, 0, 6, 11]) => start(team, enemies, 42, { leaders: true });
const attack: Order = { key: 'a0', skill: BASIC_ATTACK, target: 'e0' };
const orderFor = (state: State, actor: number, kind: Skill['kind'], target?: string): Order => ({
  key: state.allies[actor].key,
  skill: state.allies[actor].monster.skills.findIndex(skill => skill.kind === kind),
  ...(target !== undefined ? { target } : {}),
});
const next = (state: State, fixed: Order[], key = 'a1') => completeOrders(state, fixed).find(order => order.key === key)!;
const kind = (state: State, order: Order) => battleSkill(state.allies.find(unit => unit.key === order.key)!.monster, order.skill)?.kind;
const defendingEnemies = (state: State) => ({ enemyOrders: state.enemies.map(unit => ({ key: unit.key, skill: DEFEND })) });

describe('explicit snapshot planner: confirmed commands contribute only their actual support in party-slot order', () => {
  it('replaces an overridden cleanse with real automatic cleansing and prevents lethal poison', () => {
    const state = fixture(); state.allies[2].hp = 1; state.allies[2].poison = 3;
    const cleanse = orderFor(state, 1, 'cleanse', 'a2');
    expect(next(state, [attack])).toEqual(cleanse);
    const result = advanceWithEvents(state, completeOrders(state, [attack]), defendingEnemies(state));
    const manual = advanceWithEvents(state, completeOrders(state, [attack, cleanse]), defendingEnemies(state));
    expect(result.state.allies[2]).toMatchObject({ hp: 31, poison: 0 });
    expect(result.events).toEqual(manual.events);
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'cleanse', actor: 'a1', target: 'a2' }));
  });

  it('replaces overridden healing instead of counting the discarded heal', () => {
    const state = fixture([2, 7, 0, 6, 11]); state.allies[2].hp = 80;
    const heal = orderFor(state, 1, 'heal', 'a2');
    expect(next(state, [attack])).toEqual(heal);
    const result = advanceWithEvents(state, completeOrders(state, [attack]), defendingEnemies(state));
    expect(result.state.allies[2].hp).toBe(145);
    expect(result.events).toEqual(advanceWithEvents(state, completeOrders(state, [attack, heal]), defendingEnemies(state)).events);
  });

  it('replaces overridden protection before the incoming hit', () => {
    const state = fixture([1, 10, 0, 6, 11]); state.allies[0].hp = 100;
    const protect = orderFor(state, 1, 'protect', 'a0');
    expect(next(state, [attack])).toEqual(protect);
    const options = defendingEnemies(state); options.enemyOrders[0] = { key: 'e0', skill: 1, target: 'a0' } as Order;
    const result = advanceWithEvents(state, completeOrders(state, [attack]), options);
    expect(result.state.allies[0].hp).toBe(56);
    expect(result.events).toEqual(advanceWithEvents(state, completeOrders(state, [attack, protect]), options).events);
  });

  it('does not reserve the whole party for an overridden response cleanse', () => {
    const state = fixture([36, 20, 2, 3, 10]); state.allies.forEach(unit => { unit.poison = 3; });
    expect(kind(state, autoOrders(state)[0])).toBe('responseCleanse');
    const plan = completeOrders(state, [attack]);
    expect(kind(state, plan[1])).toBe('cleanse');
    expect(kind(state, plan[2])).toBe('cleanse');
    expect(plan[1].target).not.toBe(plan[2].target);
    const result = advanceWithEvents(state, completeOrders(state, [attack]), defendingEnemies(state));
    expect(result.events.filter(event => event.kind === 'cleanse' && event.actor?.startsWith('a'))).toHaveLength(2);
  });

  it('does not reserve the whole party for an overridden response guard', () => {
    const state = fixture([36, 10, 2, 6, 20]);
    state.allies.forEach(unit => { unit.hp = Math.floor(unit.monster.hp * 0.4); });
    expect(kind(state, autoOrders(state)[0])).toBe('responseGuard');
    expect(kind(state, next(state, [attack]))).toBe('protect');
  });

  it.each([BASIC_ATTACK, DEFEND, 0, 99])('fixed non-support command %s contributes no discarded healing or cleansing', skill => {
    const state = fixture(); state.allies[2].hp = 1; state.allies[2].poison = 3;
    const fixed = { ...attack, skill };
    expect(next(state, [fixed])).toEqual(orderFor(state, 1, 'cleanse', 'a2'));
    expect(completeOrders(state, [fixed])[0]).toBe(fixed);
  });

  it('a fixed poison contributes no discarded heal while retaining the poison reservation prepass', () => {
    const state = fixture([3, 2, 0, 6, 9]); state.allies[2].hp = 80;
    const fixed = orderFor(state, 0, 'poison');
    expect(next(state, [fixed])).toEqual(orderFor(state, 1, 'heal', 'a2'));
    expect(kind(state, next(state, [fixed], 'a4'))).not.toBe('poison');
  });

  it.each(['heal', 'cleanse', 'protect'] as const)('reserves the exact confirmed %s target, never the discarded suggestion', support => {
    const state = fixture(support === 'protect' ? [1, 10, 0, 6, 11] : [2, 7, 0, 6, 11]);
    if (support === 'protect') state.allies[0].hp = 100;
    else { state.allies[2].hp = 80; if (support === 'cleanse') state.allies[2].poison = 3; }
    const target = support === 'protect' ? 'a0' : 'a2';
    const fixed = orderFor(state, 0, support, 'a4');
    expect(next(state, [fixed])).toEqual(orderFor(state, 1, support, target));
    expect(completeOrders(state, [fixed])[0]).toBe(fixed);
  });

  it.each(['heal', 'cleanse', 'protect'] as const)('counts actual confirmed %s once and preserves ordinary automatic coordination', support => {
    const state = fixture(support === 'protect' ? [1, 10, 0, 6, 11] : [2, 7, 0, 6, 11]);
    if (support === 'protect') { state.allies[0].hp = 100; state.allies[1].hp = 80; }
    else { state.allies[2].hp = state.allies[3].hp = 80; if (support === 'cleanse') state.allies[2].poison = state.allies[3].poison = 3; }
    const automatic = autoOrders(state);
    expect(kind(state, automatic[0])).toBe(support);
    expect(completeOrders(state, [automatic[0]])).toEqual(automatic);
    expect(completeOrders(state, automatic)).toEqual(automatic);
  });
});

describe('explicit snapshot planner: invalid or unavailable fixed support never invents a reservation', () => {
  it.each(['heal', 'cleanse', 'protect'] as const)('checks %s actor, skill, affordability and exact living target', support => {
    for (const reason of ['dead-actor', 'unaffordable', 'invalid-skill', 'missing-target', 'dead-target', 'wrong-side', 'unknown-target', 'unknown-actor'] as const) {
      const state = fixture(support === 'protect' ? [1, 10, 0, 6, 11] : [2, 7, 0, 6, 11]);
      state.allies[2].hp = support === 'protect' ? 70 : 80;
      if (support === 'cleanse') state.allies[2].poison = 3;
      const fixed = orderFor(state, 0, support, 'a2');
      if (reason === 'dead-actor') state.allies[0].hp = 0;
      if (reason === 'unaffordable') state.allies[0].mp = 0;
      if (reason === 'invalid-skill') fixed.skill = 99;
      if (reason === 'missing-target') delete fixed.target;
      if (reason === 'dead-target') { state.allies[4].hp = 0; fixed.target = 'a4'; }
      if (reason === 'wrong-side') fixed.target = 'e0';
      if (reason === 'unknown-target') fixed.target = 'outside-party';
      if (reason === 'unknown-actor') { fixed.key = 'outside-party'; state.allies[0].hp = 0; }
      expect(next(state, [fixed]), reason).toEqual(orderFor(state, 1, support, 'a2'));
      const plan = completeOrders(state, [fixed]);
      if (reason === 'dead-actor' || reason === 'unknown-actor') expect(plan.some(order => order.key === fixed.key)).toBe(false);
      else expect(plan.find(order => order.key === fixed.key)).toBe(fixed);
    }
  });

  it('uses the first duplicate key only and ignores opposing orders', () => {
    const state = fixture(); state.allies[2].hp = 80; state.allies[2].poison = 3;
    const fixed = orderFor(state, 0, 'cleanse', 'a2');
    expect(next(state, [attack, fixed])).toEqual(orderFor(state, 1, 'cleanse', 'a2'));
    expect(kind(state, next(state, [fixed, attack]))).not.toBe('cleanse');
    expect(completeOrders(state, [{ key: 'e0', skill: 1, target: 'a2' }])).toEqual(autoOrders(state));
  });
});

describe('explicit snapshot planner: actual responses, additive healing and conservative timing', () => {
  it('reserves a confirmed response guard even when the automatic suggestion would attack', () => {
    const state = fixture([36, 10, 2, 6, 20]); state.allies[2].hp = 70;
    expect(kind(state, autoOrders(state)[0])).toBe('hit');
    expect(kind(state, autoOrders(state)[1])).toBe('protect');
    const fixed = orderFor(state, 0, 'responseGuard');
    expect(kind(state, next(state, [fixed]))).not.toBe('protect');
    expect(next(state, [fixed], 'a2')).toEqual(orderFor(state, 2, 'heal', 'a2'));
    expect(completeOrders(state, [fixed])[0]).toBe(fixed);
  });

  it.each(['responseCleanse', 'responseGuard'] as const)('does not reserve unusable or invalid %s commands', support => {
    for (const reason of ['unaffordable', 'spent', 'ineligible', 'wrong-side', 'unknown-target', 'dead-actor'] as const) {
      const state = fixture([36, 10, 2, 6, 20]); state.allies[2].hp = 70;
      if (support === 'responseCleanse') state.allies[2].poison = 3;
      const fixed = orderFor(state, 0, support);
      if (reason === 'unaffordable') state.allies[0].mp = 23;
      if (reason === 'spent') state.allies[0].responseReady = false;
      if (reason === 'ineligible') delete state.allies[0].responseReady;
      if (reason === 'wrong-side') fixed.target = 'e0';
      if (reason === 'unknown-target') fixed.target = 'outside-party';
      if (reason === 'dead-actor') state.allies[0].hp = 0;
      const selected = next(state, [fixed], support === 'responseCleanse' ? 'a2' : 'a1');
      expect(kind(state, selected), reason).toBe(support === 'responseCleanse' ? 'cleanse' : 'protect');
      expect(selected.target, reason).toBe('a2');
    }
  });

  it('does not reserve protection for a response cleanse with no current poison', () => {
    const state = fixture([36, 10, 2, 6, 20]);
    state.allies.forEach(unit => { unit.hp = Math.floor(unit.monster.hp * 0.4); });
    expect(kind(state, autoOrders(state)[0])).toBe('responseGuard');
    expect(kind(state, next(state, [orderFor(state, 0, 'responseCleanse')]))).toBe('protect');
  });

  it('does not reserve cleansing for an unavailable all-guarded response guard', () => {
    const state = fixture([36, 20, 2, 3, 10]);
    state.allies.forEach(unit => { unit.guard = true; unit.poison = 3; });
    expect(kind(state, autoOrders(state)[0])).toBe('responseCleanse');
    expect(kind(state, next(state, [orderFor(state, 0, 'responseGuard')]))).toBe('cleanse');
  });

  it('a confirmed response cleanse removes poison reservations but adds no healing', () => {
    const state = fixture([36, 2, 20, 3, 10]); state.allies.forEach(unit => { unit.poison = 3; }); state.allies[2].hp = 40;
    const fixed = orderFor(state, 0, 'responseCleanse');
    expect(next(state, [fixed])).toEqual(orderFor(state, 1, 'heal', 'a2'));
    expect(kind(state, next(state, [fixed], 'a2'))).not.toBe('cleanse');
  });

  it('a fixed cleanse reserves its healing as well as poison removal', () => {
    const state = fixture([2, 7, 0, 6, 11]); state.allies[2].hp = 80; state.allies[2].poison = 3;
    expect(kind(state, next(state, [orderFor(state, 0, 'cleanse', 'a2')]))).toBe('hit');
  });

  it('keeps useful additive heals when the first confirmed heal is not enough', () => {
    const state = fixture([2, 7, 0, 6, 11]); state.allies[2].hp = 1;
    const fixed = orderFor(state, 0, 'heal', 'a2');
    expect(next(state, [fixed])).toEqual(orderFor(state, 1, 'heal', 'a2'));
    const result = advanceWithEvents(state, completeOrders(state, [fixed]), defendingEnemies(state));
    expect(result.state.allies[2].hp).toBe(131);
    expect(result.events.filter(event => event.kind === 'heal' && event.target === 'a2').map(event => event.amount)).toEqual([65, 65]);
  });

  it('adds reservations across two fixed heals instead of counting only the last', () => {
    const state = fixture([2, 7, 3, 0, 6]); state.allies[3].hp = 1;
    const fixed = [orderFor(state, 0, 'heal', 'a3'), orderFor(state, 1, 'heal', 'a3')];
    expect(kind(state, next(state, fixed, 'a2'))).not.toBe('heal');
  });

  it('does not pre-reserve a later slower heal: the faster heal is necessary before an enemy attack', () => {
    const state = fixture([3, 2, 0, 6, 11]); state.allies[2].hp = 60;
    const fixed = orderFor(state, 1, 'heal', 'a2');
    expect(next(state, [fixed], 'a0')).toEqual(orderFor(state, 0, 'heal', 'a2'));
    const options = { enemyOrders: [{ key: 'e0', skill: 1, target: 'a2' }, ...state.enemies.slice(1).map(unit => ({ key: unit.key, skill: DEFEND }))] };
    const result = advanceWithEvents(state, completeOrders(state, [fixed]), options);
    expect(result.state.allies[2].hp).toBe(102);
    const casts = result.events.filter(event => event.kind === 'cast').map(event => event.actor);
    expect(casts.indexOf('a0')).toBeLessThan(casts.indexOf('e0'));
    expect(casts.indexOf('e0')).toBeLessThan(casts.indexOf('a1'));
    expect(advanceWithEvents(state, completeOrders(state, [attack, fixed]), options).state.allies[2].hp).toBe(0);
  });

  it('rebuilds removed and replaced support without retaining hidden choices or consuming RNG', () => {
    const state = fixture(); state.allies[2].hp = 1; state.allies[2].poison = 3;
    const fixed = orderFor(state, 0, 'cleanse', 'a2');
    const before = JSON.stringify({ state, fixed });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Planner must be deterministic'); });
    try {
      const original = completeOrders(state, [fixed]);
      expect(next(state, [attack])).toEqual(orderFor(state, 1, 'cleanse', 'a2'));
      expect(completeOrders(state, [])).toEqual(autoOrders(state));
      expect(completeOrders(state, [fixed])).toEqual(original);
      expect(JSON.stringify({ state, fixed })).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it.each([0, 0.5, 1])('retains the historical support override behavior in reservePoison:false / scale %s', poisonImpactScale => {
    const state = start([2, 20, 0, 6, 11], enemies, 42, { leaders: true, reservePoison: false, poisonImpactScale });
    state.allies[2].hp = 1; state.allies[2].poison = 3;
    const fixed = [attack, orderFor(state, 1, 'cleanse', 'a4')];
    const historical = autoOrders(state).map(order => fixed.find(value => value.key === order.key) ?? order);
    expect(completeOrders(state, fixed)).toEqual(historical);
    expect(kind(state, next(state, [attack]))).toBe('hit');
  });
});
