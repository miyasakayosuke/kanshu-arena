/** Isolated persistence candidate. No browser globals or default backend. */
import * as D from './domain';

/** All fields belong to ONE transactional record. legacyRaw is never changed. */
export interface StorageRecord { head: string | null; backup: string | null; legacyRaw: string | null }
export interface TransactionResult<T> { record: StorageRecord; result: T }
/** Implementations MUST serialize read/transition/commit across every writer, abort
 * entirely on failure, and resolve only after commit. Callback is synchronous and
 * may be retried: it must have no external side effects. localStorage is NOT an
 * implementation of this contract. A future IndexedDB readwrite transaction can be. */
export interface TransactionalStorage {
  transaction<T>(change: (current: StorageRecord) => TransactionResult<T>): Promise<T>;
}
interface Envelope { storageVersion: 1; revision: number; marker: 'awakening-schema-1'; progress: D.Progress }
export class StorageError extends Error {
  constructor(public readonly code: 'blocked' | 'stale' | 'unavailable' | 'overflow', message: string) { super(message); }
}
export interface Snapshot { revision: number; token: string; progress: D.Progress }
export type LoadResult =
  | { status: 'ready'; snapshot: Snapshot }
  | { status: 'empty' }
  | { status: 'blocked'; reason: string; recovery: Snapshot | null };
export type Command =
  | { kind: 'begin'; context: D.BattleContext }
  | { kind: 'settle'; sequence: number; completion: D.BattleCompletion }
  | { kind: 'upgrade'; speciesId: string; expectedLevel: number }
  | { kind: 'claim'; selectionId: string; speciesId: string };
function decode(raw: string): Envelope {
  try {
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'marker,progress,revision,storageVersion'
    || value.storageVersion !== 1 || value.marker !== 'awakening-schema-1'
    || !Number.isSafeInteger(value.revision) || value.revision < 1) {
    throw new StorageError('blocked', 'Unsupported or corrupt storage envelope');
  }
  D.validateProgress(value.progress);
  return value;
  } catch (error) {
    throw new StorageError('blocked', error instanceof Error ? error.message : 'Corrupt envelope');
  }
}
function snapshot(raw: string, value = decode(raw)): Snapshot {
  return { revision: value.revision, token: raw, progress: structuredClone(value.progress) };
}
function bump(revision: number): number {
  if (revision === Number.MAX_SAFE_INTEGER) throw new StorageError('overflow', 'Revision exhausted');
  return revision + 1;
}
function encode(progress: D.Progress, revision: number): string {
  D.validateProgress(progress);
  return JSON.stringify({ storageVersion: 1, revision, marker: 'awakening-schema-1', progress } satisfies Envelope);
}

export class AwakeningStorage {
  private readonly rosterIds: readonly string[];
  private readonly rules: D.EconomyRules;
  constructor(private readonly storage: TransactionalStorage, rosterIds: readonly string[], rules: D.EconomyRules) {
    // Validate and clone caller-owned configuration; no implicit economy defaults.
    D.createProgress(rosterIds, rules);
    this.rosterIds = [...rosterIds]; this.rules = structuredClone(rules);
  }
  private compatible(value: Envelope) {
    if (value.progress.economyRuleVersion !== this.rules.version) throw new StorageError('blocked', 'Economy migration required');
  }
  private async transact<T>(change: (current: StorageRecord) => TransactionResult<T>): Promise<T> {
    try { return await this.storage.transaction(change); }
    catch (error) {
      if (error instanceof StorageError || error instanceof D.AwakeningError) throw error;
      throw new StorageError('unavailable', 'Storage transaction failed; reload before retrying');
    }
  }
  /** Read-only; recovery is a preview, never a writable snapshot. */
  async load(): Promise<LoadResult> {
    return this.transact<LoadResult>(record => {
      try {
        if (record.head === null) {
          if (record.backup !== null) throw new StorageError('blocked', 'Missing head with retained backup');
          // Pending legacy import must be validated by initialize; never treated as usable state.
          return { record, result: { status: 'empty' } };
        }
        const value = decode(record.head); this.compatible(value);
        if (this.rosterIds.some(id => !Object.hasOwn(value.progress.monsters, id))) throw new StorageError('blocked', 'Roster migration required');
        return { record, result: { status: 'ready', snapshot: snapshot(record.head, value) } };
      } catch (error) {
        let recovery: Snapshot | null = null;
        try { if (record.backup !== null) { const value = decode(record.backup); this.compatible(value); recovery = snapshot(record.backup, value); } } catch { /* preserve raw bytes, fail closed */ }
        return { record, result: { status: 'blocked', reason: error instanceof Error ? error.message : 'Invalid data', recovery } };
      }
    });
  }
  /** Idempotent initialization/roster migration. Team data is not read or written.
   * Backups retain the exact previous envelope; original legacy bytes stay intact. */
  async initialize(): Promise<Snapshot> {
    return this.transact(record => {
      if (record.head === null && record.backup !== null) throw new StorageError('blocked', 'Recovery requires reconciliation, not reinitialization');
      const current = record.head === null ? null : decode(record.head);
      if (current) this.compatible(current);
      const plan = D.planMigration(current ? JSON.stringify(current.progress) : record.legacyRaw, null, this.rosterIds, this.rules);
      if (plan.status !== 'ready') throw new StorageError('blocked', plan.reason);
      if (current && JSON.stringify(plan.state) === JSON.stringify(current.progress)) return { record, result: snapshot(record.head!, current) };
      const raw = encode(plan.state, current ? bump(current.revision) : 1);
      return { record: { ...record, head: raw, backup: record.head ?? record.backup }, result: snapshot(raw) };
    });
  }
  /** expectedToken is the exact head obtained by load/initialize, not just a level.
   * No reward/UI success may be displayed before this promise resolves. */
  async dispatch(expectedToken: string, input: Command): Promise<{ snapshot: Snapshot; receipt: D.Receipt | null; duplicate: boolean }> {
    const command = structuredClone(input);
    return this.transact<{ snapshot: Snapshot; receipt: D.Receipt | null; duplicate: boolean }>(record => {
      if (record.head === null) throw new StorageError('blocked', 'Initialize first');
      const value = decode(record.head); this.compatible(value);
      if (this.rosterIds.some(id => !Object.hasOwn(value.progress.monsters, id))) throw new StorageError('blocked', 'Roster migration required');
      // Only the exact latest settlement may replay with a stale token. Domain returns
      // its stored receipt without using the changed completion or granting anything.
      if (command.kind === 'settle' && value.progress.receipt?.sequence === command.sequence) {
        const replay = D.settleBattle(value.progress, command.sequence, command.completion);
        return { record, result: { snapshot: snapshot(record.head, value), receipt: replay.receipt, duplicate: true } };
      }
      if (record.head !== expectedToken) throw new StorageError('stale', 'State changed; reload and review');
      let progress: D.Progress; let receipt: D.Receipt | null = null;
      switch (command.kind) {
        case 'begin': progress = D.beginBattle(value.progress, command.context, this.rules); break;
        case 'settle': { const result = D.settleBattle(value.progress, command.sequence, command.completion); progress = result.state; receipt = result.receipt; break; }
        case 'upgrade': progress = D.upgradeOnce(value.progress, command.speciesId, command.expectedLevel, this.rosterIds, this.rules); break;
        case 'claim': progress = D.claimSelection(value.progress, command.selectionId, command.speciesId, this.rosterIds, this.rules); break;
        default: throw new StorageError('blocked', 'Unknown command');
      }
      const raw = encode(progress, bump(value.revision));
      return { record: { ...record, backup: record.head, head: raw }, result: { snapshot: snapshot(raw), receipt, duplicate: false } };
    });
  }
}
