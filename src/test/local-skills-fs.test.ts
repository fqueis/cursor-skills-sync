import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hashSkillFiles,
  isAllowedSkillPath,
  LocalSkillsFs,
  shouldSkipName,
} from '@fs/local-skills-fs';

describe('path and filter helpers', () => {
  it('allows known text extensions', () => {
    expect(isAllowedSkillPath('demo/SKILL.md')).toBe(true);
    expect(isAllowedSkillPath('demo/script.ts')).toBe(true);
    expect(isAllowedSkillPath('demo/image.png')).toBe(false);
  });

  it('skips hidden names and node_modules', () => {
    expect(shouldSkipName('.git')).toBe(true);
    expect(shouldSkipName('node_modules')).toBe(true);
    expect(shouldSkipName('my-skill')).toBe(false);
  });
});

describe('LocalSkillsFs', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbridge-'));
    tempDirs.push(dir);
    return dir;
  }

  it('reads allowed files and skips unsupported extensions', async () => {
    const root = await makeTempDir();
    await fs.mkdir(path.join(root, 'demo'), { recursive: true });
    await fs.writeFile(path.join(root, 'demo', 'SKILL.md'), '# Demo', 'utf-8');
    await fs.writeFile(path.join(root, 'demo', 'icon.png'), 'binary', 'utf-8');

    const result = await new LocalSkillsFs(root).readAll();

    expect(result.files).toEqual([
      { path: 'demo/SKILL.md', content: '# Demo' },
    ]);
    expect(result.skipped.some((entry) => entry.includes('icon.png'))).toBe(
      true,
    );
  });

  it('writes files and deletes orphans while pruning empty dirs', async () => {
    const root = await makeTempDir();
    const fsAdapter = new LocalSkillsFs(root);

    await fsAdapter.writeAll([
      { path: 'keep/SKILL.md', content: 'keep' },
      { path: 'gone/SKILL.md', content: 'gone' },
    ]);

    await fsAdapter.deletePaths(['gone/SKILL.md']);

    const result = await fsAdapter.readAll();
    expect(result.files).toEqual([{ path: 'keep/SKILL.md', content: 'keep' }]);

    await expect(
      fs.access(path.join(root, 'gone')),
    ).rejects.toBeTruthy();
  });

  it('produces a stable snapshot hash', () => {
    const a = hashSkillFiles([
      { path: 'b.md', content: '2' },
      { path: 'a.md', content: '1' },
    ]);
    const b = hashSkillFiles([
      { path: 'a.md', content: '1' },
      { path: 'b.md', content: '2' },
    ]);
    expect(a).toBe(b);
  });
});
