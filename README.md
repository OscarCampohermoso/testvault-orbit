<p align="center">
  <img src="public/icon.png" alt="TestVault icon" width="120" />
</p>

# TestVault Extension

![License](https://img.shields.io/badge/License-GPLv3-blue.svg)

A browser extension to save and autofill test/staging accounts locally.

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Collaboration

1. Create a feature branch.
2. Run checks before opening a PR:

```bash
npm run lint
npm run build
```

3. Open a PR with a short summary of what changed.

## Releasing

Versioning and releases are **fully automated** via GitHub Actions. You don't need to manually change version numbers or create tags.

### How it works

1. You push code to `main` using [Conventional Commits](https://www.conventionalcommits.org/).
2. The `github-actions[bot]` reads your commit messages and determines if a version bump is needed.
3. If it detects a bump, the bot automatically:
   - Updates the version in `package.json`, `package-lock.json`, and `manifest.json`
   - Creates a commit (`chore: release vX.Y.Z`)
   - Creates a git tag (`vX.Y.Z`)
4. The tag triggers the **Release** workflow, which builds the extension and publishes a `.zip` to GitHub Releases.

### Commit prefixes

| Prefix | Bump | Example |
|---|---|---|
| `feat:` | minor (0.2.0 → 0.3.0) | `feat: custom fields support` |
| `fix:` | patch (0.2.0 → 0.2.1) | `fix: checkbox width issue` |
| `feat!:` / `BREAKING CHANGE` | major (0.2.0 → 1.0.0) | `feat!: new db schema` |
| `chore:`, `docs:`, `refactor:` | none | `chore: update readme` |

### Manual override

You can also trigger a version bump manually from the **Actions** tab → **Auto Version Bump** → **Run workflow**, selecting `patch`, `minor`, or `major`.

## Stack

- React + TypeScript + Vite
- Chrome Extension (Manifest V3)
- SQL.js (offscreen document)

## License

GPLv3
