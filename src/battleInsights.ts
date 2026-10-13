import { turnMpRecoveryAmount, AUTO, DRAGON_CHARGE_CAP, skillUnavailableLabel, type BattleEvent, type BattleOrderRecord, type BattleTurnRecord, type State } from './engine';

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
  kind: 'response' | 'poison-cashout' | 'resource-loss' | 'fallback' | 'supply' | 'repair' | 'poison' | 'lost-action' | 'protection' | 'largest-action' | 'healing' | 'damage-total';
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

type RecordedAction = { orderIndex: number; beforeIndex: number; actionIndex?: number; castIndex?: number; endIndex: number };
type RecordedTurn = { turn: BattleTurnRecord; actions: RecordedAction[] };

/** Reject partial/injected shapes before using absence of a cast as evidence. */
function readableTurn(turn: BattleTurnRecord): boolean {
  return !!turn && Number.isInteger(turn.turn) && turn.turn > 0
    && Array.isArray(turn.orders) && turn.orders.every(order => !!order && typeof order.key === 'string')
    && Array.isArray(turn.events) && turn.events.every(event => !!event && typeof event.kind === 'string');
}

/** The resolver records exactly one bounded queue slot per accepted order.
 * A missing prefix, phase, command or cast cannot establish an earlier action count.
 * Presentation-created passive casts are deliberately not authoritative evidence.
 */
function completeRecordedTurns(state: State, history: BattleTurnRecord[]): RecordedTurn[] | undefined {
  if (!history.length || history.length !== state.history?.length || history.at(-1)!.turn !== state.turn - 1) return;
  const turns: RecordedTurn[] = [];
  const defeated = new Set<string>();
  for (const [turnIndex, turn] of history.entries()) {
    if (turn.turn !== turnIndex + 1) return;
    const orders = new Map<string, number>();
    for (const [index, order] of turn.orders.entries()) {
      if (orders.has(order.key) || !['allies', 'enemies'].includes(order.side) || sideFor(state, order.key) !== order.side || typeof order.accepted !== 'boolean'
        || !Number.isInteger(order.skill) || !['explicit', 'automatic'].includes(order.source)
        || (order.accepted && (typeof order.skillName !== 'string' || !order.skillName.trim() || order.rejection !== undefined))) return;
      if (order.skill === AUTO && (order.source !== 'automatic' || order.accepted || order.skillName !== undefined || order.target !== undefined || order.decisionPriority !== undefined || order.nativePriority !== undefined)) return;
      orders.set(order.key, index);
    }
    const actions: RecordedAction[] = [];
    const seen = new Set<string>();
    let pending: Omit<RecordedAction, 'endIndex'> | undefined;
    let phase: BattleEvent['phase'];
    let ended = false;
    let nextTurnStarted = false;
    const recovered = new Set<string>();
    for (const [index, event] of turn.events.entries()) {
      if (event.kind !== 'phase') {
        if (!phase || event.phase !== phase) return;
        if (phase === 'next-turn-start' && (event.kind !== 'resource-gain' || event.effect !== 'turn-mp-recovery' || event.actor !== undefined || !event.target || !sideFor(state, event.target) || recovered.has(event.target) || event.nextTurn !== turn.turn + 1 || !Number.isInteger(event.amount) || event.amount! <= 0 || event.amount! > turnMpRecoveryAmount(state.turnMpRecovery) || !Number.isInteger(event.mp) || event.mp! < event.amount! || event.mp! > [...state.allies, ...state.enemies].find(unit => unit.key === event.target)!.monster.mp || defeated.has(event.target) || Object.keys(event).some(key => !['kind','target','amount','mp','effect','nextTurn','phase'].includes(key)))) return;
        if (phase === 'next-turn-start') recovered.add(event.target!);
        if (event.kind === 'defeat' && event.target) defeated.add(event.target);
        if (event.kind === 'cast') {
          if (!pending || phase !== 'action' || event.actor !== turn.orders[pending.orderIndex].key
            || pending.castIndex !== undefined || !event.skill || event.passive) return;
          pending.castIndex = index;
        }
        continue;
      }
      if (event.phase === 'next-turn-start') {
        if (!ended || nextTurnStarted || (state.winner && turn === history.at(-1)) || Object.keys(event).some(key => !['kind','phase','nextTurn'].includes(key)) || event.actor || event.nextTurn !== turn.turn + 1) return;
        nextTurnStarted = true; phase = event.phase; continue;
      }
      if (ended) return;
      if (event.phase === 'turn-start') {
        if (index !== 0 || event.actor) return;
      } else if (event.phase === 'before-action') {
        const orderIndex = event.actor === undefined ? undefined : orders.get(event.actor);
        if (pending || !phase || orderIndex === undefined || seen.has(event.actor!) || !turn.orders[orderIndex].accepted) return;
        seen.add(event.actor!);
        pending = { orderIndex, beforeIndex: index };
      } else if (event.phase === 'action') {
        if (!pending || phase !== 'before-action' || event.actor !== turn.orders[pending.orderIndex].key) return;
        pending.actionIndex = index;
      } else if (event.phase === 'action-end') {
        if (!pending || event.actor !== turn.orders[pending.orderIndex].key
          || (pending.actionIndex === undefined) !== (pending.castIndex === undefined)) return;
        actions.push({ ...pending, endIndex: index });
        pending = undefined;
      } else if (event.phase === 'turn-end') {
        if (!phase || pending || event.actor || seen.size !== turn.orders.filter(order => order.accepted).length) return;
        ended = true;
      } else return;
      phase = event.phase;
    }
    if (!ended || pending) return;
    turns.push({ turn, actions });
  }
  return turns;
}

function lostQueuedAction(state: State, history: BattleTurnRecord[]): BattleFact | undefined {
  const turns = completeRecordedTurns(state, history);
  if (!turns) return;
  // Earliest recorded turn, then original accepted-order index: stable even for mirrors.
  for (const [turnIndex, { turn, actions }] of turns.entries()) {
    for (const [orderIndex, order] of turn.orders.entries()) {
      if (order.side !== 'allies') continue;
      if (order.skill === AUTO && order.source === 'automatic' && order.accepted === false && order.rejection === 'defeated'
        && order.skillName === undefined && order.target === undefined && order.decisionPriority === undefined && order.nativePriority === undefined) {
        const defeatIndex = turn.events.findIndex(event => event.kind === 'defeat' && event.target === order.key);
        if (defeatIndex >= 0 && !turn.events.some(event => event.kind === 'cast' && event.actor === order.key)) return {
          id: `lost-action-${turn.turn}-${order.key}`, kind: 'lost-action',
          text: `TURN ${turn.turn}：${battleUnitLabel(state, order.key)}はおまかせの判断前に戦闘不能（特技・対象は未決定）。`,
          evidence: [reference(turn, defeatIndex, orderIndex)],
        };
      }
      if (!order.accepted) continue;
      const action = actions.find(item => item.orderIndex === orderIndex)!;
      if (action.castIndex !== undefined || turn.events.some(event => event.kind === 'cast' && event.actor === order.key)) continue;
      const defeatIndex = turn.events.findIndex((event, index) => index < action.beforeIndex && event.kind === 'defeat' && event.target === order.key);
      if (defeatIndex < 0) continue;
      const earlier: BattleEvidence[] = [];
      let earlierCount = 0;
      let completeEarlier = true;
      for (const prior of turns.slice(0, turnIndex)) {
        const priorOrderIndex = prior.turn.orders.findIndex(item => item.key === order.key);
        const priorAction = prior.actions.find(item => item.orderIndex === priorOrderIndex);
        if (priorOrderIndex < 0 || prior.turn.events.some(event => event.kind === 'defeat' && event.target === order.key)
          || (prior.turn.orders[priorOrderIndex].accepted && priorAction?.castIndex === undefined)) { completeEarlier = false; break; }
        if (priorAction?.castIndex !== undefined) {
          earlierCount++;
          earlier.push(reference(prior.turn, priorAction.beforeIndex, priorOrderIndex), reference(prior.turn, priorAction.castIndex), reference(prior.turn, priorAction.endIndex));
        }
      }
      if (!completeEarlier) continue;
      return {
        id: `lost-action-${turn.turn}-${order.key}`, kind: 'lost-action',
        text: `TURN ${turn.turn}：${battleUnitLabel(state, order.key)}は「${order.skillName}」の発動前に戦闘不能。それまでの発動記録：${earlierCount}回。`,
        evidence: [...earlier, reference(turn, defeatIndex, orderIndex), reference(turn, action.beforeIndex), reference(turn, action.endIndex)],
      };
    }
  }
}

/** At most three observations, never claims about why the battle was won or lost.
 * Missing historical data is not reconstructed from final HP, roster roles, or text logs.
 */
export function resultFacts(state: State): BattleFact[] {
  const history = Array.isArray(state.history) ? state.history.filter(readableTurn) : [];
  const lostAction = lostQueuedAction(state, history);
  const response = { allies: 0, enemies: 0, cleanse: 0, guard: 0, evidence: [] as BattleEvidence[] };
  const repair = { allies: 0, enemies: 0, triggers: 0, evidence: [] as BattleEvidence[] };
  const supply = { allies: 0, enemies: 0, uses: 0, evidence: [] as BattleEvidence[] };
  const resourceLoss = { allies: 0, enemies: 0, zero: 0, evidence: [] as BattleEvidence[] };
  const fallbacks = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const cashout = { allies: 0, enemies: 0, uses: 0, evidence: [] as BattleEvidence[] };
  const poison = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const healing = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const direct = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  const protection = { allies: 0, enemies: 0, evidence: [] as BattleEvidence[] };
  let largest: { amount: number; actor: string; skill: string; turn: number; targets: Set<string>; evidence: BattleEvidence[] } | undefined;

  for (const turn of history) {
    const guards = new Map<string, BattleEvidence[]>();
    let action: typeof largest;
    const finishAction = () => {
      if (action && action.amount > 0 && (!largest || action.amount > largest.amount)) largest = action;
      action = undefined;
    };
    for (const [index, event] of turn.events.entries()) {
      const evidence = reference(turn, index);
      if (event.kind === 'passive' && event.effect === 'material-repair') { repair.triggers++; repair.evidence.push(evidence); }
      if (event.kind === 'supply' && event.effect === 'slime-supply-spend') { supply.uses++; supply.evidence.push(evidence); }
      if (event.kind === 'response' && event.effect === 'extraordinary-response-spend') {
        const actorSide = sideFor(state, event.actor);
        if (actorSide) {
          response[actorSide]++;
          if (event.responseChoice) response[event.responseChoice]++;
          response.evidence.push(evidence);
        }
      }
      if (event.kind === 'poison-cashout') {
        const actorSide = sideFor(state, event.actor);
        if (actorSide) {
          cashout[actorSide] += event.poisonTicksConsumed ?? 0;
          cashout.uses++; cashout.evidence.push(evidence);
        }
      }
      if (event.kind === 'resource-loss') {
        const victimSide = sideFor(state, event.target);
        if (victimSide) {
          resourceLoss[victimSide] += positiveAmount(event);
          if (event.amount === 0) resourceLoss.zero++;
          resourceLoss.evidence.push(evidence);
        }
      }
      if (event.kind === 'fallback' && event.reason === 'enemy-mp-loss') {
        const actorSide = sideFor(state, event.actor);
        if (actorSide) {
          fallbacks[actorSide]++;
          const orderIndex = turn.orders.findIndex(order => order.key === event.actor && order.accepted && order.skill === event.fromSkill);
          fallbacks.evidence.push(reference(turn, index, orderIndex < 0 ? undefined : orderIndex));
        }
      }
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
      if (event.kind === 'resource-gain' && event.effect === 'slime-supply') {
        supply[side] += amount;
        supply.evidence.push(evidence);
      }
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

  // Reserve one of the existing three slots; keep aggregate ordering otherwise.
  const facts: BattleFact[] = lostAction ? [lostAction] : [];
  if (response.evidence.length) facts.push({
    id: 'extraordinary-response', kind: 'response',
    text: `共通の応答を消費：味方 ${response.allies}回／敵 ${response.enemies}回（毒除去 ${response.cleanse}回・今ターンの守り ${response.guard}回。二つ合わせて本人1回まで）。`, evidence: response.evidence,
  });
  if (cashout.evidence.length) facts.push({
    id: 'poison-cashout', kind: 'poison-cashout',
    text: `直接攻撃へ交換した毒の残回数：味方 ${cashout.allies}回分／敵 ${cashout.enemies}回分（${cashout.uses}回命中・対象の毒は0へ。回復ではありません）。`, evidence: cashout.evidence,
  });
  if (resourceLoss.evidence.length) facts.push({
    id: 'enemy-mp-loss', kind: 'resource-loss',
    text: `敵の攻撃で失ったMP：味方 ${resourceLoss.allies}／敵 ${resourceLoss.enemies}（減少0は${resourceLoss.zero}回・技の消費MPは含まない）。`, evidence: resourceLoss.evidence,
  });
  if (fallbacks.evidence.length) facts.push({
    id: 'mp-loss-fallback', kind: 'fallback',
    text: `敵のMP削りで有料指示から通常攻撃へ変更：味方 ${fallbacks.allies}回／敵 ${fallbacks.enemies}回（元の行動順・追加行動なし）。`, evidence: fallbacks.evidence,
  });
  if (supply.evidence.length) facts.push({
    id: 'slime-supply', kind: 'supply',
    text: `行動を使った一度の補給：味方 ${supply.allies}／敵 ${supply.enemies} MP増加（${supply.uses}回発動・生存する粘体系だけ）。`, evidence: supply.evidence,
  });
  if (repair.evidence.length) facts.push({
    id: 'material-repair', kind: 'repair',
    text: `初回ターン末の修復：味方 ${repair.allies}／敵 ${repair.enemies} HP回復（${repair.triggers}回発動・生存する物質系だけ）。`, evidence: repair.evidence,
  });
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
    case 'poison-cashout': return `${actor}の毒交換 → ${target}の毒${event.poisonTicksConsumed ?? 0}回分を消費（残り0回・${(event.poisonCashoutAdded ?? 0) > 0 ? '一撃を強化' : '追加なし'}）`;
    case 'cleanse': return `${actor} → ${target}を浄化（毒は0）`;
    case 'break': return `${actor} → ${target}の${event.removed ? event.removed.map(value => value === 'rally' ? '群気' : value === 'ward' ? '自然障壁' : value === 'dragonCharge' ? '竜気' : value === 'repairReady' ? '修復待機' : '守り').join('・') : '守り'}を解除${event.hitIndex !== undefined ? `（${event.hitIndex + 1}撃目の後）` : ''}`;
    case 'charge': return `${actor} → ${target}の竜気${event.effect === 'dragon-charge-spend' ? 'を消費' : 'を蓄積'}（${event.dragonCharge ?? 0}/${DRAGON_CHARGE_CAP}）`;
    case 'passive': return `${actor}の「${event.skill ?? '修復'}」がターン末に発動（修復待機を消費・生存者のみ・MP消費なし） → ${(event.targets ?? []).map(key => battleUnitLabel(state, key)).join('、') || '対象なし'}`;
    case 'resource': return `${actor} MP −${event.amount ?? 0}（残り ${event.mp ?? '?'}）`;
    case 'resource-loss': return `${actor}のMP削り → ${target} MP −${event.amount ?? 0}（残り ${event.mp ?? '?'}）`;
    case 'fallback': return `${actor}「${event.skill ?? '有料技'}」は敵のMP削りでMP不足（残り ${event.availableMP ?? '?'}／必要 ${event.requiredMP ?? '?'}）。元の行動順で通常攻撃へ変更 → ${target}`;
    case 'resource-gain': if (event.effect === 'turn-mp-recovery') return `TURN ${event.nextTurn ?? '?'} 開始：${target} MP ＋${event.amount ?? 0}（残り ${event.mp ?? '?'}）`; return `${actor}の補給 → ${target} MP ＋${event.amount ?? 0}（残り ${event.mp ?? '?'}）`;
    case 'response': return `${actor}が「${event.skill ?? '応答'}」で共通の応答を消費（残0回・解除不可）`;
    case 'supply': return `${actor}が補給の使用権を消費（残0回・解除不可）`;
    case 'expire': return event.effect === 'responseReady' ? `${target}の共通の応答が終了（戦闘不能）` : event.effect === 'supplyReady' ? `${target}の補給の使用権が終了（戦闘不能）` : event.effect === 'repairReady' ? `${target}の修復待機が終了` : event.effect === 'ward' ? `${target}の自然障壁${event.ward ? `：残り${event.ward}ターン` : 'が終了'}` : event.effect === 'rally' ? `${target}の群気${event.rally ? `：残り${event.rally}ターン` : 'が終了'}` : `${target}の${event.effect === 'poison' ? '毒' : '守り'}が終了`;
    case 'phase': if (event.phase === 'next-turn-start') return `TURN ${event.nextTurn ?? '?'} 開始・MP回復`; return event.phase === 'turn-start' ? 'ターン開始' : event.phase === 'turn-end' ? 'ターン終了時の処理' : `${actor}：${event.phase === 'before-action' ? '行動前確認' : event.phase === 'action-end' ? '行動終了' : '行動開始'}`;
  }
}

export function battleOrderLine(state: State, order: BattleOrderRecord): string {
  if (order.skill === AUTO) return `${battleUnitLabel(state, order.key)}のおまかせ：行動前に${order.rejection === 'defeated' ? '戦闘不能' : '戦闘終了'}（特技・対象は未決定）`;
  const reason = order.rejection === 'no-opponents' ? '相手なし' : order.rejection === 'invalid-skill' ? '不正な特技' : order.rejection === 'invalid-target' ? '不正な対象' : order.rejection ? skillUnavailableLabel(order.rejection) : 'MP不足';
  return `${battleUnitLabel(state, order.key)}の指示：「${order.skillName ?? `特技 ${order.skill}`}」${order.target ? ` → ${battleUnitLabel(state, order.target)}` : ''}${order.accepted ? order.source === 'automatic' && order.decisionPriority !== undefined ? `（行動時に判断・実行順 ${order.decisionPriority}）` : order.source === 'automatic' ? '（ターン開始時の指示）' : '（実行予定）' : `（取り消し：${reason}）`}`;
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
