export type Skill={name:string;power:number;priority:number;mpCost:number;kind:'hit'|'heal'|'guard'|'poison'|'protect'|'cleanse';all?:boolean;breaksGuard?:boolean;randomHits?:number;breaksGuardAfterHit?:boolean};
export type SpecialSkills = readonly [] | readonly [Skill] | readonly [Skill, Skill] | readonly [Skill, Skill, Skill] | readonly [Skill, Skill, Skill, Skill];
export type Family = 'beast';
export type Monster={id:number;name:string;icon:string;cost:number;hp:number;mp:number;atk:number;speed:number;family?:Family;skills:SpecialSkills};
export const BASIC_ATTACK = -1;
export const DEFEND = -2;
export const MAX_SPECIAL_SKILLS = 4;
const hit=(name:string,power:number,priority=0,all=false,mpCost=all?18:priority<0?20:priority>0?12:10):Skill=>({name,power,priority,mpCost,kind:'hit',all});
const heal:Skill={name:'生命の雫',power:65,priority:0,mpCost:18,kind:'heal'};
const guard:Skill={name:'鉄壁の構え',power:0,priority:1,mpCost:0,kind:'guard'};
const poison:Skill={name:'毒霧',power:12,priority:0,mpCost:16,kind:'poison',all:true};
const protect: Skill = { name: '護りの結界', power: 0, priority: 3, mpCost: 10, kind: 'protect' };
const cleanse: Skill = { name: '清めの雫', power: 35, priority: 0, mpCost: 12, kind: 'cleanse' };
const guardBreaker = (name: string): Skill => ({ ...hit(name, 58, 0, false, 14), breaksGuard: true });
const defend: Skill = { name: 'ぼうぎょ', power: 0, priority: 1, mpCost: 0, kind: 'guard' };

/** Universal commands do not occupy learned-special slots or change their indexes. */
export function battleSkill(monster: Monster, index: number): Skill | undefined {
  // Combined with the existing 0.38 * atk contribution, a basic hit starts at 1 * atk.
  if (index === BASIC_ATTACK) return hit('通常攻撃', monster.atk * 0.62, 0, false, 0);
  if (index === DEFEND) return defend;
  return Number.isInteger(index) && index >= 0 && index < MAX_SPECIAL_SKILLS ? monster.skills[index] : undefined;
}

const roster: [number, string, string, number, number, number, number, SpecialSkills][] = [
[0,'妖狐','🦊',4,150,47,85,[hit('狐火',55),hit('疾風斬り',38,2),hit('炎嵐',28,0,true)]],
[1,'トロル','🪨',3,250,53,23,[hit('巨人の鉄槌',65),hit('終焉の一撃',110,-2),guard,{ ...protect, name: '守護の誓い' }]],
[2,'バステト','🐈',3,170,30,57,[hit('爪撃',45),heal,guard,{ ...cleanse, name: '清めの鈴' }]],
[3,'ドリュアス','🌳',3,180,35,67,[hit('樹海の槍',60),heal,poison]],
[4,'バンシー','👻',3,155,38,75,[hit('悲鳴',54),poison,hit('影縫い',35,2)]],
[5,'ケツァルコアトル','🐉',4,200,52,47,[hit('竜の牙',65),hit('嵐の息吹',34,0,true),guard]],
[6,'ガルーダ','🦅',2,138,39,96,[hit('急降下',48),hit('先制の翼',35,2),hit('旋風',25,0,true)]],
[7,'セルキー','🦭',4,190,34,61,[hit('水刃',55),heal,guard,{ ...cleanse, name: '潮騒の浄化' }]],
[8,'イフリート','🔥',3,187,52,42,[hit('灼熱拳',69),hit('火炎旋風',33,0,true),hit('終焉の一撃',99,-2),guardBreaker('破城の拳')]],
[9,'烏天狗','🐦',3,166,41,79,[hit('風切り',51),hit('疾風斬り',36,2),poison]],
[10,'ナーガ','🐍',2,185,33,39,[hit('蛇牙',48),poison,guard,{ ...protect, name: '蛇鱗の庇護' }]],
[11,'アヌビス','🐺',4,172,54,76,[hit('冥府の刃',68),hit('影斬り',40,2),hit('終焉の一撃',105,-2),guardBreaker('冥府の断罪')]],
[12,'フェンリル','🐺',4,150,54,93,[{ ...hit('破縛の連牙',0,0,false,13), randomHits:5, breaksGuardAfterHit:true },hit('月下の一咬',55)]]
];
// Original resource budgets: three heavy casts or several economical actions.
const mpBudgets = [54, 44, 72, 64, 56, 54, 42, 72, 52, 52, 56, 50, 60];
// Game-only mammalian motifs. Unassigned creatures are not forced into a mythological taxonomy.
const beastIds = new Set([0, 2, 7, 11, 12]);
export const familyLabel = (monster: Monster): string => monster.family === 'beast' ? '獣系' : '系統未設定';
export const monsters: Monster[] = roster.map(([id, name, icon, cost, hp, atk, speed, skills]) => ({ id, name, icon, cost, hp, mp: mpBudgets[id], atk, speed, ...(beastIds.has(id) ? { family: 'beast' as const } : {}), skills }));
export type LeaderTrait = { name: string; stat: 'hp' | 'atk' | 'speed'; percent: number; description: string; family?: Family; secondary?: { stat: 'atk' | 'speed'; percent: number } };
const leaderTraits: readonly [string, LeaderTrait['stat']][] = [
  ['暁の追い風', 'speed'], ['岩山の誓い', 'hp'], ['守り猫の祈り', 'hp'], ['森羅の息吹', 'hp'],
  ['月影の号令', 'atk'], ['天空の威光', 'atk'], ['飛翼の陣', 'speed'], ['潮騒の祝福', 'hp'],
  ['灼熱の闘志', 'atk'], ['山風の導き', 'speed'], ['蛇鱗の結束', 'hp'], ['冥路の先導', 'atk'],
];

/** One trait from the first slot only. Family restrictions apply to each recipient. */
export function leaderFor(id: number): LeaderTrait {
  if (id === 12) return { name: '解き放つ群れ', stat: 'speed', percent: 12, secondary: { stat: 'atk', percent: 8 }, family: 'beast', description: '味方の獣系だけ 素早さ +12%・攻撃力 +8%' };
  const trait = leaderTraits[id];
  if (!trait) throw new Error(`Unknown monster id: ${id}`);
  const [name, stat] = trait;
  const percent = stat === 'hp' ? 12 : 8;
  const label = stat === 'hp' ? '最大HP' : stat === 'atk' ? '攻撃力' : '素早さ';
  return { name, stat, percent, description: `味方全員の${label} +${percent}%` };
}

export function leaderAppliesTo(trait: LeaderTrait, monster: Monster): boolean {
  return !trait.family || monster.family === trait.family;
}

/** These three supports require a living same-side target, including the actor. */
export const skillTargetsAllies = (skill: Skill): boolean =>
  skill.kind === 'heal' || skill.kind === 'protect' || skill.kind === 'cleanse';

export function skillOrderLabel(skill: Skill): string {
  return skill.priority >= 3 ? '最速' : skill.priority >= 2 ? '先制' : skill.priority > 0 ? '防御順' : skill.priority < 0 ? 'アンカー' : '通常順';
}

export type Unit = { key: string; monster: Monster; hp: number; mp: number; guard: boolean; poison: number; rally?: number };
export type State = {
  turn: number;
  seed: number;
  allies: Unit[];
  enemies: Unit[];
  log: string[];
  /** Authoritative completed turns. Optional only for older/injected states. */
  history?: BattleTurnRecord[];
  winner: null | 'win' | 'lose' | 'draw';
};
export type Order = { key: string; skill: number; target?: string };
export type BattlePhase = 'turn-start' | 'before-action' | 'action' | 'action-end' | 'turn-end';
export type BattleEvent = {
  kind: 'cast' | 'damage' | 'heal' | 'guard' | 'poison' | 'cleanse' | 'break' | 'defeat' | 'resource' | 'expire' | 'phase';
  actor?: string;
  target?: string;
  /** Cast intent and living targets at cast time, independent of survivor count. */
  scope?: 'single' | 'all' | 'random';
  /** Random barrages resolve one living target per hit, in this exact order. */
  hitTargets?: string[];
  hits?: number;
  hitIndex?: number;
  removed?: ('guard' | 'rally')[];
  targets?: string[];
  skill?: string;
  amount?: number;
  hp?: number;
  mp?: number;
  poison?: number;
  guard?: boolean;
  rally?: number;
  phase?: BattlePhase;
  effect?: string;
};
export type BattleOrderRecord = Order & {
  side: 'allies' | 'enemies';
  /** An explicit order may itself have been selected with the UI's auto command. */
  source: 'explicit' | 'automatic';
  skillName?: string;
  skillKind?: Skill['kind'];
  skillPower?: number;
  accepted: boolean;
  rejection?: 'invalid-skill' | 'invalid-target' | 'insufficient-mp';
};
export type BattleTurnRecord = {
  turn: number;
  orders: BattleOrderRecord[];
  events: BattleEvent[];
  log: string[];
};

export const MAX_TURNS = 20;
export const cost = (team: number[]) => team.reduce((total, id) => total + (monsters[id]?.cost ?? 0), 0);

export const RALLY_PERCENT = 5;
export const OPENING_RALLY_TURNS = 2;
/** HP/MP stay fixed; the dispellable opening aura is separate from the persistent leader. */
export const attackFor = (unit: Unit) => Math.round(unit.monster.atk * (1 + (unit.rally ? RALLY_PERCENT / 100 : 0)));
// The first-turn order is established before the opening aura; turn two can gain speed.
export const speedFor = (unit: Unit, turn: number) => Math.round(unit.monster.speed * (1 + (unit.rally && turn > 1 ? RALLY_PERCENT / 100 : 0)));
export type StartOptions = { leaders?: boolean; familySupport?: boolean };
export function start(team: number[], enemy: number[], seed = 42, options: StartOptions = {}): State {
  const units = (ids: number[], prefix: string): Unit[] => {
    const leader = options.leaders && ids.length ? leaderFor(ids[0]) : undefined;
    const rally = options.familySupport !== false && ids.includes(12);
    return ids.map((id, i) => {
      const source = monsters[id];
      if (!source) throw new Error(`Unknown monster id: ${id}`);
      // Derive battle-only stats; never accumulate boosts in the shared roster.
      const monster = leader && leaderAppliesTo(leader, source) ? {
        ...source, [leader.stat]: Math.round(source[leader.stat] * (1 + leader.percent / 100)),
        ...(leader.secondary ? { [leader.secondary.stat]: Math.round(source[leader.secondary.stat] * (1 + leader.secondary.percent / 100)) } : {}),
      } : source;
      return { key: prefix + i, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0, ...(rally && source.family === 'beast' ? { rally: OPENING_RALLY_TURNS } : {}) };
    });
  };
  return {
    turn: 1,
    seed: seed >>> 0,
    allies: units(team, 'a'),
    enemies: units(enemy, 'e'),
    history: [],
    log: ['戦闘開始！', 'MPは対戦ごとに全回復。戦闘中の自然回復はありません。', ...(options.leaders ? [
      ...(team.length ? [`味方リーダー ${monsters[team[0]].name}「${leaderFor(team[0]).name}」：${leaderFor(team[0]).description}`] : []),
      ...(enemy.length ? [`敵リーダー ${monsters[enemy[0]].name}「${leaderFor(enemy[0]).name}」：${leaderFor(enemy[0]).description}`] : []),
    ] : []), ...(options.familySupport !== false ? [
      ...(team.includes(12) ? ['味方「群れの遠吠え」：獣系だけ攻撃+5%・2ターン。素早さ+5%の行動順反映は2ターン目から。重複なし・解除可能。'] : []),
      ...(enemy.includes(12) ? ['敵「群れの遠吠え」：獣系だけ攻撃+5%・2ターン。素早さ+5%の行動順反映は2ターン目から。重複なし・解除可能。'] : []),
    ] : [])],
    winner: null,
  };
}

// Area hits trade per-target strength for coverage; poison retains its status-focused tuning.
const AREA_HIT_DAMAGE_SCALE = 0.5;
const baseDamage = (unit: Unit, skill: Skill) =>
  (skill.name === '通常攻撃' ? attackFor(unit) : skill.power + attackFor(unit) * 0.38) * (skill.all && skill.kind === 'hit' ? AREA_HIT_DAMAGE_SCALE : 1);

const random = (seed: number) => ((Math.imul(seed, 1664525) + 1013904223) >>> 0);
const living = (units: Unit[]) => units.filter(unit => unit.hp > 0);
const weakest = (units: Unit[]) => living(units).reduce<Unit | undefined>((best, unit) => (
  !best || unit.hp / unit.monster.hp < best.hp / best.monster.hp ? unit : best
), undefined);

/** MP is only spent by a valid action at its cast, never by choosing an order. */
export function canUseSkill(unit: Unit, skill: Skill): boolean {
  return unit.hp > 0 && Number.isInteger(skill.mpCost) && skill.mpCost >= 0 && unit.mp >= skill.mpCost;
}

/** Poison is measured in remaining end-of-turn ticks, not actor turns. */
export function effectStatus(unit: Unit): string {
  if (unit.hp <= 0) return '戦闘不能';
  return [unit.guard ? '守り:今T' : '', unit.poison > 0 ? `毒:残${unit.poison}回` : '', unit.rally ? `群気:残${unit.rally}T` : ''].filter(Boolean).join('・');
}

/** Choose orders without changing state or consuming the battle's random seed. */
export function autoOrders(state: State, side: 'allies' | 'enemies' = 'allies'): Order[] {
  if (state.winner) return [];
  const friends = living(state[side]);
  const opponents = living(side === 'allies' ? state.enemies : state.allies);
  const target = opponents.reduce<Unit | undefined>((best, unit) => !best || unit.hp < best.hp ? unit : best, undefined);
  const incomingThreat = opponents.reduce((largest, opponent) => Math.max(largest, attackFor(opponent),
    ...opponent.monster.skills.filter(skill => canUseSkill(opponent, skill) && (skill.kind === 'hit' || skill.kind === 'poison')).map(skill => baseDamage(opponent, skill))), 0);
  const protectedTargets = new Set<string>();
  const cleansedTargets = new Set<string>();
  const plannedHealing = new Map<string, number>();
  return friends.map(unit => {
    const specials = unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS);
    const find = (kind: Skill['kind']) => specials.findIndex(skill => skill.kind === kind && canUseSkill(unit, skill));
    const cleansing = find('cleanse');
    const poisoned = weakest(friends.filter(friend => friend.poison > 0 && !cleansedTargets.has(friend.key)));
    if (cleansing >= 0 && poisoned) {
      cleansedTargets.add(poisoned.key);
      plannedHealing.set(poisoned.key, (plannedHealing.get(poisoned.key) ?? 0) + specials[cleansing]!.power);
      return { key: unit.key, skill: cleansing, target: poisoned.key };
    }
    const protecting = find('protect');
    const vulnerable = weakest(friends.filter(friend => !protectedTargets.has(friend.key) && friend.hp > incomingThreat * 0.5));
    if (protecting >= 0 && friends.length > 1 && vulnerable && vulnerable.hp / vulnerable.monster.hp <= 0.45 && incomingThreat > 0) {
      protectedTargets.add(vulnerable.key);
      return { key: unit.key, skill: protecting, target: vulnerable.key };
    }
    const healing = find('heal');
    const injured = weakest(friends.filter(friend => (friend.hp + (plannedHealing.get(friend.key) ?? 0)) / friend.monster.hp <= 0.6));
    if (healing >= 0 && injured) {
      plannedHealing.set(injured.key, (plannedHealing.get(injured.key) ?? 0) + specials[healing]!.power);
      return { key: unit.key, skill: healing, target: injured.key };
    }
    // Keep a free attack available. Spend only when a special adds useful damage or utility.
    const score = (skill: Skill) => {
      if (skill.kind !== 'hit' && skill.kind !== 'poison') return -1;
      const targets = skill.all || skill.randomHits ? opponents : target ? [target] : [];
      return targets.reduce((total, opponent) => {
        const mitigation = opponent.guard && skill.priority < 1 && !skill.breaksGuard ? (skill.breaksGuardAfterHit ? 0.75 : 0.5) : 1;
        const damage = Math.min(opponent.hp, baseDamage(unit, skill) * mitigation * (skill.randomHits ? skill.randomHits / Math.max(1, opponents.length) : 1));
        const poisonDamage = skill.kind === 'poison' && opponent.poison === 0
          ? Math.min(Math.max(0, opponent.hp - damage), Math.floor(opponent.monster.hp * 0.06) * 2) : 0;
        return total + damage + poisonDamage;
      }, 0) + skill.priority * 0.01 - skill.mpCost * 0.18;
    };
    let skillIndex = BASIC_ATTACK;
    let bestScore = score(battleSkill(unit.monster, BASIC_ATTACK)!);
    specials.forEach((skill, index) => {
      if (!canUseSkill(unit, skill)) return;
      const candidate = score(skill);
      if (candidate > bestScore) { bestScore = candidate; skillIndex = index; }
    });
    // Non-combat fixtures and passive defenders still have a meaningful legal stance.
    if (!specials.some(skill => skill.kind === 'hit' || skill.kind === 'poison') && unit.monster.atk === 0 && find('guard') >= 0) skillIndex = find('guard');
    return { key: unit.key, skill: skillIndex, target: skillIndex >= 0 && specials[skillIndex]!.kind === 'guard' ? unit.key : target?.key };
  });
}

export function advanceWithEvents(old: State, orders: Order[]): { state: State; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  if (old.winner) return { state: old, events };
  const recordedOrders: BattleOrderRecord[] = [];
  const battle: State = { ...old, allies: old.allies.map(unit => ({ ...unit })), enemies: old.enemies.map(unit => ({ ...unit })), log: [...old.log, `── TURN ${old.turn} ──`] };
  let seed = battle.seed;
  let currentPhase: BattlePhase = 'turn-start';
  const emit = (event: BattleEvent) => events.push({ ...event, phase: currentPhase });
  const phase = (value: BattlePhase, actor?: string) => { currentPhase = value; emit({ kind: 'phase', ...(actor ? { actor } : {}) }); };
  phase('turn-start');
  // Defensive cleanup also accepts an older saved/injected state without leaking guard.
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.guard) { unit.guard = false; emit({ kind: 'expire', target: unit.key, effect: 'guard', guard: false }); }
    if (unit.hp <= 0 && unit.poison) { unit.poison = 0; emit({ kind: 'expire', target: unit.key, effect: 'poison', poison: 0 }); }
  }
  const alliedAutomatic = autoOrders(battle);
  const enemyOrders = autoOrders(battle, 'enemies');
  const actions: { unit: Unit; skill: Skill; side: 'allies' | 'enemies'; target?: string; tie: number }[] = [];
  for (const side of ['allies', 'enemies'] as const) {
    for (const unit of living(battle[side])) {
      let order = (side === 'allies' ? orders : enemyOrders).find(candidate => candidate.key === unit.key)
        ?? alliedAutomatic.find(candidate => candidate.key === unit.key);
      if (side === 'enemies') {
        const automatic = order && battleSkill(unit.monster, order.skill);
        const tacticalSupport = automatic && skillTargetsAllies(automatic);
        // Keep the approachable seeded opponent variation, restricted to legal, useful casts.
        const candidates = unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((skill, index) => ({ skill, index }))
          .filter(({ skill }) => canUseSkill(unit, skill) && (skill.kind === 'hit' || skill.kind === 'poison' || skill.kind === 'guard' || (skill.kind === 'heal' && skill.power === 0)));
        if (!tacticalSupport && candidates.length) {
          const chosen = candidates[seed % candidates.length];
          order = { key: unit.key, skill: chosen.index, target: chosen.skill.kind === 'guard' ? unit.key : order?.target };
        }
      }
      const skill = battleSkill(unit.monster, order?.skill ?? BASIC_ATTACK);
      const sameSide = skill && skillTargetsAllies(skill) ? battle[side] : side === 'allies' ? battle.enemies : battle.allies;
      const badTarget = skill && skill.kind !== 'guard' && order?.target !== undefined && !sameSide.some(target => target.key === order!.target);
      const rejection = !skill ? 'invalid-skill' : badTarget ? 'invalid-target' : !canUseSkill(unit, skill) ? 'insufficient-mp' : undefined;
      recordedOrders.push({
        key: unit.key, skill: order?.skill ?? BASIC_ATTACK, ...(order?.target !== undefined ? { target: order.target } : {}),
        side, source: side === 'allies' && orders.some(candidate => candidate.key === unit.key) ? 'explicit' : 'automatic',
        ...(skill ? { skillName: skill.name, skillKind: skill.kind, skillPower: skill.power } : {}),
        accepted: rejection === undefined, ...(rejection ? { rejection } : {}),
      });
      if (!skill || !canUseSkill(unit, skill) || badTarget) {
        battle.log.push(`${unit.monster.name}の指示は取り消し（${!skill ? '不正な特技' : badTarget ? '対象が不正' : 'MP不足'}・MP消費なし）`);
        continue;
      }
      seed = random(seed);
      actions.push({ unit, skill, side, target: order?.target, tie: seed });
    }
  }
  actions.sort((a, b) => b.skill.priority - a.skill.priority || speedFor(b.unit, battle.turn) - speedFor(a.unit, battle.turn) || a.tie - b.tie);
  const damage = (target: Unit, requested: number, actor?: string, effect?: string, hitIndex?: number) => {
    const amount = Math.min(target.hp, Math.max(1, Math.floor(requested)));
    target.hp -= amount;
    emit({ kind: 'damage', actor, ...(hitIndex !== undefined ? { hitIndex } : {}), target: target.key, amount, hp: target.hp, ...(effect === 'poison' ? { poison: target.poison } : {}), effect });
    if (target.hp === 0) {
      target.guard = false; target.poison = 0;
      if (target.rally !== undefined) target.rally = 0;
      emit({ kind: 'defeat', actor, ...(hitIndex !== undefined ? { hitIndex } : {}), target: target.key, hp: 0, guard: false, poison: 0, ...(target.rally !== undefined ? { rally: 0 } : {}), effect });
    }
    return amount;
  };
  for (const action of actions) {
    const { unit, skill, side } = action;
    phase('before-action', unit.key);
    const opponents = side === 'allies' ? battle.enemies : battle.allies;
    const friends = battle[side];
    if (unit.hp <= 0 || !canUseSkill(unit, skill) || !living(opponents).length) { phase('action-end', unit.key); continue; }
    let targets: Unit[];
    if (skill.kind === 'guard') targets = [unit];
    else if (skillTargetsAllies(skill)) {
      const fallback = skill.kind === 'cleanse' ? weakest(friends.filter(friend => friend.poison > 0)) ?? weakest(friends) : weakest(friends);
      const target = friends.find(friend => friend.key === action.target && friend.hp > 0) ?? fallback;
      targets = target ? [target] : [];
    } else {
      const alive = living(opponents);
      targets = skill.all || skill.randomHits ? alive : [alive.find(target => target.key === action.target) ?? alive[seed % alive.length]];
    }
    if (!targets.length) { phase('action-end', unit.key); continue; }
    phase('action', unit.key);
    battle.log.push(`${unit.monster.name}の「${skill.name}」！${skill.mpCost ? `（MP −${skill.mpCost}）` : ''}`);
    const castEventIndex = events.length;
    emit({ kind: 'cast', actor: unit.key, scope: skill.randomHits ? 'random' : skill.all ? 'all' : 'single', targets: targets.map(target => target.key), ...(!skill.all && !skill.randomHits ? { target: targets[0].key } : {}), ...(skill.randomHits ? { hits: skill.randomHits, hitTargets: [] } : {}), skill: skill.name, effect: skill.kind });
    // Spending is absolute and emitted at the cast, before any hit or healing animation.
    if (skill.mpCost) {
      unit.mp -= skill.mpCost;
      emit({ kind: 'resource', actor: unit.key, target: unit.key, mp: unit.mp, amount: skill.mpCost, effect: 'mp' });
    }
    if (skill.kind === 'guard' || skill.kind === 'protect') {
      const target = targets[0];
      const alreadyGuarded = target.guard;
      target.guard = true;
      emit({ kind: 'guard', actor: unit.key, target: target.key, guard: true });
      battle.log.push(`${target.monster.name}はこのターン直接ダメージ半減${alreadyGuarded ? '（重ねがけなし）' : ''}`);
    } else if (skill.kind === 'heal' || skill.kind === 'cleanse') {
      const target = targets[0];
      if (skill.kind === 'cleanse') {
        const wasPoisoned = target.poison > 0;
        target.poison = 0;
        emit({ kind: 'cleanse', actor: unit.key, target: target.key, poison: 0 });
        battle.log.push(wasPoisoned ? `${target.monster.name}の毒が消えた` : `${target.monster.name}は清められた（毒なし）`);
      }
      const amount = Math.max(0, Math.min(skill.power, target.monster.hp - target.hp));
      target.hp += amount;
      emit({ kind: 'heal', actor: unit.key, target: target.key, amount, hp: target.hp });
      battle.log.push(`${target.monster.name} HP +${amount}`);
    } else {
      const hitTargets: string[] = [];
      const hitCount = skill.randomHits ?? targets.length;
      for (let hitIndex = 0; hitIndex < hitCount; hitIndex++) {
        const alive = living(opponents);
        if (!alive.length) break;
        // Use high-quality upper bits via a fraction; low LCG parity would bias 2-target barrages.
        if (skill.randomHits) seed = random(seed);
        const target = skill.randomHits ? alive[Math.floor(seed / 0x100000000 * alive.length)] : targets[hitIndex];
        if (target.hp <= 0) continue;
        hitTargets.push(target.key);
        const wasGuarded = target.guard;
        const hadRally = !!target.rally;
        if (skill.kind === 'hit' && skill.breaksGuard && target.guard) {
          target.guard = false;
          emit({ kind: 'break', actor: unit.key, target: target.key, guard: false });
          battle.log.push(`${target.monster.name}の防御を解除！`);
        }
        seed = random(seed);
        const amount = damage(target, baseDamage(unit, skill) * (0.9 + (seed % 21) / 100) * (target.guard ? 0.5 : 1), unit.key, undefined, skill.randomHits ? hitIndex : undefined);
        battle.log.push(`${target.monster.name}に ${amount} ダメージ${wasGuarded && !skill.breaksGuard ? '（防御で半減）' : ''}${target.hp === 0 ? '・撃破！' : ''}`);
        if (skill.breaksGuardAfterHit && (wasGuarded || hadRally) && target.hp > 0) {
          target.guard = false;
          if (hadRally) target.rally = 0;
          emit({ kind: 'break', actor: unit.key, target: target.key, guard: false, ...(hadRally ? { rally: 0 } : {}), removed: [...(wasGuarded ? ['guard' as const] : []), ...(hadRally ? ['rally' as const] : [])], hitIndex, effect: hadRally ? 'rally' : 'guard' });
          battle.log.push(`${target.monster.name}の${[wasGuarded ? '守り' : '', hadRally ? '群気' : ''].filter(Boolean).join('・')}を命中後に解除！`);
        }
        if (skill.kind === 'poison' && target.hp > 0) {
          target.poison = 3;
          emit({ kind: 'poison', actor: unit.key, target: target.key, poison: 3 });
          battle.log.push(`${target.monster.name}は毒を受けた（ターン終了時・残り3回）`);
        }
      }
      if (skill.randomHits) {
        events[castEventIndex].hitTargets = hitTargets;
        events[castEventIndex].targets = [...new Set(hitTargets)];
      }
    }
    phase('action-end', unit.key);
  }
  phase('turn-end');
  // All queued actions finish before poison. Both sides tick even after a direct knockout.
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.hp <= 0 || unit.poison <= 0) continue;
    unit.poison--;
    const amount = damage(unit, unit.monster.hp * 0.06, undefined, 'poison');
    battle.log.push(`${unit.monster.name}は毒で${amount}ダメージ${unit.hp > 0 ? unit.poison ? `（残り${unit.poison}回）` : '（毒が切れた）' : '・撃破！'}`);
  }
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.rally) {
      unit.rally--;
      emit({ kind: 'expire', target: unit.key, effect: 'rally', rally: unit.rally });
    }
    if (unit.guard) {
      unit.guard = false;
      emit({ kind: 'expire', target: unit.key, effect: 'guard', guard: false });
    }
  }
  const aliveAllies = battle.allies.some(unit => unit.hp > 0);
  const aliveEnemies = battle.enemies.some(unit => unit.hp > 0);
  battle.winner = !aliveAllies && !aliveEnemies ? 'draw' : !aliveAllies ? 'lose' : !aliveEnemies ? 'win' : null;
  if (!battle.winner && battle.turn >= MAX_TURNS) {
    const remaining = (units: Unit[]) => units.reduce((total, unit) => total + unit.hp / unit.monster.hp, 0);
    const difference = remaining(battle.allies) - remaining(battle.enemies);
    battle.winner = Math.abs(difference) < 1e-9 ? 'draw' : difference > 0 ? 'win' : 'lose';
  }
  if (battle.winner) battle.log.push(battle.winner === 'win' ? '勝利！' : battle.winner === 'lose' ? '敗北…' : '引き分け');
  battle.turn++;
  battle.seed = seed;
  // Playback may repeat or skip cues; only this authoritative resolver records a turn.
  // Keep independent event/target snapshots so presentation cannot alter the evidence.
  battle.history = [...(old.history ?? []), {
    turn: old.turn,
    orders: recordedOrders,
    events: events.map(event => ({ ...event, ...(event.targets ? { targets: [...event.targets] } : {}), ...(event.hitTargets ? { hitTargets: [...event.hitTargets] } : {}), ...(event.removed ? { removed: [...event.removed] } : {}) })),
    log: battle.log.slice(old.log.length),
  }];
  return { state: battle, events };
}

export function advance(old: State, orders: Order[]): State {
  return advanceWithEvents(old, orders).state;
}
