import { describe, expect, it, vi } from 'vitest';
import { advanceWithEvents, automaticOrders, chooseAutomaticOrder, chooseEnemyAutomaticOrder, chooseTacticalAutomaticOrder, AUTO, BASIC_ATTACK, DEFEND, MAX_TURNS, battleSkill, start, type Monster, type Skill, type SpecialSkills, type State, type Unit } from './engine';
import * as baseline from '../tests/reference-v02030/engine';
import { applyBattleEvents, buildTimeline } from './playback';
import { resultFacts, battleFactEvidenceLines } from './battleInsights';

const hit: Skill = { name: '強打', kind: 'hit', power: 100, priority: 0, mpCost: 8 };
const heal: Skill = { name: '回復', kind: 'heal', power: 160, priority: 0, mpCost: 8 };
const guard: Skill = { name: '鉄壁の構え', kind: 'guard', power: 0, priority: 1, mpCost: 0 };
const poison: Skill = { name: '毒', kind: 'poison', power: 1, priority: 0, mpCost: 4 };
function unit(key: string, skills: SpecialSkills = [], options: Partial<Monster> = {}): Unit {
  const monster: Monster = {id:0,name:key,icon:'⚔️',cost:1,hp:500,mp:60,atk:20,speed:50,skills,...options};
  return {key,monster,hp:monster.hp,mp:monster.mp,guard:false,poison:0};
}
function battle(allies: Unit[], enemies: Unit[], options: Partial<State> = {}): State {return {turn:1,seed:42,allies,enemies,log:[],winner:null,...options};}
const record = (result: ReturnType<typeof advanceWithEvents>, key: string) => result.state.history!.at(-1)!.orders.find(order=>order.key===key)!;
const casts = (result: ReturnType<typeof advanceWithEvents>) => result.events.filter(event=>event.kind==='cast');
const actionActors = (result: ReturnType<typeof advanceWithEvents>) => result.events.filter(event=>event.kind==='phase' && event.phase==='before-action').map(event=>event.actor);
const sameResources = (state: State) => [...state.allies,...state.enemies].map(({key,hp,mp,guard,poison,ward,rally,supplyReady})=>({key,hp,mp,guard,poison,ward,rally,supplyReady}));

// These tests assert public policy/mechanics. They do not claim optimal play or
// preserve the old automatic policy's outcomes; explicit orders have a separate control.
describe('deferred automatic intents and pure current-state choices', () => {
  it('preserves first explicit orders and original living slots without snapshotting missing actors', () => {
    const state = battle([unit('a0'),unit('a1'),unit('a2')],[unit('e0')]); state.allies[0].hp=0;
    const manual = {key:'a2',skill:DEFEND};
    expect(automaticOrders(state,[manual,{key:'a2',skill:BASIC_ATTACK},{key:'e0',skill:DEFEND}])).toEqual([{key:'a1',skill:AUTO},manual]);
    expect(automaticOrders(state,[],'enemies')).toEqual([{key:'e0',skill:AUTO}]);
    expect(automaticOrders({...state,winner:'win'})).toEqual([]);
  });
  it('chooses deterministically without reading randomness, mutating resources or freezing future targets', () => {
    const state = battle([unit('a0',[hit])],[unit('e0'),unit('e1')]); const old=structuredClone(state);
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw new Error('AI must be pure');});
    try {
      const choice=chooseAutomaticOrder(state,'a0');
      expect(chooseAutomaticOrder({...state,seed:0xffffffff},'a0')).toEqual(choice);
      expect(chooseAutomaticOrder(state,'a0')).toEqual(choice); expect(state).toEqual(old);
      state.enemies[0].hp=0; expect(chooseAutomaticOrder(state,'a0').target).toBe('e1');
      expect(automaticOrders(state)).toEqual([{key:'a0',skill:AUTO}]);
    } finally {random.mockRestore();}
  });
  it.each(['allies','enemies'] as const)('keeps automatic progress on %s without a learned-guard lock at zero MP', side => {
    const state=battle([unit('a0',[hit,guard])],[unit('e0',[hit,guard])]); [...state.allies,...state.enemies].forEach(unit=>unit.mp=0);
    const key=state[side][0].key; expect(chooseAutomaticOrder(state,key,side).skill).toBe(BASIC_ATTACK);
    const result=advanceWithEvents(state,[]); expect(record(result,key)).toMatchObject({source:'automatic',skill:BASIC_ATTACK,accepted:true});
  });
  it('keeps genuinely useful guarding when an unacted teammate makes progress, but not after attackers act or on existing guard', () => {
    const actor=unit('a0',[guard],{atk:0}), friend=unit('a1',[],{atk:100}), foe=unit('e0',[{...hit,power:300,mpCost:0}],{atk:0});
    actor.hp=200; const state=battle([actor,friend],[foe]);
    expect(chooseAutomaticOrder(state,'a0').skill).toBe(0);
    expect(chooseAutomaticOrder(state,'a0','allies',new Set(['a0','e0'])).skill).toBe(BASIC_ATTACK);
    expect(chooseAutomaticOrder(state,'a0','allies',new Set(['a0','a1'])).skill).toBe(BASIC_ATTACK);
    actor.guard=true; expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
  });
  it('can protect poison progress or a final-turn judging lead without restoring a lone infinite guard loop', () => {
    const actor=unit('a0',[guard],{atk:0,hp:200}), foe=unit('e0',[{...hit,power:150,mpCost:0}],{atk:0,hp:500});
    const state=battle([actor],[foe]);
    expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
    foe.poison=2; expect(chooseAutomaticOrder(state,'a0').skill).toBe(0);
    foe.poison=0; foe.hp=300; state.turn=MAX_TURNS;
    expect(chooseAutomaticOrder(state,'a0').skill).toBe(0);
    state.turn--; expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
  });
});

describe('choices observe preceding authoritative actions', () => {
  it('heals newly injured allies instead of the input-time attack, then replays identical resource updates', () => {
    const healer=unit('a0',[hit,heal],{speed:10,atk:0}), friend=unit('a1',[],{speed:100});
    const enemy=unit('e0',[{...hit,power:260,mpCost:0}],{speed:80,atk:0});
    const state=battle([healer,friend],[enemy]); expect(chooseAutomaticOrder(state,'a0').skill).toBe(0);
    const result=advanceWithEvents(state,[{key:'a0',skill:AUTO},{key:'a1',skill:BASIC_ATTACK,target:'e0'}],{enemyOrders:[{key:'e0',skill:0,target:'a1'}]});
    expect(record(result,'a0')).toMatchObject({skill:1,target:'a1',source:'automatic',decisionPriority:0});
    expect(result.events.find(event=>event.kind==='heal')).toMatchObject({actor:'a0',target:'a1',amount:160});
    expect(sameResources(applyBattleEvents(state,result.events))).toEqual(sameResources(result.state));
    let playback=state; for(const cue of buildTimeline(result.events).cues) playback=applyBattleEvents(playback,[...(cue.updates??[]),...cue.impacts]);
    expect(sameResources(playback)).toEqual(sameResources(result.state));
  });
  it('abandons obsolete healing after a faster heal already fills the missing HP', () => {
    const slow=unit('a0',[hit,heal],{speed:10,atk:0}), fast=unit('a1',[{...heal,power:500}],{speed:100});slow.hp=200;
    const state=battle([slow,fast],[unit('e0')]); expect(chooseAutomaticOrder(state,'a0').skill).toBe(1);
    const result=advanceWithEvents(state,[{key:'a1',skill:0,target:'a0'}],{enemyOrders:[{key:'e0',skill:DEFEND}]});
    expect(record(result,'a0').skill).toBe(0);expect(result.events.filter(event=>event.kind==='heal'&&event.actor==='a0')).toEqual([]);
  });
  it('cleanses poison inflicted after input, without pre-reserving a cleanse against future commands', () => {
    const cleanse:Skill={...heal,name:'浄化',kind:'cleanse',power:0};
    const actor=unit('a0',[cleanse],{atk:1,speed:10}), friend=unit('a1',[],{atk:1,speed:100});
    const state=battle([actor,friend],[unit('e0',[poison],{speed:80,atk:0})]);
    expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
    const result=advanceWithEvents(state,[{key:'a1',skill:BASIC_ATTACK}],{enemyOrders:[{key:'e0',skill:0,target:'a1'}]});
    expect(record(result,'a0')).toMatchObject({skill:0,target:'a1'}); expect(result.state.allies[1].poison).toBe(0);
  });
  it('targets the living original enemy slot after an earlier kill, including duplicate species', () => {
    const state=battle([unit('a0',[hit],{speed:10}),unit('a1',[{...hit,power:999,priority:2}],{speed:100})],[unit('e0'),unit('e1')]);state.enemies[0].hp=100;
    expect(chooseAutomaticOrder(state,'a0').target).toBe('e0');
    const result=advanceWithEvents(state,[{key:'a1',skill:0,target:'e0'}],{enemyOrders:[{key:'e0',skill:DEFEND},{key:'e1',skill:DEFEND}]});
    expect(record(result,'a0')).toMatchObject({skill:0,target:'e1'}); expect(casts(result).find(event=>event.actor==='a0')?.target).toBe('e1');
  });
  it('selects an affordable basic after prior MP drain, rather than recording a stale paid choice or fallback', () => {
    const actor=unit('a0',[hit],{speed:10});actor.mp=8;
    const enemy=unit('e0',[{...hit,name:'吸魔',power:1,mpCost:1,mpDamage:8}],{speed:100,atk:0});
    const result=advanceWithEvents(battle([actor],[enemy]),[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    expect(record(result,'a0')).toMatchObject({skill:BASIC_ATTACK,accepted:true});
    expect(result.events.some(event=>event.kind==='fallback')).toBe(false);expect(result.state.allies[0].mp).toBe(0);
  });
  it('uses MP restored by a faster actual supply, without requiring the skill to be affordable at input', () => {
    const actor=unit('a0',[hit],{family:'slime',speed:10});actor.mp=0;
    const supplier=unit('a1',[{name:'蓄え分け',kind:'restoreMp',power:8,mpCost:0,priority:0,all:true}],{id:24,family:'slime',speed:100});supplier.supplyReady=true;
    const state=battle([actor,supplier],[unit('e0')]);expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
    const result=advanceWithEvents(state,[{key:'a1',skill:0}],{enemyOrders:[{key:'e0',skill:DEFEND}]});
    expect(record(result,'a0').skill).toBe(0);expect(result.events.find(event=>event.kind==='resource-gain'&&event.target==='a0')?.amount).toBe(8);
    expect(result.state.allies[0].mp).toBe(0);
  });
  it('records an unchosen defeated intent as AUTO with a reason, no invented skill or MP debit', () => {
    const state=battle([unit('a0',[hit],{speed:10})],[unit('e0',[{...hit,power:999,priority:2}],{speed:100})]);
    const result=advanceWithEvents(state,[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    expect(record(result,'a0')).toEqual({key:'a0',skill:AUTO,side:'allies',source:'automatic',accepted:false,rejection:'defeated'});
    expect(casts(result).map(event=>event.actor)).toEqual(['e0']);expect(result.state.allies[0].mp).toBe(60);
  });
  it('records no-opponents without selecting or casting a hypothetical command', () => {
    const state=battle([unit('a0',[hit],{speed:10}),unit('a1',[{...hit,power:999,priority:2}],{speed:100})],[unit('e0')]);
    const result=advanceWithEvents(state,[{key:'a1',skill:0,target:'e0'}],{enemyOrders:[{key:'e0',skill:DEFEND}]});
    expect(record(result,'a0')).toMatchObject({skill:AUTO,accepted:false,rejection:'no-opponents'});
    expect(record(result,'a0').skillName).toBeUndefined();expect(actionActors(result)).not.toContain('a0');
  });
});

describe('priority checkpoints, seed consumption, and unchanged explicit commands', () => {
  it('waits for a chosen anchor band while faster normal attacks occur first, and acts once', () => {
    const actor=unit('a0',[{...hit,power:200,priority:-2}],{speed:100}), foe=unit('e0',[{...hit,power:1}],{speed:10});
    const result=advanceWithEvents(battle([actor],[foe]),[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    expect(actionActors(result)).toEqual(['e0','a0']);expect(record(result,'a0')).toMatchObject({skill:0,decisionPriority:-2});
    expect(casts(result).filter(event=>event.actor==='a0')).toHaveLength(1);
  });
  it('can upgrade to a now-needed higher-priority heal only at the current band, never rewinding', () => {
    const actor=unit('a0',[{...heal,priority:3}],{speed:10,atk:1}), foe=unit('e0',[{...hit,power:300,mpCost:0}],{speed:100,atk:0});
    const state=battle([actor],[foe]);expect(chooseAutomaticOrder(state,'a0').skill).toBe(BASIC_ATTACK);
    const result=advanceWithEvents(state,[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    expect(actionActors(result)).toEqual(['e0','a0']);expect(record(result,'a0')).toMatchObject({skill:0,decisionPriority:0});
  });
  it('draws initiative once per actor, not once per reconsidered band', () => {
    const state=battle([unit('a0',[{...hit,priority:-2},{...heal,priority:3}])],[unit('e0',[{...hit,priority:4}])]);
    state.allies[0].mp=0;state.enemies[0].mp=0;
    const result=advanceWithEvents(state,[]);let seed=state.seed;
    for(let i=0;i<4;i++)seed=(Math.imul(seed,1664525)+1013904223)>>>0; // 2 initiative + 2 direct damage rolls
    expect(result.state.seed).toBe(seed);expect(casts(result)).toHaveLength(2);
    expect(advanceWithEvents(state,automaticOrders(state))).toEqual(result);
    const diagnostic=advanceWithEvents(state,automaticOrders(state),{enemyOrders:automaticOrders(state,[],'enemies')});
    expect(diagnostic.state.seed).toBe(seed);expect(diagnostic.events).toEqual(result.events);
    expect(record(result,'e0').decisionPriority).toBeUndefined();expect(record(diagnostic,'e0').decisionPriority).toBe(0);
  });
  it.each([0,1,42,0xffffffff])('retains full explicit-manual baseline parity through a whole match (seed %s)', seed => {
    let old=baseline.start([14,3,6,9,10],[29,1,8,30,31],seed,{leaders:true});
    let current=start([14,3,6,9,10],[29,1,8,30,31],seed,{leaders:true});expect(current).toEqual(old);
    for(let turn=0;!old.winner;turn++) {
      expect(turn).toBeLessThan(MAX_TURNS);
      const orders=baseline.autoOrders(old),enemyOrders=baseline.autoOrders(old,'enemies');
      const expected=baseline.advanceWithEvents(old,orders,{enemyOrders}),actual=advanceWithEvents(current,orders,{enemyOrders});
      expect(actual).toEqual(expected);old=expected.state;current=actual.state;
    }
  });
  it.each([0,1,42,0xffffffff])('has progress, no duplicate casts, bounded MP, and a result in exhausted guard-capable mirrors (%s)', seed => {
    let state=start([1,2,5,8,10],[1,2,5,8,10],seed,{leaders:true});[...state.allies,...state.enemies].forEach(unit=>unit.mp=0);
    let turns=0;
    while(!state.winner) {
      expect(turns++).toBeLessThan(MAX_TURNS);const result=advanceWithEvents(state,automaticOrders(state));
      expect(casts(result).some(event=>event.effect==='hit')).toBe(true);
      expect(new Set(casts(result).map(event=>event.actor)).size).toBe(casts(result).length);
      expect([...result.state.allies,...result.state.enemies].every(unit=>unit.mp===0)).toBe(true);state=result.state;
    }
    expect(state.winner).not.toBeNull();
  });
});


describe('headless tactical bounded scoring follows actual mechanics', () => {
  it('does not credit direct poison kills when direct poison impact is zero', () => {
    const actor=unit('a0',[{...poison,all:true,mpCost:0}],{atk:1});actor.poisonImpactScale=0;
    const enemies=Array.from({length:5},(_,i)=>unit(`e${i}`));enemies.forEach(enemy=>{enemy.hp=1;enemy.poison=2;});
    expect(chooseTacticalAutomaticOrder(battle([actor],enemies),'a0','allies',new Set(['a0'])).skill).toBe(BASIC_ATTACK);
  });
  it('does not pretend three random hits guarantee kills on five distinct recipients', () => {
    const actor=unit('a0',[{...hit,power:1,mpCost:0,randomHits:3},{...heal,power:70,mpCost:0}],{atk:1});actor.hp=100;
    const enemies=Array.from({length:5},(_,i)=>unit(`e${i}`));enemies.forEach(enemy=>enemy.hp=1);
    expect(chooseTacticalAutomaticOrder(battle([actor],enemies),'a0').skill).toBe(1);
  });
  it('retains original five-beast barrage eligibility after preceding slots die', () => {
    const friends=Array.from({length:5},(_,i)=>unit(`a${i}`,[],{family:'beast',atk:0}));friends.slice(0,4).forEach(friend=>friend.hp=0);
    friends[4].monster.skills=[{...hit,power:30,mpCost:0,randomHits:3,familyBonusHit:'beast'},{...hit,power:110,mpCost:0}];
    expect(chooseTacticalAutomaticOrder(battle(friends,[unit('e0',[],{hp:1000})]),'a4').skill).toBe(0);
  });
  it('scores after-hit guard breaking only on the first repeated hit', () => {
    const actor=unit('a0',[{...hit,power:350,mpCost:0},{...hit,power:100,mpCost:0,randomHits:3,breaksGuardAfterHit:true}],{atk:0});
    const enemy=unit('e0',[],{hp:1000});enemy.guard=true;
    expect(chooseTacticalAutomaticOrder(battle([actor],[enemy]),'a0').skill).toBe(1);
  });
});


describe('live player choices and diagnostic enemy-token policy', () => {
  it('selects a fresh basic at a negative checkpoint after a late drain, without rewinding or paid fallback', () => {
    const actor=unit('a0',[{...hit,power:200,priority:-2}],{speed:10});actor.mp=8;
    const enemy=unit('e0',[{...hit,power:1,mpCost:1,mpDamage:8,priority:-1}],{speed:100,atk:0});
    const state=battle([actor],[enemy]);expect(chooseAutomaticOrder(state,'a0').skill).toBe(0);
    const result=advanceWithEvents(state,[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    expect(actionActors(result)).toEqual(['e0','a0']);
    expect(record(result,'a0')).toMatchObject({skill:BASIC_ATTACK,decisionPriority:-1,nativePriority:0,accepted:true});
    expect(result.events.some(event=>event.kind==='fallback')).toBe(false);
  });
  it('uses a fixed enemy initiative token without sampling or changing legal targets on repeated checks', () => {
    const state=battle([unit('a0'),unit('a1')],[unit('e0',[hit,guard])]),remaining=new Set(['a0','a1','e0']);
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('no new random draws');});
    try {
      for(const token of [0,1,42,0xffffffff]){
        const choice=chooseEnemyAutomaticOrder(state,'e0',remaining,token);
        expect(chooseEnemyAutomaticOrder({...state,seed:123},'e0',remaining,token)).toEqual(choice);
        expect(battleSkill(state.enemies[0].monster,choice.skill)?.kind).toBe('hit');
      }
      state.allies[0].hp=0;
      for(const token of [0,1,42,0xffffffff])expect(chooseEnemyAutomaticOrder(state,'e0',remaining,token).target).toBe('a1');
      state.enemies[0].mp=0;
      for(const token of [0,1,42,0xffffffff])expect(chooseEnemyAutomaticOrder(state,'e0',remaining,token).skill).toBe(BASIC_ATTACK);
    } finally {random.mockRestore();}
  });
  it('does not fund a spent finite response merely because more MP would cover its cost', () => {
    const supply:Skill={name:'蓄え分け',kind:'restoreMp',power:8,priority:0,mpCost:0,all:true};
    const supplier=unit('a0',[supply],{id:24,family:'slime',atk:1});supplier.supplyReady=true;
    const recipient=unit('a1',[{name:'合流の扉',kind:'responseGuard',power:0,priority:3,mpCost:24,all:true}],{id:36,family:'slime'});recipient.mp=16;recipient.responseReady=false;
    const state=battle([supplier,recipient],[unit('e0')]);
    expect(chooseAutomaticOrder(state,'a0').skill).not.toBe(0);
    expect(chooseTacticalAutomaticOrder(state,'a0').skill).not.toBe(0);
  });
});


describe('undecided automatic result evidence', () => {
  it('links an actual pre-decision defeat to its AUTO order without claiming a missed heal', () => {
    const state=battle([unit('a0',[heal],{speed:1})],[unit('e0',[{...hit,power:999,priority:2}],{speed:100})]);
    const result=advanceWithEvents(state,[],{enemyOrders:[{key:'e0',skill:0,target:'a0'}]});
    const fact=resultFacts(result.state).find(fact=>fact.kind==='lost-action')!;
    expect(fact.text).toContain('特技・対象は未決定');expect(fact.text).not.toContain('回復');
    expect(fact.evidence).toEqual([{turn:1,eventIndex:result.events.findIndex(event=>event.kind==='defeat'&&event.target==='a0'),actor:'e0',target:'a0',orderIndex:0}]);
    expect(battleFactEvidenceLines(result.state,fact).join(' ')).toContain('特技・対象は未決定');
  });
  it('does not turn an unneeded no-opponents intent into a lost-action fact', () => {
    const state=battle([unit('a0',[heal],{speed:1}),unit('a1',[{...hit,power:999,priority:2}])],[unit('e0')]);
    const result=advanceWithEvents(state,[{key:'a1',skill:0,target:'e0'}],{enemyOrders:[{key:'e0',skill:DEFEND}]});
    expect(record(result,'a0')).toMatchObject({skill:AUTO,rejection:'no-opponents'});
    expect(resultFacts(result.state).some(fact=>fact.kind==='lost-action')).toBe(false);
  });
});
