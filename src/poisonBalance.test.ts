import { createHash } from 'node:crypto';
import { withoutPoisonControlMetadata as withoutControls } from './legacyPoisonTestControls';
import { describe, expect, it } from 'vitest';
import {
  advanceWithEvents, autoOrders, baseDamage, battleSkill, BASIC_ATTACK, canUseSkill,
  DEFAULT_POISON_IMPACT_SCALE, DEFAULT_RESERVE_POISON, DEFEND, directDamageScale,
  monsters, poisonImpactScaleFor, start, type BattleEvent, type Order, type StartOptions, type State,
} from './engine';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sides = ['allies', 'enemies'] as const;
const other = (side: typeof sides[number]) => side === 'allies' ? 'enemies' : 'allies';
const noOrders = (state: State, side: typeof sides[number] = 'allies'): Order[] => state[side].map(unit => ({ key: unit.key, skill: 99 }));
const resolve = (state: State, orders: Order[], enemyOrders = noOrders(state, 'enemies')) => advanceWithEvents(state, orders, { enemyOrders });
const castOnly = (state: State, side: typeof sides[number] = 'allies', index = 0) => {
  const unit = state[side][index], skill = unit.monster.skills.findIndex(skill => skill.kind === 'poison');
  const orders = noOrders(state, side); orders[index] = { key: unit.key, skill };
  return resolve(state, side === 'allies' ? orders : noOrders(state), side === 'enemies' ? orders : noOrders(state, 'enemies'));
};
const direct = (events: BattleEvent[]) => events.filter(event => event.kind === 'damage' && event.effect !== 'poison');
const ticks = (events: BattleEvent[]) => events.filter(event => event.kind === 'damage' && event.effect === 'poison');
const random = (seed: number) => ((Math.imul(seed, 1664525) + 1013904223) >>> 0);
// Frozen BEFORE engine edits from exact old37 engine SHA256
// 65a9f6fb4cb1fa04d6af0d0258bf0bfd77d82f983951751eccb09e95d2bd265b.
// Exact source, generator, manifest and 1,014 complete-state records are retained
// outside this repository at poison-balance-predecessor-20261010. All 37 units,
// including Janus attack/poison/ward mixes, are represented. No Lab is involved.
const predecessorParties = [[19,20,21,22,23],[15,5,16,17,18],[12,0,2,11,13],[14,3,6,9,10],[1,5,8,10,6],[4,7,8,13,22],[24,25,26,27,28],[29,1,8,30,31],[32,4,33,34,35],[32,4,35,3,10],[36,12,2,30,26],[36,4,3,10,30],[36,14,10,20,35]];
const predecessorDigests = [
  '84fe0bbdb76d15e6b8c025f85c6e270a242d5df016a32e63aa8f31f96d48a3a6',
  'ce805855ee26f6f2bbc8b25d1a7bb2bf053b5fbcb9efe415ea0a9cb47cc71d32',
  'ddd9d87810bdf0656d1891cf0b8266f1900595585fe20cc9939c7877004161bf',
];

describe('playtest poison defaults, explicit comparison arms, and historical predecessor contract', () => {
  it('preserves all 1,014 complete historical old37 battles with explicit scale 1 / reservation false', () => {
    const hashes = [createHash('sha256'), createHash('sha256'), createHash('sha256')];
    let count = 0;
    for (const team of predecessorParties) for (const enemy of predecessorParties) for (const seed of [0,42,4294967295]) for (const samePolicy of [false,true]) {
      let state = start(team, enemy, seed, { leaders: true, poisonImpactScale: 1, reservePoison: false });
      while (!state.winner) state = advanceWithEvents(state, autoOrders(state), samePolicy ? { enemyOrders: autoOrders(state, 'enemies') } : {}).state;
      const line = JSON.stringify({ team, enemy, seed, samePolicy, state: withoutControls(state) }) + '\n';
      hashes[0].update(line); hashes[samePolicy ? 2 : 1].update(line); count++;
    }
    expect(count).toBe(1014); expect(hashes.map(hash => hash.digest('hex'))).toEqual(predecessorDigests);
  }, 30000);
  it('adopts default scale 0 / reservation true while retaining initial state shape and symmetric explicit controls', () => {
    expect(DEFAULT_POISON_IMPACT_SCALE).toBe(0); expect(DEFAULT_RESERVE_POISON).toBe(true);
    const original = digest(monsters), ordinary = start([3,36,12,30,26], [3,36,12,30,26]);
    expect(Object.hasOwn(ordinary, 'reservePoison')).toBe(false);
    expect([...ordinary.allies, ...ordinary.enemies].every(unit => !Object.hasOwn(unit, 'poisonImpactScale'))).toBe(true);
    for (const scale of [1,.5,0]) for (const reservePoison of [true,false]) {
      const state = start([3,36,12,30,26], [3,36,12,30,26], 42, { poisonImpactScale: scale, reservePoison });
      expect(state.reservePoison).toBe(reservePoison);
      for (const unit of [...state.allies, ...state.enemies]) expect(unit.poisonImpactScale).toBe(scale);
      expect(withoutControls(state)).toEqual(ordinary);
    }
    expect(digest(monsters)).toBe(original);
  });
  it('normalizes only explicit poison control metadata, retaining every historical combat field', () => {
    const state = castOnly(start([3],[1],42,{ poisonImpactScale:1,reservePoison:false })).state;
    const before = structuredClone(state), normalized = withoutControls(state);
    expect(Object.hasOwn(normalized, 'reservePoison')).toBe(false);
    expect([...normalized.allies, ...normalized.enemies].every(unit => !Object.hasOwn(unit, 'poisonImpactScale'))).toBe(true);
    expect(normalized.history).toBe(state.history); expect(normalized.log).toBe(state.log);
    // Restoring exactly the two controls must recover the full original state.
    expect({
      ...normalized, reservePoison: false,
      allies: normalized.allies.map(unit => ({ ...unit, poisonImpactScale: 1 })),
      enemies: normalized.enemies.map(unit => ({ ...unit, poisonImpactScale: 1 })),
    }).toEqual(state);
    expect(state).toEqual(before);
  });
  it.each([[undefined,0], [0,0], [.5,.5], [1,1], [-1,0], [2,1], [NaN,0], [Infinity,0], [-Infinity,0]])('bounds override %s to %s without a truthiness default', (value, expected) => {
    expect(poisonImpactScaleFor({ poisonImpactScale: value })).toBe(expected);
    if (value !== undefined) for (const unit of [...start([3],[4],42,{ poisonImpactScale: value }).allies, ...start([3],[4],42,{ poisonImpactScale: value }).enemies]) expect(unit.poisonImpactScale).toBe(expected);
  });
  it('scales the whole poison basis, including boosted ATK, and changes no other damage preview', () => {
    const unit = start([3], [], 42, { poisonImpactScale: 1 }).allies[0]; unit.rally = 2;
    const skill = unit.monster.skills[2]!;
    const full = baseDamage(unit, skill);
    for (const scale of [0,.5,1]) {
      const experimental = { ...unit, poisonImpactScale: scale };
      expect(baseDamage(experimental, skill)).toBe(full * scale);
      expect(baseDamage(experimental, battleSkill(unit.monster, BASIC_ATTACK)!)).toBe(baseDamage(unit, battleSkill(unit.monster, BASIC_ATTACK)!));
      for (const source of monsters) for (const nonPoison of source.skills.filter(option => option.kind !== 'poison')) expect(baseDamage(experimental, nonPoison)).toBe(baseDamage(unit, nonPoison));
    }
  });
});

describe('poison direct impact isolation and original status lifecycle', () => {
  it.each(sides)('uses the exact same target rolls and RNG for the default and all three explicit scales on %s', side => {
    const results = [undefined,1,.5,0].map(scale => {
      const options: StartOptions = scale === undefined ? { familySupport:false } : { familySupport:false,poisonImpactScale:scale };
      const state = start(side === 'allies' ? [3] : [1,21,23], side === 'allies' ? [1,21,23] : [3], 173, options);
      const before = structuredClone(state), result = castOnly(state, side);
      expect(state).toEqual(before);
      let seed = random(state.seed); // One valid actor tie draw; invalid orders draw nothing.
      const basis = 12 + state[side][0].monster.atk * .38;
      const expected = state[other(side)].map(unit => {
        seed = random(seed);
        return Math.floor(basis * (scale ?? 0) * (.9 + seed % 21 / 100));
      });
      expect(direct(result.events).map(event => event.amount)).toEqual(scale ? expected : []);
      expect(result.state.seed).toBe(seed);
      expect(result.events.filter(event => event.kind === 'poison').map(event => event.poison)).toEqual([3,3,3]);
      expect(ticks(result.events).map(event => event.amount)).toEqual(state[other(side)].map(unit => Math.floor(unit.monster.hp * .06)));
      expect(result.state[side][0].mp).toBe(state[side][0].mp - 16);
      expect(result.state[side][0].monster.mp).toBe(state[side][0].monster.mp);
      return result;
    });
    expect(results.map(result => result.state.seed)).toEqual(Array(results.length).fill(results[0].state.seed));
  });
  it.each([1,.5,0])('keeps guard/ward strongest-only and ticks unmitigated at scale %s', scale => {
    for (const [guard, ward, wardPercent] of [[false,false,30], [true,false,30], [false,true,30], [true,true,30], [true,true,80]] as const) {
      const state = start([3], [1], 123, { familySupport: false, poisonImpactScale: scale });
      if (ward) { state.enemies[0].ward = 2; state.enemies[0].wardPercent = wardPercent; }
      const result = resolve(state, [{ key: 'a0', skill: 2 }], [{ key: 'e0', skill: guard ? DEFEND : 99 }]);
      let seed = random(state.seed); if (guard) seed = random(seed); seed = random(seed);
      const protection = directDamageScale({ ...state.enemies[0], guard });
      expect(protection).toBe(Math.min(guard ? .5 : 1, ward ? 1 - wardPercent / 100 : 1));
      expect(direct(result.events).map(event => event.amount)).toEqual(scale ? [Math.max(1, Math.floor((12 + 35 * .38) * scale * (.9 + seed % 21 / 100) * protection))] : []);
      expect(ticks(result.events).map(event => event.amount)).toEqual([15]);
    }
  });
  it.each([1,15,250].flatMap(hp => [undefined,0].map(scale => ({ hp, scale }))))('default/explicit zero at target HP $hp, override $scale has no minimum-one leak, fake hit/log or premature defeat', ({ hp, scale }) => {
    const state = start([3],[1],42,scale === undefined ? undefined : { poisonImpactScale:scale }); state.enemies[0].hp = hp;
    const result = castOnly(state);
    expect(direct(result.events)).toEqual([]);
    expect(result.state.log.filter(line => /に \d+ ダメージ/.test(line))).toEqual([]);
    expect(result.events.find(event => event.kind === 'poison')).toMatchObject({ target:'e0', poison:3, phase:'action' });
    expect(result.events.filter(event => event.kind === 'defeat').every(event => event.phase === 'turn-end' && event.effect === 'poison')).toBe(true);
    expect(result.state.enemies[0].hp).toBe(Math.max(0,hp-15));
  });
  it('half-scale lethal impact never applies poison to its defeated target', () => {
    const state = start([3],[1],42,{ poisonImpactScale:.5 }); state.enemies[0].hp = 1;
    const result = castOnly(state);
    expect(direct(result.events).map(event => event.amount)).toEqual([1]);
    expect(result.events.filter(event => event.kind === 'poison')).toEqual([]);
    expect(ticks(result.events)).toEqual([]); expect(result.state.enemies[0].poison).toBe(0);
  });
  it('excludes preexisting KOs, uses currently living all-target recipients, and ignores a dead aimed target', () => {
    const state = start([3],[1,21,23],42,{ poisonImpactScale:0 }); state.enemies[0].hp = 0; state.enemies[0].poison = 3;
    const result = resolve(state,[{ key:'a0', skill:2, target:'e0' }]);
    expect(result.events.find(event => event.kind === 'cast')).toMatchObject({ scope:'all',targets:['e1','e2'] });
    expect(result.events.filter(event => event.kind === 'poison').map(event => event.target)).toEqual(['e1','e2']);
    expect(result.state.seed).toBe(random(random(random(state.seed))));
    expect(result.state.enemies[0]).toMatchObject({ hp:0,poison:0 });
  });
  it('rebuilds poison cast recipients after an earlier lethal hit and retains only the live-target draws', () => {
    const state = start([0,3],[1,21],42,{ poisonImpactScale:0 }); state.enemies[0].hp = 1;
    const result = resolve(state,[{ key:'a0',skill:1,target:'e0' },{ key:'a1',skill:2,target:'e0' }]);
    expect(result.events.find(event=>event.kind==='cast'&&event.actor==='a1')).toMatchObject({scope:'all',targets:['e1']});
    expect(result.events.filter(event=>event.kind==='poison').map(event=>event.target)).toEqual(['e1']);
    expect(result.state.seed).toBe(random(random(random(random(state.seed)))));
    expect(direct(result.events).map(event=>event.actor)).toEqual(['a0']);
  });
  it('retains the ordinary minimum-one direct hit even when its basis is zero', () => {
    for(const scale of [undefined,0,.5,1]) {
      const state=start([18],[1],42,scale === undefined ? undefined : {poisonImpactScale:scale});
      state.allies[0].monster={...state.allies[0].monster,skills:[{...state.allies[0].monster.skills[0]!,power:0}]};
      const result=resolve(state,[{key:'a0',skill:0}]);
      expect(direct(result.events).map(event=>event.amount)).toEqual([1]);
      expect(result.events.filter(event=>event.kind==='poison')).toEqual([]);
    }
  });
  it.each([undefined,0])('keeps exactly three 6% end-of-turn ticks after one state-only cast, scale override %s', scale => {
    let state = start([3],[1],42,scale === undefined ? undefined : { poisonImpactScale:scale }); const amounts: number[][] = [];
    for (let turn=0;turn<4;turn++) {
      const result = turn ? resolve(state,noOrders(state)) : castOnly(state);
      amounts.push(ticks(result.events).map(event => event.amount!)); state=result.state;
      expect(state.enemies[0].poison).toBe(Math.max(0,2-turn));
    }
    expect(amounts).toEqual([[15],[15],[15],[]]); expect(state.enemies[0].hp).toBe(205);
  });
  it.each([undefined,0])('retains manually repeated casts, a real 3-to-3 refresh, and finite MP, scale override %s', scale => {
    const options = scale === undefined ? undefined : { poisonImpactScale:scale,reservePoison:true };
    const duplicated = start([4,3],[1],42,options);
    const refreshed = resolve(duplicated,[{ key:'a0',skill:1 },{ key:'a1',skill:2 }]);
    expect(refreshed.events.filter(event => event.kind === 'poison').map(event => event.poison)).toEqual([3,3]);
    expect(ticks(refreshed.events)).toHaveLength(1); expect(refreshed.state.enemies[0].poison).toBe(2);
    let state = start([3],[1],42,options);
    for(let cast=0;cast<4;cast++) {
      const result=castOnly(state); state=result.state;
      expect(result.events.filter(event=>event.kind==='resource').map(event=>event.amount)).toEqual([16]);
      expect(state.allies[0].mp).toBe(64-(cast+1)*16); expect(state.allies[0].monster.mp).toBe(64);
    }
    expect(canUseSkill(state.allies[0],state.allies[0].monster.skills[2]!)).toBe(false);
    const fifth=castOnly(state); expect(fifth.events.some(event=>event.kind==='cast')).toBe(false);
    expect(fifth.state.allies[0].mp).toBe(0); expect(fifth.state.allies[0].monster.mp).toBe(64);
  });
  it.each([1,.5,0])('does not grant poison immunity: faster cleansing then slower Naga reapplies at scale %s', scale => {
    const state=start([10],[7],42,{ poisonImpactScale:scale }); state.enemies[0].poison=2;
    const result=resolve(state,[{key:'a0',skill:1}],[{key:'e0',skill:3,target:'e0'}]);
    expect(result.events.filter(event=>event.kind==='cleanse'||event.kind==='poison').map(event=>event.kind)).toEqual(['cleanse','poison']);
    expect(result.state.enemies[0].poison).toBe(2); expect(ticks(result.events)).toHaveLength(1);
  });
  it('cleanses a newly applied fast poison before its first tick', () => {
    const state=start([4],[7],42,{poisonImpactScale:0});
    const result=resolve(state,[{key:'a0',skill:1}],[{key:'e0',skill:3,target:'e0'}]);
    expect(result.events.filter(event=>event.kind==='cleanse'||event.kind==='poison').map(event=>event.kind)).toEqual(['poison','cleanse']);
    expect(ticks(result.events)).toEqual([]); expect(result.state.enemies[0]).toMatchObject({hp:190,poison:0});
  });
  it('keeps cashout amount/ordering unchanged and permits later zero-direct reapplication', () => {
    const state=start([32,10,4,35],[1],42,{poisonImpactScale:0}); state.enemies[0].poison=3;
    const result=resolve(state,[{key:'a0',skill:0},{key:'a1',skill:1},...noOrders(state).slice(2)]);
    expect(result.events.find(event=>event.kind==='poison-cashout')).toMatchObject({poisonTicksConsumed:3,poisonCashoutPerTick:22,poisonCashoutAdded:66});
    expect(direct(result.events)).toHaveLength(1);
    expect(result.events.filter(event=>event.kind==='poison-cashout'||event.kind==='poison').map(event=>event.kind)).toEqual(['poison-cashout','poison']);
    expect(result.state.enemies[0].poison).toBe(2);
  });
  it('leaves non-poison attacks, fixed/area/barrage, MP loss, cashout, supports and all statuses identical', () => {
    for(const [team,enemy,skill] of [ [[0],[1],2], [[18],[1],0], [[12,0,2,11,13],[1,21,23],0], [[29,8,30],[1],0], [[32,4,35],[1],0], [[2],[1],3], [[36,12,2,30,26],[1],1] ] as const) {
      const outputs=[1,.5,0].map(scale=>{
        const state=start([...team],[...enemy],137,{poisonImpactScale:scale}); state.enemies[0].poison=2; state.enemies[0].ward=2;
        state.allies[0].poison=2; state.allies[0].hp-=20;
        const result=resolve(state,[{key:'a0',skill},...noOrders(state).slice(1)]);
        return {...result,state:withoutControls(result.state)};
      });
      expect(outputs[1]).toEqual(outputs[0]); expect(outputs[2]).toEqual(outputs[0]);
    }
  });
});

describe('default public same-side poison reservation policy and independent overrides', () => {
  const targets=[1,21,23,26,14];
  const chosenKinds=(state:State,side:typeof sides[number]='allies')=>autoOrders(state,side).map(order=>battleSkill(state[side].find(unit=>unit.key===order.key)!.monster,order.skill)!.kind);
  it('keeps complete non-poison battles identical across scales and reservation arms', () => {
    const teams=[[12,0,2,11,13],[15,5,16,17,18],[19,20,21,22,23],[24,25,26,27,28],[29,1,8,30,31],[32,33,34,35,2],[36,12,2,30,26],[14,6,2,7,28]];
    for(const team of teams)for(const enemy of teams)for(const samePolicy of [false,true]) {
      const arms: StartOptions[] = [{}, ...[1,.5,0].flatMap(poisonImpactScale => [false,true].map(reservePoison => ({poisonImpactScale,reservePoison})))];
      const results=arms.map(options=>{
        let state=start(team,enemy,173,{leaders:true,...options});
        while(!state.winner)state=advanceWithEvents(state,autoOrders(state),samePolicy ? {enemyOrders:autoOrders(state,'enemies')} : {}).state;
        return digest(withoutControls(state));
      });
      expect(new Set(results).size).toBe(1);
    }
  },20000);
  it('direct scale changes real AI attack previews, independently of reservation', () => {
    const full=start([3],[1,21],42,{familySupport:false,poisonImpactScale:1,reservePoison:false});
    const zero=start([3],[1,21],42,{familySupport:false,poisonImpactScale:0,reservePoison:false});
    expect(chosenKinds(full)).toEqual(['poison']); expect(chosenKinds(zero)).toEqual(['hit']);
    expect(full.reservePoison).toBe(false); expect(zero.reservePoison).toBe(false);
  });
  it.each(sides)('reserves future status utility only after an earlier own slot selects poison on %s', side => {
    const state=start(side==='allies'?[4,9]:targets,side==='enemies'?[4,9]:targets,42,{familySupport:false});
    const before=structuredClone(state);
    expect(chosenKinds(state,side)).toEqual(['poison','hit']);
    expect(state.reservePoison).toBeUndefined();
    expect(chosenKinds({...state,reservePoison:false},side)).toEqual(['poison','poison']);
    expect(chosenKinds({...state,reservePoison:true},side)).toEqual(['poison','hit']);
    expect(state).toEqual(before);
  });
  it.each(sides)('honors start-time false and zero overrides independently on %s', side => {
    const team = side === 'allies' ? [4,9] : targets, enemy = side === 'enemies' ? [4,9] : targets;
    const defaultState = start(team,enemy,42,{ familySupport:false });
    const falseOnly = start(team,enemy,42,{ familySupport:false,reservePoison:false });
    const zeroOnly = start(team,enemy,42,{ familySupport:false,poisonImpactScale:0 });
    const explicitDefault = start(team,enemy,42,{ familySupport:false,poisonImpactScale:0,reservePoison:true });
    expect(falseOnly.reservePoison).toBe(false);
    expect(falseOnly[side].every(unit => poisonImpactScaleFor(unit) === 0)).toBe(true);
    expect(chosenKinds(falseOnly,side)).toEqual(['poison','poison']);
    expect(chosenKinds(defaultState,side)).toEqual(['poison','hit']);
    expect(autoOrders(zeroOnly,side)).toEqual(autoOrders(defaultState,side));
    expect(autoOrders(explicitDefault,side)).toEqual(autoOrders(defaultState,side));
    for(const state of [falseOnly,zeroOnly,explicitDefault]) expect(withoutControls(state)).toEqual(defaultState);
  });
  it('preserves repeated poison when its immediate AoE is valuable without double-counting status', () => {
    const state=start([4,3,9,10],targets,42,{familySupport:false,poisonImpactScale:1,reservePoison:true});
    expect(chosenKinds(state)).toEqual(['poison','poison','poison','poison']);
    const result=resolve(state,autoOrders(state));
    expect(result.events.filter(event=>event.kind==='cast'&&event.effect==='poison')).toHaveLength(4);
  });
  it('does not reserve a dead, unaffordable, or unchosen earlier poisoner', () => {
    for(const scenario of ['dead','mp','healing']) {
      const state=start([3,9],targets,42,{familySupport:false,poisonImpactScale:0,reservePoison:true});
      if(scenario==='dead')state.allies[0].hp=0;
      if(scenario==='mp')state.allies[0].mp=15;
      if(scenario==='healing')state.allies[0].hp=50;
      const orders=autoOrders(state),later=orders.find(order=>order.key==='a1')!;
      expect(battleSkill(state.allies[1].monster,later.skill)!.kind).toBe('poison');
      expect(state.allies[1].poison).toBe(0);
    }
  });
  it('honestly loses the reserved opportunity when the earlier actor is knocked out before casting', () => {
    const state=start([4,9],[0,21,23,26,14],42,{familySupport:false,poisonImpactScale:0,reservePoison:true}); state.allies[0].hp=1;
    const orders=autoOrders(state); expect(chosenKinds(state)).toEqual(['poison','hit']);
    const enemyOrders=[{key:'e0',skill:1,target:'a0'},...noOrders(state,'enemies').slice(1)];
    const result=resolve(state,orders,enemyOrders);
    expect(result.state.allies[0].hp).toBe(0); expect(result.state.allies[0].mp).toBe(56);
    expect(result.events.filter(event=>event.kind==='poison')).toEqual([]);
    const unreserved={...state,reservePoison:false};
    const alternative=resolve(unreserved,autoOrders(unreserved),enemyOrders);
    expect(alternative.events.some(event=>event.kind==='poison'&&event.actor==='a1')).toBe(true);
  });
  it('uses no hidden orders or RNG, mutates no state, and never forecasts later cashout/cleanse', () => {
    const state=start([4,9,32],targets,42,{familySupport:false,poisonImpactScale:0,reservePoison:true});
    const before=structuredClone(state),expected=autoOrders(state);
    for(const key of ['orders','enemyOrders','plannedEnemyOrders'])Object.defineProperty(state,key,{get(){throw new Error('Hidden orders accessed');}});
    expect(autoOrders(state)).toEqual(expected);
    for(const seed of [0,1,42,4294967295])expect(autoOrders({...state,seed})).toEqual(expected);
    expect(state).toEqual(before); expect(state.seed).toBe(42);
    expect(expected[1].skill).toBe(0); // Later cashout is not treated as a reason to reserve another poison.
  });
});
