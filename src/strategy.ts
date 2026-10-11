import { baseDamage, poisonTicksFor, poisonCashoutPerTickFor, poisonCashoutDamageFor, cost, DRAGON_CHARGE_CAP, DRAGON_CHARGE_PER_POINT, MAX_TURNS, monsters, type Skill, type State, type Unit } from './engine';

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
  if (!target) return `命中時の毒残0〜3回×${perTick}を基礎に追加し、毒を全消費`;
  const ticks = target.hp > 0 ? poisonTicksFor(target) : 0;
  if (compact) return `毒${ticks}回 → 基礎+${poisonCashoutDamageFor(unit, skill, target)} / 残せば最大${Math.floor(target.monster.hp * .06) * ticks}`;
  return `現在の毒:残${ticks}回 → 消費で基礎+${poisonCashoutDamageFor(unit, skill, target)}。残す場合は最大${Math.floor(target.monster.hp * .06) * ticks}の経過ダメージ（最大HPの6%×${ticks}回）。実際の命中時に再判定`;
}

/** Fixed basis is distinct from final damage, and always comes from the engine values. */
export function fixedDamageHint(skill: Skill, unit?: Unit): string {
  if (!skill.fixedDamage) return '';
  if (!skill.dragonChargeFinisher) return `1体あたり固定基礎${skill.power}`;
  const formula = `${skill.power}＋竜気×${DRAGON_CHARGE_PER_POINT}`;
  return unit
    ? `1体あたり固定基礎${baseDamage(unit, skill)}（${unit.dragonCharge === undefined ? '竜気条件未成立' : `現在の竜気${unit.dragonCharge}`}）`
    : `1体あたり固定基礎${formula}（最大${skill.power + DRAGON_CHARGE_CAP * DRAGON_CHARGE_PER_POINT}）`;
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

// Original arena fiction; slime names and settings are game-created, not historical claims.
const monsterStories: Record<number, string> = {
  36: 'ふたつの横顔で道の前後を見る、空いた門口の番人。異なる足音が四つ重なったとき、掌を開いて一度だけ道を整える。流すか、囲うか。選んだ後は石の敷居に足を戻す。',
  32: '塚の土を肩に載せ、ほどけかけた埋葬布を結び直す古い番人。霧の欠片を掌に閉じ、一度の低い拳に重みを渡す。取り立てた力を自分の命へ戻すことはない。',
  33: '乗り手を失った道を歩く、頭のない馭者。空いた襟の横で顔灯を揺らし、手綱の先に残る結び目を見つけてほどく。',
  34: '折った布の胴を小さく跳ねさせる静かな仲間。長さの違う袖を開き、近くのひとりを囲う場所を作る。足をつけば、次の一押しに備える。',
  35: '折れ枝から逆さに下がり、ほどけた影の糸を拾うもの。大きな結び目から短い糸を分け、生きている仲間の裂け目だけをつなぎ直す。',

  29: '深い頭巾の下で、音のしない勘定を続けるもの。ひらいた指に浮かぶ小さな札は、相手が次に振り絞る力の余白を数えている。',
  30: '工房の隅から現れる煤だらけの小人。曲がった工具をひねり、頑丈な留め具に隠れた一本の緩みを見つける。',
  31: '片脚に鈍い金属の光を宿し、長い衣の端を払う幻。静かな踏み込みから一瞬だけ輪郭を鋭くし、すぐ薄い影へ戻る。',

  24: '片側の空いた水のアーチを保つ、淡い泉の生きもの。体の底に貯めた雫を分けるか、一筋の流れにして押し出すか、仲間の息づかいを聞いて決める。',
  25: '細い水のひもをほどきながら地面をすべる、小さな走り手。分かれた端を弾き、離れた隙間へ一粒の雫を届かせる。',
  26: '柔らかな膜を幾重にも折って立つ粘体。ひだを広げれば仲間を守る幕に、狭めれば相手の構えへ入り込む細い縁になる。',
  27: '泡の枝をゆっくり伸ばす、水辺の粘体。先端にためた澄んだ粒を、傷ついた仲間へひとつずつ渡して歩く。',
  28: '六つの丸いこぶを低く広げた、練りもののような粘体。体をぐっと押し縮め、集めた重みを一方向へ返す。',
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
  13: '枝から枝へ、群れの合図を運ぶ小さな走り手。仲間の足音が五つそろうと、隠していた木の実をもう一つ投げ放つ。',
  14: '甲羅に森を、水面に星を宿す古い守り手。戦いのはじまりに自然の仲間を包み、海と山の響きをゆっくり解き放つ。',
  15: '長い蛇身を輪にして、水の道をせき止める竜。仲間の攻めに呼応して輪の内へ力を蓄え、乾いた空へ一息に放つ。',
  16: '二本の脚と長い尾で岩場を渡る竜。ざらついた鱗を盾のように立て、背後の仲間へ続く道を守る。',
  17: '尾の先にも頭を持つ、両端で見張る蛇竜。前後の呼吸をそろえた瞬間、二つの牙が別々の隙を探しに走る。',
  18: '青緑の翼と淡い腹を持つ雲の旅竜。雲間の水を携えて飛び、鋭い息と澄んだ湧き水を使い分ける。',
  19: 'いくつもの銅の環を胸に重ねた番人。ひとめぐりの戦いを受け止めると、炉に残した熱で仲間の継ぎ目を一度だけつなぎ直す。',
  20: '縫い目に小さな灯を宿す古い雨傘。骨を軽やかに開いて雨を払い、仲間の周りに溜まった淀みをぬぐう。',
  21: '行く先をふさぐ気配が、段違いの石になって姿を得たもの。顔も足も見せず、石の重なりをずらして仲間をかばう。',
  22: '浅い器を三つの車輪に載せた巡回の鼎。縁から湯気を上げ、傷ついた仲間へ温かな湯を分けて回る。',
  23: '鋳肌に深い継ぎ目を持つ青銅の牡牛。重い蹄をひとつずつ踏みしめ、角と全身の重みを遅い突進へ預ける。',
};

export function monsterLore(id: number): string {
  return monsterStories[id] ?? 'まだ物語の記されていない幻獣。';
}

export type MonsterRole = { name: string; strength: string; tradeoff: string };

// These are descriptions of implemented jobs and costs, not extra passive effects.
const monsterRoles: Record<number, MonsterRole> = {
  36: { name: '一度の応答を選ぶ中核', strength: '開戦時の4系統混成で、全体毒解除か今ターン守護を一度だけ選べる。', tradeoff: 'COST5・MP24と一手。HP回復はなく、使うと両方とも残0回。' },
  32: { name: '残り毒の決着役', strength: '相手の残り毒を単体打点へ交換。自身を含む不死系3体で14から22へ強化。', tradeoff: 'MP18と一手で今後の毒を失う。補給なしで最大3回。毒0では追加0。' },
  33: { name: '手綱の解除役', strength: 'バンシーより速く守りを解除。不要なら高打点の轍の一打を選べる。', tradeoff: 'COST4。解除もMP14と一手が必要。毒付与・毒交換・回復・守護はない。' },
  34: { name: '袖囲いの守り手', strength: '先に味方ひとりを守り、遅い主力へ手番をつなぐ。低消費攻撃も選べる。', tradeoff: '守護は直接ダメージ半減のみ。毒を防げず、回復もできない。攻撃時は遅い。' },
  35: { name: '逆さ糸の手当て役', strength: '生存者の52回復と毒解除＋20回復を使い分けるCOST2の支援役。', tradeoff: 'HP125で脆い。MP50では52回復2回と清め1回まで。支援時は攻撃できない。' },

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
  敷居の一打: '一歩だけ身を傾け、門口の低い縁を狙った相手へ押し出す。',
  門番の構え: '石の両足をそろえ、次に来る衝撃をその場で受け止める。',
  塚底の取り立て: '相手に残る霧の欠片を小さく畳み、失われる余韻ごと一度の拳へ変える。',
  土蓋の拳: '片肩の石を支えに、土の重みを乗せた拳を低く押し出す。',
  手綱ほどき: '細い手綱を横へ引き、相手の構えをつなぐ結び目をほどく。',
  轍の一打: '道に刻む轍のように、長い一筆を狙った相手へ走らせる。',
  袖の囲い: '長短の袖を括弧の形に開き、仲間ひとりの前へ布の縁を合わせる。',
  踏みしめ: '小さな跳躍から両足を下ろし、その重みを短い押しへ伝える。',
  影の縫い直し: '逆向きの糸を渡し、生きている仲間の影に残る裂け目を縫い寄せる。',
  結び払い: '影に絡んだ結び目を一つずつ払い、細い糸でほころびを閉じる。',
  逆さの小突き: '枝に掛けた足を支えに、逆さの腕から小さな一押しを届ける。',

  空勘の爪: '指先で空をなぞり、相手の体力と残された力に小さな欠け目を刻む。奪った力を自分へ移すことはない。',
  封銭の打撃: 'ひらいた手を閉じ、重なった札の重みを一つの衝撃にして押し出す。',
  帳を閉じる: '手元の札をしまい、頭巾を深く下げて次の衝撃に備える。',
  留め具ほどき: '工具の先を差し込み、守りを支えていた留め具をひとつ外す。',
  木片はじき: '作業台に残った小さな木片を指で弾き、相手の隙へ飛ばす。',
  片脚の踏み込み: '金属の脚を軸に衣をひるがえし、一歩の重みを狙った場所へ届かせる。',
  薄影の払い: '衣の端で淀みを払い、仲間の傷へ静かな休息を添える。',
  影の投げ針: 'ほどけた影を細くまとめ、一筋の針として投げる。',

  蓄え分け: '体の底に残した雫をほどき、同じ流れを持つ仲間へ一度だけ渡す。',
  押し流し: 'アーチを細くたわませ、絞った水の筋を狙った一点へ送る。',
  水面のかばい: '開いた体の縁を伸ばし、仲間の前に薄い水の面をつくる。',
  糸しぶき: '細長い体の端をしならせ、一粒の雫をまっすぐ弾く。',
  はじけ糸: '分かれた端を短く跳ねさせ、相手が動く前にしぶきを散らす。',
  膜のかばい: '折り畳んだひだを開き、仲間の前へ柔らかな幕を置く。',
  ひだ押し: '膜の折り目を重ね、一枚の柔らかな面で押し出す。',
  折りほどき: '相手の守りへ薄い縁を差し込み、結びをほどいてから打つ。',
  泡の手当て: '枝先にためた温かな泡を、仲間の傷へ静かに重ねる。',
  泡さらい: '澄んだ泡で淀みを包み、傷をいたわりながら外へ運ぶ。',
  泡つぶて: '小さな枝を振って泡を切り離し、一点へ飛ばす。',
  ねり打ち: '六つのこぶをひとつへ寄せ、練り固めた重みを打ち込む。',
  散る重泡: '低い体を押し縮め、重い泡を扇状に散らして敵陣へ送る。',
  鋳輪の備え: '胴を巡る銅輪を狭め、内側の炉心を衝撃から守る。',
  石組みの構え: 'ずれた石の段を噛み合わせ、迫る力を面で受け止める。',
  折壁の守り: '壁の一面を折り出し、仲間へ向く道をふさぐ。',
  炉心の槌: '胸の環を締め、銅の拳に重みを集めて振り下ろす。',
  環銅の衝撃: '足元へ打ち込んだ振動を、銅色の輪として敵陣へ広げる。',
  炉心の修復: '炉に残した一度きりの熱を渡し、生きている仲間の継ぎ目をつなぐ。',
  雨縫い: '細い雨筋を縫うように傘の先を伸ばし、一点を打つ。',
  傘下の清め: '傘の内へ仲間を招き、淀んだ雨を外へ払う。',
  石段押し: '段違いの石をひとつずつ押し出し、重い壁面を相手へ寄せる。',
  湯の巡り: '器の縁から温かな湯を注ぎ、仲間ひとりの傷をいたわる。',
  封留め崩し: '車輪の縁を構えの隙へ差し込み、結び目を外してから押す。',
  三輪の一押し: '三つの車輪を揃えて回し、器ごと短く押し込む。',
  銅角の突き: '頭を低く据え、青銅の角をまっすぐに届かせる。',
  鋳火の突貫: '蹄を深く踏み込み、鋳肌の重みを乗せて遅れて突き抜ける。',
  渇天の息: '幾重にも巻いた体をほどき、溜めていた乾いた息を敵陣へ押し流す。',
  雨裂きの牙: '水の幕を裂くように蛇身を伸ばし、狙った一点へ牙を打ち込む。',
  蜷局の備え: '頭を幾重の輪で囲み、外側の鱗で衝撃を受け止める。',
  石割りの牙: '岩の割れ目を探るように、狙った相手の隙へ太い牙を押し込む。',
  鱗のかばい: '長い胴をひねって仲間の前へ鱗を立て、迫る力を受け流す。',
  双頭の連突: '両端の頭が交互に伸び、別々に見つけた隙へ一度ずつ突きかかる。',
  封鱗裂き: '尾先の頭が構えを崩し、もう一方の牙が残された隙を裂く。',
  翠雲の息: '翼の間に抱えた青緑の雲を絞り、細い息の流れをまっすぐ送る。',
  雲の湧き水: '翼から集めた雫を小さな水たまりに変え、仲間の傷へそっと注ぐ。',
  雲払い: '柔らかな翼で淀んだ空気を追い払い、清らかな雫で仲間をいたわる。',
  破縛の連牙: '低く構え、五度の跳躍で敵を追う。牙が触れた守りから鎖のように裂けていく。',
  月下の一咬: '群れの隙間を駆け抜け、選んだ相手へ一度だけ牙を深く届かせる。',
  木の実の連弾: '蓄えた木の実を次々に放つ。群れの足並みがそろえば、最後の一粒も戦場へ躍る。',
  枝渡りの一突き: 'しなる枝を足場に間合いを飛び越え、小さな一撃を先に届ける。',
  海山の轟き: '甲羅の奥で海と山が共鳴する。長い溜めのあと、敵陣全体へ重い響きが届く。',
  悠久の雫: '甲羅にたたえた澄んだ水を分け、傷ついた仲間に静かな休息を届ける。',
  甲羅の結界: '甲羅に刻まれた紋を仲間の前へ映し、迫る一撃の衝撃を和らげる。',
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
