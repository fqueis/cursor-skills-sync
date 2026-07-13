import { Octokit } from '@octokit/rest';
import { REMOTE_SKILLS_PREFIX } from '@constants';
import type { SkillFile } from '@fs/local-skills-fs';
import { buildSkillsRepoReadme } from '@github/readme-template';
import {
  classifyRepoEligibility,
  type RepoEligibility,
} from '@github/repo-eligibility';

export interface RepoRef {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface RemoteSkillsSnapshot {
  commitSha: string;
  files: SkillFile[];
}

export interface RepoInspection {
  eligibility: RepoEligibility;
  defaultBranch: string;
  paths: string[];
}

interface TreeBlobEntry {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000' | '120000';
  type: 'blob';
  sha: string;
}

/**
 * GitHub adapter that mirrors the local skills folder to `skills/` and
 * upserts the managed root README on push.
 */
export class GitHubSkillsRepo {
  constructor(
    private readonly octokit: Octokit,
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  /**
   * Creates an authenticated repository client.
   */
  static async connect(
    token: string,
    owner: string,
    repo: string,
  ): Promise<{ client: GitHubSkillsRepo; ref: RepoRef }> {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.get({ owner, repo });
    const client = new GitHubSkillsRepo(octokit, owner, repo);
    return {
      client,
      ref: {
        owner,
        repo,
        defaultBranch: data.default_branch,
      },
    };
  }

  /**
   * Inspects whether the repository is empty, already SkillBridge-managed, or foreign.
   */
  async inspectEligibility(branch: string): Promise<RepoInspection> {
    const head = await this.octokit.git
      .getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branch}`,
      })
      .catch(() => null);

    if (!head) {
      return {
        eligibility: 'empty',
        defaultBranch: branch,
        paths: [],
      };
    }

    const commit = await this.octokit.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: head.data.object.sha,
    });

    const tree = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: commit.data.tree.sha,
      recursive: 'true',
    });

    const paths = tree.data.tree
      .filter((item) => item.type === 'blob' && item.path)
      .map((item) => item.path as string);

    let readmeContent: string | undefined;
    const readme = tree.data.tree.find(
      (item) => item.type === 'blob' && item.path === 'README.md' && item.sha,
    );
    if (readme?.sha) {
      const blob = await this.octokit.git.getBlob({
        owner: this.owner,
        repo: this.repo,
        file_sha: readme.sha,
      });
      readmeContent = Buffer.from(blob.data.content, 'base64').toString('utf-8');
    }

    return {
      eligibility: classifyRepoEligibility({ paths, readmeContent }),
      defaultBranch: branch,
      paths,
    };
  }

  /**
   * Seeds an empty repository with `skills/.gitkeep` and the managed README.
   *
   * Completely empty repos (no commits) cannot use the Git Data API (`createTree`).
   * The Contents API is used to create the first commit, then the normal mirror path.
   */
  async seedEmptyRepository(branch: string): Promise<string> {
    const head = await this.octokit.git
      .getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branch}`,
      })
      .catch(() => null);

    if (!head) {
      return this.bootstrapEmptyRepository(branch);
    }

    return this.pushSkillsMirror({
      branch,
      files: [],
      commitMessage: 'chore: initialize SkillBridge skills repository',
      includeGitkeepWhenEmpty: true,
    });
  }

  /**
   * Creates the first commit on a repo with no git history via the Contents API.
   */
  private async bootstrapEmptyRepository(branch: string): Promise<string> {
    const syncedAt = new Date().toISOString();
    const readme = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: 'README.md',
      message: 'chore: initialize SkillBridge skills repository',
      content: Buffer.from(
        buildSkillsRepoReadme({ lastSuccessfulSyncAt: syncedAt }),
        'utf-8',
      ).toString('base64'),
      branch,
    });

    const gitkeep = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: `${REMOTE_SKILLS_PREFIX}/.gitkeep`,
      message: 'chore: seed skills directory',
      content: Buffer.from('', 'utf-8').toString('base64'),
      branch,
    });

    return (
      gitkeep.data.commit.sha ??
      readme.data.commit.sha ??
      ''
    );
  }

  /**
   * Loads skill files under `skills/` from the default branch HEAD.
   */
  async getSkillsSnapshot(branch: string): Promise<RemoteSkillsSnapshot> {
    const ref = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${branch}`,
    });
    const commitSha = ref.data.object.sha;
    const commit = await this.octokit.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: commitSha,
    });

    const tree = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: commit.data.tree.sha,
      recursive: 'true',
    });

    const prefix = `${REMOTE_SKILLS_PREFIX}/`;
    const blobs = tree.data.tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.path?.startsWith(prefix) &&
        item.sha &&
        !item.path.endsWith('/.gitkeep') &&
        item.path !== `${REMOTE_SKILLS_PREFIX}/.gitkeep`,
    );

    const files: SkillFile[] = [];
    for (const item of blobs) {
      const blob = await this.octokit.git.getBlob({
        owner: this.owner,
        repo: this.repo,
        file_sha: item.sha!,
      });
      const content = Buffer.from(blob.data.content, 'base64').toString('utf-8');
      const relativePath = item.path!.slice(prefix.length);
      files.push({ path: relativePath, content });
    }

    return { commitSha, files };
  }

  /**
   * Mirrors local skill files to `skills/`, upserts README.md, and preserves
   * non-skills root files (LICENSE, .gitignore, etc.).
   */
  async pushSkillsMirror(options: {
    branch: string;
    files: SkillFile[];
    commitMessage: string;
    includeGitkeepWhenEmpty?: boolean;
    expectedHeadSha?: string;
  }): Promise<string> {
    const {
      branch,
      files,
      commitMessage,
      includeGitkeepWhenEmpty = false,
      expectedHeadSha,
    } = options;

    const head = await this.octokit.git
      .getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branch}`,
      })
      .catch(() => null);

    // Git Data API cannot create trees on repos with zero commits.
    if (!head) {
      await this.bootstrapEmptyRepository(branch);
      if (files.length === 0) {
        const seeded = await this.octokit.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: `heads/${branch}`,
        });
        return seeded.data.object.sha;
      }
      return this.pushSkillsMirror({
        ...options,
        expectedHeadSha: undefined,
      });
    }

    if (expectedHeadSha && head.data.object.sha !== expectedHeadSha) {
      throw new Error(
        'Remote branch moved since the last check. Refresh and try again.',
      );
    }

    let baseCommitSha: string | undefined;
    let preserved: TreeBlobEntry[] = [];

    if (head) {
      baseCommitSha = head.data.object.sha;
      const commit = await this.octokit.git.getCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha: baseCommitSha,
      });

      const tree = await this.octokit.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: commit.data.tree.sha,
        recursive: 'true',
      });

      preserved = tree.data.tree
        .filter(
          (item): item is typeof item & { path: string; sha: string } =>
            item.type === 'blob' &&
            !!item.path &&
            !!item.sha &&
            !item.path.startsWith(`${REMOTE_SKILLS_PREFIX}/`) &&
            item.path !== 'README.md',
        )
        .map((item) => ({
          path: item.path,
          mode: (item.mode as TreeBlobEntry['mode']) || '100644',
          type: 'blob' as const,
          sha: item.sha,
        }));
    }

    const skillEntries: Array<{
      path: string;
      mode: '100644';
      type: 'blob';
      content: string;
    }> = files.map((file) => ({
      path: `${REMOTE_SKILLS_PREFIX}/${file.path}`,
      mode: '100644',
      type: 'blob',
      content: file.content,
    }));

    if (files.length === 0 && includeGitkeepWhenEmpty) {
      skillEntries.push({
        path: `${REMOTE_SKILLS_PREFIX}/.gitkeep`,
        mode: '100644',
        type: 'blob',
        content: '',
      });
    }

    const readmeEntry = {
      path: 'README.md',
      mode: '100644' as const,
      type: 'blob' as const,
      content: buildSkillsRepoReadme({
        lastSuccessfulSyncAt: new Date().toISOString(),
      }),
    };

    const newTree = await this.octokit.git.createTree({
      owner: this.owner,
      repo: this.repo,
      tree: [...preserved, ...skillEntries, readmeEntry],
    });

    const newCommit = await this.octokit.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: baseCommitSha ? [baseCommitSha] : [],
    });

    if (head) {
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha,
        force: false,
      });
    } else {
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branch}`,
        sha: newCommit.data.sha,
      });
    }

    return newCommit.data.sha;
  }
}
