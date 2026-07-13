import type { SkillFile } from '@fs/local-skills-fs';

/** Diff between two skill file maps. */
export interface SkillDiff {
  added: string[];
  updated: string[];
  deleted: string[];
  unchanged: string[];
}

/**
 * Builds a content map keyed by relative path.
 */
export function toContentMap(files: SkillFile[]): Map<string, string> {
  return new Map(files.map((file) => [file.path, file.content]));
}

/**
 * Compares local and remote skill snapshots.
 *
 * @param from - Baseline (e.g. remote for push preview, local for pull preview)
 * @param to - Target desired state
 */
export function diffSkillFiles(from: SkillFile[], to: SkillFile[]): SkillDiff {
  const fromMap = toContentMap(from);
  const toMap = toContentMap(to);

  const added: string[] = [];
  const updated: string[] = [];
  const deleted: string[] = [];
  const unchanged: string[] = [];

  for (const [path, content] of toMap) {
    if (!fromMap.has(path)) {
      added.push(path);
    } else if (fromMap.get(path) !== content) {
      updated.push(path);
    } else {
      unchanged.push(path);
    }
  }

  for (const path of fromMap.keys()) {
    if (!toMap.has(path)) {
      deleted.push(path);
    }
  }

  added.sort();
  updated.sort();
  deleted.sort();
  unchanged.sort();

  return { added, updated, deleted, unchanged };
}

/**
 * Returns true when the diff contains any changes.
 */
export function hasDiffChanges(diff: SkillDiff): boolean {
  return (
    diff.added.length > 0 ||
    diff.updated.length > 0 ||
    diff.deleted.length > 0
  );
}

/**
 * Formats a short human-readable diff summary.
 */
export function formatDiffSummary(diff: SkillDiff): string {
  const parts: string[] = [];
  if (diff.added.length) {
    parts.push(`${diff.added.length} added`);
  }
  if (diff.updated.length) {
    parts.push(`${diff.updated.length} updated`);
  }
  if (diff.deleted.length) {
    parts.push(`${diff.deleted.length} deleted`);
  }
  return parts.length ? parts.join(', ') : 'No changes';
}
