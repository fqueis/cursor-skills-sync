import { describe, expect, it } from 'vitest';
import { SKILLBRIDGE_MANAGED_MARKER } from '@constants';
import { classifyRepoEligibility } from '@github/repo-eligibility';

describe('classifyRepoEligibility', () => {
  it('detects SkillBridge-managed repos by marker even when skills exist', () => {
    const eligibility = classifyRepoEligibility({
      paths: ['README.md', 'skills/demo/SKILL.md'],
      readmeContent: `${SKILLBRIDGE_MANAGED_MARKER}\n# SkillBridge`,
    });
    expect(eligibility).toBe('skillbridge');
  });

  it('treats GitHub default files as empty', () => {
    expect(
      classifyRepoEligibility({
        paths: ['README.md', 'LICENSE', '.gitignore'],
        readmeContent: '# My Repo',
      }),
    ).toBe('empty');
  });

  it('rejects foreign non-empty repositories', () => {
    expect(
      classifyRepoEligibility({
        paths: ['src/index.ts', 'package.json'],
        readmeContent: '# Other project',
      }),
    ).toBe('foreign');
  });
});
