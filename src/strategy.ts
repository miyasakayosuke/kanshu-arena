import { cost, MAX_TURNS, monsters, type State, type Unit } from './engine';

export const initialTeam = [0, 2, 3, 4, 6];

export type RuleId = 'standard' | 'light';
export const rules = {
  standard: {
    id: 'standard', name: '標準戦', budget: 17,
    description: '5体・合計コスト17以内。得意な役割を組み合わせて挑もう。',
  },
  light: {
    id: 'light', name: '軽量戦', budget: 15,
    description: '5体・合計コスト15以内。限られたコストで連携を磨こう。',
  },
} as const;

const opponents: Record<RuleId, number[][]> = {
  standard: [[1, 5, 8, 10, 6], [11, 9, 4, 7, 10], [0, 3, 1, 6, 2], [12, 0, 2, 6, 10]],
  light: [[1, 5, 8, 10, 2], [11, 9, 4, 3, 10], [0, 7, 2, 6, 10], [12, 0, 2, 6, 10]],
};

/** Return fresh teams so changing a preview cannot change a later opponent. */
export function opponentTeams(rule: RuleId): number[][] {
  return opponents[rule].map(team => [...team]);
}

export function isValidTeam(value: unknown, budget: number = rules.standard.budget): value is number[] {
  if (!Array.isArray(value) || value.length !== 5 || !Number.isFinite(budget) || budget < 0) return false;
  const ids = new Set<number>();
  for (const id of value) {
    if (!Number.isInteger(id) || !monsters.some(monster => monster.id === id) || ids.has(id)) return false;
    ids.add(id);
  }
  return cost(value) <= budget;
}

export type TeamSlot = { team: number[]; rule: RuleId };
const TEAM_SLOTS_KEY = 'kanshu-team-slots-v1';

function readSlot(value: unknown): TeamSlot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { team?: unknown; rule?: unknown };
  if (candidate.rule !== 'standard' && candidate.rule !== 'light') return null;
  if (!isValidTeam(candidate.team, rules[candidate.rule].budget)) return null;
  return { team: [...candidate.team], rule: candidate.rule };
}

/** Bad slots do not hide good ones; missing slots are always empty. */
export function loadTeamSlots(storage: Pick<Storage, 'getItem'>): (TeamSlot | null)[] {
  try {
    const saved: unknown = JSON.parse(storage.getItem(TEAM_SLOTS_KEY) ?? 'null');
    if (Array.isArray(saved)) return Array.from({ length: 3 }, (_, index) => readSlot(saved[index]));
  } catch { /* Saving is optional, including in browsers that block local storage. */ }
  return [null, null, null];
}

/** Reject incomplete or corrupt input rather than overwriting a usable save. */
export function saveTeamSlots(storage: Pick<Storage, 'setItem'>, slots: unknown): boolean {
  try {
    if (!Array.isArray(slots) || slots.length !== 3) return false;
    const valid: (TeamSlot | null)[] = [];
    for (const value of slots) {
      if (value === null) valid.push(null);
      else {
        const slot = readSlot(value);
        if (!slot) return false;
        valid.push(slot);
      }
    }
    storage.setItem(TEAM_SLOTS_KEY, JSON.stringify(valid));
    return true;
  } catch { return false; }
}

// Original arena fiction inspired by the roster's mythic motifs, not historical claims.
const monsterStories: Record<number, string> = {
  0: '夕暮れの回廊を駆ける狐の幻獣。尾に灯した狐火で相手の足並みを乱す。',
  1: '岩だらけの峠をすみかにする巨人。動きは遅いが、仲間を守る決意は山より重い。',
  2: '鈴の音とともに現れる猫の守り手。しなやかな爪と癒やしの雫で仲間を支える。',
  3: '古い森の息吹を宿す樹の精。やさしい雨も鋭い枝も、森を守るために使う。',
  4: '霧の向こうで歌う幽かな幻獣。その声は敵を震わせ、影を戦場に縫い留める。',
  5: '色鮮やかな羽をまとい、雲海を渡る蛇の幻獣。ひとたび翼を広げれば、闘技場に嵐が吹く。',
  6: '高空を巡る誇り高い鳥の戦士。仲間の合図を受け、風より早く急降下する。',
  7: '潮の満ち引きとともに旅する海の幻獣。静かな波音で傷と淀みを洗い流す。',
  8: '消えない火種を胸に宿す炎の巨人。熱した拳は、守りに籠もる相手にも迫る。',
  9: '山道を渡る風にまぎれた烏の剣士。速さと毒を織り交ぜ、相手の間合いを崩す。',
  10: '深い水辺を見守る蛇の守り手。鱗の輪で仲間を囲み、毒牙で敵を遠ざける。',
  12: '封じられた谷で、鎖を断って帰ってきた魔狼。仲間を縛る守りを連なる牙で裂き、群れが駆ける道を開く。',
  11: '闘技場と冥府の境に立つ静かな番人。振り下ろす刃に迷いはなく、堅い守りも断ち切る。',
};

export function monsterLore(id: number): string {
  return monsterStories[id] ?? 'まだ物語の記されていない幻獣。';
}

export type MonsterRole = { name: string; strength: string; tradeoff: string };

// These are descriptions of implemented jobs and costs, not extra passive effects.
const monsterRoles: Record<number, MonsterRole> = {
  0: {
    name: '狐火の速攻役',
    strength: '先制技と全体攻撃を使い分け、ガルーダより重い一撃を放つ。',
    tradeoff: 'COST4でHPは低め。回復や味方を守る特技は持たない。',
  },
  1: {
    name: '岩山の守り手',
    strength: '最多のHPと最速の守護で仲間を支え、重い一撃も狙える。',
    tradeoff: '守護を選ぶターンは攻撃できず、通常順の行動も遅い。',
  },
  2: {
    name: '鈴を鳴らす救護役',
    strength: 'COST3で回復と毒解除を備え、HPリーダーとしても支える。',
    tradeoff: 'セルキーよりHP・素早さが低く、攻撃力も控えめ。',
  },
  3: {
    name: '持久戦の森番',
    strength: '回復と全体毒を使い分け、味方を支えながら敵を削る。',
    tradeoff: '毒解除や味方の守護はできず、先制技も持たない。',
  },
  4: {
    name: '月影の攻撃支援役',
    strength: '攻撃リーダーで火力を支え、先制技と全体毒で攻める。',
    tradeoff: 'HPは低めで烏天狗より遅い。回復や毒解除は持たない。',
  },
  5: {
    name: '嵐の重攻役',
    strength: '高めのHPと攻撃力で、単体にも全体にも圧力をかける。',
    tradeoff: 'COST4で動きは遅め。回復・毒解除・味方の守護は持たない。',
  },
  6: {
    name: '空の追撃役',
    strength: 'COST2・最高の素早さで先手を取り、削れた敵の撃破を狙う。',
    tradeoff: 'HPは最も低く、妖狐より一撃は軽い。長期戦には支えが必要。',
  },
  7: {
    name: '潮騒の救護役',
    strength: 'バステトより高いHPと素早さで、回復と毒解除を届ける。',
    tradeoff: 'COST4。回復量と毒解除の効果はバステトと同じ。',
  },
  8: {
    name: '守り崩しの火拳',
    strength: 'COST3で防御解除・全体攻撃・アンカーを使い分ける。',
    tradeoff: '先制技と回復は持たず、行動前に削られやすい。',
  },
  9: {
    name: '山風のかく乱役',
    strength: '素早さリーダーで先手を支え、先制技と全体毒を使う。',
    tradeoff: 'リーダー効果で攻撃力は上がらず、回復や毒解除も持たない。',
  },
  10: {
    name: '待ち構える蛇盾',
    strength: 'COST2で仲間を守り、全体毒で粘り強く体力を削る。',
    tradeoff: '守護と毒は同時に使えない。通常順の行動は遅く、回復もできない。',
  },
  12: {
    name: '群れの突破役',
    strength: '獣系の攻撃と速さを支え、ランダム5連撃で命中した敵の守りと群気を裂く。',
    tradeoff: 'COST4でHPは低め。先制技はなく、連撃の相手は指定できない。',
  },
  11: {
    name: '冥府の突破役',
    strength: '最高の攻撃力で、先制・防御解除・アンカーを選べる。',
    tradeoff: 'COST4で回復は持たない。防御解除は先制技ではない。',
  },
};

export function monsterRole(id: number): MonsterRole {
  return { ...(monsterRoles[id] ?? {
    name: '未知の役割',
    strength: 'まだ得意な戦い方は記されていない。',
    tradeoff: '能力と特技を確かめて編成しよう。',
  }) };
}

const skillStories: Record<string, string> = {
  破縛の連牙: '低く構え、五度の跳躍で敵を追う。牙が触れた守りから鎖のように裂けていく。',
  月下の一咬: '群れの隙間を駆け抜け、選んだ相手へ一度だけ牙を深く届かせる。',
  通常攻撃: '力を温存し、鍛えた一撃をまっすぐに放つ。',
  ぼうぎょ: '姿勢を低く構え、迫る一撃の衝撃を逃がす。',
  狐火: '尾先の青い灯を放ち、狙った相手を包み込む。',
  疾風斬り: '風の切れ目を走り、相手より先に刃を届かせる。',
  炎嵐: 'いくつもの火種を舞わせ、敵陣を炎の渦でなでる。',
  巨人の鉄槌: '大地を踏みしめ、岩のように重い拳を落とす。',
  終焉の一撃: '深く力を溜め、遅れて届く強烈な一撃に懸ける。',
  鉄壁の構え: '身を固く守り、受ける衝撃を和らげる。',
  爪撃: '鋭い爪をひらめかせ、相手の隙を切り裂く。',
  生命の雫: '澄んだ雫を分け与え、仲間ひとりの傷を癒やす。',
  樹海の槍: '若枝を鋭い槍に変え、森の力を突き立てる。',
  毒霧: '淀んだ霧で敵陣を覆い、じわじわと体力を奪う。',
  悲鳴: '霧を震わせる声を上げ、相手を打ちすえる。',
  影縫い: '足元の影をすばやく突き、先手の一撃を刻む。',
  竜の牙: '羽の奥に隠した牙で、狙った相手にかみつく。',
  嵐の息吹: '胸に溜めた風を解き放ち、敵陣へ嵐を送る。',
  急降下: '高空から翼をたたみ、一筋の矢のように襲う。',
  先制の翼: '翼のひと振りで間合いを詰め、先に一撃を加える。',
  旋風: '大きく翼を回し、敵陣を巻き込む風を起こす。',
  水刃: '波の縁を研ぎ澄まし、一枚の刃として放つ。',
  灼熱拳: '炎を拳に集め、熱と重みを相手にたたき込む。',
  火炎旋風: '燃え盛る腕を振り、敵陣へ火の渦を広げる。',
  風切り: '山風に刃を乗せ、相手を一息に切り払う。',
  蛇牙: '低い姿勢から伸び上がり、鋭い牙を突き立てる。',
  冥府の刃: '静かに刃を振り抜き、冥府の冷気を刻む。',
  影斬り: '影に踏み込み、相手の構えが整う前に斬り込む。',
  守護の誓い: '仲間の前に守りの印を描き、受ける衝撃を和らげる。',
  蛇鱗の庇護: '仲間を鱗の盾で包み、迫る一撃の勢いを和らげる。',
  清めの鈴: '澄んだ鈴の音を響かせ、仲間の毒を払い傷を癒やす。',
  潮騒の浄化: '清らかな潮を招き、仲間の毒と傷を洗い流す。',
  破城の拳: '守りの隙を砕く拳で、固めた構えを貫く。',
  冥府の断罪: '重く鋭い刃を落とし、相手の守りを断ち切る。',
};

export function skillLore(name: string): string {
  return skillStories[name] ?? '磨き上げた力を、闘技場の一手に込める。';
}

export type ResultSummary = {
  remainingAllies: number;
  remainingEnemies: number;
  allyHpPercent: number;
  enemyHpPercent: number;
  turns: number;
};

/** Every team member has equal weight, matching the engine's turn-limit scoring. */
export function resultSummary(state: State): ResultSummary {
  const hpPercent = (units: Unit[]) => {
    if (!units.length) return 0;
    const total = units.reduce((sum, unit) => sum + Math.min(1, Math.max(0, unit.hp / unit.monster.hp)), 0);
    return Math.round(total / units.length * 1000) / 10;
  };
  return {
    remainingAllies: state.allies.filter(unit => unit.hp > 0).length,
    remainingEnemies: state.enemies.filter(unit => unit.hp > 0).length,
    allyHpPercent: hpPercent(state.allies),
    enemyHpPercent: hpPercent(state.enemies),
    turns: Math.max(0, Math.min(MAX_TURNS, state.turn - 1)),
  };
}
