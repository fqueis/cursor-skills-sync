import {
  MARKETPLACE_URL,
  OPEN_VSX_URL,
  SKILLBRIDGE_MANAGED_MARKER,
} from "@constants";

export interface SkillsRepoReadmeOptions {
  /** ISO-8601 timestamp of the last successful SkillBridge sync. */
  lastSuccessfulSyncAt: string;
}

/**
 * Formats a sync timestamp for display in the managed README.
 */
export function formatSyncTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }

  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Builds the managed README.md body written to the user's skills GitHub repo on push.
 */
export function buildSkillsRepoReadme(
  options: SkillsRepoReadmeOptions = {
    lastSuccessfulSyncAt: new Date().toISOString(),
  }
): string {
  const lastSync = formatSyncTimestamp(options.lastSuccessfulSyncAt);

  return `${SKILLBRIDGE_MANAGED_MARKER}
# SkillBridge: Cursor Skills Sync

This repository stores **Cursor and agent skills** synced by the [SkillBridge](${MARKETPLACE_URL}) extension.

## What is SkillBridge?

SkillBridge keeps skills identical across machines by mirroring local folders such as \`~/.cursor/skills\` and \`~/.agents/skills\` into the \`skills/\` directory in this GitHub repository.

- **Push** uploads local skills and mirrors deletions under \`skills/\`
- **Pull** downloads remote skills and restores them into the matching local folders
- Last-write-wins warnings help avoid accidental overwrites when both sides changed

## Repository layout

| Path | Local folder (default) | Purpose |
|------|------------------------|---------|
| \`skills/cursor/\` | \`~/.cursor/skills\` | Cursor skills |
| \`skills/agents/\` | \`~/.agents/skills\` | Agent skills (e.g. \`npx skills add <owner/repo>\`) |
| \`README.md\` | n/a | Managed by SkillBridge (this file) |

Extra folders from \`skillBridge.skillsPaths\` are synced under \`skills/<id>/\`.

Do not put unrelated project files under \`skills/\`. They will be overwritten on the next sync.

## Support SkillBridge

If SkillBridge helps you, please rate it **5 stars** on the extension stores. Reviews improve discoverability so more developers can find it.

- [VS Code Marketplace](${MARKETPLACE_URL})
- [Open VSX Registry](${OPEN_VSX_URL}) (used by Cursor)

Thank you for using SkillBridge!

---

*Last successful sync: \`${lastSync}\` (UTC). Updated automatically by SkillBridge on each Push.*
`;
}
