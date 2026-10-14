import { useEffect, useRef, useState } from 'react';
import { AwakeningStorage, type Snapshot, type Command } from './storage';
import { IndexedDbTransactionalStorage } from './indexedDbStorage';
import { AwakeningPlaySession, AWAKENING_DATABASE, rosterIds, trialRules } from './playSession';
import type { State } from '../engine';

export function useAwakening() {
  const [session] = useState(() => {
    try { return new AwakeningPlaySession(new AwakeningStorage(new IndexedDbTransactionalStorage(indexedDB, AWAKENING_DATABASE), rosterIds, trialRules)); }
    catch { return null; }
  });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(!!session);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState(session ? '育成データを確認中…' : 'この環境では育成を保存できません。対戦はできますが、素材は獲得できません。');
  const refresh = async () => {
    if (!session || lock.current) return;
    setLoading(true);
    try { setSnapshot(await session.load()); setMessage(''); }
    catch { setSnapshot(null); setMessage('育成データを読み込めません。保存内容は消していません。再読込を試してください。保存なしの対戦はできます。'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const run = async <T,>(action: () => Promise<T>, success = ''): Promise<T | null> => {
    if (lock.current) return null;
    lock.current = true; setBusy(true);
    try { const result = await action(); setSnapshot(session?.snapshot ?? null); setMessage(success); return result; }
    catch { setMessage('保存を完了できませんでした。素材は未確定です。再確認してから操作してください。'); return null; }
    finally { lock.current = false; setBusy(false); }
  };
  const terminal = (state: State) => {
    if (!session || !state.winner || session.sequence === null) return;
    void run(async () => { await session.terminal(state); }, '対戦報酬を保存しました。');
  };
  const abandon = () => {
    if (!session || session.sequence === null) return;
    // terminal() already owns the save while final playback runs.
    if (lock.current) return;
    const completed = session.pending?.completion.kind === 'engine-terminal';
    void run(() => session.abandon(), completed ? '対戦報酬を保存しました。' : '対戦を終了しました。途中終了の報酬はありません。');
  };
  return { session, snapshot, loading, busy, message, refresh, run, terminal, abandon,
    command: (token: string, command: Command) => run(() => session!.command(token, command), '育成データを保存しました。'),
    retry: () => run(async () => { if (session?.pending) await session.flush(); else if (session) await session.load(); }, '育成データを確認しました。'),
  };
}
export type AwakeningController = ReturnType<typeof useAwakening>;
