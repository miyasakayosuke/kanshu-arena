import { monsterStory } from './monsterLore';
import { poisonTicksFor, poisonCashoutPerTickFor, cost, MAX_TURNS, monsters, type Skill, type State, type Unit } from './engine';

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
  standard: [[1, 5, 8, 10, 6], [11, 9, 4, 7, 10], [0, 3, 1, 6, 2], [12, 0, 2, 6, 10], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [15, 5, 16, 17, 18], [19, 20, 21, 22, 23], [24, 25, 26, 27, 28], [29, 1, 8, 30, 31], [32, 4, 33, 34, 35], [36, 12, 2, 30, 26]],
  light: [[1, 5, 8, 10, 2], [11, 9, 4, 3, 10], [0, 7, 2, 6, 10], [12, 0, 2, 6, 10], [14, 3, 6, 9, 10]],
};

/** Read-only examples: members are ordered leader first; no saved team is overwritten. */
export const recommendedTeams = [
  { name: '獣系の速攻', team: [12, 0, 2, 11, 13], note: '群気と獣系5体の連弾。回復役を守りながら先手を取る。' },
  { name: '自然系の持久戦', team: [14, 3, 6, 9, 10], note: '開幕の自然障壁から回復と毒へ。毒の重ねがけはできないので攻撃や守護も選ぶ。COST15で軽量戦にも出場可能。' },
  { name: '竜系の蓄積', team: [15, 5, 16, 17, 18], note: '全員が竜系。攻撃で竜気を溜め、アンカーの息へつなぐ。標準戦向け。' },
  { name: '竜3体の混成', team: [15, 16, 18, 2, 6], note: '竜気の条件を満たす軽量戦の例。竜以外の攻撃では溜まらない。' },
  { name: '物質系の反攻', team: [19, 20, 21, 22, 23], note: '初手を受け、残った仲間を一度だけ修復。遅い重撃へつなぐ標準戦の例。' },
  { name: '物質3体の混成', team: [19, 20, 23, 2, 10], note: '修復と牡牛の重撃を、回復・毒・守護で支える標準戦の例。バステトとナーガは修復の対象外。' },
  { name: '粘体系の資源戦', team: [24, 25, 26, 27, 28], note: '攻撃と一度のMP補給を切り替える標準戦の例。仲間を守りながら、補給に使う手番を選ぶ。' },
  { name: '粘体3体の混成', team: [24, 25, 28, 2, 10], note: '回復と守護で補給の手番を支える標準戦の例。バステトとナーガのMPは補給できない。' },
  { name: '悪魔系のMP圧力', team: [29, 1, 8, 30, 31], note: '相手の残りMPを見て一撃を選ぶ標準戦の例。守護と毒解除で支えるが、回復の量は控えめ。' },
  { name: '悪魔3体の混成', team: [29, 8, 30, 2, 10], note: '資源を削る中核と解除役に、回復・守護を添えたCOST15の例。MP削りが増えるのはマモンだけ。' },
  { name: '不死系の毒交換', team: [32, 4, 33, 34, 35], note: '純5体・COST17の標準戦用。毒を残す継続圧力と、残回数を消費する一撃を選ぶ。守護・解除・有限の手当てで支える。' },
  { name: '不死3体の混成', team: [2, 32, 4, 35, 10], note: '混成・COST15。中核が先頭以外でも条件成立。バステトとナーガは人数条件の対象外で、仲間の技に毒交換は追加されない。' },
  { name: '超常の攻防混成', team: [36, 12, 4, 20, 26], note: '混成・COST17。連撃・毒・清め・守護を組み合わせる5種類の例。応答は4種類でも同じ1回で、5種類による追加強化はない。' },
  { name: '超常の手当て混成', team: [36, 12, 2, 10, 35], note: '混成・COST16。超常・獣・自然・不死の4種類。毒解除の後も毒は再付与され、攻めは残る仲間に託す。' },
] as const;

/** Current target preview, never a reservation or a final damage promise. */
export function poisonCashoutHint(unit: Unit, skill: Skill, target?: Unit, compact = false): string {
  const perTick = poisonCashoutPerTickFor(unit, skill);
  if (!perTick) return '';
  const strength = unit.poisonCashoutBonus ? '不死の連携でさらに強まる' : '残り毒が多いほど強まる';
  if (!target) return `命中時の毒残0〜3回を全消費し、毒が残っていれば一撃を強める（毒0は追加なし）・${strength}`;
  const ticks = target.hp > 0 ? poisonTicksFor(target) : 0;
  const benefit = ticks ? '一撃を強める' : '追加なし';
  if (compact) return `毒${ticks}回 → ${benefit}`;
  return `現在の毒:残${ticks}回 → 消費で${benefit}。${ticks ? `${strength}。残す場合はターン末の毒が続く` : '現在は消費できる毒がない'}。実際の命中時に再判定`;

}

/** Describe the damage model without exposing the hidden skill power. */
export function fixedDamageHint(skill: Skill, unit?: Unit): string {
  if (!skill.fixedDamage) return '';
  if (!skill.dragonChargeFinisher) return '攻撃力に依存しない一撃';
  return `竜気を溜めるほど強まる息${unit ? `（${unit.dragonCharge === undefined ? '竜気条件未成立' : `現在の竜気${unit.dragonCharge}`}）` : ''}`;
}

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

/** Backward-compatible flavour accessor; factual tradition is a separate field. */
export function monsterLore(id: number): string {
  return monsterStory(id).flavour;
}

export type MonsterRole = { name: string; strength: string; tradeoff: string };

// These are descriptions of implemented jobs and costs, not extra passive effects.
const monsterRoles: Record<number, MonsterRole> = {
  36: { name: '一度の応答を選ぶ中核', strength: '開戦時の4系統混成で、全体毒解除か今ターン守護を一度だけ選べる。', tradeoff: 'COST5・MP24と一手。HP回復はなく、使うと両方とも残0回。' },
  32: { name: '残り毒の決着役', strength: '相手の残り毒を単体打点へ交換。自身を含む不死系3体で毒を消費した一撃がさらに強まる。', tradeoff: 'MP18と一手で今後の毒を失う。補給なしで最大3回。毒0では追加0。' },
  33: { name: '手綱の解除役', strength: 'バンシーより速く守りを解除。不要なら高打点の轍の一打を選べる。', tradeoff: 'COST4。解除もMP14と一手が必要。毒付与・毒交換・回復・守護はない。' },
  34: { name: '袖囲いの守り手', strength: '先に味方ひとりを守り、遅い主力へ手番をつなぐ。低消費攻撃も選べる。', tradeoff: '守護は直接ダメージ半減のみ。毒を防げず、回復もできない。攻撃時は遅い。' },
  35: { name: '逆さ糸の手当て役', strength: '生存者の手当てと毒解除＋小回復を使い分けるCOST2の支援役。', tradeoff: 'HP125で脆い。MP50では手当て2回と清め1回まで。支援時は攻撃できない。' },

  29: { name: '残りMPへの圧力役', strength: 'HP命中後に相手MPを削る。自身を含む悪魔系3体で削る量が増える。', tradeoff: 'MP16と一手が必要。撃破時はMPを削らず、MP0の相手も通常攻撃はできる。' },
  30: { name: '留め具の解除役', strength: 'COST2の速い悪魔系。命中前の守り解除と低消費攻撃を選べる。', tradeoff: 'HPと攻撃力は低め。回復・守護・毒解除・MP削りは持たない。' },
  31: { name: '薄影の攻撃救護役', strength: '単体への踏み込みと、味方の毒解除・小回復を切り替える。', tradeoff: 'COST4。全体攻撃・先制・守護はなく、手当ての手番は攻撃できない。' },

  24: { name: '一度の補給役', strength: '粘体系3体以上で、一度だけ生存する粘体の仲間へMPを分ける。固定基礎の単体攻撃も選べる。', tradeoff: 'COST4。補給の手番は攻撃できず、HPも戻せない。全員満タンなら補給は使えない。' },
  25: { name: 'しぶきの先制役', strength: 'COST2の速い粘体系。低消費攻撃と先制の小さな一撃を切り替える。', tradeoff: 'HPが低く、一撃は軽い。回復・守護・解除は持たない。' },
  26: { name: 'ひだの守り手', strength: '最速の守護で仲間を包み、命中前の守り解除で攻め直す。', tradeoff: '動きは遅めで攻撃力も低い。守護では毒を防げず、回復はできない。' },
  27: { name: '泡枝の手当て役', strength: 'HP回復と毒解除を切り替えて、傷ついた仲間を支える粘体系。', tradeoff: '回復の手番は攻撃できない。手当てを続ければMPが尽き、守護は持たない。' },
  28: { name: '練り圧の攻め手', strength: '指定した相手への一撃と、全体の削りを使い分ける粘体系。', tradeoff: 'COST5で回復・守護・先制は持たない。攻撃の継続には残りMPの管理が必要。' },
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
    tradeoff: 'HPは低く、妖狐より一撃は軽い。長期戦には支えが必要。',
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
    strength: '獣系の攻撃と速さを支え、5連撃で命中した敵の守り・群気・自然障壁・竜気・修復待ちを裂く。',
    tradeoff: 'COST4でHPは低め。先制技はなく、連撃の相手は指定できない。',
  },
  11: {
    name: '冥府の突破役',
    strength: '高い攻撃力で、先制・防御解除・アンカーを選べる。',
    tradeoff: 'COST4で回復は持たない。防御解除は先制技ではない。',
  },
  13: {
    name: '枝渡りの速攻役',
    strength: 'COST2で先制とランダム連弾を使い分け、獣系5体なら連弾が1発増える。',
    tradeoff: 'HPが低く、回復も守護も持たない。連弾の相手は指定できない。',
  },
  14: {
    name: '森羅の守り手',
    strength: '自然系に開幕の自然障壁を張り、回復・守護・全体アンカーを使い分ける。',
    tradeoff: 'COST5で動きは遅い。自然障壁は解除可能で、毒の継続ダメージを防げない。',
  },
  15: {
    name: '竜気を束ねる中核',
    strength: '開戦時に竜系3体以上なら、仲間の攻撃で竜気を蓄えて全体の息へ使う。',
    tradeoff: 'COST5で動きは遅い。竜気は解除や本人の撃破で失い、息はMP消費が重い。',
  },
  16: {
    name: '岩場の竜盾',
    strength: 'COST2の竜系。最速の守護で中核を守り、攻撃なら竜気の蓄積を助ける。',
    tradeoff: '守護の手番では竜気は増えない。回復・毒解除・先制攻撃は持たない。',
  },
  17: {
    name: '双頭の崩し役',
    strength: 'ランダム2連撃と、命中前の守り・自然障壁・竜気解除を使い分ける。',
    tradeoff: '連撃は相手を選べず、竜気の増加は2発でも1。回復や守護はできない。',
  },
  18: {
    name: '雲渡りの支援竜',
    strength: '攻撃力に依存しない息と、回復・毒解除を使い分ける竜系の支え。',
    tradeoff: '回復や毒解除では竜気は増えない。息も守りや自然障壁で軽減される。',
  },
  19: { name: '修復の炉心', strength: '物質系3体以上で、生き残った物質の仲間を初手の終わりに一度だけ修復する。', tradeoff: '修復より先に倒されるか、待機を解除されると発動しない。戦闘不能は治せない。' },
  20: { name: '雨傘の清め役', strength: 'COST2で速い物質系。低消費攻撃と毒解除を切り替える。', tradeoff: 'HPと攻撃力は控えめ。複数の毒を一手で清めることはできない。' },
  21: { name: '道を塞ぐ石壁', strength: '高いHPと最速の守護で仲間を守り、遅い石の一撃を返す。', tradeoff: '素早さは低く、回復や清めは持たない。毒の継続ダメージは守護では防げない。' },
  22: { name: '巡回する給湯役', strength: '回復と命中前の守り・自然障壁・竜気・修復待機解除を使い分ける。', tradeoff: '攻撃力は低い。回復を続けるほど攻撃や解除へ回せるMPが減る。' },
  23: { name: '青銅の重突役', strength: '高い攻撃力を通常順の突きと、重いアンカーの突進に託す。', tradeoff: 'COST4で回復・守護・先制を持たず、大技を二度使うとMPがほぼ尽きる。' },
};

export function monsterRole(id: number): MonsterRole {
  return { ...(monsterRoles[id] ?? {
    name: '未知の役割',
    strength: 'まだ得意な戦い方は記されていない。',
    tradeoff: '能力と特技を確かめて編成しよう。',
  }) };
}

const skillStories: Record<string, string> = {
  境目の清め: '門の空洞を通る細い流れが、生きた仲間の今ある淀みだけを連れ去る。',
  合流の扉: '開いた掌から短い格子を広げ、合流した道をひとめぐりだけ囲う。',
  敷居の一打: '一歩だけ身を傾け、門口の低い縁を狙った相手へ押し出す。石の厚みが、ずしりと一打に乗る。',
  門番の構え: '石の両足をそろえ、次に来る衝撃をその場で受け止める。',
  塚底の取り立て: '相手に残る霧の欠片を畳み、一度の拳へ変える。霧が多く残るほど拳は重く、不死の仲間が集えばさらに深く響く。使った霧の余韻は残らない。',
  土蓋の拳: '片肩の石を支えに、土の重みを乗せた拳を低く押し出す。霧を借りずとも、ずしりと届く一打。',
  手綱ほどき: '細い手綱を横へ引き、相手の構えをつなぐ結び目をほどく。轍を刻む一打より軽く、ほどいた隙を打つ。',
  轍の一打: '道に深く刻む轍のように、長い一筆を狙った相手へ走らせる。手綱を引く腕の重みが、一点に集まる。',
  袖の囲い: '長短の袖を括弧の形に開き、仲間ひとりの前へ布の縁を合わせる。',
  踏みしめ: '小さな跳躍から両足を下ろし、その重みを短い押しへ伝える。派手には跳ねず、踏み固めた土のような手応えを残す。',
  影の縫い直し: '逆向きの糸を渡し、生きている仲間の影の裂け目を縫い寄せる。結び目を払う時より多くの糸を重ね、傷をいたわる。',
  結び払い: '影に絡んだ結び目を一つずつ払い、残った細い糸でほころびをわずかに閉じる。',
  逆さの小突き: '枝に掛けた足を支えに、逆さの腕から小さな一押しを届ける。',

  空勘の爪: '指先で空をなぞり、体力と残された力に欠け目を刻む。札の打撃ほど重くはないが、次の技の蓄えにも爪痕を残す。奪った力を自分へ移すことはない。',
  封銭の打撃: 'ひらいた手を閉じ、重なった札の重みを大きな衝撃にして押し出す。細い爪痕より深く、一点を打つ。',
  帳を閉じる: '手元の札をしまい、頭巾を深く下げて次の衝撃に備える。',
  留め具ほどき: '工具の先を差し込み、守りを支えていた留め具をひとつ外す。大振りせず、小さな工具の一打を添える。',
  木片はじき: '作業台に残った小さな木片を指で弾き、相手の隙へ飛ばす。軽い一粒を鋭く当てる。',
  片脚の踏み込み: '金属の脚を軸に衣をひるがえし、一歩の重みを狙った場所へ叩き込む。影の針より深く響く、重い踏み込み。',
  薄影の払い: '衣の端で淀みを払い、仲間の傷へ薄い影を重ねる。毒を去らせた後に、ささやかな休息を添える。',
  影の投げ針: 'ほどけた影を細くまとめ、一筋の針として投げる。金属の脚ほどの重みはなくとも、細い先端が相手を鋭く打つ。',

  蓄え分け: '体の底に残した雫をほどき、同じ流れを持つ仲間へ一度だけ渡す。満ちるほどではない小さな蓄えが、次の一手を支える。',
  押し流し: 'アーチを細くたわませ、蓄えた水を一点へ絞る。細い見た目の奥から、身を打つ激しい奔流が押し寄せる。',
  水面のかばい: '開いた体の縁を伸ばし、仲間の前に薄い水の面をつくる。',
  糸しぶき: '細長い体の端をしならせ、一粒の雫をまっすぐ弾く。小粒ながら、急いで散らすしぶきより力を込める。',
  はじけ糸: '分かれた端を短く跳ねさせ、先手の軽いしぶきを散らす。太い水筋を作る前に、細い雫だけを届ける。',
  膜のかばい: '折り畳んだひだを開き、仲間の前へ柔らかな幕を置く。',
  ひだ押し: '膜の折り目を重ね、一枚の柔らかな面で押し出す。薄い縁でほどく時より厚みをつけ、相手を打つ。',
  折りほどき: '相手の守りへ薄い縁を差し込み、結びをほどいてから打つ。膜を重ねる押しより軽く、解けた場所を狙う。',
  泡の手当て: '枝先にためた温かな泡を、仲間の傷へたっぷり重ねる。淀みをさらう時より厚い泡が、傷口をいたわる。',
  泡さらい: '澄んだ泡で淀みを包んで外へ運ぶ。傷には薄い泡を残し、控えめな手当てを添える。',
  泡つぶて: '小さな枝を振って泡を切り離し、一点へ飛ばす。軽いつぶてが弾け、相手を小さく打つ。',
  ねり打ち: '六つのこぶをひとつへ寄せ、練り固めた重みを打ち込む。散らさず束ねた塊が、深く響く一撃になる。',
  散る重泡: '低い体を押し縮め、重い泡を扇状に散らして敵陣へ送る。一点に束ねた拳より一体ずつへの衝撃は薄まるが、広く届く泡にも重みが残る。',
  鋳輪の備え: '胴を巡る銅輪を狭め、内側の炉心を衝撃から守る。',
  石組みの構え: 'ずれた石の段を噛み合わせ、迫る力を面で受け止める。',
  折壁の守り: '壁の一面を折り出し、仲間へ向く道をふさぐ。',
  炉心の槌: '胸の環を締め、銅の拳に重みを集めて振り下ろす。輪に広げず一点へ落とす、重い槌。',
  環銅の衝撃: '足元へ打ち込んだ振動を、遅れて広がる銅色の輪へ変える。一体ずつを打つ揺れは槌より浅く、敵陣全体へ伝わる。',
  炉心の修復: '炉に残した一度きりの熱を渡し、生きている仲間の継ぎ目をつなぐ。',
  雨縫い: '細い雨筋を縫うように傘の先を伸ばし、一点を鋭く打つ。大きく振り回さず、細い先へ力を集める。',
  傘下の清め: '傘の内へ仲間を招き、淀んだ雨を外へ払う。雨の切れ間に、傷へのささやかな手当てを添える。',
  石段押し: '段違いの石をひとつずつ押し出し、重い壁面を相手へ寄せる。遅れて届く石の厚みが、ずしりと響く。',
  湯の巡り: '器の縁から温かな湯を惜しまず注ぎ、仲間ひとりの傷を包む。小さな一滴で済ませず、湯の温もりをしっかり渡す。',
  封留め崩し: '車輪の縁を構えの隙へ差し込み、結び目を外してから押す。重い突進にはせず、短い一押しで隙を打つ。',
  三輪の一押し: '三つの車輪を揃えて回し、器ごと短く押し込む。大きく助走を取らず、軽い一打を届ける。',
  銅角の突き: '頭を低く据え、青銅の角をまっすぐに届かせる。重い角の一突きは、長い助走を待たずとも深く響く。',
  鋳火の突貫: '蹄を深く踏み込み、鋳肌の重みをすべて乗せて遅れて突き抜ける。短い角突きを上回る、渾身の突進。',
  渇天の息: '幾重にも巻いた体をほどき、乾いた息を敵陣へ押し流す。竜気のない息はかすかでも、仲間と蓄えた竜気が増すほど激しい奔流となり、すべてを吐き切る。',
  雨裂きの牙: '水の幕を裂くように蛇身を伸ばし、狙った一点へ牙を打ち込む。細く絞った突きが、鋭い噛み跡を残す。',
  蜷局の備え: '頭を幾重の輪で囲み、外側の鱗で衝撃を受け止める。',
  石割りの牙: '岩の割れ目を探るように、狙った相手の隙へ太い牙を押し込む。岩を丸ごと砕く大振りではなく、隙間を穿つ一噛み。',
  鱗のかばい: '長い胴をひねって仲間の前へ鱗を立て、迫る力を受け流す。',
  双頭の連突: '両端の頭が交互に伸び、それぞれ見つけた隙へ突きかかる。一噛みは浅くても、二つの牙が重なれば傷は深まる。',
  封鱗裂き: '尾先の頭が構えを崩し、もう一方の牙が残された隙を裂く。連突の一噛みより深く、一度で牙を届かせる。',
  翠雲の息: '翼の間に抱えた青緑の雲を絞り、細い息をまっすぐ送る。腕力ではなく雲に宿る力で、狙った一点をしっかり打つ。',
  雲の湧き水: '翼から集めた雫を小さな水たまりに変え、仲間の傷へ注ぐ。雲を払う時の雫より多く、静かに傷をいたわる。',
  雲払い: '柔らかな翼で淀んだ空気を追い払い、残った清らかな雫で傷を少しだけいたわる。',
  破縛の連牙: '低く構え、五度の跳躍で敵を追う。一噛みは浅くても、重なった牙は深い傷になる。牙が触れた守りから鎖のように裂けていく。',
  月下の一咬: '群れの隙間を駆け抜け、選んだ相手へ一度だけ牙を深く届かせる。連牙の一噛みより、重く沈む一咬。',
  木の実の連弾: '軽い木の実を次々に放ち、当たるたび小さな衝撃を重ねる。群れの足並みがそろえば、最後の一粒も戦場へ躍る。',
  枝渡りの一突き: 'しなる枝を足場に間合いを飛び越え、小さな一撃を先に届ける。',
  海山の轟き: '甲羅の奥で海と山が共鳴する。長い溜めのあと、浅い波紋のような響きが敵陣全体を広く揺らす。',
  悠久の雫: '甲羅にたたえた澄んだ水を豊かに分け、傷ついた仲間を深くいたわる。長く蓄えた水が、ひとりの傷へ惜しまず注がれる。',
  甲羅の結界: '甲羅に刻まれた紋を仲間の前へ映し、迫る一撃の衝撃を和らげる。',
  通常攻撃: '力を温存し、鍛えた一撃をまっすぐに放つ。',
  ぼうぎょ: '姿勢を低く構え、迫る一撃の衝撃を逃がす。',
  狐火: '尾先の青い灯を放ち、狙った相手をしっかり包み込む。広く散らす炎より濃い火が、一点に燃える。',
  疾風斬り: '風の切れ目を走り、軽く鋭い刃を先に届ける。大きく振りかぶらず、速さに力を託す。',
  炎嵐: 'いくつもの火種を舞わせ、敵陣を炎の渦でなでる。ひとりを包む狐火より薄い熱が、広く行き渡る。',
  巨人の鉄槌: '大地を踏みしめ、岩のように重い拳を落とす。',
  終焉の一撃: '深く力を溜め、遅れて届く強烈な一撃に懸ける。',
  鉄壁の構え: '身を固く守り、受ける衝撃を和らげる。',
  爪撃: '鋭い爪をひらめかせ、相手の隙を切り裂く。大きな一撃より、細い爪先の軽い切れ味を頼る。',
  生命の雫: '澄んだ雫を惜しまず分け与え、仲間ひとりの傷をしっかり癒やす。毒を払う清めよりも、傷への手当てに力を注ぐ。',
  樹海の槍: '若枝を鋭い槍に変え、森の力を一点へ突き立てる。しなる枝から、芯のある一撃が伸びる。',
  毒霧: '淀んだ霧で敵陣を覆い、じわじわと体力を奪う。',
  悲鳴: '霧を震わせる声を上げ、相手を打ちすえる。影を素早く突く時よりも深く、声の震えを届かせる。',
  影縫い: '足元の影をすばやく突き、先手の軽い一撃を刻む。大きな傷より、先に届く鋭さを選ぶ。',
  竜の牙: '羽の奥に隠した牙で、狙った相手に深くかみつく。散らす嵐とは違い、一点へ重みを集める。',
  嵐の息吹: '胸に溜めた風を解き放ち、敵陣へ嵐を送る。牙ほど深くは食い込まず、薄く広がる風が全体を打つ。',
  急降下: '高空から翼をたたみ、一筋の矢のように襲う。先に振る翼より、落下の重みを乗せて鋭く打つ。',
  先制の翼: '翼のひと振りで間合いを詰め、軽い一撃を先に加える。高く舞い上がる暇を惜しみ、短く打ち払う。',
  旋風: '大きく翼を回し、敵陣を巻き込む風を起こす。一体ずつへの風当たりは軽く、広く吹き渡る。',
  水刃: '波の縁を研ぎ澄まし、一枚の刃として放つ。薄い水面に力を集め、狙った相手へ鋭く切り込む。',
  灼熱拳: '炎を拳に集め、熱と重みを相手にたたき込む。散らす火の渦より濃く、重い火拳。',
  火炎旋風: '燃え盛る腕を振り、敵陣へ火の渦を広げる。拳を集めた一撃より一体ずつへの熱は薄まり、広く相手を包む。',
  風切り: '山風に刃を乗せ、相手を一息に切り払う。先を急ぐ斬りより深く、ひと筋の風を届かせる。',
  蛇牙: '低い姿勢から伸び上がり、鋭い牙を突き立てる。大きく叩きつけず、細い先端で隙を穿つ。',
  冥府の刃: '静かに刃を振り抜き、冥府の冷気を深く刻む。先を急ぐ影斬りより、重い刃筋を届かせる。',
  影斬り: '影に踏み込み、相手の構えが整う前に斬り込む。刃の重みを抑え、先に届く切れ味を選ぶ。',
  守護の誓い: '仲間の前に守りの印を描き、受ける衝撃を和らげる。',
  蛇鱗の庇護: '仲間を鱗の盾で包み、迫る一撃の勢いを和らげる。',
  清めの鈴: '澄んだ鈴の音を響かせ、仲間の毒を払う。傷には小さな癒やしを添え、雫を注ぐ時ほど深くは手当てしない。',
  潮騒の浄化: '清らかな潮を招き、仲間の毒を洗い流す。残る波が傷を少し癒やし、雫を注ぐ時より控えめな手当てを残す。',
  破城の拳: '守りの隙を砕き、固めた構えを崩してから拳を届かせる。灼熱拳ほどの重さより、守りをほどく打ち筋を選ぶ。',
  冥府の断罪: '鋭い刃で相手の守りを断ち切り、その隙へ斬り込む。冥府の刃ほどの重さを乗せず、構えを崩して傷を刻む。',
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
