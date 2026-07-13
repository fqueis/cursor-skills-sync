import * as vscode from 'vscode';
import type { StartupStatus } from '@sync/orchestrator';

/**
 * Status bar item for SkillBridge sync state and menu access.
 */
export class StatusBarController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'skillBridge.showMenu';
    this.setIdle();
    this.item.show();
  }

  /**
   * Default idle label.
   */
  setIdle(): void {
    this.item.text = '$(sync) SkillBridge';
    this.item.tooltip = 'SkillBridge: Open Menu';
    this.item.backgroundColor = undefined;
  }

  /**
   * Updates the status bar from a startup check result.
   */
  applyStartupStatus(status: StartupStatus, message?: string): void {
    switch (status) {
      case 'setup_needed':
        this.item.text = '$(warning) SkillBridge: Setup needed';
        this.item.tooltip = message ?? 'Configure a GitHub repository';
        this.item.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground',
        );
        break;
      case 'auth_needed':
        this.item.text = '$(key) SkillBridge: Add PAT';
        this.item.tooltip =
          message ?? 'Add a fine-grained GitHub PAT for your skills repo';
        this.item.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground',
        );
        break;
      case 'diverged':
        this.item.text = '$(sync-ignored) SkillBridge: Out of sync';
        this.item.tooltip = message ?? 'Local and remote skills differ';
        this.item.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground',
        );
        break;
      case 'error':
        this.item.text = '$(error) SkillBridge';
        this.item.tooltip = message ?? 'SkillBridge check failed';
        this.item.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground',
        );
        break;
      case 'in_sync':
      default:
        this.item.text = '$(check) SkillBridge';
        this.item.tooltip = message ?? 'Skills are in sync';
        this.item.backgroundColor = undefined;
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
