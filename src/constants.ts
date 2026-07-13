/** Extension command and configuration namespace. */
export const EXTENSION_NAMESPACE = 'skillBridge';

/** Remote directory that mirrors the local skills folder. */
export const REMOTE_SKILLS_PREFIX = 'skills';

/** Default local skills paths when settings are empty. */
export const DEFAULT_SKILLS_PATHS = [
  '~/.cursor/skills',
  '~/.agents/skills',
] as const;

/** Maximum allowed skill file size in bytes. */
export const MAX_FILE_SIZE_BYTES = 512 * 1024;

/** Text file extensions allowed in sync. */
export const ALLOWED_EXTENSIONS = new Set([
  '.md',
  '.mdc',
  '.json',
  '.yml',
  '.yaml',
  '.txt',
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.sh',
  '.ps1',
  '.py',
  '.toml',
  '.xml',
  '.html',
  '.css',
]);

/** Root files that push must never delete from the remote repo. */
export const PROTECTED_ROOT_PATHS = new Set([
  'LICENSE',
  'LICENSE.md',
  '.gitignore',
  '.gitattributes',
]);

/** Store listing URLs used in the managed skills-repo README. */
export const MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=fqueis.cursor-skills-sync';

export const OPEN_VSX_URL =
  'https://open-vsx.org/extension/fqueis/cursor-skills-sync';

/** globalState key for the last successful sync baseline. */
export const SYNC_STATE_KEY = 'skillBridge.syncState';

/** SecretStorage key for the fine-grained GitHub PAT. */
export const GITHUB_TOKEN_SECRET_KEY = 'skillBridge.githubToken';

/**
 * Marker embedded in the managed skills-repo README so other machines can
 * recognize an already-synced SkillBridge repository (even when not empty).
 */
export const SKILLBRIDGE_MANAGED_MARKER = '<!-- skillbridge-managed -->';

/** GitHub UI for creating a fine-grained PAT. */
export const FINE_GRAINED_PAT_URL =
  'https://github.com/settings/personal-access-tokens/new';

/** GitHub UI for creating a new repository. */
export const GITHUB_NEW_REPO_URL = 'https://github.com/new';
