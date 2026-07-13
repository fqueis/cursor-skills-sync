# SkillBridge: Cursor Skills Sync

Sync your **Cursor and agent skills** across machines using a GitHub repository.

## Features

- Push / Pull mirror sync for configurable local skills folders
- Remote skills kept separate under `skills/cursor/` and `skills/agents/`
- Last-write-wins warnings before overwriting divergent changes
- Startup status check (notify only; never auto-applies)
- Managed promotional `README.md` written to your skills repo on Push
- **Least-privilege auth**: fine-grained GitHub PAT limited to **one repository** (no full-account OAuth)
- Works in **VS Code** and **Cursor** (Open VSX)

## Install

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=felipequeis.cursor-skills-sync)
- [Open VSX Registry](https://open-vsx.org/extension/felipequeis/cursor-skills-sync)

If SkillBridge helps you, please leave a **5-star** review. It improves discoverability for everyone.

## Quick start

1. Install the extension
2. Click **SkillBridge** in the status bar (or run **SkillBridge: Open Menu**)
3. Create an **empty private** GitHub repository (or reuse one already managed by SkillBridge)
4. Create a [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) (not Classic):
   - Repository access: **Only select repositories** → pick that one repo
   - Under **Repository permissions**, find **Contents**
   - Change the Contents dropdown from **No access** → **Read and write**
   - Leave other permissions on **No access** (Metadata stays Read-only automatically)
5. Paste the token when SkillBridge asks (stored in OS-backed Secret Storage)
6. **Push** from the machine that has your skills
7. On other machines: configure the same `owner/repo` + a PAT for that repo, then **Pull**

### Repository rules

- **Empty repo** (or only GitHub defaults like README/LICENSE): accepted and initialized by SkillBridge
- **Already synced by SkillBridge**: accepted (detected via managed README marker). This is how a second computer works even though the repo is no longer empty
- **Any other non-empty repo**: rejected, so SkillBridge never overwrites unrelated projects

## Settings

| Setting                        | Default                                    | Description                       |
| ------------------------------ | ------------------------------------------ | --------------------------------- |
| `skillBridge.skillsPaths`      | `["~/.cursor/skills", "~/.agents/skills"]` | Local skills folders to sync      |
| `skillBridge.githubRepository` | _(empty)_                                  | Target GitHub repo (`owner/repo`) |

On GitHub, folders are kept separate:

- `skills/cursor/` ← `~/.cursor/skills`
- `skills/agents/` ← `~/.agents/skills` (including installs from `npx skills add`)

That way another machine restores each skill into the same kind of folder.

## Commands

- `SkillBridge: Open Menu`
- `SkillBridge: Configure GitHub Repository`
- `SkillBridge: Update GitHub Token`
- `SkillBridge: Push Skills`
- `SkillBridge: Pull Skills`
- `SkillBridge: Check Sync Status`
