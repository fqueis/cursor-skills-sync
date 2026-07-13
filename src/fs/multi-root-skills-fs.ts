import type { SkillsRoot } from '@config/skills-roots';
import { splitRemoteSkillPath } from '@config/skills-roots';
import {
  hashSkillFiles,
  LocalSkillsFs,
  type LocalReadResult,
  type SkillFile,
} from '@fs/local-skills-fs';

/**
 * Reads/writes skills across multiple local roots, using `{rootId}/...` paths
 * in the sync snapshot (and under `skills/` on GitHub).
 */
export class MultiRootSkillsFs {
  private readonly adapters: Map<string, LocalSkillsFs>;

  constructor(private readonly roots: SkillsRoot[]) {
    this.adapters = new Map(
      roots.map((root) => [root.id, new LocalSkillsFs(root.path)]),
    );
  }

  /**
   * Returns configured root ids.
   */
  getRootIds(): Set<string> {
    return new Set(this.roots.map((root) => root.id));
  }

  /**
   * Preferred fallback root for legacy flat remote layouts.
   */
  getFallbackRootId(): string {
    if (this.adapters.has('cursor')) {
      return 'cursor';
    }
    return this.roots[0]?.id ?? 'cursor';
  }

  /**
   * Reads all roots and prefixes each path with its root id.
   */
  async readAll(): Promise<LocalReadResult> {
    const files: SkillFile[] = [];
    const skipped: string[] = [];

    for (const root of this.roots) {
      const adapter = this.adapters.get(root.id);
      if (!adapter) {
        continue;
      }

      const result = await adapter.readAll();
      for (const file of result.files) {
        files.push({
          path: `${root.id}/${file.path}`,
          content: file.content,
        });
      }
      for (const entry of result.skipped) {
        skipped.push(`${root.id}/${entry}`);
      }
    }

    return { files, skipped };
  }

  /**
   * Writes snapshot files into the matching local roots.
   */
  async writeAll(files: SkillFile[]): Promise<void> {
    const grouped = this.groupByRoot(files.map((file) => file.path));

    for (const [rootId, relativePaths] of grouped) {
      const adapter = this.adapters.get(rootId);
      if (!adapter) {
        continue;
      }

      const rootFiles = files
        .filter((file) => relativePaths.has(file.path))
        .map((file) => ({
          path: splitRemoteSkillPath(
            file.path,
            this.getRootIds(),
            this.getFallbackRootId(),
          ).localRelative,
          content: file.content,
        }));

      await adapter.writeAll(rootFiles);
    }
  }

  /**
   * Deletes snapshot paths from the matching local roots.
   */
  async deletePaths(snapshotPaths: string[]): Promise<void> {
    const grouped = this.groupByRoot(snapshotPaths);

    for (const [rootId, relativeSnapshotPaths] of grouped) {
      const adapter = this.adapters.get(rootId);
      if (!adapter) {
        continue;
      }

      const localRelatives = [...relativeSnapshotPaths].map(
        (snapshotPath) =>
          splitRemoteSkillPath(
            snapshotPath,
            this.getRootIds(),
            this.getFallbackRootId(),
          ).localRelative,
      );

      await adapter.deletePaths(localRelatives);
    }
  }

  /**
   * Ensures every configured root directory exists.
   */
  async ensureRoots(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.ensureRoot();
    }
  }

  private groupByRoot(snapshotPaths: string[]): Map<string, Set<string>> {
    const grouped = new Map<string, Set<string>>();
    const rootIds = this.getRootIds();
    const fallback = this.getFallbackRootId();

    for (const snapshotPath of snapshotPaths) {
      const { rootId } = splitRemoteSkillPath(snapshotPath, rootIds, fallback);
      if (!this.adapters.has(rootId)) {
        continue;
      }
      const bucket = grouped.get(rootId) ?? new Set<string>();
      bucket.add(snapshotPath);
      grouped.set(rootId, bucket);
    }

    return grouped;
  }
}

export { hashSkillFiles };
export type { SkillFile, LocalReadResult };
