import { FAMILY_DEFINITIONS, type Family } from './families.ts';
export { FAMILY_IDS, type Family } from './families.ts';

export type Skill={name:string;power:number;priority:number;mpCost:number;kind:'hit'|'heal'|'guard'|'poison'|'protect'|'cleanse'|'restoreMp'|'responseCleanse'|'responseGuard';all?:boolean;breaksGuard?:boolean;randomHits?:number;breaksGuardAfterHit?:boolean;familyBonusHit?:Family;/** Literal per-target damage basis; ignores ATK and legacy area scaling. */fixedDamage?:boolean;dragonChargeFinisher?:boolean;/** Enemy MP loss after a surviving HP hit; no ATK or random scaling. */mpDamage?:number;/** Consume current target poison once for bounded per-tick direct damage; single paid hit only. */poisonCashout?:number};
export type SpecialSkills = readonly [] | readonly [Skill] | readonly [Skill, Skill] | readonly [Skill, Skill, Skill] | readonly [Skill, Skill, Skill, Skill];
export type Monster={id:number;name:string;icon:string;cost:number;hp:number;mp:number;atk:number;speed:number;family?:Family;skills:SpecialSkills};
export const BASIC_ATTACK = -1;
export const DEFEND = -2;
/** Deferred automatic intent; never a learned skill or a cast. */
export const AUTO = -3;
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
[23,'青銅の牡牛','🐂',4,215,58,42,[hit('銅角の突き',75,0,false,12),hit('鋳火の突貫',115,-2,false,22)]],
[24,'うつろ泉','💧',4,235,28,54,[{ name:'蓄え分け', kind:'restoreMp', power:8, priority:0, mpCost:0, all:true },{ ...hit('押し流し',128,0,false,24), fixedDamage:true },{ ...protect, name:'水面のかばい' }]],
[25,'ひも雫','💧',2,160,35,88,[hit('糸しぶき',44,0,false,7),hit('はじけ糸',30,2,false,10)]],
[26,'ひだまもり','💧',3,250,27,36,[{ ...protect, name:'膜のかばい' },hit('ひだ押し',54,0,false,8),{ ...guardBreaker('折りほどき'), power:46, mpCost:12 }]],
[27,'あわ枝','💧',3,195,24,66,[{ ...heal, name:'泡の手当て', power:60, mpCost:18 },{ ...cleanse, name:'泡さらい', power:28, mpCost:10 },hit('泡つぶて',42,0,false,8)]],
[28,'ねりこぶし','💧',5,220,51,61,[hit('ねり打ち',76,0,false,12),hit('散る重泡',60,0,true,20)]],
[29,'マモン','🪙',5,210,35,58,[{ ...hit('空勘の爪',50,0,false,16), mpDamage:6 },hit('封銭の打撃',72,0,false,12),{ ...guard, name:'帳を閉じる' }]],
[30,'コボルト','🛠️',2,138,31,82,[{ ...guardBreaker('留め具ほどき'), power:43, mpCost:12 },hit('木片はじき',42,0,false,7)]],
[31,'エンプーサ','🎭',4,178,48,66,[hit('片脚の踏み込み',76,0,false,14),{ ...cleanse, name:'薄影の払い', power:30, mpCost:12 },hit('影の投げ針',52,0,false,8)]],
[32,'ドラウグル','🪦',5,205,42,49,[{ ...hit('塚底の取り立て',48,0,false,18), poisonCashout:14 },hit('土蓋の拳',62,0,false,10)]],
[33,'首なしの馭者','🏮',4,175,50,84,[{ ...guardBreaker('手綱ほどき'), power:48 },hit('轍の一打',70,0,false,12)]],
[34,'キョンシー','🧵',3,220,34,32,[{ ...protect, name:'袖の囲い' },hit('踏みしめ',56,0,false,8)]],
[35,'ヴェータラ','🪡',2,125,25,63,[{ ...heal, name:'影の縫い直し', power:52, mpCost:18 },{ ...cleanse, name:'結び払い', power:20, mpCost:10 },hit('逆さの小突き',35,0,false,7)]],
[36,'ヤヌス','🚪',5,200,30,57,[{ name:'境目の清め', kind:'responseCleanse', power:0, priority:0, mpCost:24, all:true },{ name:'合流の扉', kind:'responseGuard', power:0, priority:3, mpCost:24, all:true },hit('敷居の一打',62,0,false,10),{ ...guard, name:'門番の構え' }]]
];
// Original resource budgets: three heavy casts or several economical actions.
const mpBudgets = [54, 44, 72, 64, 56, 54, 42, 72, 52, 52, 56, 50, 60, 44, 64, 62, 40, 50, 56, 64, 54, 44, 66, 50, 64, 40, 46, 60, 52, 64, 44, 54, 62, 48, 42, 50, 58];
// Game-only mammalian motifs. Unassigned creatures are not forced into a mythological taxonomy.
const beastIds = new Set([0, 2, 7, 11, 12, 13]);
// This is a gameplay family, not a claim of shared mythological origin.
const natureIds = new Set([3, 6, 9, 10, 14]);
const dragonIds = new Set([5, 15, 16, 17, 18]);
const materialIds = new Set([19, 20, 21, 22, 23]);
const slimeIds = new Set([24, 25, 26, 27, 28]);
const demonIds = new Set([1, 8, 29, 30, 31]);
const undeadIds = new Set([4, 32, 33, 34, 35]);
export const familyLabel = (monster: Monster): string => monster.family ? FAMILY_DEFINITIONS[monster.family].label : '系統未設定';
export const monsters: Monster[] = roster.map(([id, name, icon, cost, hp, atk, speed, skills]) => ({ id, name, icon, cost, hp, mp: mpBudgets[id], atk, speed, ...(beastIds.has(id) ? { family: 'beast' as const } : natureIds.has(id) ? { family: 'nature' as const } : dragonIds.has(id) ? { family: 'dragon' as const } : materialIds.has(id) ? { family: 'material' as const } : slimeIds.has(id) ? { family: 'slime' as const } : demonIds.has(id) ? { family: 'demon' as const } : undeadIds.has(id) ? { family: 'undead' as const } : id === 36 ? { family: 'extraordinary' as const } : {}), skills }));
export type LeaderTrait = { name: string; stat: 'hp' | 'mp' | 'atk' | 'speed'; percent: number; description: string; family?: Family; secondary?: { stat: 'atk' | 'speed'; percent: number } };
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
  if (id === 24) return { name: '澄み溜まり', stat: 'mp', percent: 10, family: 'slime', description: '味方の粘体系だけ 最大MP・初期MP +10%（毎ターンのMP回復とは別）' };
  if (id === 25) return { name: '雫の道筋', stat: 'speed', percent: 8, family: 'slime', description: '味方の粘体系だけ 素早さ +8%' };
  if (id === 26) return { name: 'ひだの囲い', stat: 'hp', percent: 8, family: 'slime', description: '味方の粘体系だけ 最大HP +8%' };
  if (id === 27) return { name: '泡の寄り合い', stat: 'hp', percent: 8, family: 'slime', description: '味方の粘体系だけ 最大HP +8%' };
  if (id === 28) return { name: '重泡の合図', stat: 'atk', percent: 8, family: 'slime', description: '味方の粘体系だけ 攻撃力 +8%' };
  if (id === 29) return { name: '帳場の結束', stat: 'hp', percent: 10, secondary: { stat: 'speed', percent: 5 }, family: 'demon', description: '味方の悪魔系だけ 最大HP +10%・素早さ +5%' };
  if (id === 30) return { name: '戸口の先導', stat: 'speed', percent: 8, family: 'demon', description: '味方の悪魔系だけ 素早さ +8%' };
  if (id === 31) return { name: '片影の号令', stat: 'atk', percent: 8, family: 'demon', description: '味方の悪魔系だけ 攻撃力 +8%' };
  if (id === 32) return { name: '塚守の結束', stat: 'hp', percent: 10, family: 'undead', description: '味方の不死系だけ 最大HP +10%' };
  if (id === 33) return { name: '夜道の手綱', stat: 'speed', percent: 8, family: 'undead', description: '味方の不死系だけ 素早さ +8%' };
  if (id === 34) return { name: '重ね布の陣', stat: 'hp', percent: 8, family: 'undead', description: '味方の不死系だけ 最大HP +8%' };
  if (id === 35) return { name: '逆さの結び', stat: 'mp', percent: 8, family: 'undead', description: '味方の不死系だけ 最大MP・初期MP +8%（毎ターンのMP回復とは別）' };
  if (id === 36) return { name: '門口の結び', stat: 'hp', percent: 8, description: '味方全員の最大HP +8%' };
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

/** Supports affect only living same-side targets, including the actor. */
export const skillTargetsAllies = (skill: Skill): boolean =>
  skill.kind === 'heal' || skill.kind === 'protect' || skill.kind === 'cleanse' || skill.kind === 'restoreMp' || isExtraordinaryResponse(skill);

export function skillOrderLabel(skill: Skill): string {
  return skill.priority >= 3 ? '最速' : skill.priority >= 2 ? '先制' : skill.priority > 0 ? '防御順' : skill.priority < 0 ? 'アンカー' : '通常順';
}

export type Unit = { key: string; monster: Monster; hp: number; mp: number; guard: boolean; poison: number; rally?: number; /** Isolated simulation override; gameplay uses RALLY_PERCENT. */ rallyPercent?: number; ward?: number; /** Isolated simulation override; gameplay uses NATURE_WARD_PERCENT. */ wardPercent?: number; /** Present, including zero, only on an enabled dragon core. */ dragonCharge?: number; /** Isolated simulation override; gameplay uses DRAGON_CHARGE_PER_POINT. */ dragonChargePerPoint?: number; /** Undefined when ineligible; false after repair, dispel, or defeat. */ repairReady?: boolean; /** Isolated simulation override; gameplay uses MATERIAL_REPAIR_PERCENT. */ repairPercent?: number; /** Fixed opening allowance; never dispellable, false after use or defeat. */ supplyReady?: boolean; /** Isolated simulation override; gameplay uses SLIME_SUPPLY.amount. */ supplyAmount?: number; /** Fixed opening family bonus, not a buff. Lab may override this independently of Skill.mpDamage. */ mpDamageBonus?: number; /** Fixed opening cashout bonus on the enabled core, never a dispellable buff. Lab override is bounded independently from the skill base. */ poisonCashoutBonus?: number; /** Fixed opening shared allowance; undefined if ineligible/disabled, false after cast or own defeat. Not dispellable. */ responseReady?: boolean; /** Isolated poison-direct comparison only; bounded to [0, 1], omitted in ordinary states. */ poisonImpactScale?: number };
export type State = {
  turn: number;
  seed: number;
  allies: Unit[];
  enemies: Unit[];
  log: string[];
  /** Authoritative completed turns. Optional only for older/injected states. */
  history?: BattleTurnRecord[];
  winner: null | 'win' | 'lose' | 'draw';
  /** Optional same-side public-order reservation heuristic, independent of direct scale. */
  reservePoison?: boolean;
  /** Headless economy comparison only. Ordinary battles use TURN_MP_RECOVERY. */
  turnMpRecovery?: number;
};
export type Order = { key: string; skill: number; target?: string };
export type BattlePhase = 'turn-start' | 'before-action' | 'action' | 'action-end' | 'turn-end' | 'next-turn-start';
export type BattleEvent = {
  kind: 'cast' | 'damage' | 'heal' | 'guard' | 'poison' | 'cleanse' | 'break' | 'defeat' | 'resource' | 'expire' | 'phase' | 'charge' | 'passive' | 'supply' | 'resource-gain' | 'resource-loss' | 'fallback' | 'poison-cashout' | 'response';
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
  /** Absolute affected-target MP, shared by paid costs, gains, and enemy MP loss. */
  mp?: number;
  /** A valid paid order can fall back only after actual enemy MP loss this turn. */
  fromSkill?: number;
  toSkill?: number;
  reason?: 'enemy-mp-loss';
  queuePriority?: number;
  requiredMP?: number;
  availableMP?: number;
  poison?: number;
  /** Captured at the actual hit before poison reset or lethal damage; never inferred from HP. */
  poisonTicksConsumed?: number;
  poisonCashoutPerTick?: number;
  /** Unmitigated addition to this one direct hit, not a separate damage event. */
  poisonCashoutAdded?: number;
  guard?: boolean;
  rally?: number;
  ward?: number;
  dragonCharge?: number;
  repairReady?: boolean;
  supplyReady?: boolean;
  responseReady?: boolean;
  responseChoice?: 'cleanse' | 'guard';
  /** Only presentation-created casts carry this marker; authoritative passives are never casts. */
  passive?: 'material-repair';
  /** Charge captured before the finisher spends it; presentation never reconstructs it. */
  dragonChargeSpent?: number;
  /** Only the next-turn recovery boundary carries the upcoming turn number. */
  nextTurn?: number;
  phase?: BattlePhase;
  effect?: string;
};
export type BattleOrderRecord = Order & {
  side: 'allies' | 'enemies';
  /** Old explicit records may contain an eager UI-auto choice. Automatic records
   * may be fixed pre-turn CPU orders or real player checkpoint decisions. */
  source: 'explicit' | 'automatic';
  skillName?: string;
  skillKind?: Skill['kind'];
  skillPower?: number;
  accepted: boolean;
  rejection?: 'invalid-skill' | 'invalid-target' | 'no-opponents' | SkillUnavailableReason;
  /** Auto decisions are recorded only at their real checkpoint, possibly late. */
  decisionPriority?: number;
  nativePriority?: number;
};
export type BattleTurnRecord = {
  turn: number;
  orders: BattleOrderRecord[];
  events: BattleEvent[];
  log: string[];
};

export const MAX_TURNS = 20;
export const TURN_MP_RECOVERY = 2;
/** Explicit test/Lab ablation is bounded and never exposed as a gameplay setting. */
export const turnMpRecoveryAmount = (value: number | undefined): number => value === undefined ? TURN_MP_RECOVERY : Number.isFinite(value) ? Math.max(0, Math.min(5, Math.floor(value))) : TURN_MP_RECOVERY;
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
export const DEMON_CORE_ID = 29;
export const DEMON_PRESSURE = { coreId: DEMON_CORE_ID, family: 'demon' as const, minimumMembers: 3, base: 6, bonus: 4, name: '空勘の爪' };
/** Original roster membership, including defeated members; never a living-count condition. */
export const demonPressureEligible = (friends: readonly { monster: Monster }[]) => friends.some(friend => friend.monster.id === DEMON_CORE_ID) && friends.filter(friend => friend.monster.family === DEMON_PRESSURE.family).length >= DEMON_PRESSURE.minimumMembers;
const boundedMpDamage = (amount: number | undefined) => Number.isFinite(amount) ? Math.max(0, Math.min(30, Math.floor(amount!))) : 0;
/** Base and fixed bonus are bounded separately. Zero/absent base always disables MP damage. */
export function mpDamageFor(unit: Unit, skill: Skill): number {
  const base = skill.kind === 'hit' ? boundedMpDamage(skill.mpDamage) : 0;
  return base ? Math.min(30, base + boundedMpDamage(unit.mpDamageBonus)) : 0;
}
/** Exact prospective MP loss if this target survives the HP hit, using its current protection. */
export function mpLossFor(unit: Unit, skill: Skill, target: Unit): number {
  return target.hp > 0 ? Math.max(0, Math.min(target.mp, Math.floor(mpDamageFor(unit, skill) * directDamageScale(target)))) : 0;
}
export const UNDEAD_CORE_ID = 32;
export const UNDEAD_CASHOUT = { coreId: UNDEAD_CORE_ID, family: 'undead' as const, minimumMembers: 3, base: 14, bonus: 8, name: '塚底の取り立て' };
/** Original membership, including later defeated allies; the core need not lead. */
export const undeadCashoutEligible = (friends: readonly { monster: Monster }[]) => friends.some(friend => friend.monster.id === UNDEAD_CORE_ID) && friends.filter(friend => friend.monster.family === UNDEAD_CASHOUT.family).length >= UNDEAD_CASHOUT.minimumMembers;
/** Poison is at most three remaining end-of-turn ticks, never a new meter. */
export const poisonTicksFor = (target: Unit): number => Number.isFinite(target.poison) ? Math.max(0, Math.min(3, Math.floor(target.poison))) : 0;
const boundedCashout = (amount: number | undefined): number => Number.isFinite(amount) ? Math.max(0, Math.min(30, Math.floor(amount!))) : 0;
/** This wave allows only a paid, ordinary single hit. Disabled/invalid base cannot be revived by a stale bonus. */
export function poisonCashoutPerTickFor(unit: Unit, skill: Skill): number {
  if (skill.kind !== 'hit' || skill.all || skill.randomHits !== undefined || skill.fixedDamage || skill.dragonChargeFinisher || skill.breaksGuard || skill.breaksGuardAfterHit || skill.mpDamage !== undefined || !Number.isInteger(skill.mpCost) || skill.mpCost <= 0) return 0;
  const base = boundedCashout(skill.poisonCashout);
  return base ? Math.min(30, base + boundedCashout(unit.poisonCashoutBonus)) : 0;
}
/** Read-only target-specific preview. Resolution calls it only on the actual living impact target. */
export function poisonCashoutDamageFor(unit: Unit, skill: Skill, target: Unit): number {
  return target.hp > 0 ? poisonCashoutPerTickFor(unit, skill) * poisonTicksFor(target) : 0;
}
export const EXTRAORDINARY_CORE_ID = 36;
/** One shared battle allowance, with no additional five-family bonus. */
export const EXTRAORDINARY_RESPONSE = { coreId: EXTRAORDINARY_CORE_ID, minimumFamilies: 4, maxUses: 1, mpCost: 24, name: '門口の応答' };
/** Count assigned, implemented gameplay tags once, including the core's own tag.
 * Call at the opening; later casualties never revoke an already granted allowance.
 */
export const assignedFamilyCount = (friends: readonly { monster: Pick<Monster, 'family'> }[]): number =>
  new Set(friends.flatMap(friend => friend.monster.family && Object.hasOwn(FAMILY_DEFINITIONS, friend.monster.family) ? [friend.monster.family] : [])).size;
export const extraordinaryResponseEligible = (friends: readonly { monster: Monster }[]): boolean =>
  friends.some(friend => friend.monster.id === EXTRAORDINARY_CORE_ID) && assignedFamilyCount(friends) >= EXTRAORDINARY_RESPONSE.minimumFamilies;
export const isExtraordinaryResponse = (skill: Skill): boolean => skill.kind === 'responseCleanse' || skill.kind === 'responseGuard';
export const SLIME_CORE_ID = 24;
export const SLIME_SUPPLY = { coreId: SLIME_CORE_ID, family: 'slime' as const, minimumMembers: 3, amount: 8, name: '蓄え分け', maxUses: 1 };
/** One bounded source for isolated amount ablations and the actual AI utility. */
export function supplyAmountFor(unit: Unit): number {
  const amount = unit.supplyAmount ?? SLIME_SUPPLY.amount;
  return Number.isFinite(amount) ? Math.max(0, Math.min(30, Math.floor(amount))) : SLIME_SUPPLY.amount;
}
/** Fixed opening eligibility. Includes defeated members and does not require the leader slot. */
export const slimeSupplyEligible = (friends: readonly { monster: Monster }[]) => friends.some(friend => friend.monster.id === SLIME_CORE_ID) && friends.filter(friend => friend.monster.family === SLIME_SUPPLY.family).length >= SLIME_SUPPLY.minimumMembers;
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
/** Playtest defaults selected after frozen all-family comparisons; explicit legacy controls remain available for reproducibility. */
export const DEFAULT_POISON_IMPACT_SCALE = 0;
export const DEFAULT_RESERVE_POISON = true;
/** Scale the complete poison direct basis, not its status/ticks, cost, or target count. */
export function poisonImpactScaleFor(unit: Pick<Unit, 'poisonImpactScale'>): number {
  const scale = unit.poisonImpactScale ?? DEFAULT_POISON_IMPACT_SCALE;
  return Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : DEFAULT_POISON_IMPACT_SCALE;
}
export type StartOptions = { /** Frozen player-only levels; enemies retain baseline stats. */ allyAwakeningStats?: Readonly<Record<string, { hp: number; atk: number }>>; /** Headless comparison only; default is 2 MP each new turn. */ turnMpRecovery?: number; leaders?: boolean; familySupport?: boolean; /** Isolated opening-allowance ablation; does not select a different AI policy. */ extraordinaryResponse?: boolean; /** Applies symmetrically to every unit only when explicitly provided. */ poisonImpactScale?: number; /** Separate optional AI arm; does not change the ordinary enemy-variation branch. */ reservePoison?: boolean };
export function start(team: number[], enemy: number[], seed = 42, options: StartOptions = {}): State {
  const units = (ids: number[], prefix: string): Unit[] => {
    const leader = options.leaders && ids.length ? leaderFor(ids[0]) : undefined;
    const rally = options.familySupport !== false && ids.includes(12);
    const ward = options.familySupport !== false && ids.includes(14);
    const dragonCharge = options.familySupport !== false && ids.includes(DRAGON_CORE_ID) && ids.filter(id => monsters[id]?.family === 'dragon').length >= 3;
    const repair = options.familySupport !== false && materialRepairEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    const cashout = options.familySupport !== false && undeadCashoutEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    const pressure = options.familySupport !== false && demonPressureEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    const response = options.familySupport !== false && options.extraordinaryResponse !== false && extraordinaryResponseEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    const supply = options.familySupport !== false && slimeSupplyEligible(ids.map(id => ({ monster: monsters[id] })).filter(friend => friend.monster));
    return ids.map((id, i) => {
      const base = monsters[id];
      const growth = prefix === 'a' ? options.allyAwakeningStats?.[String(id)] : undefined;
      const source = base && growth ? { ...base, hp: growth.hp, atk: growth.atk } : base;
      if (!source) throw new Error(`Unknown monster id: ${id}`);
      // Derive battle-only stats; never accumulate boosts in the shared roster.
      const monster = leader && leaderAppliesTo(leader, source) ? {
        ...source, [leader.stat]: Math.round(source[leader.stat] * (1 + leader.percent / 100)),
        ...(leader.secondary ? { [leader.secondary.stat]: Math.round(source[leader.secondary.stat] * (1 + leader.secondary.percent / 100)) } : {}),
      } : source;
      return { key: prefix + i, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0, ...(rally && source.family === 'beast' ? { rally: OPENING_RALLY_TURNS } : {}), ...(ward && source.family === 'nature' ? { ward: OPENING_WARD_TURNS } : {}), ...(dragonCharge && id === DRAGON_CORE_ID ? { dragonCharge: 0 } : {}), ...(repair && id === MATERIAL_CORE_ID ? { repairReady: true } : {}), ...(supply && id === SLIME_CORE_ID ? { supplyReady: true } : {}), ...(pressure && id === DEMON_CORE_ID ? { mpDamageBonus: DEMON_PRESSURE.bonus } : {}), ...(cashout && id === UNDEAD_CORE_ID ? { poisonCashoutBonus: UNDEAD_CASHOUT.bonus } : {}), ...(response && id === EXTRAORDINARY_CORE_ID ? { responseReady: true } : {}), ...(options.poisonImpactScale !== undefined ? { poisonImpactScale: poisonImpactScaleFor(options) } : {}) };
    });
  };
  return {
    turn: 1,
    seed: seed >>> 0,
    allies: units(team, 'a'),
    enemies: units(enemy, 'e'),
    history: [],
    ...(options.turnMpRecovery !== undefined ? { turnMpRecovery: turnMpRecoveryAmount(options.turnMpRecovery) } : {}),
    log: ['戦闘開始！', `MPは対戦ごとに全回復。2ターン目から各ターン開始時、生存中の両軍はMP +${turnMpRecoveryAmount(options.turnMpRecovery)}（最大MPまで）。`, ...(options.leaders ? [
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
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => demonPressureEligible(ids.map(id => ({ monster: monsters[id] })))
        ? [`${side}「悪魔の資源圧力」：開戦時にマモンを含む悪魔系3体以上で空勘の爪のMP減少が6→10。本人を含む開始時の編成で固定・解除不可。HP命中後に生存した対象だけ、守り・自然障壁で軽減し残MPまで減少。自身のMP回復はありません。`]
        : []),
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => undeadCashoutEligible(ids.map(id => ({ monster: monsters[id] })))
        ? [`${side}「毒の取り立て」：開戦時にドラウグルを含む不死系3体以上で、塚底の取り立ての毒1回あたり追加が14→22。本人を含む開始時の編成で固定・解除不可。命中した生存対象の現在の毒0〜3回を全消費し、追加分も守り・自然障壁で軽減。蘇生・回復・追加行動はありません。`]
        : []),
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => options.extraordinaryResponse !== false && extraordinaryResponseEligible(ids.map(id => ({ monster: monsters[id] })))
        ? [`${side}「${EXTRAORDINARY_RESPONSE.name}」：開戦時にヤヌス本人を含む系統4種類以上で、毒除去か今ターンの守りを共通の1回から選択。各MP24・行動を消費。使用権は解除不可、本人の戦闘不能で終了。5種類の追加効果、回復・蘇生・毒予防はありません。`]
        : []),
      ...([[team, '味方'], [enemy, '敵']] as const).flatMap(([ids, side]) => slimeSupplyEligible(ids.map(id => ({ monster: monsters[id] })))
        ? [`${side}「${SLIME_SUPPLY.name}」：開戦時にうつろ泉を含む粘体系3体以上で使用可能。通常順の行動を使い、生存する味方粘体系へ各MP+${SLIME_SUPPLY.amount}（最大MPまで）。戦闘中1回・MP消費なし・解除不可。全員満タンなら使わず残1回を保持。HPは回復しません。毎ターンのMP回復とは別の補給です。`]
        : []),
    ] : [])],
    winner: null,
    ...(options.reservePoison !== undefined ? { reservePoison: options.reservePoison } : {}),
  };
}

// Ordinary area hits are unchanged. Poison direct comparisons are independently opt-in.
const AREA_HIT_DAMAGE_SCALE = 0.5;
export const baseDamage = (unit: Unit, skill: Skill) => (skill.fixedDamage
  ? skill.power + (skill.dragonChargeFinisher ? (unit.dragonCharge ?? 0) * (unit.dragonChargePerPoint ?? DRAGON_CHARGE_PER_POINT) : 0)
  : (skill.name === '通常攻撃' ? attackFor(unit) : skill.power + attackFor(unit) * 0.38) * (skill.all && skill.kind === 'hit' ? AREA_HIT_DAMAGE_SCALE : 1)) * (skill.kind === 'poison' ? poisonImpactScaleFor(unit) : 1);

const random = (seed: number) => ((Math.imul(seed, 1664525) + 1013904223) >>> 0);
const living = (units: Unit[]) => units.filter(unit => unit.hp > 0);
const weakest = (units: Unit[]) => living(units).reduce<Unit | undefined>((best, unit) => (
  !best || unit.hp / unit.monster.hp < best.hp / best.monster.hp ? unit : best
), undefined);

export type SkillUnavailableReason = 'defeated' | 'insufficient-mp' | 'supply-ineligible' | 'supply-spent' | 'supply-full' | 'supply-context-required' | 'response-ineligible' | 'response-spent' | 'response-no-poison' | 'response-all-guarded' | 'response-context-required';
/** Shared authoritative validation. Wide supports require the actual same-side roster.
 * Explicit response kinds deliberately do not widen old cleanse/protect semantics.
 */
export function skillUnavailableReason(unit: Unit, skill: Skill, friends?: readonly Unit[]): SkillUnavailableReason | undefined {
  if (unit.hp <= 0) return 'defeated';
  if (isExtraordinaryResponse(skill)) {
    if (unit.monster.id !== EXTRAORDINARY_CORE_ID || unit.responseReady === undefined) return 'response-ineligible';
    if (!unit.responseReady) return 'response-spent';
    if (!friends) return 'response-context-required';
    if (skill.kind === 'responseCleanse' && !friends.some(friend => friend.hp > 0 && friend.poison > 0)) return 'response-no-poison';
    if (skill.kind === 'responseGuard' && !friends.some(friend => friend.hp > 0 && !friend.guard)) return 'response-all-guarded';
  }
  if (!Number.isInteger(skill.mpCost) || skill.mpCost < 0 || unit.mp < skill.mpCost) return 'insufficient-mp';
  if (skill.kind !== 'restoreMp') return undefined;
  if (unit.monster.id !== SLIME_CORE_ID || unit.supplyReady === undefined) return 'supply-ineligible';
  if (!unit.supplyReady) return 'supply-spent';
  if (!friends) return 'supply-context-required';
  if (!friends.some(friend => friend.hp > 0 && friend.monster.family === SLIME_SUPPLY.family && friend.mp < friend.monster.mp)) return 'supply-full';
  return undefined;
}
export function skillUnavailableLabel(reason: SkillUnavailableReason): string {
  return ({ defeated: '戦闘不能', 'insufficient-mp': 'MP不足', 'supply-ineligible': '開戦時にうつろ泉を含む粘体系3体以上が必要', 'supply-spent': '補給は使用済み（残0回）', 'supply-full': '生存する味方粘体系のMPが全員満タン', 'supply-context-required': '味方のMP状態が未確認', 'response-ineligible': '開戦時に本人を含む系統4種類以上が必要（無効設定時も使用不可）', 'response-spent': '共通の応答は使用済み（残0回）', 'response-no-poison': '毒のある生存味方がいない', 'response-all-guarded': '生存する味方は全員守り中', 'response-context-required': '味方の毒・守り状態が未確認' })[reason];
}
/** MP and finite allowances are spent only by a valid cast, never by choosing an order. */
export function canUseSkill(unit: Unit, skill: Skill, friends?: readonly Unit[]): boolean {
  return skillUnavailableReason(unit, skill, friends) === undefined;
}

/** Poison is measured in remaining end-of-turn ticks, not actor turns. */
export function effectStatus(unit: Unit): string {
  if (unit.hp <= 0) return '戦闘不能';
  return [unit.guard ? '守り:今T' : '', unit.poison > 0 ? `毒:残${unit.poison}回` : '', unit.rally ? `群気:残${unit.rally}T` : '', unit.ward ? `自然障壁:残${unit.ward}T` : '', unit.dragonCharge !== undefined ? `竜気:${unit.dragonCharge}/${DRAGON_CHARGE_CAP}` : '', unit.repairReady !== undefined ? unit.repairReady ? '修復:待機' : '修復:終了' : '', unit.supplyReady !== undefined ? `補給:残${unit.supplyReady ? 1 : 0}回` : '', unit.responseReady !== undefined ? `応答:残${unit.responseReady ? 1 : 0}回` : ''].filter(Boolean).join('・');
}

/** A conservative HP-equivalent heuristic, not a prediction of hidden enemy orders.
 * Cleansing values remaining ticks, discounted for uncertain future survival/reapplication.
 * Guard averages public affordable attack options, then weights wounds and caps damage
 * at living HP. A lone advertised area attack is not assumed to happen. Guard breakers
 * and attacks before this priority contribute no false protection. These weights are
 * explicit design assumptions, not fitted win rates or measured attack probabilities.
 */
export function extraordinaryResponseScore(unit: Unit, skill: Skill, friends: readonly Unit[], opponents: readonly Unit[], turn: number): number {
  if (!isExtraordinaryResponse(skill) || !canUseSkill(unit, skill, friends)) return -Infinity;
  const alive = friends.filter(friend => friend.hp > 0);
  // Spending an irreplaceable response carries a small future-option cost in addition
  // to its ordinary MP cost; the caller compares the result with a real attack's score.
  const cost = skill.mpCost * 0.18 + 10;
  if (skill.kind === 'responseCleanse') return alive.reduce((sum, friend) => {
    const tick = Math.max(1, Math.floor(friend.monster.hp * 0.06));
    const remaining = Array.from({ length: poisonTicksFor(friend) }, (_, index) => tick * 0.85 ** index).reduce((total, amount) => total + amount, 0);
    return sum + Math.min(friend.hp, remaining) + (friend.poison > 0 && friend.hp <= tick ? 20 : 0);
  }, 0) - cost;
  if (!alive.length) return -Infinity;
  return opponents.filter(opponent => opponent.hp > 0).reduce((sum, opponent) => {
    const options = [battleSkill(opponent.monster, BASIC_ATTACK)!, ...opponent.monster.skills]
      .filter(option => (option.kind === 'hit' || option.kind === 'poison') && canUseSkill(opponent, option, opponents));
    const value = options.reduce((total, option) => {
      if (option.breaksGuard || option.priority > skill.priority || (option.priority === skill.priority && speedFor(opponent, turn) >= speedFor(unit, turn))) return total;
      const raw = baseDamage(opponent, option);
      const hits = option.randomHits ? barrageHits(option, [...opponents]) : 1;
      return total + alive.reduce((saved, friend) => {
        if (friend.guard) return saved;
        const before = Math.min(friend.hp, Math.max(1, Math.floor(raw * directDamageScale(friend))));
        const after = Math.min(friend.hp, Math.max(1, Math.floor(raw * Math.min(0.5, directDamageScale(friend)))));
        const exposure = option.all ? 1 : option.randomHits && option.breaksGuardAfterHit
          ? 1 - (1 - 1 / alive.length) ** hits : hits / alive.length;
        const urgency = 0.4 + 0.6 * (1 - friend.hp / friend.monster.hp);
        const avoidsDefeat = before >= friend.hp && after < friend.hp ? 20 : 0;
        return saved + ((before - after) * urgency + avoidsDefeat) * exposure;
      }, 0);
    }, 0);
    return sum + value / Math.max(1, options.length);
  }, 0) - cost;
}

/** Legacy snapshot planner for explicit-plan comparisons. Gameplay uses automaticOrders.
 * Does not change state or consume the seed; its result is a fixed manual plan. */
export function autoOrders(state: State, side: 'allies' | 'enemies' = 'allies'): Order[] {
  return planOrders(state, side);
}

/** Preserve confirmed own commands and complete only the unselected actors.
 * Reservations are rebuilt per call; no pending UI selection or enemy order is read.
 */
export function completeOrders(state: State, confirmed: readonly Order[], side: 'allies' | 'enemies' = 'allies'): Order[] {
  // The comparison arm retains its historical context-free choices and overrides.
  if (!(state.reservePoison ?? DEFAULT_RESERVE_POISON)) {
    return autoOrders(state, side).map(order => confirmed.find(fixed => fixed.key === order.key) ?? order);
  }
  return planOrders(state, side, confirmed);
}

type LiveChoice = { key: string; remaining?: ReadonlySet<string>; excluded?: ReadonlySet<number> };
function planOrders(state: State, side: 'allies' | 'enemies', confirmed: readonly Order[] = [], live?: LiveChoice): Order[] {
  if (state.winner) return [];
  const friends = living(state[side]);
  const opponents = living(side === 'allies' ? state.enemies : state.allies);
  const target = opponents.reduce<Unit | undefined>((best, unit) => !best || unit.hp < best.hp ? unit : best, undefined);
  const incomingThreat = opponents.filter(opponent => !live?.remaining || live.remaining.has(opponent.key)).reduce((largest, opponent) => Math.max(largest, attackFor(opponent),
    ...opponent.monster.skills.filter(skill => canUseSkill(opponent, skill) && (skill.kind === 'hit' || skill.kind === 'poison')).map(skill => baseDamage(opponent, skill))), 0);
  const protectedTargets = new Set<string>();
  const cleansedTargets = new Set<string>();
  const plannedHealing = new Map<string, number>();
  // Optional slot-order reservation, not optimal planning: a prior actor may be
  // defeated or lose its MP before casting. Only current living enemy targets and
  // confirmed own poisons and earlier automatic all-target poisons are reserved. Do not forecast survival,
  // enemy orders, future cashout, cleansing, or reapplication. Legal repeated casts
  // and their immediate damage utility remain available on either physical side.
  const reservePoison = state.reservePoison ?? DEFAULT_RESERVE_POISON;
  const plannedPoison = new Set<string>();
  const fixedOrders = new Map(friends.flatMap(unit => {
    // Match the resolver's first-order precedence even for duplicated input keys.
    const order = confirmed.find(order => order.key === unit.key);
    return order ? [[unit.key, order] as const] : [];
  }));
  if (reservePoison) for (const unit of friends) {
    const order = fixedOrders.get(unit.key);
    const skill = order && battleSkill(unit.monster, order.skill);
    if (!order || !skill || skill.kind !== 'poison' || skill.randomHits || !canUseSkill(unit, skill, friends)) continue;
    // As in execution, an explicit target on the wrong side is invalid even for
    // an area skill. Missing single-target input is not a confirmed reservation.
    const enemies = side === 'allies' ? state.enemies : state.allies;
    if (order.target !== undefined && !enemies.some(target => target.key === order.target)) continue;
    for (const target of opponents) if (skill.all || target.key === order.target) plannedPoison.add(target.key);
  }
  return (live ? friends.filter(unit => unit.key === live.key) : friends).map(unit => {
    const fixed = fixedOrders.get(unit.key);
    if (fixed) {
      // Account for the command that will actually be returned, at this actor's
      // existing slot. Do not reserve a discarded automatic suggestion or pull
      // later supports forward: a faster earlier heal may still be necessary.
      const skill = battleSkill(unit.monster, fixed.skill);
      if (skill && canUseSkill(unit, skill, friends)) {
        if (isExtraordinaryResponse(skill)) {
          // Responses affect all living friends. An explicit wrong-side or
          // unknown target is still rejected by execution, even for an area skill.
          if (fixed.target === undefined || state[side].some(friend => friend.key === fixed.target)) {
            for (const friend of friends) (skill.kind === 'responseCleanse' ? cleansedTargets : protectedTargets).add(friend.key);
          }
        } else {
          // Missing/dead targets may retarget during execution; do not invent a
          // reservation for that future fallback while completing public orders.
          const recipient = friends.find(friend => friend.key === fixed.target);
          if (recipient) {
            if (skill.kind === 'protect') protectedTargets.add(recipient.key);
            if (skill.kind === 'cleanse') cleansedTargets.add(recipient.key);
            if (skill.kind === 'heal' || skill.kind === 'cleanse') {
              plannedHealing.set(recipient.key, (plannedHealing.get(recipient.key) ?? 0) + skill.power);
            }
          }
        }
      }
      return fixed;
    }
    const specials = unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS);
    const find = (kind: Skill['kind']) => specials.findIndex((skill, index) => !live?.excluded?.has(index) && skill.kind === kind && canUseSkill(unit, skill, friends));
    const cleansing = find('cleanse');
    const poisoned = weakest(friends.filter(friend => friend.poison > 0 && !cleansedTargets.has(friend.key)));
    if (cleansing >= 0 && poisoned) {
      cleansedTargets.add(poisoned.key);
      plannedHealing.set(poisoned.key, (plannedHealing.get(poisoned.key) ?? 0) + specials[cleansing]!.power);
      return { key: unit.key, skill: cleansing, target: poisoned.key };
    }
    const protecting = find('protect');
    const vulnerable = weakest(friends.filter(friend => !protectedTargets.has(friend.key) && (!live || !friend.guard) && friend.hp > incomingThreat * 0.5));
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
    // Spend the one action on actual missing MP only when it funds a currently
    // unaffordable paid action. Never reserve a skill against future borrowed MP.
    const supply = find('restoreMp');
    if (supply >= 0) {
      const recipients = friends.filter(friend => friend.monster.family === SLIME_SUPPLY.family);
      const fundsAction = recipients.some(friend => friend.monster.skills.some(skill =>
        skill.mpCost > friend.mp && skill.mpCost <= Math.min(friend.monster.mp, friend.mp + supplyAmountFor(unit)) && (!live || canUseSkill({ ...friend, mp: Math.min(friend.monster.mp, friend.mp + supplyAmountFor(unit)) }, skill, state[side]))));
      if (fundsAction) return { key: unit.key, skill: supply };
    }
    // Keep a free attack available. Spend only when a special adds useful damage or utility.
    // Keep the new core's policy stable when Lab disables its mechanic. Other
    // actors keep the exact historical scoring and target-selection behavior.
    const cashoutActor = unit.monster.id === UNDEAD_CORE_ID;
    const responseActor = unit.monster.id === EXTRAORDINARY_CORE_ID;
    // Keep core policy fixed when the Lab disables MP damage.
    const pressureActor = unit.monster.id === DEMON_CORE_ID || specials.some(skill => (skill.mpDamage ?? 0) > 0);
    const score = (skill: Skill, singleTarget = target) => {
      if (live && responseActor && isExtraordinaryResponse(skill)) return skill.kind === 'responseGuard'
        ? friends.reduce((sum, friend) => sum + automaticProtectionValue(state, unit.key, side, friend, live.remaining), 0) - skill.mpCost * .18 - 10
        : friends.reduce((sum, friend) => sum + Math.min(friend.hp, Math.floor(friend.monster.hp * .06) * Math.min(poisonTicksFor(friend), MAX_TURNS - state.turn + 1)) * .8, 0) - skill.mpCost * .18 - 10;
      if (responseActor && isExtraordinaryResponse(skill)) return extraordinaryResponseScore(unit, skill, friends.map(friend => cleansedTargets.has(friend.key) ? { ...friend, poison: 0 } : friend), state[side === 'allies' ? 'enemies' : 'allies'], state.turn);
      if (skill.kind !== 'hit' && skill.kind !== 'poison') return -1;
      const targets = skill.all || skill.randomHits ? opponents : singleTarget ? [singleTarget] : [];
      return targets.reduce((total, opponent) => {
        const guardMitigation = opponent.guard && (live || skill.priority < 1) && !skill.breaksGuard ? (skill.breaksGuardAfterHit ? 0.75 : 0.5) : 1;
        const wardMitigation = !opponent.ward || skill.breaksGuard ? 1 : 1 - (opponent.wardPercent ?? NATURE_WARD_PERCENT) / 100 * (skill.breaksGuardAfterHit ? 0.5 : 1);
        const mitigation = Math.min(guardMitigation, wardMitigation);
        // New cashout actors alone compare immediate damage/kill chance against
        // the current ticks they give up and the MP spent. Average the same 21
        // possible public rolls, never read the seed or any queued orders.
        if (cashoutActor) {
          const cashout = poisonCashoutPerTickFor(unit, skill) > 0;
          const basis = baseDamage(unit, skill) + poisonCashoutDamageFor(unit, skill, opponent);
          const remainingPoison = Math.floor(opponent.monster.hp * 0.06) * Math.min(poisonTicksFor(opponent), live ? MAX_TURNS - state.turn + 1 : Infinity);
          return total + Array.from({ length: 21 }, (_, roll) => {
            const hit = Math.min(opponent.hp, Math.max(1, Math.floor(basis * (0.9 + roll / 100) * mitigation)));
            const lostPoison = cashout ? Math.min(opponent.hp - hit, remainingPoison) : 0;
            return hit - lostPoison + (hit === opponent.hp ? 20 : 0);
          }).reduce((sum, value) => sum + value, 0) / 21;
        }
        const damage = Math.min(opponent.hp, baseDamage(unit, skill) * mitigation * (skill.randomHits ? barrageHits(skill, state[side]) / Math.max(1, opponents.length) : 1));
        const poisonDamage = skill.kind === 'poison' && opponent.poison === 0 && !(reservePoison && plannedPoison.has(opponent.key))
          ? Math.min(Math.max(0, opponent.hp - damage), Math.floor(opponent.monster.hp * 0.06) * (live ? Math.min(2, MAX_TURNS - state.turn + 1) : 2)) : 0;
        // Only the new MP-damage branch values resource pressure. Two HP-equivalent
        // points per actual MP lost, plus at most 16 for the fraction of currently
        // affordable learned options made unaffordable. No hidden orders are read.
        // Weight by the 21 possible HP rolls that leave the target alive; an HP kill
        // cannot also earn resource utility. Empty-MP and free-only targets earn zero.
        let resourceUtility = 0;
        if (mpDamageFor(unit, skill) > 0) {
          const preview = { ...opponent, guard: guardMitigation < 1, ward: skill.breaksGuard ? 0 : opponent.ward };
          const loss = mpLossFor(unit, skill, preview);
          const paid = opponent.monster.skills.filter(option => option.mpCost > 0 && option.mpCost <= opponent.mp && (!live || canUseSkill(opponent, option, state[side === 'allies' ? 'enemies' : 'allies'])));
          const crossing = paid.filter(option => option.mpCost > opponent.mp - loss).length;
          const survival = Array.from({ length: 21 }, (_, roll) => opponent.hp > Math.max(1, Math.floor(baseDamage(unit, skill) * (0.9 + roll / 100) * mitigation))).filter(Boolean).length / 21;
          resourceUtility = paid.length ? survival * (loss * 2 + 16 * crossing / paid.length) : 0;
        }
        // The mixed core also values finishing a living enemy over spending its
        // sole support response to postpone an already available knockout.
        return total + damage + poisonDamage + resourceUtility + (responseActor && damage >= opponent.hp ? 20 : 0);
      }, 0) + skill.priority * 0.01 - skill.mpCost * 0.18;
    };
    let skillIndex = BASIC_ATTACK;
    let selectedTarget = target;
    let bestScore = score(battleSkill(unit.monster, BASIC_ATTACK)!);
    if (cashoutActor) for (const candidateTarget of opponents) {
      const candidate = score(battleSkill(unit.monster, BASIC_ATTACK)!, candidateTarget);
      if (candidate > bestScore) { bestScore = candidate; selectedTarget = candidateTarget; }
    }
    specials.forEach((skill, index) => {
      if (live?.excluded?.has(index) || !canUseSkill(unit, skill, friends)) return;
      const candidates = (pressureActor || cashoutActor) && !skill.all && !skill.randomHits && skill.kind === 'hit' ? opponents : [target];
      for (const candidateTarget of candidates) {
        const candidate = score(skill, candidateTarget);
        if (candidate > bestScore) { bestScore = candidate; skillIndex = index; selectedTarget = candidateTarget; }
      }
    });
    if (responseActor && skillIndex >= 0 && isExtraordinaryResponse(specials[skillIndex]!)) {
      for (const friend of friends) (specials[skillIndex]!.kind === 'responseCleanse' ? cleansedTargets : protectedTargets).add(friend.key);
      return { key: unit.key, skill: skillIndex };
    }
    if (reservePoison && skillIndex >= 0 && specials[skillIndex]!.kind === 'poison' && specials[skillIndex]!.all) {
      for (const opponent of opponents) plannedPoison.add(opponent.key);
    }
    // Non-combat fixtures and passive defenders still have a meaningful legal stance.
    if (!specials.some(skill => skill.kind === 'hit' || skill.kind === 'poison') && unit.monster.atk === 0 && find('guard') >= 0) skillIndex = find('guard');
    return { key: unit.key, skill: skillIndex, target: skillIndex >= 0 && specials[skillIndex]!.kind === 'guard' ? unit.key : selectedTarget?.key };
  });
}

/** Keep automatic intent unresolved. Explicit commands, including invalid ones, stay fixed. */
export function automaticOrders(state: State, confirmed: readonly Order[] = [], side: 'allies' | 'enemies' = 'allies'): Order[] {
  if (state.winner) return [];
  return living(state[side]).map(unit => confirmed.find(order => order.key === unit.key) ?? { key: unit.key, skill: AUTO });
}

/** Marginal current-turn protection only; never interception, stacking or poison reduction. */
export function automaticProtectionValue(state: State, key: string, side: 'allies' | 'enemies', recipient: Unit, remainingKeys?: ReadonlySet<string>): number {
  const friends = living(state[side]);
  const opponents = living(state[side === 'allies' ? 'enemies' : 'allies']);
  const remaining = (other: Unit) => !remainingKeys || remainingKeys.has(other.key);
  const attackOptions = (other: Unit, team: Unit[]) => [battleSkill(other.monster, BASIC_ATTACK)!, ...other.monster.skills]
    .filter(skill => (skill.kind === 'hit' || skill.kind === 'poison') && canUseSkill(other, skill, team));
  const futureAttackers = opponents.filter(remaining);
  const alliedProgress = friends.some(friend => friend.key !== key && remaining(friend) && attackOptions(friend, friends).some(skill => baseDamage(friend, skill) > 1));
  const poisonProgress = opponents.some(opponent => opponent.poison > 0);
  const judgingLead = state.turn >= MAX_TURNS && friends.reduce((sum, friend) => sum + friend.hp / friend.monster.hp, 0) > opponents.reduce((sum, enemy) => sum + enemy.hp / enemy.monster.hp, 0);
  const protection = (): number => {
    if (recipient.guard || (!alliedProgress && !poisonProgress && !judgingLead)) return 0;
    return futureAttackers.reduce((sum, enemy) => {
      const options = attackOptions(enemy, opponents).filter(skill => !skill.breaksGuard);
      return sum + options.reduce((best, skill) => {
        const raw = baseDamage(enemy, skill);
        const before = Math.min(recipient.hp, raw * directDamageScale(recipient));
        const after = Math.min(recipient.hp, raw * Math.min(.5, directDamageScale(recipient)));
        const hitCount = skill.randomHits ? barrageHits(skill, state[side === 'allies' ? 'enemies' : 'allies']) : 1;
        const exposure = skill.all ? 1 : skill.breaksGuardAfterHit ? 1 - (1 - 1 / friends.length) ** hitCount : hitCount / friends.length;
        const savesLife = before >= recipient.hp && after < recipient.hp;
        return Math.max(best, ((before - after) * .6 + (savesLife ? 25 : 0)) * exposure);
      }, 0);
    }, 0);
  };
  return protection();
}

/** Public-state, deterministic action-time utility. No seed, queued command or future
 * outcome is read. Scores are documented HP-equivalent heuristics, not win forecasts.
 * remainingKeys contains only publicly unacted actors, never their chosen commands.
 */
export function chooseTacticalAutomaticOrder(state: State, key: string, side: 'allies' | 'enemies' = 'allies', remainingKeys?: ReadonlySet<string>): Order {
  const friends = living(state[side]);
  const opponents = living(state[side === 'allies' ? 'enemies' : 'allies']);
  const unit = friends.find(friend => friend.key === key);
  if (!unit) return { key, skill: BASIC_ATTACK };
  const horizon = Math.max(0, MAX_TURNS - state.turn + 1);
  const ticks = (target: Unit) => Math.min(horizon, poisonTicksFor(target));
  const remaining = (other: Unit) => !remainingKeys || remainingKeys.has(other.key);
  const protection = (recipient: Unit) => automaticProtectionValue(state, key, side, recipient, remainingKeys);
  const damageScore = (skill: Skill, target: Unit) => {
    const mitigation = skill.breaksGuard ? 1 : directDamageScale(target);
    const basis = baseDamage(unit, skill) + poisonCashoutDamageFor(unit, skill, target);
    const hits = skill.randomHits ? barrageHits(skill, state[side]) : 1;
    const chance = skill.randomHits ? 1 / opponents.length : 1;
    // Binomial occupancy is a bounded public estimate, not a guaranteed split.
    // It cannot credit more knockouts than hits. Actual rolls/retargeting remain
    // solely in the resolver; this estimate never samples the battle seed.
    let total = 0;
    for (let count = 1; count <= hits; count++) {
      let combinations = 1;
      for (let j = 1; j <= count; j++) combinations *= (hits - j + 1) / j;
      const probability = combinations * chance ** count * (1 - chance) ** (hits - count);
      if (!probability) continue;
      for (let roll = 90; roll <= 110; roll++) {
        const first = Math.max(1, Math.floor(basis * roll / 100 * mitigation));
        const later = skill.breaksGuardAfterHit ? Math.max(1, Math.floor(basis * roll / 100)) : first;
        const damage = skill.kind === 'poison' && poisonImpactScaleFor(unit) === 0 ? 0 : Math.min(target.hp, first + later * (count - 1));
        const survives = damage < target.hp;
        const poisonGain = skill.kind === 'poison' && !target.poison && survives ? Math.min(target.hp - damage, Math.floor(target.monster.hp * .06) * Math.min(horizon, 1.6)) : 0;
        const lostPoison = skill.poisonCashout && survives ? Math.min(target.hp - damage, Math.floor(target.monster.hp * .06) * ticks(target) * .8) : 0;
        const paid = target.monster.skills.filter(option => option.mpCost > 0 && canUseSkill(target, option, state[side === 'allies' ? 'enemies' : 'allies']));
        const loss = survives && paid.length ? mpLossFor(unit, skill, target) : 0;
        const crossing = paid.filter(option => !canUseSkill({ ...target, mp: target.mp - loss }, option, state[side === 'allies' ? 'enemies' : 'allies'])).length;
        const dispel = survives && (skill.breaksGuard || skill.breaksGuardAfterHit) ? Math.min(18, (skill.breaksGuardAfterHit && target.rally && remaining(target) ? 4 : 0) + (target.dragonCharge ?? 0) * 2 + (target.repairReady ? 8 : 0)) : 0;
        total += probability * (damage + (!survives ? 25 : 0) + poisonGain - lostPoison + dispel + loss * 1.5 + (paid.length ? 12 * crossing / paid.length : 0));
      }
    }
    return total / 21;
  };
  let best: Order = { key, skill: BASIC_ATTACK, target: opponents[0]?.key };
  let bestScore = -Infinity;
  // Free attack wins exact utility ties, then stable original skill/target slots.
  const options = [BASIC_ATTACK, ...unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((_, index) => index), DEFEND];
  for (const index of options) {
    const skill = battleSkill(unit.monster, index)!;
    if (!canUseSkill(unit, skill, friends)) continue;
    const targets = skill.kind === 'guard' ? [unit] : skillTargetsAllies(skill) ? friends : opponents;
    const candidates = skill.all || skill.randomHits ? [undefined] : targets;
    for (const target of candidates) {
      let utility = 0;
      if (skill.kind === 'hit' || skill.kind === 'poison') utility = (target ? [target] : opponents).reduce((sum, enemy) => sum + damageScore(skill, enemy), 0);
      else if (skill.kind === 'heal' || skill.kind === 'cleanse') {
        if (!target) continue;
        const heal = Math.min(target.monster.hp - target.hp, skill.power);
        utility = heal * (target.hp / target.monster.hp < .45 ? 1.25 : .85);
        if (skill.kind === 'cleanse' && target.poison) utility += Math.min(target.hp, Math.floor(target.monster.hp * .06) * ticks(target)) * .8;
      } else if (skill.kind === 'guard' || skill.kind === 'protect') utility = target ? protection(target) : 0;
      else if (skill.kind === 'responseGuard') utility = friends.reduce((sum, friend) => sum + protection(friend), 0) - 10;
      else if (skill.kind === 'responseCleanse') utility = friends.reduce((sum, friend) => sum + Math.min(friend.hp, Math.floor(friend.monster.hp * .06) * ticks(friend)) * .8, 0) - 10;
      else if (skill.kind === 'restoreMp') utility = friends.filter(friend => friend.monster.family === SLIME_SUPPLY.family).reduce((sum, friend) => {
        const gain = Math.min(friend.monster.mp - friend.mp, supplyAmountFor(unit));
        const funded = friend.monster.skills.some(option => option.mpCost > friend.mp && canUseSkill({ ...friend, mp: friend.mp + gain }, option, state[side]));
        return sum + (funded ? gain * 3 : 0);
      }, 0);
      utility -= skill.mpCost * .18;
      if (utility > bestScore) { bestScore = utility; best = { key, skill: index, ...(target ? { target: target.key } : {}) }; }
    }
  }
  return best;
}

/** Shipping player auto: retain the established support preferences, but evaluate
 * only this actor against actual live state. No imaginary earlier allies or hidden
 * opponent commands are reserved. A positively justified self-defense can still win.
 */
export function chooseAutomaticOrder(state: State, key: string, side: 'allies' | 'enemies' = 'allies', remainingKeys?: ReadonlySet<string>): Order {
  const unit = state[side].find(unit => unit.key === key);
  if (!unit) return { key, skill: BASIC_ATTACK };
  const excluded = new Set<number>();
  let choice: Order;
  let skill: Skill | undefined;
  do {
    choice = planOrders(state, side, [], { key, remaining: remainingKeys, excluded }).find(order => order.key === key) ?? { key, skill: BASIC_ATTACK };
    skill = battleSkill(unit.monster, choice.skill);
    const protectedFriends = skill?.kind === 'responseGuard' ? living(state[side]) : state[side].filter(friend => friend.key === (skill?.kind === 'guard' ? key : choice.target));
    if (!skill || !['guard', 'protect', 'responseGuard'].includes(skill.kind) || protectedFriends.some(friend => automaticProtectionValue(state, key, side, friend, remainingKeys) > 0)) break;
    excluded.add(choice.skill);
  } while (excluded.size <= MAX_SPECIAL_SKILLS);
  if (!skill || skillTargetsAllies(skill)) return choice;
  const defense = chooseTacticalAutomaticOrder(state, key, side, remainingKeys);
  return battleSkill(unit.monster, defense.skill)?.kind === 'guard' ? defense : choice;
}

/** Headless superseded CPU comparison, not the shipping default.
 * Bounded learned-attack variety uses its ONE fixed initiative token.
 * Reassessment changes legal options, never redraws randomness. Support/core policies
 * stay deliberate; basic attack is always a candidate and guard requires positive
 * defensive utility. This strategy differs from player auto, not its information or rules.
 */
export function chooseEnemyAutomaticOrder(state: State, key: string, remainingKeys: ReadonlySet<string>, token: number): Order {
  const choice = chooseAutomaticOrder(state, key, 'enemies', remainingKeys);
  const unit = state.enemies.find(unit => unit.key === key);
  const skill = unit && battleSkill(unit.monster, choice.skill);
  if (!unit || !skill || skillTargetsAllies(skill) || [DEMON_CORE_ID, UNDEAD_CORE_ID, EXTRAORDINARY_CORE_ID].includes(unit.monster.id)
    || unit.monster.skills.some(option => (option.mpDamage ?? 0) > 0)) return choice;
  const defense = chooseTacticalAutomaticOrder(state, key, 'enemies', remainingKeys);
  const guardWorthwhile = battleSkill(unit.monster, defense.skill)?.kind === 'guard';
  const candidates = [BASIC_ATTACK, ...unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((_, index) => index)]
    .filter(index => { const option = battleSkill(unit.monster, index)!; return canUseSkill(unit, option, state.enemies)
      && (option.kind === 'hit' || option.kind === 'poison' || (option.kind === 'guard' && guardWorthwhile)); });
  const index = candidates[(token >>> 0) % candidates.length] ?? BASIC_ATTACK;
  const target = living(state.allies).find(friend => friend.key === choice.target) ?? weakest(state.allies);
  return { key, skill: index, target: battleSkill(unit.monster, index)!.kind === 'guard' ? key : target?.key };
}

/** Shipping CPU keeps the established pre-turn policy. Its only new branch is a
 * learned-guard-only affordable pool: include free attack, and retain guard only
 * when public-state defensive utility justifies it. Healthy offensive pools and
 * deliberate support/core choices keep the exact v30 seed-modulo selection.
 * seedBeforeTie is the existing seed before this actor's one initiative draw;
 * this function itself consumes no randomness and is called once, never per band.
 */
export function chooseLegacyEnemyOrder(state: State, key: string, seedBeforeTie: number, planned: readonly Order[] = autoOrders(state, 'enemies')): Order {
  const unit = state.enemies.find(unit => unit.key === key);
  const order = planned.find(order => order.key === key) ?? { key, skill: BASIC_ATTACK };
  if (!unit) return order;
  const automatic = battleSkill(unit.monster, order.skill);
  const tacticalSupport = automatic && skillTargetsAllies(automatic);
  const candidates = unit.monster.skills.slice(0, MAX_SPECIAL_SKILLS).map((skill, index) => ({ skill, index }))
    .filter(({ skill }) => canUseSkill(unit, skill, state.enemies) && (skill.kind === 'hit' || skill.kind === 'poison' || skill.kind === 'guard' || (skill.kind === 'heal' && skill.power === 0)));
  if (tacticalSupport || !candidates.length || [DEMON_CORE_ID, UNDEAD_CORE_ID, EXTRAORDINARY_CORE_ID].includes(unit.monster.id) || unit.monster.skills.some(skill => (skill.mpDamage ?? 0) > 0)) return order;
  if (candidates.every(({ skill }) => skill.kind === 'guard')) {
    const remaining = new Set([...living(state.allies), ...living(state.enemies)].map(actor => actor.key));
    const defensive = chooseTacticalAutomaticOrder(state, key, 'enemies', remaining);
    const guardWorthwhile = battleSkill(unit.monster, defensive.skill)?.kind === 'guard';
    const pool = [{ skill: battleSkill(unit.monster, BASIC_ATTACK)!, index: BASIC_ATTACK }, ...(guardWorthwhile ? candidates : [])];
    const chosen = pool[(seedBeforeTie >>> 0) % pool.length];
    const target = living(state.allies).find(target => target.key === order.target) ?? weakest(state.allies);
    return { key, skill: chosen.index, target: chosen.skill.kind === 'guard' ? key : target?.key };
  }
  const chosen = candidates[seedBeforeTie % candidates.length];
  return { key, skill: chosen.index, target: chosen.skill.kind === 'guard' ? key : order.target };
}

/** Opt-in explicit opposing orders for headless tests. Omission preserves the gameplay CPU. */
export type AdvanceOptions = { enemyOrders?: Order[]; /** Headless comparison only; no UI/save setting. */ automaticPolicy?: 'tactical' | 'snapshot-live' | 'narrow-live' };
/** Comparison arm: old scoring, current actor first so no hypothetical ally plan is reserved. */
export function chooseSnapshotAutomaticOrder(state: State, key: string, side: 'allies' | 'enemies' = 'allies'): Order {
  const actor = state[side].find(unit => unit.key === key);
  if (!actor) return { key, skill: BASIC_ATTACK };
  return planOrders({ ...state, [side]: [actor, ...state[side].filter(unit => unit.key !== key)] }, side).find(order => order.key === key) ?? { key, skill: BASIC_ATTACK };
}
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
    if (unit.hp <= 0 && unit.supplyReady) { unit.supplyReady = false; emit({ kind: 'expire', target: unit.key, effect: 'supplyReady', supplyReady: false }); }
    if (unit.hp <= 0 && unit.responseReady) { unit.responseReady = false; emit({ kind: 'expire', target: unit.key, effect: 'responseReady', responseReady: false }); }
  }
  type Action = { unit: Unit; skill: Skill; side: 'allies' | 'enemies'; target?: string; skillIndex: number; tie: number; speed: number; automatic: boolean; record: BattleOrderRecord; queuePriority: number };
  const actions: Action[] = [];
  const enemyMpLoss = new Set<string>();
  const legacyEnemyPlan = options.automaticPolicy === undefined && options.enemyOrders === undefined ? autoOrders(battle, 'enemies') : undefined;
  const bands = [...new Set([0, 1, ...[...battle.allies, ...battle.enemies].flatMap(unit => unit.monster.skills.map(skill => skill.priority))])].sort((a, b) => b - a);
  for (const side of ['allies', 'enemies'] as const) {
    for (const unit of living(battle[side])) {
      const submitted = (side === 'allies' ? orders : options.enemyOrders ?? []).find(candidate => candidate.key === unit.key);
      const legacyEnemy = side === 'enemies' && legacyEnemyPlan !== undefined;
      const order = submitted ?? (legacyEnemy ? chooseLegacyEnemyOrder(battle, unit.key, seed, legacyEnemyPlan) : { key: unit.key, skill: AUTO });
      const automatic = order.skill === AUTO;
      const skill = automatic ? battleSkill(unit.monster, BASIC_ATTACK)! : battleSkill(unit.monster, order.skill);
      const sameSide = skill && skillTargetsAllies(skill) ? battle[side] : side === 'allies' ? battle.enemies : battle.allies;
      const badTarget = !automatic && skill && skill.kind !== 'guard' && order.target !== undefined && !sameSide.some(target => target.key === order.target);
      const rejection = automatic ? undefined : !skill ? 'invalid-skill' : badTarget ? 'invalid-target' : skillUnavailableReason(unit, skill, battle[side]);
      const record: BattleOrderRecord = {
        key: unit.key, skill: order.skill, ...(!automatic && order.target !== undefined ? { target: order.target } : {}), side,
        source: automatic || legacyEnemy ? 'automatic' : 'explicit',
        ...(!automatic && skill ? { skillName: skill.name, skillKind: skill.kind, skillPower: skill.power } : {}),
        accepted: !automatic && rejection === undefined, ...(rejection ? { rejection } : {}),
      };
      recordedOrders.push(record);
      if (!skill || rejection) {
        battle.log.push(`${unit.monster.name}の指示は取り消し（${!skill ? '不正な特技' : badTarget ? '対象が不正' : skillUnavailableLabel(rejection as SkillUnavailableReason)}・MP消費なし）`);
        continue;
      }
      seed = random(seed);
      const action = { unit, skill, side, skillIndex: order.skill, target: automatic ? undefined : order.target, tie: seed, speed: speedFor(unit, battle.turn), automatic, record };
      for (const queuePriority of automatic ? bands : [skill.priority]) actions.push({ ...action, queuePriority });
    }
  }
  actions.sort((a, b) => b.queuePriority - a.queuePriority || b.speed - a.speed || a.tie - b.tie);
  const completed = new Set<string>();
  const remaining = new Set(actions.map(action => action.unit.key));
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
      if (target.supplyReady !== undefined) target.supplyReady = false;
      if (target.responseReady !== undefined) target.responseReady = false;
      emit({ kind: 'defeat', actor, ...(hitIndex !== undefined ? { hitIndex } : {}), target: target.key, hp: 0, guard: false, poison: 0, ...(target.rally !== undefined ? { rally: 0 } : {}), ...(target.ward !== undefined ? { ward: 0 } : {}), ...(target.dragonCharge !== undefined ? { dragonCharge: 0 } : {}), ...(target.repairReady !== undefined ? { repairReady: false } : {}), ...(target.supplyReady !== undefined ? { supplyReady: false } : {}), ...(target.responseReady !== undefined ? { responseReady: false } : {}), effect });
    }
    return amount;
  };
  for (const action of actions) {
    const { unit, side } = action;
    if (completed.has(unit.key)) continue;
    if (action.automatic) {
      if (unit.hp <= 0 || !living(side === 'allies' ? battle.enemies : battle.allies).length) {
        action.record.rejection = unit.hp <= 0 ? 'defeated' : 'no-opponents';
        completed.add(unit.key); remaining.delete(unit.key); continue;
      }
      const choice = options.automaticPolicy === 'snapshot-live' ? chooseSnapshotAutomaticOrder(battle, unit.key, side)
        : options.automaticPolicy === 'tactical' ? chooseTacticalAutomaticOrder(battle, unit.key, side, remaining)
        : side === 'enemies' ? chooseEnemyAutomaticOrder(battle, unit.key, remaining, action.tie) : chooseAutomaticOrder(battle, unit.key, side, remaining);
      const chosen = battleSkill(unit.monster, choice.skill)!;
      if (chosen.priority < action.queuePriority) continue;
      action.skill = chosen; action.skillIndex = choice.skill; action.target = choice.target;
      Object.assign(action.record, choice, { skillName: chosen.name, skillKind: chosen.kind, skillPower: chosen.power, accepted: true, decisionPriority: action.queuePriority, nativePriority: chosen.priority });
    }
    completed.add(unit.key); remaining.delete(unit.key);
    let skill = action.skill;
    phase('before-action', unit.key);
    const opponents = side === 'allies' ? battle.enemies : battle.allies;
    const friends = battle[side];
    let unavailable = skillUnavailableReason(unit, skill, friends);
    const fallback = unit.hp > 0 && unavailable === 'insufficient-mp' && skill.mpCost > 0 && enemyMpLoss.has(unit.key);
    if (fallback) {
      // Keep this already-sorted queue slot, with no new tie draw and no second turn.
      // Support targets are naturally rejected by the ordinary enemy target lookup.
      skill = battleSkill(unit.monster, BASIC_ATTACK)!;
      unavailable = undefined;
    }
    if (unit.hp <= 0 || unavailable || !living(opponents).length) {
      if ((skill.kind === 'restoreMp' || isExtraordinaryResponse(skill)) && unavailable) battle.log.push(`${unit.monster.name}の「${skill.name}」は不発（${skillUnavailableLabel(unavailable)}・${isExtraordinaryResponse(skill) ? 'MP・応答の消費なし' : '補給なし'}）`);
      phase('action-end', unit.key); continue;
    }
    let targets: Unit[];
    if (skill.kind === 'restoreMp') targets = living(friends).filter(friend => friend.monster.family === SLIME_SUPPLY.family);
    else if (isExtraordinaryResponse(skill)) targets = living(friends);
    else if (skill.kind === 'guard') targets = [unit];
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
    if (fallback) {
      emit({ kind: 'fallback', actor: unit.key, target: targets[0].key, skill: action.skill.name, fromSkill: action.skillIndex, toSkill: BASIC_ATTACK, reason: 'enemy-mp-loss', queuePriority: action.skill.priority, requiredMP: action.skill.mpCost, availableMP: unit.mp });
      battle.log.push(`${unit.monster.name}の「${action.skill.name}」は敵のMP削りでMP不足（残り${unit.mp}・必要${action.skill.mpCost}）。元の行動順で通常攻撃へ変更`);
    }
    battle.log.push(`${unit.monster.name}の「${skill.name}」！${skill.mpCost ? `（MP −${skill.mpCost}）` : ''}`);
    const castEventIndex = events.length;
    emit({ kind: 'cast', actor: unit.key, scope: skill.randomHits ? 'random' : skill.all ? 'all' : 'single', targets: targets.map(target => target.key), ...(!skill.all && !skill.randomHits ? { target: targets[0].key } : {}), ...(skill.randomHits ? { hits: barrageHits(skill, friends), hitTargets: [] } : {}), ...(skill.dragonChargeFinisher ? { dragonChargeSpent: unit.dragonCharge ?? 0 } : {}), skill: skill.name, effect: skill.kind });
    // Spending is absolute and emitted at the cast, before any hit or healing animation.
    if (skill.mpCost) {
      unit.mp -= skill.mpCost;
      emit({ kind: 'resource', actor: unit.key, target: unit.key, mp: unit.mp, amount: skill.mpCost, effect: 'mp' });
    }
    // This nondispellable allowance is consumed BEFORE every authoritative gain.
    if (skill.kind === 'restoreMp') {
      unit.supplyReady = false;
      emit({ kind: 'supply', actor: unit.key, target: unit.key, supplyReady: false, effect: 'slime-supply-spend' });
    }
    if (isExtraordinaryResponse(skill)) {
      unit.responseReady = false;
      emit({ kind: 'response', actor: unit.key, target: unit.key, skill: skill.name, responseReady: false, responseChoice: skill.kind === 'responseCleanse' ? 'cleanse' : 'guard', effect: 'extraordinary-response-spend' });
    }
    // Snapshot once for the whole cast. Clearing the charge cannot weaken later area hits.
    const castDamage = baseDamage(unit, skill);
    if (skill.dragonChargeFinisher && unit.dragonCharge !== undefined) {
      unit.dragonCharge = 0;
      emit({ kind: 'charge', actor: unit.key, target: unit.key, dragonCharge: 0, effect: 'dragon-charge-spend' });
    }
    if (skill.kind === 'restoreMp') {
      for (const target of targets) {
        const amount = Math.max(0, Math.min(supplyAmountFor(unit), target.monster.mp - target.mp));
        target.mp += amount;
        emit({ kind: 'resource-gain', actor: unit.key, target: target.key, amount, mp: target.mp, effect: 'slime-supply' });
        battle.log.push(`${target.monster.name} MP +${amount}（残り ${target.mp}）`);
      }
    } else if (isExtraordinaryResponse(skill)) {
      for (const target of targets) {
        if (skill.kind === 'responseCleanse') {
          const wasPoisoned = target.poison > 0;
          target.poison = 0;
          emit({ kind: 'cleanse', actor: unit.key, target: target.key, poison: 0, effect: 'extraordinary-response-cleanse' });
          if (wasPoisoned) battle.log.push(`${target.monster.name}の毒が消えた（HP回復・予防なし）`);
        } else {
          const alreadyGuarded = target.guard;
          target.guard = true;
          emit({ kind: 'guard', actor: unit.key, target: target.key, guard: true, effect: 'extraordinary-response-guard' });
          battle.log.push(`${target.monster.name}はこのターン直接ダメージ半減${alreadyGuarded ? '（重ねがけなし）' : ''}`);
        }
      }
    } else if (skill.kind === 'guard' || skill.kind === 'protect') {
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
        // Capture and spend exactly once on the resolved living target, before
        // damage can clear poison on defeat. This is an offensive impact, never a cleanse.
        const perTick = poisonCashoutPerTickFor(unit, skill);
        const consumed = perTick ? poisonTicksFor(target) : 0;
        const cashoutAdded = perTick * consumed;
        if (perTick) {
          target.poison = 0;
          emit({ kind: 'poison-cashout', actor: unit.key, target: target.key, skill: skill.name, poison: 0, poisonTicksConsumed: consumed, poisonCashoutPerTick: perTick, poisonCashoutAdded: cashoutAdded, effect: 'poison-cashout' });
          battle.log.push(`${target.monster.name}の毒を${consumed}回分消費（残り0回・直接攻撃の基礎に+${cashoutAdded}）`);
        }
        seed = random(seed);
        // A state-only poison still consumes the original per-target roll. It must
        // bypass damage(), whose ordinary minimum of one is intentionally unchanged.
        if (skill.kind !== 'poison' || poisonImpactScaleFor(unit) > 0) {
          const amount = damage(target, (castDamage + cashoutAdded) * (0.9 + (seed % 21) / 100) * directDamageScale(target), unit.key, undefined, skill.randomHits ? hitIndex : undefined);
          battle.log.push(`${target.monster.name}に ${amount} ダメージ${wasGuarded && !skill.breaksGuard ? '（防御で半減）' : hadWard && !skill.breaksGuard ? '（自然障壁で軽減）' : ''}${target.hp === 0 ? '・撃破！' : ''}`);
        }
        if (mpDamageFor(unit, skill) > 0 && target.hp > 0) {
          const loss = mpLossFor(unit, skill, target);
          target.mp -= loss;
          if (loss > 0) enemyMpLoss.add(target.key);
          emit({ kind: 'resource-loss', actor: unit.key, target: target.key, skill: skill.name, amount: loss, mp: target.mp, effect: 'mp-damage', ...(skill.randomHits ? { hitIndex } : {}) });
          battle.log.push(`${target.monster.name} MP −${loss}（残り ${target.mp}・敵のMP削り）`);
        }
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
  // Prepare the next command phase only after all poison, expiry and terminal checks.
  // Manual commands and player auto see the same recovered MP; playback never re-runs this.
  const recovery = turnMpRecoveryAmount(battle.turnMpRecovery);
  if (!battle.winner && recovery > 0) {
    currentPhase = 'next-turn-start';
    emit({ kind: 'phase', nextTurn: battle.turn });
    battle.log.push(`── TURN ${battle.turn} 開始・MP回復 ──`);
    for (const unit of [...battle.allies, ...battle.enemies]) {
      if (unit.hp <= 0) continue;
      const amount = Math.max(0, Math.min(recovery, unit.monster.mp - unit.mp));
      if (!amount) continue;
      unit.mp += amount;
      emit({ kind: 'resource-gain', target: unit.key, amount, mp: unit.mp, effect: 'turn-mp-recovery', nextTurn: battle.turn });
      battle.log.push(`${unit.monster.name} MP +${amount}（残り ${unit.mp}・ターン開始回復）`);
    }
  }
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
