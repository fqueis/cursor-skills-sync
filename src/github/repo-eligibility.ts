import { REMOTE_SKILLS_PREFIX, SKILLBRIDGE_MANAGED_MARKER } from '@constants';

/** How a candidate GitHub repository should be treated during setup. */
export type RepoEligibility = 'empty' | 'skillbridge' | 'foreign';

/** Root paths that GitHub may create by default and do not count as “content”. */
const DEFAULT_ROOT_FILES = new Set([
  'README.md',
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  '.gitignore',
  '.gitattributes',
]);

/**
 * Returns true when README content identifies a SkillBridge-managed repo.
 */
export function isSkillBridgeReadme(readmeContent: string | undefined): boolean {
  if (!readmeContent) {
    return false;
  }

  return (
    readmeContent.includes(SKILLBRIDGE_MANAGED_MARKER) ||
    readmeContent.includes('SkillBridge: Cursor Skills Sync')
  );
}

/**
 * Classifies a remote repository tree for first-time setup.
 *
 * - `skillbridge`: already used by SkillBridge (safe on other machines)
 * - `empty`: only GitHub defaults / no real project files (safe to claim)
 * - `foreign`: has unrelated content (must not overwrite)
 */
export function classifyRepoEligibility(options: {
  paths: string[];
  readmeContent?: string;
}): RepoEligibility {
  const { paths, readmeContent } = options;

  if (isSkillBridgeReadme(readmeContent)) {
    return 'skillbridge';
  }

  const meaningful = paths.filter((path) => {
    if (DEFAULT_ROOT_FILES.has(path)) {
      return false;
    }
    // Placeholder only: treat as empty until first real sync.
    if (
      path === `${REMOTE_SKILLS_PREFIX}/.gitkeep` ||
      path === `${REMOTE_SKILLS_PREFIX}`
    ) {
      return false;
    }
    return true;
  });

  return meaningful.length === 0 ? 'empty' : 'foreign';
}
