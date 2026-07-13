import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '@constants';

/** A skill file relative to the local skills root. */
export interface SkillFile {
  /**
   * POSIX-style path in the sync snapshot.
   * Multi-root layout: `{rootId}/my-skill/SKILL.md` (e.g. `cursor/...`, `agents/...`).
   */
  path: string;
  /** UTF-8 text content. */
  content: string;
}

/** Result of a filtered local read. */
export interface LocalReadResult {
  files: SkillFile[];
  skipped: string[];
}

/**
 * Returns whether a relative path is eligible for sync based on extension.
 */
export function isAllowedSkillPath(relativePath: string): boolean {
  const ext = path.extname(relativePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Returns whether a directory or file name should be skipped during walk.
 */
export function shouldSkipName(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules';
}

/**
 * Builds a stable hash of the local skill snapshot for LWW comparisons.
 */
export function hashSkillFiles(files: SkillFile[]): string {
  const hash = crypto.createHash('sha256');
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  for (const file of sorted) {
    hash.update(file.path);
    hash.update('\0');
    hash.update(file.content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * Local filesystem adapter for the configured skills directory.
 */
export class LocalSkillsFs {
  constructor(private readonly rootDir: string) {}

  /**
   * Recursively reads allowed text files under the skills root.
   */
  async readAll(): Promise<LocalReadResult> {
    const files: SkillFile[] = [];
    const skipped: string[] = [];

    try {
      await this.walk(this.rootDir, this.rootDir, files, skipped);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? (error as { code?: string }).code
          : undefined;
      if (code === 'ENOENT') {
        return { files: [], skipped: [] };
      }
      throw error;
    }

    return { files, skipped };
  }

  /**
   * Writes the provided skill files under the local root (creates directories).
   */
  async writeAll(files: SkillFile[]): Promise<void> {
    for (const file of files) {
      const absolute = path.join(this.rootDir, file.path);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, file.content, 'utf-8');
    }
  }

  /**
   * Deletes relative skill files that exist under the local root.
   */
  async deletePaths(relativePaths: string[]): Promise<void> {
    for (const relativePath of relativePaths) {
      const absolute = path.join(this.rootDir, relativePath);
      try {
        await fs.unlink(absolute);
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error && 'code' in error
            ? (error as { code?: string }).code
            : undefined;
        if (code !== 'ENOENT') {
          throw error;
        }
      }
    }

    await this.pruneEmptyDirectories(this.rootDir);
  }

  /**
   * Ensures the skills root directory exists.
   */
  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  private async walk(
    dir: string,
    baseDir: string,
    files: SkillFile[],
    skipped: string[],
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (shouldSkipName(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(fullPath, baseDir, files, skipped);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (!isAllowedSkillPath(relativePath)) {
        skipped.push(`${relativePath} (unsupported extension)`);
        continue;
      }

      const stat = await fs.stat(fullPath);
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        skipped.push(
          `${relativePath} (exceeds ${MAX_FILE_SIZE_BYTES / 1024}KB)`,
        );
        continue;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  private async pruneEmptyDirectories(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.pruneEmptyDirectories(path.join(dir, entry.name));
      }
    }

    if (path.resolve(dir) === path.resolve(this.rootDir)) {
      return;
    }

    const remaining = await fs.readdir(dir);
    if (remaining.length === 0) {
      await fs.rmdir(dir);
    }
  }
}
