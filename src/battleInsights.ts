import { DRAGON_CHARGE_CAP, type BattleEvent, type BattleOrderRecord, type BattleTurnRecord, type State } from './engine';

export type BattleEvidence = {
  turn: number;
  /** Zero-based index into that turn's authoritative events. */
  eventIndex: number;
  actor?: string;
  target?: string;
  /** Optional supporting command, including a command that never cast. */
  orderIndex?: number;
};

export type BattleFact = {
  id: string;
  kind: 'repair' | 'poison' | 'missed-heal' | 'protection' | 'largest-action' | 'healing' | 'damage-total';
  text: string;
  evidence: BattleEvidence[];
};

type Side = 'allies' | 'enemies';
const sideLabel = (side: Side) => side === 'allies' ? '味方' : '敵';
const positiveAmount = (event: BattleEvent) => Number.isFinite(event.amount) && event.amount! > 0 ? event.amount! : 0;
const reference = (turn: BattleTurnRecord, eventIndex: number, orderIndex?: number): BattleEvidence => {
  const event = turn.events[eventIndex];
  return { turn: turn.turn, eventIndex, ...(event.actor ? { actor: event.actor } : {}), ...(event.target ? { target: event.target } : {}), ...(orderIndex === undefined ? {} : { orderIndex }) };
};
const uniqueEvidence = (evidence: BattleEvidence[]) => evidence.filter((item, index) =>
  evidence.findIndex(other => item.turn === other.turn && item.eventIndex === other.eventIndex && item.orderIndex === other.orderIndex) === index);

function sideFor(state: State, key?: string): Side | undefined {
  if (state.allies.some(unit => unit.key === key)) return 'allies';
  if (state.enemies.some(unit => unit.key === key)) return 'enemies';
  return undefined;
}

/** Side and slot keep mirror matches (and injected duplicate names) unambiguous. */
export function battleUnitLabel(state: State, key?: string): string {
  const side = sideFor(state, key);
  if (!side) return key ?? '対象なし';
  const index = state[side].findIndex(unit => unit.key === key);
  return `${sideLabel(side)}${index + 1} ${state[side][index].monster.name}`;
}

/** At most three observations, never claims about why the battle was won or lost.
 * Missing historical data is not reconstructed from final HP, roster roles, or text logs.
 */
export function resultFacts(state: State): BattleFact[] {
  const history = state.history ?? [];
  const repair = { allies: 0, enemies: 0, triggers: 0, evidence: [] as BattleEvidence[] };
  const poison = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const healing = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const direct = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const protection = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  let missedHeal: BattleFact | undefined;
  let largest: { amount: number; actor: string; skill: string; turn: number; targets: Set<string>; evidence: BattleEvidence[] } | undefined;

  for (const turn of history) {
    // A missed heal requires a legal scheduled command, a defeat BEFORE that
    // actor's action, and the complete action boundary without a cast.
    for (const [orderIndex, order] of turn.orders.entries()) {
      if (missedHeal || !order.accepted || !order.skillName || !sideFor(state, order.key)
        || !['heal', 'cleanse'].includes(order.skillKind ?? '') || !(order.skillPower! > 0)) continue;
      const beforeIndex = turn.events.findIndex(event => event.kind === 'phase' && event.phase === 'before-action' && event.actor === order.key);
      const endIndex = turn.events.findIndex((event, index) => index > beforeIndex && event.kind === 'phase' && event.phase === 'action-end' && event.actor === order.key);
      const defeatIndex = turn.events.findIndex((event, index) => index < beforeIndex && event.kind === 'defeat' && event.target === order.key);
      if (beforeIndex < 0 || endIndex < 0 || defeatIndex < 0 || turn.events.some(event => event.kind === 'cast' && event.actor === order.key)) continue;
      missedHeal = {
        id: `missed-heal-${turn.turn}-${order.key}`, kind: 'missed-heal',
        text: `TURN ${turn.turn}：${battleUnitLabel(state, order.key)}は「${order.skillName}」の発動前に戦闘不能。`,
        evidence: [reference(turn, defeatIndex, orderIndex), reference(turn, beforeIndex), reference(turn, endIndex)],
      };
    }

    const guards = new Map<string, BattleEvidence[]>();
    let action: typeof largest;
    const finishAction = () => {
      if (action && action.amount > 0 && (!largest || action.amount > largest.amount)) largest = action;
      action = undefined;
    };
    for (const [index, event] of turn.events.entries()) {
      const evidence = reference(turn, index);
      if (event.kind === 'passive' && event.effect === 'material-repair') { repair.triggers++; repair.evidence.push(evidence); }
      if (event.kind === 'phase' && (event.phase === 'before-action' || event.phase === 'action-end' || event.phase === 'turn-end')) finishAction();
      if (event.kind === 'cast') {
        finishAction();
        if (event.actor && event.skill && sideFor(state, event.actor)) {
          action = { amount: 0, actor: event.actor, skill: event.skill, turn: turn.turn, targets: new Set(), evidence: [evidence] };
        }
      }
      if (event.target && event.kind === 'guard') {
        guards.set(event.target, [...(action?.evidence ?? []), evidence]);
      }
      if (event.target && (event.kind === 'break' || event.kind === 'defeat' || (event.kind === 'expire' && event.effect === 'guard'))) guards.delete(event.target);
      const side = sideFor(state, event.target);
      const amount = positiveAmount(event);
      if (!side || amount === 0) continue;
      if (event.kind === 'heal') {
        if (event.effect === 'material-repair') { repair[side] += amount; repair.evidence.push(evidence); }
        healing[side] += amount;
        healing.evidence.push(evidence);
      }
      if (event.kind !== 'damage') continue;
      if (event.effect === 'poison') {
        poison[side] += amount;
        poison.evidence.push(evidence);
        continue;
      }
      if (!event.actor || !sideFor(state, event.actor)) continue;
      direct[side] += amount;
      direct.evidence.push(evidence);
      const guard = guards.get(event.target!);
      if (guard) {
        protection[side]++;
        protection.evidence.push(...guard, evidence);
      }
      if (action?.actor === event.actor) {
        action.amount += amount;
        action.targets.add(event.target!);
        action.evidence.push(evidence);
      }
    }
    finishAction();
  }

  const facts: BattleFact[] = [];
  if (repair.evidence.length) facts.push({
    id: 'material-repair', kind: 'repair',
    text: `初回ターン末の修復：味方 ${repair.allies}／敵 ${repair.enemies} HP回復（${repair.triggers}回発動・生存する物質系だけ）。`, evidence: repair.evidence,
  });
  if (missedHeal) facts.push(missedHeal);
  if (poison.evidence.length) facts.push({
    id: 'poison-total', kind: 'poison',
    text: `毒で失ったHP：味方 ${poison.allies}／敵 ${poison.enemies}（${poison.evidence.length}回の毒ダメージ）。`, evidence: poison.evidence,
  });
  if (protection.evidence.length) facts.push({
    id: 'protection-hits', kind: 'protection',
    text: `守りで直接ダメージを半減：味方 ${protection.allies}回／敵 ${protection.enemies}回。`, evidence: uniqueEvidence(protection.evidence),
  });
  if (largest) facts.push({
    id: `largest-action-${largest.turn}-${largest.evidence[0].eventIndex}`, kind: 'largest-action',
    text: `最大の1行動：TURN ${largest.turn}、${battleUnitLabel(state, largest.actor)}の「${largest.skill}」が合計 ${largest.amount} ダメージ（${largest.targets.size}体）。`, evidence: largest.evidence,
  });
  if (healing.evidence.length) facts.push({
    id: 'healing-total', kind: 'healing',
    text: `実際に回復したHP：味方 ${healing.allies}／敵 ${healing.enemies}。`, evidence: healing.evidence,
  });
  if (direct.evidence.length) facts.push({
    id: 'direct-damage-total', kind: 'damage-total',
    text: `直接攻撃で失ったHP：味方 ${direct.allies}／敵 ${direct.enemies}（毒の継続ダメージを除く）。`, evidence: direct.evidence,
  });
  return facts.slice(0, 3);
}

export function battleEventLine(state: State, event: BattleEvent): string {
  const actor = battleUnitLabel(state, event.actor);
  const target = battleUnitLabel(state, event.target);
  switch (event.kind) {
    case 'cast': return `${actor}「${event.skill ?? '行動'}」を発動${event.scope === 'random' ? `（ランダム${event.hits}回）` : ''} → ${(event.targets ?? (event.target ? [event.target] : [])).map(key => battleUnitLabel(state, key)).join('、') || '対象なし'}`;
    case 'damage': return `${event.effect === 'poison' ? '毒の継続ダメージ' : `${actor}の直接攻撃${event.hitIndex !== undefined ? `（${event.hitIndex + 1}撃目）` : ''}`} → ${target} HP −${event.amount ?? 0}（残り ${event.hp ?? '?'}）`;
    case 'heal': return `${event.effect === 'material-repair' ? `${actor}の一度きりの修復` : actor} → ${target} HP ＋${event.amount ?? 0}（残り ${event.hp ?? '?'}）`;
    case 'defeat': return `${target}が戦闘不能${event.effect === 'poison' ? '（毒）' : event.actor ? `（${actor}の攻撃）` : ''}`;
    case 'guard': return `${actor} → ${target}に守り（このターンの直接ダメージ半減）`;
    case 'poison': return `${actor} → ${target}に毒（残り ${event.poison ?? 3}回）`;
    case 'cleanse': return `${actor} → ${target}を浄化（毒は0）`;
    case 'break': return `${actor} → ${target}の${event.removed ? event.removed.map(value => value === 'rally' ? '群気' : value === 'ward' ? '自然障壁' : value === 'dragonCharge' ? '竜気' : value === 'repairReady' ? '修復待機' : '守り').join('・') : '守り'}を解除${event.hitIndex !== undefined ? `（${event.hitIndex + 1}撃目の後）` : ''}`;
    case 'charge': return `${actor} → ${target}の竜気${event.effect === 'dragon-charge-spend' ? 'を消費' : 'を蓄積'}（${event.dragonCharge ?? 0}/${DRAGON_CHARGE_CAP}）`;
    case 'passive': return `${actor}の「${event.skill ?? '修復'}」がターン末に発動（修復待機を消費・生存者のみ・MP消費なし） → ${(event.targets ?? []).map(key => battleUnitLabel(state, key)).join('、') || '対象なし'}`;
    case 'resource': return `${actor} MP −${event.amount ?? 0}（残り ${event.mp ?? '?'}）`;
    case 'expire': return event.effect === 'repairReady' ? `${target}の修復待機が終了` : event.effect === 'ward' ? `${target}の自然障壁${event.ward ? `：残り${event.ward}ターン` : 'が終了'}` : event.effect === 'rally' ? `${target}の群気${event.rally ? `：残り${event.rally}ターン` : 'が終了'}` : `${target}の${event.effect === 'poison' ? '毒' : '守り'}が終了`;
    case 'phase': return event.phase === 'turn-start' ? 'ターン開始' : event.phase === 'turn-end' ? 'ターン終了時の処理' : `${actor}：${event.phase === 'before-action' ? '行動前確認' : event.phase === 'action-end' ? '行動終了' : '行動開始'}`;
  }
}

export function battleOrderLine(state: State, order: BattleOrderRecord): string {
  const reason = order.rejection === 'invalid-skill' ? '不正な特技' : order.rejection === 'invalid-target' ? '不正な対象' : 'MP不足';
  return `${battleUnitLabel(state, order.key)}の指示：「${order.skillName ?? `特技 ${order.skill}`}」${order.target ? ` → ${battleUnitLabel(state, order.target)}` : ''}${order.accepted ? '（実行予定）' : `（取り消し：${reason}）`}`;
}

/** Every displayed observation can expand to actual commands and indexed events. */
export function battleFactEvidenceLines(state: State, fact: BattleFact): string[] {
  return fact.evidence.flatMap(evidence => {
    const turn = state.history?.find(record => record.turn === evidence.turn);
    const event = turn?.events[evidence.eventIndex];
    if (!turn || !event) return [];
    const order = evidence.orderIndex === undefined ? undefined : turn.orders[evidence.orderIndex];
    return [
      ...(order ? [`TURN ${turn.turn}・指示 ${evidence.orderIndex! + 1}：${battleOrderLine(state, order)}`] : []),
      `TURN ${turn.turn}・記録 ${evidence.eventIndex + 1}：${battleEventLine(state, event)}`,
    ];
  });
}
