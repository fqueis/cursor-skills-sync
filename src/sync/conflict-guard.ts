import * as vscode from 'vscode';
import { isBilateralConflict } from '@sync/conflict-logic';
import type { SyncState } from '@sync/state-store';

export type ConflictDecision = 'force' | 'cancel';

/**
 * Detects bilateral changes since the last successful sync and asks the user
 * whether to force the requested direction.
 */
export class ConflictGuard {
  /**
   * Returns true when both local and remote advanced since the stored baseline.
   */
  isBilateralConflict(options: {
    state: SyncState | undefined;
    remoteCommitSha: string;
    localSnapshotHash: string;
    repo: string;
  }): boolean {
    return isBilateralConflict(options);
  }

  /**
   * Prompts the user to force the operation or cancel.
   */
  async confirmForce(direction: 'push' | 'pull'): Promise<ConflictDecision> {
    const actionLabel = direction === 'push' ? 'Force Push' : 'Force Pull';
    const detail =
      direction === 'push'
        ? 'Both local and remote skills changed since the last sync. Force Push will overwrite the remote skills/ tree.'
        : 'Both local and remote skills changed since the last sync. Force Pull will overwrite your local skills folder.';

    const choice = await vscode.window.showWarningMessage(
      detail,
      { modal: true },
      actionLabel,
      'Cancel',
    );

    return choice === actionLabel ? 'force' : 'cancel';
  }
}
