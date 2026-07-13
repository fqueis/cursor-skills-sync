import type { SyncState } from '@sync/state-store';

/**
 * Returns true when both local and remote advanced since the stored baseline.
 */
export function isBilateralConflict(options: {
  state: SyncState | undefined;
  remoteCommitSha: string;
  localSnapshotHash: string;
  repo: string;
}): boolean {
  const { state, remoteCommitSha, localSnapshotHash, repo } = options;
  if (!state || state.repo !== repo) {
    return false;
  }

  const remoteChanged = state.lastSyncedCommitSha !== remoteCommitSha;
  const localChanged = state.lastLocalSnapshotHash !== localSnapshotHash;
  return remoteChanged && localChanged;
}
