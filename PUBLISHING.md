# Publishing SkillBridge (Marketplace + Open VSX)

This repo publishes automatically via [`.github/workflows/publish.yml`](.github/workflows/publish.yml) when you push a version tag matching `v*` (example: `v1.0.0`). After Marketplace and Open VSX succeed, the same job creates a **GitHub Release** for that tag and attaches the packaged `.vsix`.

Your `package.json` publisher id is **`fqueis`**. That same id must exist on both stores.

## Overview

| Store | Secret name in GitHub | What it is |
|-------|------------------------|------------|
| VS Code Marketplace | `VSCE_PAT` | Azure DevOps Personal Access Token with Marketplace access |
| Open VSX (Cursor) | `OVSX_PAT` | Open VSX personal access token |

## 1) Visual Studio Marketplace (`VSCE_PAT`)

### 1.1 Create / sign in to Azure DevOps

1. Open [https://dev.azure.com](https://dev.azure.com)
2. Sign in with a Microsoft account
3. Create an organization if you do not have one (any name is fine)

### 1.2 Create a Personal Access Token

1. In Azure DevOps, open **User settings** (top right) → **Personal access tokens**
2. Click **+ New Token**
3. Fill:
   - **Name:** `skillbridge-vsce` (or similar)
   - **Organization:** your org (or **All accessible organizations** if available)
   - **Expiration:** choose a date you can remember to rotate
   - **Scopes:** **Custom defined**
4. Enable:
   - **Marketplace** → **Manage**
5. Create the token and **copy it once** (you will not see it again)

Official docs: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

> Note: Azure DevOps is retiring **global** PATs on **2026-12-01**. For now a Marketplace Manage PAT still works for `vsce`. Plan to migrate later if Microsoft requires Entra ID / workload identity for CI.

### 1.3 Create the publisher `fqueis`

1. Open [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Create a publisher with id **`fqueis`** (must match `package.json`)
3. Complete the publisher profile

Optional local check:

```bash
pnpm exec vsce login fqueis
# paste VSCE_PAT when asked
```

## 2) Open VSX Registry (`OVSX_PAT`)

Cursor installs many extensions from Open VSX, so this store matters.

Official docs:

- [Publishing Extensions](https://github.com/EclipseFdn/open-vsx.org/wiki/Publishing-Extensions)
- [Namespace Access](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access)

### Important: create namespace vs claim ownership

On Open VSX these are **two different steps**:

| Step | What it does | Result |
|------|----------------|--------|
| **Create namespace** | `ovsx create-namespace fqueis` | You become a **contributor** and can publish |
| **Claim ownership** | Public GitHub issue on EclipseFdn/open-vsx.org | You become an **owner**; extensions can show as **verified** |

Creating a namespace does **not** make you the owner. Without an owner, published extensions stay **unverified** (warning icon). After ownership is granted and the publisher is a namespace member, versions show as **verified** (shield).

Only namespace **members** can publish (namespaces are no longer public). Service accounts / CI bots should be added as **contributors**, not owners.

### 2.1 Eclipse account + Publisher Agreement

1. Create an [Eclipse account](https://accounts.eclipse.org/) and set **GitHub Username** to the **same** GitHub account you use on open-vsx.org
2. Open [https://open-vsx.org](https://open-vsx.org) → sign in with **GitHub**
3. Avatar → **Settings** → **Log in with Eclipse** → authorize
4. On the profile page, open **Show Publisher Agreement**, read it, and click **Agree**

Without the Publisher Agreement you cannot publish.

### 2.2 Create an access token

1. Open [https://open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens) (or Avatar → Settings → Access Tokens)
2. **Generate New Token** (example: `skillbridge-github-actions`)
3. Copy the token once and store it as the GitHub secret `OVSX_PAT`

Prefer one token per environment (local vs CI) so you can revoke safely.

### 2.3 Create the namespace `fqueis`

The `publisher` field in `package.json` is the Open VSX **namespace**. Create it before the first publish:

```bash
pnpm exec ovsx create-namespace fqueis -p <OVSX_PAT>
```

Valid names: letters, numbers, and `_`, `-`, `+`, `$`, `~` (regex `[\w\-\+\$~]+`).

After this, you are a **contributor** of `fqueis` and can publish. The namespace still has **no owner** until the claim below is approved.

### 2.4 Claim namespace ownership (verified badge)

1. Log in to [open-vsx.org](https://open-vsx.org) with the GitHub account that should own the namespace
2. Open a public issue using the **Claim namespace ownership** template:  
   [https://github.com/EclipseFdn/open-vsx.org/issues/new/choose](https://github.com/EclipseFdn/open-vsx.org/issues/new/choose)
3. Title example: `Claiming namespace fqueis`
4. Fill the form:
   - **Namespace:** `fqueis`
   - Confirm the namespace is not already owned (search on open-vsx.org)
   - Confirm the GitHub account has at least **12 months** of public history
   - Pick a validation option (see below)

Ownership is granted publicly via that issue so the process stays transparent. Comment on an existing claim if you need to dispute one.

#### Validation options (pick one)

| Option | When to use |
|--------|-------------|
| **1 – VS Code Publisher with Repo** | Same id exists on [Marketplace publishers](https://marketplace.visualstudio.com/publishers/fqueis) **and** an extension there has a repo in `package.json` |
| **2 – VS Code Publisher without Repo** | Marketplace publisher exists, but no published extensions (or no GitHub repos) |
| **3 – Not a Marketplace publisher** | Namespace matches your GitHub id, or you prove domain ownership |
| **4 – All other cases** | Slowest path; use only if 1–3 do not apply |

For SkillBridge / `fqueis`, **Option 1** is preferred when you already have a Marketplace publisher and at least one published extension with a repo (for example [CUIDv2 Tools](https://marketplace.visualstudio.com/items?itemName=fqueis.cuidv2-tools)).

Under Option 1, check either:

- The extension repo (public or private) is owned by the GitHub ID opening the issue, **or**
- Provide a **commit URL** in that repo authored by that GitHub ID

#### Example Claim Evidence (Option 1)

```text
Claiming Open VSX namespace: fqueis

VS Code Marketplace publisher:
https://marketplace.visualstudio.com/publishers/fqueis

Published extension with repository in package.json / Marketplace metadata:
- Extension: fqueis.cuidv2-tools (CUIDv2 Tools)
- Marketplace: https://marketplace.visualstudio.com/items?itemName=fqueis.cuidv2-tools
- Repository: https://github.com/fqueis/vscode-cuidv2-tools

Ownership proof (Option 1):
The extension repository is owned by the same GitHub ID making this request: @fqueis

Additional commit evidence by @fqueis:
https://github.com/fqueis/vscode-cuidv2-tools/commit/6172a010e524df0ed914a1347dadd6c338702e11
```

Wait until the issue is approved and you appear as **owner** of namespace `fqueis` under Open VSX Settings → Namespaces.

### 2.5 Optional local publish check

```bash
pnpm run package
pnpm exec ovsx publish builds/cursor-skills-sync-1.0.0.vsix -p <OVSX_PAT>
```

You can publish as a contributor before ownership is approved; the extension may show as **unverified** until the claim lands. After you are owner (and the publishing user is a member), new versions can show as **verified**.

## 3) Add secrets to the GitHub repository

1. Open your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Use **Repository secrets** (not Environment secrets), unless the workflow is changed to use an environment
3. Click **New repository secret** and create:

| Name | Value |
|------|--------|
| `VSCE_PAT` | Azure DevOps PAT from step 1 |
| `OVSX_PAT` | Open VSX token from step 2 |

Exact names matter: the workflow reads `${{ secrets.VSCE_PAT }}` and `${{ secrets.OVSX_PAT }}`.

## 4) First publish with a tag

Make sure the code is pushed to GitHub, then create and push a version tag:

```bash
git add .
git commit -m "chore: prepare first release"
git push -u origin HEAD

# tag must match package.json version: 1.0.0 -> v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

Then:

1. GitHub → **Actions** → workflow **Publish Extension**
2. Confirm the run is green
3. Check:
   - Marketplace: `https://marketplace.visualstudio.com/items?itemName=fqueis.cursor-skills-sync`
   - Open VSX: `https://open-vsx.org/extension/fqueis/cursor-skills-sync`
   - GitHub Release for the tag (includes the `.vsix` asset and `CHANGELOG.md` notes)

## 5) Later releases

1. Bump `"version"` in `package.json` (example: `1.0.1`)
2. Update `CHANGELOG.md`
3. Commit and push
4. Tag and push:

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Troubleshooting

- **Publisher does not exist / not authorized:** publisher id in Marketplace/Open VSX is not exactly `fqueis`
- **401 / 403 on Marketplace:** PAT missing **Marketplace → Manage**, expired, or wrong org scope
- **Open VSX: cannot publish / unknown namespace:** run `ovsx create-namespace fqueis` first; only namespace members can publish
- **Open VSX shows unverified / warning:** namespace has no owner yet, or the publishing user is not a member — finish the [ownership claim](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access) and keep your account (or CI token user) as member
- **Publisher Agreement missing:** complete Eclipse login + agreement on the Open VSX profile page
- **Workflow did not start:** tag must match `v*` and must be pushed (`git push origin v1.0.0`)
- **Local package works, CI fails:** secrets not set, or set on the wrong repository/fork (use Repository secrets)

## Security tips

- Never commit tokens to git
- Store them only as GitHub Actions secrets
- Rotate tokens when they expire or if leaked
- Prefer the shortest useful expiration you can manage
- Prefer separate Open VSX tokens for local vs CI
