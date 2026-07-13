import * as path from 'path';
import { expandHomePath } from '@config/path-utils';

/** A configured local skills directory with a stable remote id. */
export interface SkillsRoot {
  /** Remote folder name under `skills/` (e.g. `cursor`, `agents`). */
  id: string;
  /** Absolute local filesystem path. */
  path: string;
}

/**
 * Resolves a stable remote id for a local skills path.
 *
 * Known locations keep fixed ids so machines share the same repo layout:
 * - `~/.cursor/skills` → `cursor`
 * - `~/.agents/skills` → `agents`
 */
export function resolveSkillsRootId(configuredPath: string): string {
  const absolute = expandHomePath(configuredPath);
  const normalized = absolute.replace(/\\/g, '/').toLowerCase();

  if (
    normalized.endsWith('/.cursor/skills') ||
    normalized.endsWith('/.cursor/skills/') ||
    /\/\.cursor\/skills$/.test(normalized)
  ) {
    return 'cursor';
  }

  if (
    normalized.endsWith('/.agents/skills') ||
    normalized.endsWith('/.agents/skills/') ||
    /\/\.agents\/skills$/.test(normalized)
  ) {
    return 'agents';
  }

  const base = path.basename(absolute);
  const parent = path.basename(path.dirname(absolute));
  const slug = `${parent}-${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'custom';
}

/**
 * Builds skills roots from configured path strings (expands `~`, assigns ids).
 */
export function buildSkillsRoots(configuredPaths: string[]): SkillsRoot[] {
  const roots: SkillsRoot[] = [];
  const seenIds = new Set<string>();

  for (const configured of configuredPaths) {
    const trimmed = configured.trim();
    if (!trimmed) {
      continue;
    }

    let id = resolveSkillsRootId(trimmed);
    if (seenIds.has(id)) {
      let suffix = 2;
      while (seenIds.has(`${id}-${suffix}`)) {
        suffix += 1;
      }
      id = `${id}-${suffix}`;
    }
    seenIds.add(id);

    roots.push({
      id,
      path: expandHomePath(trimmed),
    });
  }

  return roots;
}

/**
 * Splits a path stored under `skills/` into root id + local-relative path.
 *
 * Legacy flat layouts (no root prefix) map to `fallbackRootId`.
 */
export function splitRemoteSkillPath(
  remoteRelative: string,
  rootIds: Set<string>,
  fallbackRootId: string,
): { rootId: string; localRelative: string } {
  const parts = remoteRelative.split('/').filter(Boolean);
  if (parts.length >= 2 && rootIds.has(parts[0])) {
    return {
      rootId: parts[0],
      localRelative: parts.slice(1).join('/'),
    };
  }

  return {
    rootId: fallbackRootId,
    localRelative: remoteRelative,
  };
}
