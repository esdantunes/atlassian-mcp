# Release Guide

This project uses automated npm publishing via GitHub Actions.

Release flow in one sentence:
- Push code to `main` -> create and push tag `vX.Y.Z` -> workflow `publish.yml` runs -> package is published to npm.

## Prerequisites

- You have push permission to `main`.
- You have permission to create tags.
- npm Trusted Publisher is configured for this repository and `publish.yml`.
- Local tools available: `git`, `npm`, `bun`, `gh` (optional but recommended).

## Standard Release Steps

### 1) Make your code changes

Implement and validate your changes.

Recommended local checks:

```bash
bun run build
bun run lint
bun audit
```

### 2) List existing tags

Use this to find the latest released version:

```bash
git tag --sort=-v:refname
```

### 3) Bump `package.json` version

The npm version comes from `package.json`, not from the Git tag name alone.

Option A (recommended):

```bash
npm version patch --no-git-tag-version
# or
npm version minor --no-git-tag-version
# or
npm version major --no-git-tag-version
```

Option B (manual):
- Edit `package.json` and set `"version": "X.Y.Z"`.

### 4) Commit changes

```bash
git add package.json bun.lock
git commit -m "release: bump version to X.Y.Z"
```

Include any other files changed for the release.

### 5) Create a matching Git tag

Tag must match `package.json` version:

```bash
git tag vX.Y.Z
```

Example:
- `package.json` version: `1.0.3`
- Git tag: `v1.0.3`

### 6) Push commit and tag

```bash
git push origin main
git push origin vX.Y.Z
```

### 7) Watch GitHub Actions publish workflow

List recent runs:

```bash
gh run list --repo esdantunes/atlassian-mcp --limit 10
```

Watch the latest run until completion:

```bash
gh run watch --repo esdantunes/atlassian-mcp
```

If you already have a run id:

```bash
gh run watch <RUN_ID> --repo esdantunes/atlassian-mcp --exit-status
```

### 8) Verify npm published version

```bash
npm view @esdantunes/atlassian-mcp version
```

It should match the version you released.

## Quick Example (Patch Release)

```bash
# 1) checks
bun run build && bun run lint && bun audit

# 2) bump to next patch version
npm version patch --no-git-tag-version

# 3) commit
git add package.json bun.lock
git commit -m "release: bump version"

# 4) create matching tag from package.json version
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"

# 5) push
git push origin main
git push origin "v$VERSION"

# 6) verify publish
npm view @esdantunes/atlassian-mcp version
```

## Common Mistakes

- Tag and `package.json` version do not match.
- Tag created before version bump commit.
- Trying to republish an already published version.
- Not checking workflow result after pushing tag.
- Local dirty tree with unrelated files (review `git status` before release).
