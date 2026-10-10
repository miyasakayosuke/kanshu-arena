import { FAMILY_DEFINITIONS, type Family } from './families.ts';
export { FAMILY_IDS, type Family } from './families.ts';

export type Skill={name:string;power:number;priority:number;mpCost:number;kind:'hit'|'heal'|'guard'|'poison'|'protect'|'cleanse';all?:boolean;breaksGuard?:boolean;randomHits?:number;breaksGuardAfterHit?:boolean;familyBonusHit?:Family;/** Literal per-target damage basis; ignores ATK and legacy area scaling. */fixedDamage?:boolean;dragonChargeFinisher?:boolean};
export type SpecialSkills = readonly [] | readonly [Skill] | readonly [Skill, Skill] | readonly [Skill, Skill, Skill] | readonly [Skill, Skill, Skill, Skill];
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
[12,'フェンリル','🐺',4,150,54,93,[{ ...hit('破縛の連牙',0,0,false,13), randomHits:5, breaksGuardAfterHit:true },hit('月下の一咬',55)]],
[13,'ラタトスク','🐿️',2,130,39,87,[{ ...hit('木の実の連弾',10,0,false,10), randomHits:3, familyBonusHit:'beast' },hit('枝渡りの一突き',36,2)]],
[14,'玄武','🐢',5,240,25,24,[hit('海山の轟き',20,-2,true,22),{ ...heal, name:'悠久の雫', power:70, mpCost:20 },{ ...protect, name:'甲羅の結界' }]],
[15,'ヴリトラ','🐉',5,220,31,44,[{ ...hit('渇天の息',10,-2,true,28), fixedDamage:true, dragonChargeFinisher:true },hit('雨裂きの牙',52),{ ...guard, name:'蜷局の備え' }]],
[16,'リンドヴルム','🦎',2,150,38,62,[hit('石割りの牙',47),{ ...protect, name:'鱗のかばい' }]],
[17,'アンフィスバエナ','🐍',3,156,40,71,[{ ...hit('双頭の連突',20,0,false,12), randomHits:2 },{ ...guardBreaker('封鱗裂き'), power:50 }]],
[18,'ジラント','🐲',3,165,33,67,[{ ...hit('翠雲の息',68,0,false,12), fixedDamage:true },{ ...heal, name:'雲の湧き水', power:50, mpCost:16 },{ ...cleanse, name:'雲払い', power:25, mpCost:10 }]],
[19,'タロス','⚙️',5,235,42,36,[hit('炉心の槌',70,0,false,12),hit('環銅の衝撃',36,-2,true,22),{ ...guard, name:'鋳輪の備え' }]],
[20,'唐傘おばけ','☂️',2,145,29,86,[hit('雨縫い',50,0,false,8),{ ...cleanse, name:'傘下の清め', power:30, mpCost:10 }]],
[21,'ぬりかべ','🧱',3,250,36,17,[hit('石段押し',70,-1,false,16),{ ...protect, name:'折壁の守り' },{ ...guard, name:'石組みの構え' }]],
[22,'巡る三脚鼎','♨️',3,190,28,48,[{ ...heal, name:'湯の巡り', power:62, mpCost:18 },{ ...guardBreaker('封留め崩し'), power:45, mpCost:12 },hit('三輪の一押し',44,0,false,8)]],
[23,'青銅の牡牛','🐂',4,215,58,42,[hit('銅角の突き',75,0,false,12),hit('鋳火の突貫',115,-2,false,22)]]
];
// Original resource budgets: three heavy casts or several economical actions.
const mpBudgets = [54, 44, 72, 64, 56, 54, 42, 72, 52, 52, 56, 50, 60, 44, 64, 62, 40, 50, 56, 64, 54, 44, 66, 50];
// Game-only mammalian motifs. Unassigned creatures are not forced into a mythological taxonomy.
const beastIds = new Set([0, 2, 7, 11, 12, 13]);
// This is a gameplay family, not a claim of shared mythological origin.
const natureIds = new Set([3, 6, 9, 10, 14]);
const dragonIds = new Set([5, 15, 16, 17, 18]);
const materialIds = new Set([19, 20, 21, 22, 23]);
export const familyLabel = (monster: Monster): string => monster.family ? FAMILY_DEFINITIONS[monster.family].label : '系統未設定';
export const monsters: Monster[] = roster.map(([id, name, icon, cost, hp, atk, speed, skills]) => ({ id, name, icon, cost, hp, mp: mpBudgets[id], atk, speed, ...(beastIds.has(id) ? { family: 'beast' as const } : natureIds.has(id) ? { family: 'nature' as const } : dragonIds.has(id) ? { family: 'dragon' as const } : materialIds.has(id) ? { family: 'material' as const } : {}), skills }));
export type LeaderTrait = { name: string; stat: 'hp' | 'atk' | 'speed'; percent: number; description: string; family?: Family; secondary?: { stat: 'atk' | 'speed'; percent: number } };
const leaderTraits: readonly [string, LeaderTrait['stat']][] = [
  ['暁の追い風', 'speed'], ['岩山の誓い', 'hp'], ['守り猫の祈り', 'hp'], ['森羅の息吹', 'hp'],
  ['月影の号令', 'atk'], ['天空の威光', 'atk'], ['飛翼の陣', 'speed'], ['潮騒の祝福', 'hp'],
  ['灼熱の闘志', 'atk'], ['山風の導き', 'speed'], ['蛇鱗の結束', 'hp'], ['冥路の先導', 'atk'],
];

/** One trait from the first slot only. Family restrictions apply to each recipient. */
export function leaderFor(id: number): LeaderTrait {
  if (id === 12) return { name: '解き放つ群れ', stat: 'speed', percent: 12, secondary: { stat: 'atk', percent: 8 }, family: 'beast', description: '味方の獣系だけ 素早さ +12%・攻撃力 +8%' };
  if (id === 13) return { name: '枝道の伝令', stat: 'speed', percent: 8, description: '味方全員の素早さ +8%' };
  if (id === 14) return { name: '北辰の大地', stat: 'hp', percent: 15, family: 'nature', description: '味方の自然系だけ 最大HP +15%' };
  if (id === 15) return { name: '竜脈の結束', stat: 'hp', percent: 10, family: 'dragon', description: '味方の竜系だけ 最大HP +10%' };
  if (id === 16) return { name: '地這いの陣', stat: 'hp', percent: 8, family: 'dragon', description: '味方の竜系だけ 最大HP +8%' };
  if (id === 17) return { name: '双頭の呼応', stat: 'atk', percent: 8, family: 'dragon', description: '味方の竜系だけ 攻撃力 +8%' };
  if (id === 18) return { name: '翠雲の導き', stat: 'speed', percent: 8, family: 'dragon', description: '味方の竜系だけ 素早さ +8%' };
  if (id === 19) return { name: '鋳輪の結束', stat: 'hp', percent: 10, family: 'material', description: '味方の物質系だけ 最大HP +10%' };
  if (id === 20) return { name: '雨道の先導', stat: 'speed', percent: 8, family: 'material', description: '味方の物質系だけ 素早さ +8%' };
  if (id === 21) return { name: '重なる石段', stat: 'hp', percent: 8, family: 'material', description: '味方の物質系だけ 最大HP +8%' };
  if (id === 22) return { name: '湯輪の集い', stat: 'hp', percent: 8, family: 'material', description: '味方の物質系だけ 最大HP +8%' };
  if (id === 23) return { name: '銅蹄の号令', stat: 'atk', percent: 8, family: 'material', description: '味方の物質系だけ 攻撃力 +8%' };
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

export type Unit = { key: string; monster: Monster; hp: number; mp: number; guard: boolean; poison: number; rally?: number; /** Isolated simulation override; gameplay uses RALLY_PERCENT. */ rallyPercent?: number; ward?: number; /** Isolated simulation override; gameplay uses NATURE_WARD_PERCENT. */ wardPercent?: number; /** Present, including zero, only on an enabled dragon core. */ dragonCharge?: number; /** Isolated simulation override; gameplay uses DRAGON_CHARGE_PER_POINT. */ dragonChargePerPoint?: number; /** Undefined when ineligible; false after repair, dispel, or defeat. */ repairReady?: boolean; /** Isolated simulation override; gameplay uses MATERIAL_REPAIR_PERCENT. */ repairPercent?: number };
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
  kind: 'cast' | 'damage' | 'heal' | 'guard' | 'poison' | 'cleanse' | 'break' | 'defeat' | 'resource' | 'expire' | 'phase' | 'charge' | 'passive';
  actor?: string;
  target?: string;
  /** Cast intent and living targets at cast time, independent of survivor count. */
  scope?: 'single' | 'all' | 'random';
  /** Random barrages resolve one living target per hit, in this exact order. */
  hitTargets?: string[];
  hits?: number;
  hitIndex?: number;
  removed?: ('guard' | 'rally' | 'ward' | 'dragonCharge' | 'repairReady')[];
  targets?: string[];
  skill?: string;
  amount?: number;
  hp?: number;
  mp?: number;
  poison?: number;
  guard?: boolean;
  rally?: number;
  ward?: number;
  dragonCharge?: number;
  repairReady?: boolean;
  /** Only presentation-created casts carry this marker; authoritative passives are never casts. */
  passive?: 'material-repair';
  /** Charge captured before the finisher spends it; presentation never reconstructs it. */
  dragonChargeSpent?: number;
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
export const NATURE_WARD_PERCENT = 10;
export const OPENING_WARD_TURNS = 2;
export const DRAGON_CORE_ID = 15;
export const DRAGON_CHARGE_CAP = 5;
export const DRAGON_CHARGE_PER_POINT = 18;
export const MATERIAL_CORE_ID = 19;
export const MATERIAL_REPAIR_PERCENT = 14;
/** A finite family repair definition, independent of learned skills and action orders. */
export const MATERIAL_REPAIR = { coreId: MATERIAL_CORE_ID, family: 'material' as const, minimumMembers: 3, turn: 1, percent: MATERIAL_REPAIR_PERCENT, name: '炉心の修復' };
const repairEligible = (friends: readonly { monster: Monster }[], repair: typeof MATERIAL_REPAIR) => friends.some(friend => friend.monster.id === repair.coreId) && friends.filter(friend => friend.monster.family === repair.family).length >= repair.minimumMembers;
/** Starting membership, including defeated members. Never recalculated from living count. */
export const materialRepairEligible = (friends: readonly { monster: Monster }[]) => repairEligible(friends, MATERIAL_REPAIR);
/** Starting membership, never living count. Used by isolated lab starts too. */
export const dragonChargeEligible = (friends: readonly { monster: Monster }[]) => friends.some(friend => friend.monster.id === DRAGON_CORE_ID) && friends.filter(friend => friend.monster.family === 'dragon').length >= 3;
/** Guard and nature ward do not stack; poison is handled separately. */
export const directDamageScale = (unit: Unit) => Math.min(unit.guard ? 0.5 : 1, unit.ward ? 1 - (unit.wardPercent ?? NATURE_WARD_PERCENT) / 100 : 1);
/** Eligibility is the original party, including its defeated members. No skill or support recursion. */
export const barrageHits = (skill: Skill, friends: Unit[]) => (skill.randomHits ?? 1) + (skill.familyBonusHit && friends.length === 5 && friends.every(friend => friend.monster.family === skill.familyBonusHit) ? 1 : 0);
/** HP/MP stay fixed; the dispellable opening aura is separate from the persistent leader. */
export const attackFor = (unit: Unit) => Math.round(unit.monster.atk * (1 + (unit.rally ? (unit.rallyPercent ?? RALLY_PERCENT) / 100 : 0)));
// The first-turn order is established before the opening aura; turn two can gain speed.
export const speedFor = (unit: Unit, turn: number) => Math.round(unit.monster.speed * (1 + (unit.rally && turn > 1 ? (unit.rallyPercent ?? RALLY_PERCENT) / 100 : 0)));
export type StartOptions = { leaders?: boolean; familySupport?: boolean };
export function start(team: number[], enemy: number[], seed = 42, options: StartOptions = {}): State {
  const units = (ids: number[], prefix: string): Unit[] => {
    const leader = options.leaders && ids.length ? leaderFor(ids[0]) : undefined;
    const rally = options.familySupport !== false && ids.includes(12);
    const ward = options.familySupport !== false && ids.includes(14);
    const dragonCharge = options.familySupport !== false && ids.includes(DRAGON_CORE_ID) && ids.filter(id => monsters[id]?.family === 'dragon').length >= 3;
    const repair = options.familySupport !== false && materialRepairEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    return ids.map((id, i) => {
      const source = monsters[id];
      if (!source) throw new Error(`Unknown monster id: ${id}`);
      // Derive battle-only stats; never accumulate boosts in the shared roster.
      const monster = leader && leaderAppliesTo(leader, source) ? {
        ...source, [leader.stat]: Math.round(source[leader.stat] * (1 + leader.percent / 100)),
        ...(leader.secondary ? { [leader.secondary.stat]: Math.round(source[leader.secondary.stat] * (1 + leader.secondary.percent / 100)) } : {}),
      } : source;
      return { key: prefix + i, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0, ...(rally && source.family === 'beast' ? { rally: OPENING_RALLY_TURNS } : {}), ...(ward && source.family === 'nature' ? { ward: OPENING_WARD_TURNS } : {}), ...(dragonCharge && id === DRAGON_CORE_ID ? { dragonCharge: 0 } : {}), ...(repair && id === MATERIAL_CORE_ID ? { repairReady: true } : {}) };
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
      ...(team.includes(14) ? [`味方「森羅の甲羅」：自然系だけ自然障壁を2ターン付与。直接ダメージ${NATURE_WARD_PERCENT}%軽減・守りと重複なし・解除可能。毒は軽減しません。`] : []),
      ...(enemy.includes(14) ? [`敵「森羅の甲羅」：自然系だけ自然障壁を2ターン付与。直接ダメージ${NATURE_WARD_PERCENT}%軽減・守りと重複なし・解除可能。毒は軽減しません。`] : []),
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => ids.includes(DRAGON_CORE_ID) && ids.filter(id => monsters[id]?.family === 'dragon').length >= 3
        ? [`${side}「竜気」：開戦時にヴリトラを含む竜系3体以上で有効。生存中のヴリトラは、同じ側の竜系のMP消費攻撃（毒・通常攻撃を除く）後に1蓄積。連撃も1回、上限${DRAGON_CHARGE_CAP}。渇天の息で全消費し、同技では蓄積しません。解除可能。`]
        : []),
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => materialRepairEligible(ids.map(id => ({ monster: monsters[id] })))
        ? [`${side}「${MATERIAL_REPAIR.name}」：開戦時にタロスを含む物質系3体以上で修復待機。1ターン目終了時、全ての毒の後にタロスが生存していれば、生存中の味方物質系を各最大HPの${MATERIAL_REPAIR_PERCENT}%だけ一度回復（端数切り捨て・減少HPが上限）。全快でも消費。待機は解除可能。蘇生・MP回復・能力強化はありません。`]
        : []),
    ] : [])],
    winner: null,
  };
}

// Area hits trade per-target strength for coverage; poison retains its status-focused tuning.
const AREA_HIT_DAMAGE_SCALE = 0.5;
export const baseDamage = (unit: Unit, skill: Skill) => skill.fixedDamage
  ? skill.power + (skill.dragonChargeFinisher ? (unit.dragonCharge ?? 0) * (unit.dragonChargePerPoint ?? DRAGON_CHARGE_PER_POINT) : 0)
  : (skill.name === '通常攻撃' ? attackFor(unit) : skill.power + attackFor(unit) * 0.38) * (skill.all && skill.kind === 'hit' ? AREA_HIT_DAMAGE_SCALE : 1);

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
  return [unit.guard ? '守り:今T' : '', unit.poison > 0 ? `毒:残${unit.poison}回` : '', unit.rally ? `群気:残${unit.rally}T` : '', unit.ward ? `自然障壁:残${unit.ward}T` : '', unit.dragonCharge !== undefined ? `竜気:${unit.dragonCharge}/${DRAGON_CHARGE_CAP}` : '', unit.repairReady !== undefined ? unit.repairReady ? '修復:待機' : '修復:終了' : ''].filter(Boolean).join('・');
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
        const guardMitigation = opponent.guard && skill.priority < 1 && !skill.breaksGuard ? (skill.breaksGuardAfterHit ? 0.75 : 0.5) : 1;
        const wardMitigation = !opponent.ward || skill.breaksGuard ? 1 : 1 - (opponent.wardPercent ?? NATURE_WARD_PERCENT) / 100 * (skill.breaksGuardAfterHit ? 0.5 : 1);
        const mitigation = Math.min(guardMitigation, wardMitigation);
        const damage = Math.min(opponent.hp, baseDamage(unit, skill) * mitigation * (skill.randomHits ? barrageHits(skill, state[side]) / Math.max(1, opponents.length) : 1));
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

/** Opt-in explicit opposing orders for headless tests. Omission preserves the gameplay CPU. */
export type AdvanceOptions = { enemyOrders?: Order[] };
export function advanceWithEvents(old: State, orders: Order[], options: AdvanceOptions = {}): { state: State; events: BattleEvent[] } {
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
    if (unit.hp <= 0 && unit.repairReady) { unit.repairReady = false; emit({ kind: 'expire', target: unit.key, effect: 'repairReady', repairReady: false }); }
  }
  const alliedAutomatic = autoOrders(battle);
  const enemyAutomatic = autoOrders(battle, 'enemies');
  const enemyOrders = options.enemyOrders ?? enemyAutomatic;
  const actions: { unit: Unit; skill: Skill; side: 'allies' | 'enemies'; target?: string; tie: number }[] = [];
  for (const side of ['allies', 'enemies'] as const) {
    for (const unit of living(battle[side])) {
      let order = (side === 'allies' ? orders : enemyOrders).find(candidate => candidate.key === unit.key)
        ?? (side === 'allies' ? alliedAutomatic : enemyAutomatic).find(candidate => candidate.key === unit.key);
      if (side === 'enemies' && options.enemyOrders === undefined) {
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
        side, source: (side === 'allies' ? orders : options.enemyOrders ?? []).some(candidate => candidate.key === unit.key) ? 'explicit' : 'automatic',
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
      if (target.ward !== undefined) target.ward = 0;
      if (target.dragonCharge !== undefined) target.dragonCharge = 0;
      if (target.repairReady !== undefined) target.repairReady = false;
      emit({ kind: 'defeat', actor, ...(hitIndex !== undefined ? { hitIndex } : {}), target: target.key, hp: 0, guard: false, poison: 0, ...(target.rally !== undefined ? { rally: 0 } : {}), ...(target.ward !== undefined ? { ward: 0 } : {}), ...(target.dragonCharge !== undefined ? { dragonCharge: 0 } : {}), ...(target.repairReady !== undefined ? { repairReady: false } : {}), effect });
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
    emit({ kind: 'cast', actor: unit.key, scope: skill.randomHits ? 'random' : skill.all ? 'all' : 'single', targets: targets.map(target => target.key), ...(!skill.all && !skill.randomHits ? { target: targets[0].key } : {}), ...(skill.randomHits ? { hits: barrageHits(skill, friends), hitTargets: [] } : {}), ...(skill.dragonChargeFinisher ? { dragonChargeSpent: unit.dragonCharge ?? 0 } : {}), skill: skill.name, effect: skill.kind });
    // Spending is absolute and emitted at the cast, before any hit or healing animation.
    if (skill.mpCost) {
      unit.mp -= skill.mpCost;
      emit({ kind: 'resource', actor: unit.key, target: unit.key, mp: unit.mp, amount: skill.mpCost, effect: 'mp' });
    }
    // Snapshot once for the whole cast. Clearing the charge cannot weaken later area hits.
    const castDamage = baseDamage(unit, skill);
    if (skill.dragonChargeFinisher && unit.dragonCharge !== undefined) {
      unit.dragonCharge = 0;
      emit({ kind: 'charge', actor: unit.key, target: unit.key, dragonCharge: 0, effect: 'dragon-charge-spend' });
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
      const hitCount = skill.randomHits ? barrageHits(skill, friends) : targets.length;
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
        const hadWard = !!target.ward;
        const hadDragonCharge = !!target.dragonCharge;
        const hadRepair = !!target.repairReady;
        if (skill.kind === 'hit' && skill.breaksGuard && (target.guard || target.ward || target.dragonCharge || target.repairReady)) {
          target.guard = false;
          if (hadWard) target.ward = 0;
          if (hadDragonCharge) target.dragonCharge = 0;
          if (hadRepair) target.repairReady = false;
          emit({ kind: 'break', actor: unit.key, target: target.key, guard: false, ...(hadWard ? { ward: 0 } : {}), ...(hadDragonCharge ? { dragonCharge: 0 } : {}), ...(hadRepair ? { repairReady: false } : {}), ...(hadWard || hadDragonCharge || hadRepair ? { removed: [...(wasGuarded ? ['guard' as const] : []), ...(hadWard ? ['ward' as const] : []), ...(hadDragonCharge ? ['dragonCharge' as const] : []), ...(hadRepair ? ['repairReady' as const] : [])] } : {}) });
          battle.log.push(`${target.monster.name}の${[wasGuarded ? '防御' : '', hadWard ? '自然障壁' : '', hadDragonCharge ? '竜気' : '', hadRepair ? '修復待機' : ''].filter(Boolean).join('・')}を解除！`);
        }
        seed = random(seed);
        const amount = damage(target, castDamage * (0.9 + (seed % 21) / 100) * directDamageScale(target), unit.key, undefined, skill.randomHits ? hitIndex : undefined);
        battle.log.push(`${target.monster.name}に ${amount} ダメージ${wasGuarded && !skill.breaksGuard ? '（防御で半減）' : hadWard && !skill.breaksGuard ? '（自然障壁で軽減）' : ''}${target.hp === 0 ? '・撃破！' : ''}`);
        if (skill.breaksGuardAfterHit && (wasGuarded || hadRally || hadWard || hadDragonCharge || hadRepair) && target.hp > 0) {
          target.guard = false;
          if (hadRally) target.rally = 0;
          if (hadWard) target.ward = 0;
          if (hadDragonCharge) target.dragonCharge = 0;
          if (hadRepair) target.repairReady = false;
          emit({ kind: 'break', actor: unit.key, target: target.key, guard: false, ...(hadRally ? { rally: 0 } : {}), ...(hadWard ? { ward: 0 } : {}), ...(hadDragonCharge ? { dragonCharge: 0 } : {}), ...(hadRepair ? { repairReady: false } : {}), removed: [...(wasGuarded ? ['guard' as const] : []), ...(hadRally ? ['rally' as const] : []), ...(hadWard ? ['ward' as const] : []), ...(hadDragonCharge ? ['dragonCharge' as const] : []), ...(hadRepair ? ['repairReady' as const] : [])], hitIndex, effect: hadWard ? 'ward' : hadRally ? 'rally' : hadDragonCharge ? 'dragonCharge' : hadRepair ? 'repairReady' : 'guard' });
          battle.log.push(`${target.monster.name}の${[wasGuarded ? '守り' : '', hadRally ? '群気' : '', hadWard ? '自然障壁' : '', hadDragonCharge ? '竜気' : '', hadRepair ? '修復待機' : ''].filter(Boolean).join('・')}を命中後に解除！`);
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
    if (unit.monster.family === 'dragon' && skill.kind === 'hit' && skill.mpCost > 0 && !skill.dragonChargeFinisher) {
      for (const core of friends) if (core.monster.id === DRAGON_CORE_ID && core.hp > 0 && core.dragonCharge !== undefined && core.dragonCharge < DRAGON_CHARGE_CAP) {
        core.dragonCharge++;
        emit({ kind: 'charge', actor: unit.key, target: core.key, dragonCharge: core.dragonCharge, effect: 'dragon-charge-gain' });
        battle.log.push(`${core.monster.name}の竜気 +1（${core.dragonCharge}/${DRAGON_CHARGE_CAP}）`);
      }
    }
  }
  phase('turn-end');
  // All queued actions finish before poison. Both sides tick even after a direct knockout.
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.hp <= 0 || unit.poison <= 0) continue;
    unit.poison--;
    const amount = damage(unit, unit.monster.hp * 0.06, undefined, 'poison');
    battle.log.push(`${unit.monster.name}は毒で${amount}ダメージ${unit.hp > 0 ? unit.poison ? `（残り${unit.poison}回）` : '（毒が切れた）' : '・撃破！'}`);
  }
  // All poison on BOTH sides resolves before either side's finite repair. No skill,
  // cast, MP debit, random draw, revival, cleanse, or charge generation occurs here.
  const repair = MATERIAL_REPAIR;
  if (battle.turn === repair.turn) for (const friends of [battle.allies, battle.enemies]) {
    for (const core of friends) {
      if (core.monster.id !== repair.coreId || core.hp <= 0 || !core.repairReady) continue;
      core.repairReady = false;
      const recipients = friends.filter(friend => friend.hp > 0 && friend.monster.family === repair.family);
      emit({ kind: 'passive', actor: core.key, target: core.key, targets: recipients.map(friend => friend.key), scope: 'all', skill: repair.name, effect: 'material-repair', repairReady: false });
      battle.log.push(`${core.monster.name}の「${repair.name}」！ 修復待機を消費（生存する物質系だけ・一度きり）`);
      const requestedPercent = core.repairPercent ?? repair.percent;
      const percent = Number.isFinite(requestedPercent) ? Math.max(0, requestedPercent) : repair.percent;
      for (const target of recipients) {
        const amount = Math.max(0, Math.min(Math.floor(target.monster.hp * percent / 100), target.monster.hp - target.hp));
        target.hp += amount;
        emit({ kind: 'heal', actor: core.key, target: target.key, amount, hp: target.hp, effect: 'material-repair' });
        battle.log.push(`${target.monster.name} 修復 HP +${amount}`);
      }
    }
  }
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (unit.ward) {
      unit.ward--;
      emit({ kind: 'expire', target: unit.key, effect: 'ward', ward: unit.ward });
    }
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
