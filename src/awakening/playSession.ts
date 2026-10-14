import { monsters, start, type State } from '../engine';
import { approvedTrialRules, deriveAwakeningMonster, STAT_RULE_VERSION, type BattleCompletion } from './domain';
import { AwakeningStorage, StorageError, type Snapshot, type Command } from './storage';

export const AWAKENING_DATABASE = 'kanshu-awakening-v1';
export const rosterIds = monsters.map(monster => String(monster.id));
export const trialRules = approvedTrialRules();
/** Owns one real engine lifecycle. No navigation/render callback can invent a result. */
export class AwakeningPlaySession {
  snapshot: Snapshot | null = null;
  sequence: number | null = null;
  pending: { sequence: number; completion: BattleCompletion } | null = null;
  private busy = false;
  constructor(readonly storage: AwakeningStorage) {}
  async load() { this.snapshot = await this.storage.initialize(); return this.snapshot; }
  async begin(team: number[], enemy: number[], seed: number, mode: string): Promise<State> {
    if (this.busy || this.sequence !== null || this.pending) throw new Error('対戦の保存を確認してください');
    this.busy = true;
    try {
      const snapshot = await this.load();
      const allyAwakening = Object.fromEntries(Object.entries(snapshot.progress.monsters).map(([id, progress]) => [id, progress.level]));
      const allyAwakeningStats = Object.fromEntries(monsters.map(base => { const grown = deriveAwakeningMonster(base, allyAwakening[String(base.id)] ?? 0); return [String(base.id), { hp: grown.hp, atk: grown.atk }]; }));
      const state = start(team, enemy, seed, { leaders: true, allyAwakeningStats });
      const result = await this.storage.dispatch(snapshot.token, { kind: 'begin', context: {
        initialStateJson: JSON.stringify({ state, allyAwakening }), mode, teamId: 'party-' + team.join('-'), statRuleVersion: STAT_RULE_VERSION,
      } });
      this.snapshot = result.snapshot; this.sequence = result.snapshot.progress.activeBattle!.sequence;
      return state;
    } finally { this.busy = false; }
  }
  /** Called directly with advanceWithEvents(...).state, before visual playback. */
  terminal(state: State): Promise<void> {
    if (!state.winner || this.sequence === null) return Promise.resolve();
    if (!this.pending) this.pending = { sequence: this.sequence, completion: { kind: 'engine-terminal', engineState: { winner: state.winner } } };
    return this.flush();
  }
  abandon(): Promise<void> {
    if (this.sequence === null) return Promise.resolve();
    // A terminal engine result already earned takes precedence over a later navigation.
    this.pending ??= { sequence: this.sequence, completion: { kind: 'abandoned' } };
    return this.flush();
  }
  async flush(): Promise<void> {
    if (!this.pending || this.busy) return;
    this.busy = true;
    try {
      const pending = this.pending;
      const loaded = await this.storage.load();
      if (loaded.status !== 'ready') throw new StorageError('blocked', '保存データを確認してください');
      const result = await this.storage.dispatch(loaded.snapshot.token, { kind: 'settle', ...pending });
      this.snapshot = result.snapshot; this.pending = null; this.sequence = null;
    } finally { this.busy = false; }
  }
  async command(token: string, command: Command) {
    if (this.busy || this.sequence !== null || this.pending) throw new Error('対戦の保存を確認してください');
    this.busy = true;
    try { this.snapshot = (await this.storage.dispatch(token, command)).snapshot; }
    finally { this.busy = false; }
  }
  /** Explicit recovery choice after reload; never grants rewards or rewinds a backup. */
  async discardInterrupted(token: string, sequence: number) {
    await this.command(token, { kind: 'settle', sequence, completion: { kind: 'abandoned' } });
  }
}
