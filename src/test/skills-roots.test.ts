import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildSkillsRoots,
  resolveSkillsRootId,
  splitRemoteSkillPath,
} from '@config/skills-roots';

describe('resolveSkillsRootId', () => {
  it('maps known Cursor and agents paths', () => {
    expect(resolveSkillsRootId('~/.cursor/skills')).toBe('cursor');
    expect(resolveSkillsRootId('~/.agents/skills')).toBe('agents');
    expect(
      resolveSkillsRootId(path.join(os.homedir(), '.cursor', 'skills')),
    ).toBe('cursor');
  });
});

describe('buildSkillsRoots', () => {
  it('builds roots for the default path list', () => {
    const roots = buildSkillsRoots(['~/.cursor/skills', '~/.agents/skills']);
    expect(roots.map((root) => root.id)).toEqual(['cursor', 'agents']);
    expect(roots[0].path).toBe(path.join(os.homedir(), '.cursor', 'skills'));
    expect(roots[1].path).toBe(path.join(os.homedir(), '.agents', 'skills'));
  });
});

describe('splitRemoteSkillPath', () => {
  const rootIds = new Set(['cursor', 'agents']);

  it('splits prefixed remote paths', () => {
    expect(splitRemoteSkillPath('agents/demo/SKILL.md', rootIds, 'cursor')).toEqual({
      rootId: 'agents',
      localRelative: 'demo/SKILL.md',
    });
  });

  it('maps legacy flat paths to the fallback root', () => {
    expect(splitRemoteSkillPath('demo/SKILL.md', rootIds, 'cursor')).toEqual({
      rootId: 'cursor',
      localRelative: 'demo/SKILL.md',
    });
  });
});
