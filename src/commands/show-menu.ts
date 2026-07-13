import * as vscode from 'vscode';
import type { SyncOrchestrator } from '@sync/orchestrator';
import type { StatusBarController } from '@ui/status-bar';

/**
 * Registers SkillBridge commands and wires them to the orchestrator.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  orchestrator: SyncOrchestrator,
  statusBar: StatusBarController,
): void {
  const refreshStatus = async (): Promise<void> => {
    const result = await orchestrator.checkStartup();
    statusBar.applyStartupStatus(result.status, result.message);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('skillBridge.showMenu', async () => {
      const options: Array<vscode.QuickPickItem & { id: string }> = [
        {
          id: 'push',
          label: '$(cloud-upload) Push Skills',
          description: 'Upload local skills to GitHub',
        },
        {
          id: 'pull',
          label: '$(cloud-download) Pull Skills',
          description: 'Download and mirror remote skills locally',
        },
        {
          id: 'check',
          label: '$(sync) Check Sync Status',
          description: 'Compare local and remote without changing files',
        },
        {
          id: 'setup',
          label: '$(settings-gear) Configure Repository',
          description: 'Set owner/repo + fine-grained PAT (single repo)',
        },
        {
          id: 'token',
          label: '$(key) Update GitHub Token',
          description: 'Replace the stored fine-grained PAT',
        },
      ];

      const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'What would you like to do?',
      });
      if (!selection) {
        return;
      }

      switch (selection.id) {
        case 'push':
          await orchestrator.push();
          await refreshStatus();
          break;
        case 'pull':
          await orchestrator.pull();
          await refreshStatus();
          break;
        case 'check': {
          const result = await orchestrator.checkStartup();
          statusBar.applyStartupStatus(result.status, result.message);
          if (result.status === 'in_sync') {
            vscode.window.showInformationMessage('Skills are in sync.');
          } else if (result.status === 'diverged') {
            vscode.window.showInformationMessage(
              'Skills are out of sync. Use Push or Pull from the SkillBridge menu.',
            );
          } else if (result.message) {
            vscode.window.showWarningMessage(result.message);
          }
          break;
        }
        case 'setup':
          await orchestrator.setupRepository();
          await refreshStatus();
          break;
        case 'token':
          await orchestrator.updateToken();
          await refreshStatus();
          break;
      }
    }),

    vscode.commands.registerCommand('skillBridge.setupRepo', async () => {
      await orchestrator.setupRepository();
      await refreshStatus();
    }),

    vscode.commands.registerCommand('skillBridge.updateToken', async () => {
      await orchestrator.updateToken();
      await refreshStatus();
    }),

    vscode.commands.registerCommand('skillBridge.push', async () => {
      await orchestrator.push();
      await refreshStatus();
    }),

    vscode.commands.registerCommand('skillBridge.pull', async () => {
      await orchestrator.pull();
      await refreshStatus();
    }),

    vscode.commands.registerCommand('skillBridge.checkStatus', async () => {
      const result = await orchestrator.checkStartup();
      statusBar.applyStartupStatus(result.status, result.message);
      vscode.window.showInformationMessage(
        result.message ?? `Status: ${result.status}`,
      );
    }),
  );
}
