import * as vscode from 'vscode';
import { DEFAULT_SKILLS_PATHS, EXTENSION_NAMESPACE } from '@constants';
import { buildSkillsRoots, type SkillsRoot } from '@config/skills-roots';

/**
 * Typed accessors for SkillBridge workspace/user settings.
 */
export class Settings {
  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  }

  /**
   * Returns configured skills directory paths (may include `~`).
   */
  getConfiguredSkillsPaths(): string[] {
    const configured = this.config.get<string[]>('skillsPaths');
    if (configured && configured.length > 0) {
      return configured.map((entry) => entry.trim()).filter(Boolean);
    }

    return [...DEFAULT_SKILLS_PATHS];
  }

  /**
   * Returns resolved skills roots with stable remote ids.
   */
  getSkillsRoots(): SkillsRoot[] {
    return buildSkillsRoots(this.getConfiguredSkillsPaths());
  }

  /**
   * Returns the configured GitHub repository (`owner/repo`) or `undefined`.
   */
  getGithubRepository(): string | undefined {
    const repo = this.config.get<string>('githubRepository')?.trim();
    return repo ? repo : undefined;
  }

  /**
   * Persists the GitHub repository setting globally.
   */
  async setGithubRepository(ownerRepo: string): Promise<void> {
    await this.config.update(
      'githubRepository',
      ownerRepo,
      vscode.ConfigurationTarget.Global,
    );
  }
}

export { expandHomePath, parseOwnerRepo } from '@config/path-utils';
