import * as vscode from 'vscode';
import {
  FINE_GRAINED_PAT_URL,
  GITHUB_TOKEN_SECRET_KEY,
} from '@constants';

/**
 * Stores and retrieves a fine-grained GitHub PAT scoped to a single repository.
 *
 * GitHub OAuth (used by `vscode.authentication`) cannot limit access to one repo;
 * a fine-grained PAT is the supported least-privilege option.
 */
export class GitHubAuth {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  /**
   * Returns a stored token, or prompts when `createIfNone` is true.
   */
  async getAccessToken(createIfNone: boolean): Promise<string | undefined> {
    const existing = await this.secrets.get(GITHUB_TOKEN_SECRET_KEY);
    if (existing) {
      return existing;
    }

    if (!createIfNone) {
      return undefined;
    }

    return this.promptAndStoreToken();
  }

  /**
   * Returns true when a token is already stored.
   */
  async hasToken(): Promise<boolean> {
    return !!(await this.secrets.get(GITHUB_TOKEN_SECRET_KEY));
  }

  /**
   * Prompts for a fine-grained PAT and stores it in SecretStorage.
   */
  async promptAndStoreToken(repositoryHint?: string): Promise<string | undefined> {
    const repoLine = repositoryHint
      ? `4) Repository access → "Only select repositories" → pick "${repositoryHint}".`
      : '4) Repository access → "Only select repositories" → pick your skills repo.';

    const steps = [
      'Use a Fine-grained token (not Classic).',
      '1) Open GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
      '2) Give it a name (e.g. SkillBridge) and an expiration.',
      '3) Resource owner = your user (or the org that owns the repo).',
      repoLine,
      '5) Scroll to "Repository permissions".',
      '6) Find the row named "Contents" (not "Actions", not "Metadata").',
      '7) Change its dropdown from "No access" to "Read and write".',
      '8) Metadata stays "Read-only" (GitHub sets this automatically).',
      '9) Generate the token and paste it below.',
      'Leave every other permission on "No access".',
    ].join('\n');

    const openDocs = 'Open token page';
    const continueLabel = 'I have the token';
    const choice = await vscode.window.showInformationMessage(
      steps,
      { modal: true },
      openDocs,
      continueLabel,
    );

    if (choice === openDocs) {
      await vscode.env.openExternal(vscode.Uri.parse(FINE_GRAINED_PAT_URL));
      const afterOpen = await vscode.window.showInformationMessage(
        'After creating the fine-grained token (Contents = Read and write), click Continue to paste it.',
        'Continue',
        'Cancel',
      );
      if (afterOpen !== 'Continue') {
        return undefined;
      }
    } else if (choice !== continueLabel) {
      return undefined;
    }

    const token = await vscode.window.showInputBox({
      prompt:
        'Paste your fine-grained GitHub PAT (starts with github_pat_…)',
      placeHolder: 'github_pat_…',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return 'Token is required';
        }
        if (trimmed.startsWith('ghp_')) {
          return 'This looks like a Classic token (ghp_). Create a Fine-grained token instead (github_pat_…).';
        }
        return undefined;
      },
    });

    if (!token) {
      return undefined;
    }

    const trimmed = token.trim();
    await this.secrets.store(GITHUB_TOKEN_SECRET_KEY, trimmed);
    return trimmed;
  }

  /**
   * Removes the stored token from SecretStorage.
   */
  async clearToken(): Promise<void> {
    await this.secrets.delete(GITHUB_TOKEN_SECRET_KEY);
  }
}
