import type { StorageRecord, TransactionalStorage, TransactionResult } from './storage';
/** Test/development fake only. One shared instance simulates one database, including
 * independent adapter clients. Separate instances do not coordinate. No browser I/O. */
export class FakeTransactionalStorage implements TransactionalStorage {
  private record: StorageRecord;
  private tail: Promise<unknown> = Promise.resolve();
  private failure: 'read' | 'write' | null = null;
  constructor(seed: Partial<StorageRecord> = {}) {
    this.record = { head: null, backup: null, legacyRaw: null, ...seed };
  }
  failNext(stage: 'read' | 'write') { this.failure = stage; }
  inspect(): StorageRecord { return structuredClone(this.record); }
  transaction<T>(change: (current: StorageRecord) => TransactionResult<T>): Promise<T> {
    const job = this.tail.then(() => {
      if (this.failure === 'read') { this.failure = null; throw new Error('Injected read failure'); }
      const before = this.inspect();
      const next = change(before);
      if (this.failure === 'write' && JSON.stringify(next.record) !== JSON.stringify(this.record)) {
        this.failure = null; throw new Error('Injected quota/write failure');
      }
      // Copy before assignment: even a cloning error leaves all fields unchanged.
      const record = structuredClone(next.record), result = structuredClone(next.result);
      this.record = record;
      return result;
    });
    this.tail = job.catch(() => undefined);
    return job;
  }
}
