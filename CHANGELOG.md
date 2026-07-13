# Changelog

## 1.0.1

- Declare MIT license so Open VSX accepts the package
- Include `LICENSE` in the VSIX (remove `--skip-license` from packaging)

## 1.0.0

- Initial release of SkillBridge: Cursor Skills Sync
- Push/Pull mirror sync via GitHub `skills/` directory
- Last-write-wins conflict warnings with force confirmation
- Startup sync status check and status bar badges
- Managed skills-repo README with Marketplace / Open VSX review links
- Extension icon for Marketplace / Open VSX listings
- Automated publish workflow on `v*` tags (VS Marketplace + Open VSX)
- Publish workflow actions run on Node.js 24 (`checkout@v6`, `setup-node@v6`, `pnpm/action-setup@v6`)
- Publishing guide for store tokens, secrets, and Open VSX namespace claim
