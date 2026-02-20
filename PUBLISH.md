# Quick Publishing Guide

This guide shows the steps to publish the package to npm.

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **Authentication**: Run `npm login` in the terminal

## Publishing Steps

### 1. Prepare the Package

```bash
# Make sure you're in the project root
cd /Volumes/My\ Shared\ Files/eantunes/.gemini/extensions/atlassian-mcp

# Update the package name in package.json
# If you want to use a scope: @your-username/atlassian-mcp
# If you want a simple name: atlassian-mcp (check availability)

# Update version if necessary
npm version patch  # or minor, major

# Build the project
npm run build

# Test locally (creates a .tgz to test)
npm pack
```

### 2. Verify Package Contents

```bash
# See what will be included in the package
npm pack --dry-run

# Or extract the generated .tgz to inspect
tar -tzf atlassian-mcp-*.tgz
```

### 3. Publish

```bash
# Publish for the first time
npm publish --access public

# For future updates
npm version patch && npm publish
# or
npm version minor && npm publish
# or
npm version major && npm publish
```

### 4. Verify Publication

```bash
# Check in browser
# https://www.npmjs.com/package/@your-username/atlassian-mcp

# Or via CLI
npm view @your-username/atlassian-mcp
```

## Update Information in package.json

Before publishing, update this information in `package.json`:

```json
{
  "name": "@your-username/atlassian-mcp",  // or "atlassian-mcp" if available
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/atlassian-mcp.git"  // Update with your repo
  },
  "bugs": {
    "url": "https://github.com/your-username/atlassian-mcp/issues"  // Update
  },
  "homepage": "https://github.com/your-username/atlassian-mcp#readme"  // Update
}
```

## Useful Commands

```bash
# View local package information
npm list

# View published package information
npm view @your-username/atlassian-mcp

# Unpublish a version (only within first 72 hours)
npm unpublish @your-username/atlassian-mcp@1.0.0

# View all published versions
npm view @your-username/atlassian-mcp versions
```

## Pre-Publishing Checklist

- [ ] ✅ Code tested and working
- [ ] ✅ `npm run build` executed successfully
- [ ] ✅ Version updated in `package.json`
- [ ] ✅ Package name verified (available on npm)
- [ ] ✅ Repository information updated
- [ ] ✅ README.md updated
- [ ] ✅ Sensitive files not included (`.env`, `issue-config.yml`)
- [ ] ✅ `.npmignore` correctly configured
- [ ] ✅ `npm pack --dry-run` verified

## After Publishing

1. **Create GitHub release** (if using Git):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Update documentation** with npm installation instructions

3. **Share** the package with other users!
