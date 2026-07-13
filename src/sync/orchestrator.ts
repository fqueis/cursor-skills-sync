import * as vscode from 'vscode';
import { parseOwnerRepo, Settings } from '@config/settings';
import { GITHUB_NEW_REPO_URL } from '@constants';
import { hashSkillFiles } from '@fs/local-skills-fs';
import { MultiRootSkillsFs } from '@fs/multi-root-skills-fs';
import { GitHubAuth } from '@github/auth';
import { GitHubSkillsRepo } from '@github/skills-repo';
import { ConflictGuard } from '@sync/conflict-guard';
import {
  diffSkillFiles,
  formatDiffSummary,
  hasDiffChanges,
} from '@sync/diff-service';
import { SyncStateStore } from '@sync/state-store';

export type StartupStatus =
  | 'setup_needed'
  | 'auth_needed'
  | 'in_sync'
  | 'diverged'
  | 'error';

export interface StartupCheckResult {
  status: StartupStatus;
  message?: string;
}

/**
 * Application use-cases for push, pull, setup, and startup checks.
 */
export class SyncOrchestrator {
  private readonly settings = new Settings();
  private readonly conflictGuard = new ConflictGuard();

  constructor(
    private readonly stateStore: SyncStateStore,
    private readonly auth: GitHubAuth,
  ) {}

  /**
   * Returns whether a GitHub repository is configured.
   */
  isConfigured(): boolean {
    return !!this.settings.getGithubRepository();
  }

  /**
   * Updates or replaces the stored fine-grained GitHub PAT.
   */
  async updateToken(): Promise<boolean> {
    const repo = this.settings.getGithubRepository();
    const token = await this.auth.promptAndStoreToken(repo);
    if (!token) {
      return false;
    }

    if (repo) {
      const parsed = parseOwnerRepo(repo);
      if (parsed) {
        try {
          await GitHubSkillsRepo.connect(token, parsed.owner, parsed.repo);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Token saved, but it cannot access ${repo}: ${message}`,
          );
          return false;
        }
      }
    }

    vscode.window.showInformationMessage(
      'GitHub token saved securely (single-repo fine-grained PAT).',
    );
    return true;
  }

  /**
   * Interactive repository setup using a single-repo fine-grained PAT.
   */
  async setupRepository(): Promise<boolean> {
    const action = await vscode.window.showQuickPick(
      [
        {
          label: '$(repo-create) Create a new empty private repository',
          description: 'Opens GitHub; then connect it here',
          id: 'create' as const,
        },
        {
          label: '$(repo) Use an existing empty or SkillBridge repository',
          description: 'owner/repo: empty, or already synced by SkillBridge',
          id: 'existing' as const,
        },
      ],
      {
        placeHolder:
          'SkillBridge only uses one repository (via a fine-grained PAT)',
      },
    );

    if (!action) {
      return false;
    }

    if (action.id === 'create') {
      const open = await vscode.window.showInformationMessage(
        'Create a new private repository on GitHub (leave it empty). Then come back and enter owner/repo.',
        'Open GitHub',
        'Continue',
        'Cancel',
      );
      if (!open || open === 'Cancel') {
        return false;
      }
      if (open === 'Open GitHub') {
        await vscode.env.openExternal(vscode.Uri.parse(GITHUB_NEW_REPO_URL));
      }
    }

    const input = await vscode.window.showInputBox({
      prompt: 'Enter owner/repository',
      placeHolder: 'your-user/cursor-skills',
      ignoreFocusOut: true,
      value: this.settings.getGithubRepository() ?? '',
    });
    if (!input) {
      return false;
    }

    const parsed = parseOwnerRepo(input);
    if (!parsed) {
      vscode.window.showErrorMessage(
        'Invalid repository format. Use owner/repo.',
      );
      return false;
    }

    const repoKey = `${parsed.owner}/${parsed.repo}`;
    const token = await this.auth.promptAndStoreToken(repoKey);
    if (!token) {
      vscode.window.showErrorMessage(
        'A fine-grained GitHub PAT limited to this repository is required.',
      );
      return false;
    }

    try {
      const { client, ref } = await GitHubSkillsRepo.connect(
        token,
        parsed.owner,
        parsed.repo,
      );
      const inspection = await client.inspectEligibility(ref.defaultBranch);

      if (inspection.eligibility === 'foreign') {
        vscode.window.showErrorMessage(
          [
            `${repoKey} is not empty and is not a SkillBridge skills repository.`,
            'Use a brand-new empty private repo, or an existing repo already managed by SkillBridge',
            '(README contains the SkillBridge marker from a previous sync).',
          ].join(' '),
        );
        return false;
      }

      if (inspection.eligibility === 'empty') {
        await client.seedEmptyRepository(ref.defaultBranch);
        vscode.window.showInformationMessage(
          `Initialized empty repository ${repoKey} for SkillBridge.`,
        );
      } else {
        vscode.window.showInformationMessage(
          `Connected to existing SkillBridge repository ${repoKey}.`,
        );
      }

      await this.settings.setGithubRepository(repoKey);
      await this.stateStore.clear();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to configure repository: ${message}`,
      );
      return false;
    }
  }

  /**
   * Silent startup comparison used by the status bar.
   */
  async checkStartup(): Promise<StartupCheckResult> {
    const repo = this.settings.getGithubRepository();
    if (!repo) {
      return { status: 'setup_needed', message: 'Setup needed' };
    }

    const token = await this.auth.getAccessToken(false);
    if (!token) {
      return {
        status: 'auth_needed',
        message: 'Add a fine-grained GitHub PAT',
      };
    }

    try {
      const parsed = parseOwnerRepo(repo);
      if (!parsed) {
        return { status: 'setup_needed', message: 'Invalid repository config' };
      }

      const { client, ref } = await GitHubSkillsRepo.connect(
        token,
        parsed.owner,
        parsed.repo,
      );
      const remote = await client.getSkillsSnapshot(ref.defaultBranch);
      const localFs = new MultiRootSkillsFs(this.settings.getSkillsRoots());
      const local = await localFs.readAll();
      const localHash = hashSkillFiles(local.files);
      const state = this.stateStore.get();

      const remoteChanged =
        !state ||
        state.repo !== repo ||
        state.lastSyncedCommitSha !== remote.commitSha;
      const localChanged =
        !state ||
        state.repo !== repo ||
        state.lastLocalSnapshotHash !== localHash;

      if (!remoteChanged && !localChanged) {
        return { status: 'in_sync', message: 'In sync' };
      }

      return {
        status: 'diverged',
        message: 'Skills out of sync',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'error', message };
    }
  }

  /**
   * Pushes local skills to GitHub (mirror under skills/ + managed README).
   */
  async push(): Promise<boolean> {
    return this.runWithProgress('Pushing skills to GitHub...', async () => {
      const ctx = await this.resolveContext(true);
      if (!ctx) {
        return false;
      }

      const localFs = new MultiRootSkillsFs(this.settings.getSkillsRoots());
      const local = await localFs.readAll();
      this.warnSkipped(local.skipped);

      const remote = await ctx.client.getSkillsSnapshot(ctx.ref.defaultBranch);
      const localHash = hashSkillFiles(local.files);
      const repoKey = `${ctx.ref.owner}/${ctx.ref.repo}`;

      if (
        this.conflictGuard.isBilateralConflict({
          state: this.stateStore.get(),
          remoteCommitSha: remote.commitSha,
          localSnapshotHash: localHash,
          repo: repoKey,
        })
      ) {
        const decision = await this.conflictGuard.confirmForce('push');
        if (decision === 'cancel') {
          return false;
        }
      }

      const diff = diffSkillFiles(remote.files, local.files);
      if (!hasDiffChanges(diff) && this.stateStore.get()?.repo === repoKey) {
        // Still refresh README / baseline when user explicitly pushes.
      }

      const confirmed = await this.confirmDiff(
        'Push will update the remote skills/ tree',
        diff,
        'Push',
      );
      if (!confirmed) {
        return false;
      }

      const newCommitSha = await ctx.client.pushSkillsMirror({
        branch: ctx.ref.defaultBranch,
        files: local.files,
        commitMessage: 'chore: sync skills via SkillBridge',
        includeGitkeepWhenEmpty: local.files.length === 0,
        expectedHeadSha: remote.commitSha,
      });

      await this.stateStore.save({
        lastSyncedCommitSha: newCommitSha,
        lastLocalSnapshotHash: localHash,
        repo: repoKey,
        syncedAt: new Date().toISOString(),
      });

      vscode.window.showInformationMessage('Push completed successfully.');
      return true;
    });
  }

  /**
   * Pulls remote skills and mirrors them onto the local folder.
   */
  async pull(): Promise<boolean> {
    return this.runWithProgress('Pulling skills from GitHub...', async () => {
      const ctx = await this.resolveContext(true);
      if (!ctx) {
        return false;
      }

      const localFs = new MultiRootSkillsFs(this.settings.getSkillsRoots());
      await localFs.ensureRoots();
      const local = await localFs.readAll();
      this.warnSkipped(local.skipped);

      const remote = await ctx.client.getSkillsSnapshot(ctx.ref.defaultBranch);
      const localHash = hashSkillFiles(local.files);
      const repoKey = `${ctx.ref.owner}/${ctx.ref.repo}`;

      if (
        this.conflictGuard.isBilateralConflict({
          state: this.stateStore.get(),
          remoteCommitSha: remote.commitSha,
          localSnapshotHash: localHash,
          repo: repoKey,
        })
      ) {
        const decision = await this.conflictGuard.confirmForce('pull');
        if (decision === 'cancel') {
          return false;
        }
      }

      const diff = diffSkillFiles(local.files, remote.files);
      if (!hasDiffChanges(diff)) {
        vscode.window.showInformationMessage('Local skills are already up to date.');
        await this.stateStore.save({
          lastSyncedCommitSha: remote.commitSha,
          lastLocalSnapshotHash: hashSkillFiles(remote.files),
          repo: repoKey,
          syncedAt: new Date().toISOString(),
        });
        return true;
      }

      const confirmed = await this.confirmDiff(
        'Pull will mirror remote skills onto your local folder',
        diff,
        'Pull',
      );
      if (!confirmed) {
        return false;
      }

      await localFs.writeAll(remote.files);
      if (diff.deleted.length > 0) {
        await localFs.deletePaths(diff.deleted);
      }

      await this.stateStore.save({
        lastSyncedCommitSha: remote.commitSha,
        lastLocalSnapshotHash: hashSkillFiles(remote.files),
        repo: repoKey,
        syncedAt: new Date().toISOString(),
      });

      vscode.window.showInformationMessage('Pull completed successfully.');
      return true;
    });
  }

  private async resolveContext(createIfNone: boolean): Promise<
    | {
        client: GitHubSkillsRepo;
        ref: { owner: string; repo: string; defaultBranch: string };
      }
    | undefined
  > {
    let repo = this.settings.getGithubRepository();
    if (!repo) {
      const configured = await this.setupRepository();
      if (!configured) {
        return undefined;
      }
      repo = this.settings.getGithubRepository();
    }

    if (!repo) {
      return undefined;
    }

    const parsed = parseOwnerRepo(repo);
    if (!parsed) {
      vscode.window.showErrorMessage(
        'Invalid skillBridge.githubRepository. Use owner/repo.',
      );
      return undefined;
    }

    const token = await this.auth.getAccessToken(createIfNone);
    if (!token) {
      vscode.window.showErrorMessage(
        'A fine-grained GitHub PAT limited to your skills repository is required.',
      );
      return undefined;
    }

    try {
      return await GitHubSkillsRepo.connect(
        token,
        parsed.owner,
        parsed.repo,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to connect to GitHub repository: ${message}`,
      );
      return undefined;
    }
  }

  private async confirmDiff(
    title: string,
    diff: ReturnType<typeof diffSkillFiles>,
    confirmLabel: string,
  ): Promise<boolean> {
    if (!hasDiffChanges(diff)) {
      const choice = await vscode.window.showInformationMessage(
        `${title}. No skill file changes detected; README may still be refreshed.`,
        confirmLabel,
        'Cancel',
      );
      return choice === confirmLabel;
    }

    const lines = [
      `${title} (${formatDiffSummary(diff)}).`,
      '',
      ...diff.added.slice(0, 8).map((p) => `+ ${p}`),
      ...diff.updated.slice(0, 8).map((p) => `~ ${p}`),
      ...diff.deleted.slice(0, 8).map((p) => `- ${p}`),
    ];

    const overflow =
      Math.max(0, diff.added.length - 8) +
      Math.max(0, diff.updated.length - 8) +
      Math.max(0, diff.deleted.length - 8);
    if (overflow > 0) {
      lines.push(`…and ${overflow} more`);
    }

    const choice = await vscode.window.showWarningMessage(
      lines.join('\n'),
      { modal: true },
      confirmLabel,
      'Cancel',
    );
    return choice === confirmLabel;
  }

  private warnSkipped(skipped: string[]): void {
    if (skipped.length === 0) {
      return;
    }
    const preview = skipped.slice(0, 5).join(', ');
    const more =
      skipped.length > 5 ? ` (+${skipped.length - 5} more)` : '';
    vscode.window.showWarningMessage(
      `Skipped ${skipped.length} file(s): ${preview}${more}`,
    );
  }

  private async runWithProgress(
    title: string,
    task: () => Promise<boolean>,
  ): Promise<boolean> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false,
      },
      async () => {
        try {
          return await task();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`SkillBridge error: ${message}`);
          return false;
        }
      },
    );
  }
}
