import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { expandHomePath, parseOwnerRepo } from '@config/path-utils';
import { MARKETPLACE_URL, OPEN_VSX_URL, SKILLBRIDGE_MANAGED_MARKER } from '@constants';
import { buildSkillsRepoReadme } from '@github/readme-template';

describe('expandHomePath', () => {
  it('expands leading ~', () => {
    expect(expandHomePath('~/.cursor/skills')).toBe(
      path.join(os.homedir(), '.cursor', 'skills'),
    );
  });

  it('keeps absolute paths', () => {
    const absolute = path.join(os.homedir(), 'skills');
    expect(expandHomePath(absolute)).toBe(absolute);
  });
});

describe('parseOwnerRepo', () => {
  it('parses owner/repo and GitHub URLs', () => {
    expect(parseOwnerRepo('acme/skills')).toEqual({
      owner: 'acme',
      repo: 'skills',
    });
    expect(parseOwnerRepo('https://github.com/acme/skills.git')).toEqual({
      owner: 'acme',
      repo: 'skills',
    });
  });

  it('rejects invalid values', () => {
    expect(parseOwnerRepo('only-one')).toBeUndefined();
    expect(parseOwnerRepo('a/b/c')).toBeUndefined();
  });
});

describe('buildSkillsRepoReadme', () => {
  it('includes product pitch, store links, and last sync timestamp', () => {
    const syncedAt = '2026-07-13T19:52:00.123Z';
    const readme = buildSkillsRepoReadme({ lastSuccessfulSyncAt: syncedAt });
    expect(readme).toContain('SkillBridge: Cursor Skills Sync');
    expect(readme).toContain(SKILLBRIDGE_MANAGED_MARKER);
    expect(readme).toContain('5 stars');
    expect(readme).toContain(MARKETPLACE_URL);
    expect(readme).toContain(OPEN_VSX_URL);
    expect(readme).toContain('skills/');
    expect(readme).toContain('Last successful sync');
    expect(readme).toContain('2026-07-13T19:52:00Z');
  });
});
