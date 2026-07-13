import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { MultiRootSkillsFs } from '@fs/multi-root-skills-fs';

describe('MultiRootSkillsFs', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbridge-multi-'));
    tempDirs.push(dir);
    return dir;
  }

  it('reads and writes skills into the correct local roots', async () => {
    const cursorRoot = await makeTempDir();
    const agentsRoot = await makeTempDir();
    const adapter = new MultiRootSkillsFs([
      { id: 'cursor', path: cursorRoot },
      { id: 'agents', path: agentsRoot },
    ]);

    await fs.mkdir(path.join(cursorRoot, 'c-skill'), { recursive: true });
    await fs.writeFile(
      path.join(cursorRoot, 'c-skill', 'SKILL.md'),
      '# cursor',
      'utf-8',
    );
    await fs.mkdir(path.join(agentsRoot, 'a-skill'), { recursive: true });
    await fs.writeFile(
      path.join(agentsRoot, 'a-skill', 'SKILL.md'),
      '# agents',
      'utf-8',
    );

    const read = await adapter.readAll();
    expect(read.files).toEqual(
      expect.arrayContaining([
        { path: 'cursor/c-skill/SKILL.md', content: '# cursor' },
        { path: 'agents/a-skill/SKILL.md', content: '# agents' },
      ]),
    );

    await adapter.writeAll([
      { path: 'agents/new-skill/SKILL.md', content: '# new' },
    ]);

    const written = await fs.readFile(
      path.join(agentsRoot, 'new-skill', 'SKILL.md'),
      'utf-8',
    );
    expect(written).toBe('# new');
  });
});
