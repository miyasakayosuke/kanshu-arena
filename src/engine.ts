export type Skill={name:string;power:number;priority:number;kind:'hit'|'heal'|'guard'|'poison';all?:boolean};
export type SpecialSkills = readonly [] | readonly [Skill] | readonly [Skill, Skill] | readonly [Skill, Skill, Skill] | readonly [Skill, Skill, Skill, Skill];
export type Monster={id:number;name:string;icon:string;cost:number;hp:number;atk:number;speed:number;skills:SpecialSkills};
export const BASIC_ATTACK = -1;
export const DEFEND = -2;
export const MAX_SPECIAL_SKILLS = 4;
const hit=(name:string,power:number,priority=0,all=false):Skill=>({name,power,priority,kind:'hit',all});
const heal:Skill={name:'生命の雫',power:65,priority:0,kind:'heal'};
const guard:Skill={name:'鉄壁の構え',power:0,priority:1,kind:'guard'};
const poison:Skill={name:'毒霧',power:12,priority:0,kind:'poison',all:true};
const defend: Skill = { name: 'ぼうぎょ', power: 0, priority: 1, kind: 'guard' };

/** Universal commands do not occupy learned-special slots or change their indexes. */
export function battleSkill(monster: Monster, index: number): Skill | undefined {
  // Combined with the existing 0.38 * atk contribution, a basic hit starts at 1 * atk.
  if (index === BASIC_ATTACK) return hit('通常攻撃', monster.atk * 0.62);
  if (index === DEFEND) return defend;
  return Number.isInteger(index) && index >= 0 && index < MAX_SPECIAL_SKILLS ? monster.skills[index] : undefined;
}

const roster: [number, string, string, number, number, number, number, SpecialSkills][] = [
[0,'妖狐','🦊',4,150,47,85,[hit('狐火',55),hit('疾風斬り',38,2),hit('炎嵐',28,0,true)]],
[1,'トロル','🪨',3,250,53,23,[hit('巨人の鉄槌',65),hit('終焉の一撃',110,-2),guard]],
[2,'バステト','🐈',3,170,30,57,[hit('爪撃',45),heal,guard]],
[3,'ドリュアス','🌳',3,180,35,67,[hit('樹海の槍',60),heal,poison]],
[4,'バンシー','👻',3,155,38,75,[hit('悲鳴',54),poison,hit('影縫い',35,2)]],
[5,'ケツァルコアトル','🐉',4,200,52,47,[hit('竜の牙',65),hit('嵐の息吹',34,0,true),guard]],
[6,'ガルーダ','🦅',2,138,39,96,[hit('急降下',48),hit('先制の翼',35,2),hit('旋風',25,0,true)]],
[7,'セルキー','🦭',4,190,34,61,[hit('水刃',55),heal,guard]],
[8,'イフリート','🔥',3,187,52,42,[hit('灼熱拳',69),hit('火炎旋風',33,0,true),hit('終焉の一撃',99,-2)]],
[9,'烏天狗','🐦',3,166,41,79,[hit('風切り',51),hit('疾風斬り',36,2),poison]],
[10,'ナーガ','🐍',2,185,33,39,[hit('蛇牙',48),poison,guard]],
[11,'アヌビス','🐺',4,172,54,76,[hit('冥府の刃',68),hit('影斬り',40,2),hit('終焉の一撃',105,-2)]]
];
export const monsters: Monster[] = roster.map(([id, name, icon, cost, hp, atk, speed, skills]) => ({ id, name, icon, cost, hp, atk, speed, skills }));
export type Unit = { key: string; monster: Monster; hp: number; guard: boolean; poison: number };
export type State = {
  turn: number;
  seed: number;
  allies: Unit[];
  enemies: Unit[];
  log: string[];
  winner: null | 'win' | 'lose' | 'draw';
};
export type Order = { key: string; skill: number; target?: string };
export type BattleEvent = {
  kind: 'cast' | 'damage' | 'heal' | 'guard' | 'poison' | 'defeat';
  actor?: string;
  target?: string;
  skill?: string;
  amount?: number;
  hp?: number;
  effect?: string;
};

export const MAX_TURNS = 20;
export const cost = (team: number[]) => team.reduce((total, id) => total + (monsters[id]?.cost ?? 0), 0);

export function start(team: number[], enemy: number[], seed = 42): State {
  const units = (ids: number[], prefix: string): Unit[] => ids.map((id, i) => {
    const monster = monsters[id];
    if (!monster) throw new Error(`Unknown monster id: ${id}`);
    return { key: prefix + i, monster, hp: monster.hp, guard: false, poison: 0 };
  });
  return {
    turn: 1,
    seed: seed >>> 0,
    allies: units(team, 'a'),
    enemies: units(enemy, 'e'),
    log: ['戦闘開始！'],
    winner: null,
  };
}

// Area hits trade per-target strength for coverage; poison retains its status-focused tuning.
const AREA_HIT_DAMAGE_SCALE = 0.5;
const baseDamage = (unit: Unit, skill: Skill) =>
  (skill.power + unit.monster.atk * 0.38) * (skill.all && skill.kind === 'hit' ? AREA_HIT_DAMAGE_SCALE : 1);

const random = (seed: number) => ((Math.imul(seed, 1664525) + 1013904223) >>> 0);
const living = (units: Unit[]) => units.filter(unit => unit.hp > 0);
const weakest = (units: Unit[]) => living(units).reduce<Unit | undefined>((best, unit) => (
  !best || unit.hp / unit.monster.hp < best.hp / best.monster.hp ? unit : best
), undefined);

/** Choose orders without changing the state or consuming the battle's random seed. */
export function autoOrders(state: State, side: 'allies' | 'enemies' = 'allies'): Order[] {
  if (state.winner) return [];
  const friends = living(state[side]);
  const opponents = living(side === 'allies' ? state.enemies : state.allies);
  const injured = weakest(friends);
  const target = opponents.reduce<Unit | undefined>((best, unit) => (
    !best || unit.hp < best.hp ? unit : best
  ), undefined);

  return friends.map(unit => {
    const specials = unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS);
    const healing = specials.findIndex(skill => skill.kind === 'heal');
    if (healing >= 0 && injured && injured.hp / injured.monster.hp <= 0.6) {
      return { key: unit.key, skill: healing, target: injured.key };
    }

    let skillIndex = specials.length ? 0 : BASIC_ATTACK;
    let bestScore = -1;
    specials.forEach((skill, index) => {
      let score = 0;
      if (skill.kind === 'hit' || skill.kind === 'poison') {
        const targets = skill.all ? opponents : target ? [target] : [];
        score = targets.reduce((total, opponent) => {
          const damage = Math.min(opponent.hp, baseDamage(unit, skill));
          const poisonDamage = skill.kind === 'poison' && opponent.poison === 0
            ? Math.min(Math.max(0, opponent.hp - damage), Math.floor(opponent.monster.hp * 0.06) * 2)
            : 0;
          return total + damage + poisonDamage;
        }, 0);
        // For an otherwise equal attack, favor acting sooner.
        score += skill.priority * 0.01;
      }
      if (score > bestScore) {
        bestScore = score;
        skillIndex = index;
      }
    });
    const skill = battleSkill(unit.monster, skillIndex);
    return {
      key: unit.key,
      skill: skillIndex,
      target: skill?.kind === 'heal' ? injured?.key : skill?.kind === 'guard' ? unit.key : target?.key,
    };
  });
}

export function advanceWithEvents(old: State, orders: Order[]): { state: State; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  if (old.winner) return { state: old, events };

  const battle: State = {
    ...old,
    allies: old.allies.map(unit => ({ ...unit, guard: false })),
    enemies: old.enemies.map(unit => ({ ...unit, guard: false })),
    log: [...old.log, `── TURN ${old.turn} ──`],
  };
  let seed = battle.seed;
  const enemyOrders = autoOrders(battle, 'enemies');
  const actions: { unit: Unit; skill: Skill; side: 'allies' | 'enemies'; target?: string; tie: number }[] = [];

  for (const side of ['allies', 'enemies'] as const) {
    const sideOrders = side === 'allies' ? orders : enemyOrders;
    for (const unit of living(battle[side])) {
      const order = sideOrders.find(candidate => candidate.key === unit.key);
      // Varied, seeded opponent skills keep the introductory fights from becoming an AoE burst race.
      const specialCount = Math.min(unit.monster.skills.length, MAX_SPECIAL_SKILLS);
      const skillIndex = side === 'enemies'
        ? specialCount ? seed % specialCount : BASIC_ATTACK
        : order?.skill ?? 0;
      const skill = battleSkill(unit.monster, skillIndex) ?? battleSkill(unit.monster, 0) ?? battleSkill(unit.monster, BASIC_ATTACK)!;
      seed = random(seed);
      actions.push({ unit, skill, side, target: order?.target, tie: seed });
    }
  }
  actions.sort((a, b) => b.skill.priority - a.skill.priority || b.unit.monster.speed - a.unit.monster.speed || a.tie - b.tie);

  const damage = (target: Unit, requested: number, actor?: string, effect?: string) => {
    const amount = Math.min(target.hp, Math.max(1, Math.floor(requested)));
    target.hp -= amount;
    events.push({ kind: 'damage', actor, target: target.key, amount, hp: target.hp, effect });
    if (target.hp === 0) events.push({ kind: 'defeat', actor, target: target.key, hp: 0, effect });
    return amount;
  };

  for (const action of actions) {
    const { unit, skill, side } = action;
    if (unit.hp <= 0) continue;
    const opponents = side === 'allies' ? battle.enemies : battle.allies;
    const friends = battle[side];
    if ((skill.kind === 'hit' || skill.kind === 'poison') && !opponents.some(target => target.hp > 0)) continue;
    battle.log.push(`${unit.monster.name}の「${skill.name}」！`);
    const cast: BattleEvent = { kind: 'cast', actor: unit.key, skill: skill.name, effect: skill.kind };
    events.push(cast);

    if (skill.kind === 'guard') {
      cast.target = unit.key;
      unit.guard = true;
      events.push({ kind: 'guard', actor: unit.key, target: unit.key });
      continue;
    }
    if (skill.kind === 'heal') {
      const target = friends.find(friend => friend.key === action.target && friend.hp > 0) ?? weakest(friends);
      if (target) {
        cast.target = target.key;
        const amount = Math.max(0, Math.min(skill.power, target.monster.hp - target.hp));
        target.hp += amount;
        events.push({ kind: 'heal', actor: unit.key, target: target.key, amount, hp: target.hp });
        battle.log.push(`${target.monster.name} HP +${amount}`);
      }
      continue;
    }

    const alive = living(opponents);
    if (!alive.length) continue;
    const targets = skill.all ? alive : [alive.find(target => target.key === action.target) ?? alive[seed % alive.length]];
    if (!skill.all) cast.target = targets[0].key;
    for (const target of targets) {
      seed = random(seed);
      const requested = baseDamage(unit, skill) * (0.9 + (seed % 21) / 100) * (target.guard ? 0.5 : 1);
      const amount = damage(target, requested, unit.key);
      battle.log.push(`${target.monster.name}に ${amount} ダメージ${target.hp === 0 ? '・撃破！' : ''}`);
      if (skill.kind === 'poison' && target.hp > 0) {
        target.poison = 3;
        events.push({ kind: 'poison', actor: unit.key, target: target.key });
        battle.log.push(`${target.monster.name}は毒を受けた`);
      }
    }
  }

  // Poison lasts for three end-of-turn ticks, including the turn it is applied.
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.hp <= 0 || unit.poison <= 0) continue;
    const amount = damage(unit, unit.monster.hp * 0.06, undefined, 'poison');
    unit.poison--;
    battle.log.push(`${unit.monster.name}は毒で${amount}ダメージ`);
  }

  const aliveAllies = battle.allies.some(unit => unit.hp > 0);
  const aliveEnemies = battle.enemies.some(unit => unit.hp > 0);
  battle.winner = !aliveAllies && !aliveEnemies ? 'draw' : !aliveAllies ? 'lose' : !aliveEnemies ? 'win' : null;
  if (!battle.winner && battle.turn >= MAX_TURNS) {
    const remaining = (units: Unit[]) => units.reduce((total, unit) => total + unit.hp / unit.monster.hp, 0);
    const allyHealth = remaining(battle.allies);
    const enemyHealth = remaining(battle.enemies);
    const difference = allyHealth - enemyHealth;
    battle.winner = Math.abs(difference) < 1e-9 ? 'draw' : difference > 0 ? 'win' : 'lose';
  }
  if (battle.winner) battle.log.push(battle.winner === 'win' ? '勝利！' : battle.winner === 'lose' ? '敗北…' : '引き分け');
  battle.turn++;
  battle.seed = seed;
  return { state: battle, events };
}

export function advance(old: State, orders: Order[]): State {
  return advanceWithEvents(old, orders).state;
}
