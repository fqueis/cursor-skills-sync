import * as os from 'os';
import * as path from 'path';

/**
 * Expands a path that may start with `~` into an absolute filesystem path.
 */
export function expandHomePath(configuredPath: string): string {
  const trimmed = configuredPath.trim();
  if (trimmed === '~') {
    return os.homedir();
  }
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
}

/**
 * Parses `owner/repo` into components. Returns `undefined` when invalid.
 */
export function parseOwnerRepo(
  value: string,
): { owner: string; repo: string } | undefined {
  const parts = value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .split('/')
    .filter(Boolean);

  if (parts.length !== 2) {
    return undefined;
  }

  return { owner: parts[0], repo: parts[1] };
}
