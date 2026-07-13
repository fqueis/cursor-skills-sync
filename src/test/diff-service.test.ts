import { describe, expect, it } from 'vitest';
import {
  diffSkillFiles,
  formatDiffSummary,
  hasDiffChanges,
} from '@sync/diff-service';

describe('diffSkillFiles', () => {
  it('detects added, updated, and deleted paths', () => {
    const from = [
      { path: 'a/SKILL.md', content: 'one' },
      { path: 'b/SKILL.md', content: 'two' },
    ];
    const to = [
      { path: 'a/SKILL.md', content: 'one-changed' },
      { path: 'c/SKILL.md', content: 'three' },
    ];

    const diff = diffSkillFiles(from, to);

    expect(diff.added).toEqual(['c/SKILL.md']);
    expect(diff.updated).toEqual(['a/SKILL.md']);
    expect(diff.deleted).toEqual(['b/SKILL.md']);
    expect(hasDiffChanges(diff)).toBe(true);
    expect(formatDiffSummary(diff)).toBe('1 added, 1 updated, 1 deleted');
  });

  it('reports no changes when snapshots match', () => {
    const files = [{ path: 'x/SKILL.md', content: 'same' }];
    const diff = diffSkillFiles(files, files);
    expect(hasDiffChanges(diff)).toBe(false);
    expect(formatDiffSummary(diff)).toBe('No changes');
  });
});
