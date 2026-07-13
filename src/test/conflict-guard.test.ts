import { describe, expect, it } from 'vitest';
import { isBilateralConflict } from '@sync/conflict-logic';
import type { SyncState } from '@sync/state-store';

describe('isBilateralConflict', () => {
  const state: SyncState = {
    lastSyncedCommitSha: 'commit-a',
    lastLocalSnapshotHash: 'hash-a',
    repo: 'acme/skills',
    syncedAt: '2026-01-01T00:00:00.000Z',
  };

  it('returns false when there is no baseline', () => {
    expect(
      isBilateralConflict({
        state: undefined,
        remoteCommitSha: 'commit-b',
        localSnapshotHash: 'hash-b',
        repo: 'acme/skills',
      }),
    ).toBe(false);
  });

  it('returns true when both sides changed for the same repo', () => {
    expect(
      isBilateralConflict({
        state,
        remoteCommitSha: 'commit-b',
        localSnapshotHash: 'hash-b',
        repo: 'acme/skills',
      }),
    ).toBe(true);
  });

  it('returns false when only remote changed', () => {
    expect(
      isBilateralConflict({
        state,
        remoteCommitSha: 'commit-b',
        localSnapshotHash: 'hash-a',
        repo: 'acme/skills',
      }),
    ).toBe(false);
  });
});
