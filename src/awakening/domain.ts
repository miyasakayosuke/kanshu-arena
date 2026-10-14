/** Isolated candidate only. No persistence, UI integration, or anti-cheat authority. */
export const STAT_RULE_VERSION = '95-98-100-nearest-linear-preserve-zero-v1';
export const SCHEMA_VERSION = 1 as const;
export class AwakeningError extends Error {}
function requireThat(value: unknown, message: string): asserts value {
  if (!value) throw new AwakeningError(message);
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  requireThat(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max, 'Invalid integer');
}
function id(value: unknown): asserts value is string {
  requireThat(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value), 'Invalid identifier');
}
function object(value: unknown): asserts value is Record<string, unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected object');
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  requireThat(Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), 'Unexpected fields');
}
function add(a: number, b: number) { const value = a + b; integer(value); return value; }
export function validateLevel(level: unknown): asserts level is number { integer(level, 0, 99); }
export function awakeningRatio(level: number) {
  validateLevel(level);
  return level <= 4 ? { numerator: 380 + 3 * level, denominator: 380 }
    : { numerator: 9310 + 2 * (level - 4), denominator: 9025 };
}
export function awakeningStat(base: number, level: number) {
  integer(base, 1, 1_000_000);
  const { numerator, denominator } = awakeningRatio(level);
  return Math.floor((2 * base * numerator + denominator) / (2 * denominator));
}
/** Always supply the unmodified level-zero roster record; apply existing leader rules afterward. */
export function deriveAwakeningMonster<T extends { hp: number; atk: number }>(base: T, level: number): T {
  return { ...base, hp: awakeningStat(base.hp, level), atk: awakeningStat(base.atk, level) };
}
export function nextStatChange(base: number, level: number): { level: number; value: number } | null {
  const current = awakeningStat(base, level);
  for (let n = level + 1; n <= 99; n++) {
    const value = awakeningStat(base, n);
    if (value !== current) return { level: n, value };
  }
  return null;
}
export interface EconomyRules {
  version: string;
  /** Index is current level: exactly 99 entries for 0->1 through 98->99. */
  stepCosts: number[];
  completionCommon: number;
  winBonusCommon: number;
  selectionEveryWins: number;
  essencePerSelection: number;
}
/** Explicit opt-in trial fixture, NOT final policy and never an implicit default. */
export function proposedTrialRules(): EconomyRules {
  return { version: 'proposal-A-10-20-v1', stepCosts: Array.from({ length: 99 }, (_, n) => n < 4 ? 10 : 20),
    completionCommon: 1, winBonusCommon: 4, selectionEveryWins: 10, essencePerSelection: 10 };
}
export function validateRules(value: unknown): asserts value is EconomyRules {
  object(value); exactKeys(value, ['version', 'stepCosts', 'completionCommon', 'winBonusCommon', 'selectionEveryWins', 'essencePerSelection']);
  id(value.version); requireThat(Array.isArray(value.stepCosts) && value.stepCosts.length === 99, 'Expected 99 step costs');
  for (const cost of value.stepCosts) integer(cost, 1);
  integer(value.completionCommon); integer(value.winBonusCommon); integer(value.selectionEveryWins, 1); integer(value.essencePerSelection, 1);
  add(value.completionCommon, value.winBonusCommon);
}
export interface MonsterProgress { level: number; essence: number }
export interface Selection { id: string; atWins: number; amount: number }
export interface BattleContext {
  /** Caller freezes the actual starting engine state here, never a UI reconstruction. */
  initialStateJson: string;
  mode: string;
  teamId: string;
  statRuleVersion: typeof STAT_RULE_VERSION;
}
export interface ActiveBattle { sequence: number; context: BattleContext; rules: EconomyRules }
export type Outcome = 'win' | 'lose' | 'draw' | 'surrender' | 'abandoned';
export interface Receipt { sequence: number; outcome: Outcome; common: number; selection: Selection | null }
export interface Progress {
  schemaVersion: typeof SCHEMA_VERSION;
  statRuleVersion: typeof STAT_RULE_VERSION;
  economyRuleVersion: string;
  monsters: Record<string, MonsterProgress>;
  common: number;
  wins: number;
  selections: Selection[];
  nextBattleSequence: number;
  activeBattle: ActiveBattle | null;
  receipt: Receipt | null;
}
function validateContext(value: unknown): asserts value is BattleContext {
  object(value); exactKeys(value, ['initialStateJson', 'mode', 'teamId', 'statRuleVersion']);
  id(value.mode); id(value.teamId); requireThat(value.statRuleVersion === STAT_RULE_VERSION, 'Unsupported stat rules');
  requireThat(typeof value.initialStateJson === 'string' && value.initialStateJson.length > 0, 'Missing starting snapshot');
  const parsed: unknown = JSON.parse(value.initialStateJson); object(parsed);
}
function validateSelection(value: unknown): asserts value is Selection {
  object(value); exactKeys(value, ['id', 'atWins', 'amount']); id(value.id); integer(value.atWins, 1); integer(value.amount, 1);
  requireThat(value.id === `wins-${value.atWins}`, 'Invalid selection identity');
}
export function validateProgress(value: unknown): asserts value is Progress {
  object(value); exactKeys(value, ['schemaVersion','statRuleVersion','economyRuleVersion','monsters','common','wins','selections','nextBattleSequence','activeBattle','receipt']);
  requireThat(value.schemaVersion === SCHEMA_VERSION && value.statRuleVersion === STAT_RULE_VERSION, 'Unsupported schema/stat version');
  id(value.economyRuleVersion); object(value.monsters);
  for (const [key, monster] of Object.entries(value.monsters)) { id(key); object(monster); exactKeys(monster, ['level','essence']); validateLevel(monster.level); integer(monster.essence); }
  integer(value.common); integer(value.wins); integer(value.nextBattleSequence, 1);
  requireThat(value.wins <= value.nextBattleSequence - 1, 'Wins exceed started battles');
  requireThat(Array.isArray(value.selections), 'Invalid selections'); const seen = new Set<string>();
  for (const selection of value.selections) {
    validateSelection(selection); requireThat(selection.atWins <= value.wins && !seen.has(selection.id), 'Invalid/duplicate selection'); seen.add(selection.id);
  }
  requireThat(value.activeBattle === null || value.receipt === null, 'Active and completed battle overlap');
  requireThat(value.nextBattleSequence === 1 || value.activeBattle !== null || value.receipt !== null, 'Missing latest battle record');
  if (value.activeBattle !== null) {
    object(value.activeBattle); exactKeys(value.activeBattle, ['sequence','context','rules']); integer(value.activeBattle.sequence, 1);
    requireThat(value.activeBattle.sequence === value.nextBattleSequence - 1, 'Invalid active sequence');
    requireThat(value.wins < value.activeBattle.sequence, 'Wins include unfinished battle');
    validateContext(value.activeBattle.context); validateRules(value.activeBattle.rules);
    requireThat(value.activeBattle.rules.version === value.economyRuleVersion, 'Economy rule mismatch');
  }
  if (value.receipt !== null) {
    object(value.receipt); exactKeys(value.receipt, ['sequence','outcome','common','selection']); integer(value.receipt.sequence, 1);
    requireThat(value.receipt.sequence === value.nextBattleSequence - 1, 'Invalid receipt sequence');
    requireThat(['win','lose','draw','surrender','abandoned'].includes(value.receipt.outcome as string), 'Invalid outcome'); integer(value.receipt.common);
    if (value.receipt.outcome === 'win') requireThat(value.wins > 0, 'Win receipt without a win');
    else requireThat(value.wins < value.receipt.sequence, 'Wins include non-winning battle');
    if (value.receipt.selection !== null) { validateSelection(value.receipt.selection); requireThat(value.receipt.selection.atWins === value.wins && value.receipt.outcome === 'win', 'Invalid receipt selection'); }
    if (value.receipt.outcome === 'surrender' || value.receipt.outcome === 'abandoned') requireThat(value.receipt.common === 0 && value.receipt.selection === null, 'Ineligible reward');
  }
}
function clone<T>(value: T): T { return structuredClone(value); }
function knownSpecies(speciesId: string, rosterIds: readonly string[]) {
  id(speciesId); requireThat(rosterIds.includes(speciesId), 'Unknown current species');
}
export function createProgress(rosterIds: readonly string[], rules: EconomyRules): Progress {
  validateRules(rules); requireThat(new Set(rosterIds).size === rosterIds.length, 'Duplicate roster IDs');
  for (const speciesId of rosterIds) id(speciesId);
  return { schemaVersion: SCHEMA_VERSION, statRuleVersion: STAT_RULE_VERSION, economyRuleVersion: rules.version,
    monsters: Object.fromEntries(rosterIds.map(key => [key, { level: 0, essence: 0 }])), common: 0, wins: 0, selections: [],
    nextBattleSequence: 1, activeBattle: null, receipt: null };
}
function monsterFor(state: Progress, speciesId: string, rosterIds: readonly string[]) {
  knownSpecies(speciesId, rosterIds); requireThat(Object.hasOwn(state.monsters, speciesId), 'Species needs migration'); return state.monsters[speciesId];
}
export function previewUpgrade(state: Progress, speciesId: string, expectedLevel: number, rosterIds: readonly string[], rules: EconomyRules) {
  validateProgress(state); validateRules(rules); validateLevel(expectedLevel);
  requireThat(state.economyRuleVersion === rules.version, 'Economy version mismatch');
  requireThat(state.activeBattle === null, 'Battle must be settled first');
  const monster = monsterFor(state, speciesId, rosterIds);
  requireThat(monster.level === expectedLevel, 'Stale level'); requireThat(monster.level < 99, 'Already at maximum');
  const cost = rules.stepCosts[monster.level], essence = Math.min(monster.essence, cost), common = cost - essence;
  return { fromLevel: monster.level, toLevel: monster.level + 1, cost, essence, common, affordable: state.common >= common };
}
export function upgradeOnce(state: Progress, speciesId: string, expectedLevel: number, rosterIds: readonly string[], rules: EconomyRules): Progress {
  const quote = previewUpgrade(state, speciesId, expectedLevel, rosterIds, rules); requireThat(quote.affordable, 'Insufficient materials');
  const next = clone(state); next.monsters[speciesId].level = quote.toLevel; next.monsters[speciesId].essence -= quote.essence; next.common -= quote.common; return next;
}
export function claimSelection(state: Progress, selectionId: string, speciesId: string, rosterIds: readonly string[], rules: EconomyRules): Progress {
  validateProgress(state); validateRules(rules); id(selectionId);
  requireThat(state.economyRuleVersion === rules.version, 'Economy version mismatch');
  const monster = monsterFor(state, speciesId, rosterIds);
  requireThat(monster.level < 99, 'Already at maximum');
  requireThat(state.activeBattle === null, 'Battle must be settled first');
  const selection = state.selections.find(s => s.id === selectionId); requireThat(selection, 'Selection unavailable or already claimed');
  const remaining = rules.stepCosts.slice(monster.level).reduce(add, 0);
  requireThat(add(monster.essence, selection.amount) <= remaining, 'Selection exceeds remaining material need');
  const next = clone(state); next.monsters[speciesId].essence = add(next.monsters[speciesId].essence, selection.amount);
  next.selections = next.selections.filter(s => s.id !== selectionId); return next;
}
/** Caller must read, transition and persist in ONE transaction. Pure transitions alone do not serialize tabs. */
export function beginBattle(state: Progress, context: BattleContext, rules: EconomyRules): Progress {
  validateProgress(state); validateContext(context); validateRules(rules);
  requireThat(state.activeBattle === null, 'Another battle is active'); requireThat(state.economyRuleVersion === rules.version, 'Economy version mismatch');
  const next = clone(state); next.activeBattle = { sequence: state.nextBattleSequence, context: clone(context), rules: clone(rules) };
  next.nextBattleSequence = add(state.nextBattleSequence, 1); next.receipt = null; return next;
}
/** Must come from the authoritative engine instance bound to this sequence/snapshot, NOT result-screen text.
 * This boundary cannot authenticate client-supplied values; it is not online anti-cheat. */
export type BattleCompletion =
  | { kind: 'engine-terminal'; engineState: { winner: 'win' | 'lose' | 'draw' | null } }
  | { kind: 'surrender' | 'abandoned' };
export function settleBattle(state: Progress, sequence: number, completion: BattleCompletion): { state: Progress; receipt: Receipt; duplicate: boolean } {
  validateProgress(state); integer(sequence, 1);
  // A repeated receipt is returned as stored; even a changed caller result cannot grant twice.
  if (state.receipt?.sequence === sequence) return { state: clone(state), receipt: clone(state.receipt), duplicate: true };
  requireThat(state.activeBattle?.sequence === sequence, 'No matching active battle');
  let outcome: Outcome;
  if (completion?.kind === 'engine-terminal') {
    const winner = completion.engineState?.winner; requireThat(winner === 'win' || winner === 'lose' || winner === 'draw', 'Engine has not reached a valid terminal result'); outcome = winner;
  } else { requireThat(completion?.kind === 'surrender' || completion?.kind === 'abandoned', 'Invalid completion'); outcome = completion.kind; }
  const next = clone(state), rules = state.activeBattle.rules;
  const eligible = outcome === 'win' || outcome === 'lose' || outcome === 'draw';
  const common = eligible ? add(rules.completionCommon, outcome === 'win' ? rules.winBonusCommon : 0) : 0;
  let selection: Selection | null = null;
  next.common = add(next.common, common);
  if (outcome === 'win') {
    next.wins = add(next.wins, 1);
    if (next.wins % rules.selectionEveryWins === 0) { selection = { id: `wins-${next.wins}`, atWins: next.wins, amount: rules.essencePerSelection }; next.selections.push(selection); }
  }
  const receipt: Receipt = { sequence, outcome, common, selection }; next.activeBattle = null; next.receipt = clone(receipt);
  validateProgress(next); return { state: next, receipt: clone(receipt), duplicate: false };
}
export type MigrationPlan<T> =
  | { status: 'ready'; state: Progress; existingTeamSave: T; backupRaw: string | null; requiresAtomicBackup: boolean; marker: string }
  | { status: 'blocked'; existingTeamSave: T; preservedRaw: string; reason: string };
/** A plan only: no browser/storage access. Storage must atomically commit backup+marker+state before use.
 * No older awakening schema ever shipped: unknown versions are deliberately blocked, never reset.
 * The existing team save is returned by identity and never interpreted or written. */
export function planMigration<T>(raw: string | null, existingTeamSave: T, rosterIds: readonly string[], rules: EconomyRules): MigrationPlan<T> {
  try {
    const fresh = createProgress(rosterIds, rules);
    if (raw === null) return { status: 'ready', state: fresh, existingTeamSave, backupRaw: null, requiresAtomicBackup: false, marker: 'awakening-schema-1' };
    const parsed: unknown = JSON.parse(raw); validateProgress(parsed);
    requireThat(parsed.economyRuleVersion === rules.version, 'Economy version requires an explicit migration');
    const next = clone(parsed); let changed = false;
    for (const speciesId of rosterIds) if (!Object.hasOwn(next.monsters, speciesId)) { Object.defineProperty(next.monsters, speciesId, { value: { level: 0, essence: 0 }, enumerable: true, writable: true, configurable: true }); changed = true; }
    return { status: 'ready', state: next, existingTeamSave, backupRaw: changed ? raw : null, requiresAtomicBackup: changed, marker: 'awakening-schema-1' };
  } catch (error) {
    return { status: 'blocked', existingTeamSave, preservedRaw: raw ?? '', reason: error instanceof Error ? error.message : 'Invalid data' };
  }
}
