/** Isolated candidate: no default browser global and no production imports. */
import type { StorageRecord, TransactionalStorage, TransactionResult } from './storage';

const STORE = 'awakening-record';
const KEY = 'state';
const VERSION = 1;
function record(value: unknown): StorageRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'backup,head,legacyRaw') {
    throw new Error('Unsupported awakening record');
  }
  const data = value as StorageRecord;
  for (const field of ['head', 'backup', 'legacyRaw'] as const) {
    if (data[field] !== null && typeof data[field] !== 'string') throw new Error('Corrupt awakening record');
  }
  return { head: data.head, backup: data.backup, legacyRaw: data.legacyRaw };
}
function same(a: StorageRecord, b: StorageRecord) {
  return a.head === b.head && a.backup === b.backup && a.legacyRaw === b.legacyRaw;
}

/** Every operation opens its own connection and closes it at the terminal event.
 * Serialization belongs to IndexedDB, not a process-local queue. Use the SAME
 * dedicated database name for all clients. Do not use a team-save database.
 * legacyRaw is an explicit captured input, never read from localStorage here.
 * It seeds only a missing record and becomes durable with the first changed write.
 */
export class IndexedDbTransactionalStorage implements TransactionalStorage {
  constructor(
    private readonly factory: IDBFactory,
    private readonly databaseName: string,
    private readonly legacyRaw: string | null = null,
  ) {
    if (!factory || typeof factory.open !== 'function') throw new Error('IndexedDB unavailable');
    if (typeof databaseName !== 'string' || !databaseName.trim()) throw new Error('Dedicated database name required');
    if (legacyRaw !== null && typeof legacyRaw !== 'string') throw new Error('Invalid legacy bytes');
  }

  transaction<T>(change: (current: StorageRecord) => TransactionResult<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let db: IDBDatabase | undefined;
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        db?.close();
        reject(error ?? new Error('IndexedDB operation failed'));
      };
      let request: IDBOpenDBRequest;
      try { request = this.factory.open(this.databaseName, VERSION); }
      catch (error) { fail(error); return; }
      request.onerror = () => fail(request.error);
      // An open request cannot be cancelled. Reject promptly, then abort any late
      // upgrade and close any late connection rather than executing the callback.
      request.onblocked = () => fail(new Error('IndexedDB open blocked; close older clients and retry'));
      request.onupgradeneeded = event => {
        db = request.result;
        try {
          if (settled || event.oldVersion !== 0 || db.objectStoreNames.length !== 0) {
            throw new Error('Unsupported IndexedDB schema');
          }
          db.createObjectStore(STORE);
        } catch (error) {
          request.transaction?.abort();
          fail(error);
        }
      };
      request.onsuccess = () => {
        db = request.result;
        if (settled) { db.close(); return; }
        db.onversionchange = () => db?.close();
        db.onclose = () => fail(new Error('IndexedDB connection closed unexpectedly'));
        let tx: IDBTransaction;
        try {
          if (db.version !== VERSION || db.objectStoreNames.length !== 1 || !db.objectStoreNames.contains(STORE)) {
            throw new Error('Unsupported IndexedDB schema');
          }
          tx = db.transaction(STORE, 'readwrite');
        } catch (error) { fail(error); return; }
        let result: T;
        let prepared = false;
        let failure: unknown;
        const abort = (error: unknown) => {
          failure = error;
          try { tx.abort(); } catch { fail(error); }
        };
        tx.onabort = () => fail(failure ?? tx.error ?? new Error('IndexedDB transaction aborted'));
        // Do not cancel the default abort or resolve/reject before its terminal event.
        tx.onerror = () => { failure ??= tx.error; };
        tx.oncomplete = () => {
          if (settled) return;
          if (!prepared) { fail(new Error('IndexedDB transaction completed without a result')); return; }
          settled = true;
          db?.close();
          resolve(result);
        };
        try {
          const store = tx.objectStore(STORE);
          if (store.keyPath !== null || store.autoIncrement || store.indexNames.length !== 0) {
            throw new Error('Unsupported IndexedDB object store');
          }
          const read = store.get(KEY);
          read.onerror = () => { failure = read.error; };
          read.onsuccess = () => {
            try {
              const before = read.result === undefined
                ? { head: null, backup: null, legacyRaw: this.legacyRaw }
                : record(read.result);
              const next = change({ ...before });
              // An async callback/thenable is not this synchronous contract.
              if (!next || typeof next !== 'object' || 'then' in next) throw new Error('Synchronous transition required');
              const after = record(next.record);
              if (after.legacyRaw !== before.legacyRaw) throw new Error('Legacy bytes are immutable');
              // Clone before put so an uncloneable result aborts without any write.
              result = structuredClone(next.result);
              if (!same(before, after)) {
                const write = store.put(after, KEY);
                write.onerror = () => { failure = write.error; };
              }
              prepared = true;
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    });
  }
}

