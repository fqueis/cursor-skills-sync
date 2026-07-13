import type * as vscode from 'vscode';
import { SYNC_STATE_KEY } from '@constants';

/** Persisted baseline after a successful sync. */
export interface SyncState {
  lastSyncedCommitSha: string;
  lastLocalSnapshotHash: string;
  repo: string;
  syncedAt: string;
}

/**
 * Stores and loads the per-machine sync baseline from extension globalState.
 */
export class SyncStateStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Returns the stored sync state, or `undefined` when never synced.
   */
  get(): SyncState | undefined {
    return this.context.globalState.get<SyncState>(SYNC_STATE_KEY);
  }

  /**
   * Persists a successful sync baseline.
   */
  async save(state: SyncState): Promise<void> {
    await this.context.globalState.update(SYNC_STATE_KEY, state);
  }

  /**
   * Clears the baseline (e.g. after changing repositories).
   */
  async clear(): Promise<void> {
    await this.context.globalState.update(SYNC_STATE_KEY, undefined);
  }
}
