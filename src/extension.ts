import * as vscode from 'vscode';
import { registerCommands } from '@commands/show-menu';
import { GitHubAuth } from '@github/auth';
import { SyncOrchestrator } from '@sync/orchestrator';
import { SyncStateStore } from '@sync/state-store';
import { StatusBarController } from '@ui/status-bar';

/**
 * Activates SkillBridge: status bar, commands, and a silent startup sync check.
 */
export function activate(context: vscode.ExtensionContext): void {
  const stateStore = new SyncStateStore(context);
  const auth = new GitHubAuth(context.secrets);
  const orchestrator = new SyncOrchestrator(stateStore, auth);
  const statusBar = new StatusBarController();
  context.subscriptions.push(statusBar);

  registerCommands(context, orchestrator, statusBar);

  void (async () => {
    const result = await orchestrator.checkStartup();
    statusBar.applyStartupStatus(result.status, result.message);

    if (result.status === 'diverged') {
      vscode.window.showInformationMessage(
        'SkillBridge: skills appear out of sync. Open the status bar menu to Push or Pull.',
      );
    }
  })();
}

/**
 * Disposes extension resources (subscriptions handle cleanup).
 */
export function deactivate(): void {}
