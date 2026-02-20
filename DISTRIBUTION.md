# Atlassian MCP Server Distribution Guide

This document describes the different ways to distribute and install the Atlassian MCP server for use with Gemini CLI or other MCP clients.

## Distribution Options

### 1. 📦 NPM Distribution (Recommended)

This is the most professional and convenient way to distribute your MCP agent.

#### Prerequisites

1. Account on [npmjs.com](https://www.npmjs.com/)
2. Authentication configured: `npm login`

#### Package Preparation

1. **Ensure `package.json` is correctly configured:**
   - Unique name on npm (e.g., `@your-username/atlassian-mcp`)
   - Updated version
   - `bin` field configured (already in package.json)
   - `files` field to include only necessary files

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Test locally before publishing:**
   ```bash
   npm pack
   # This creates a .tgz file you can test
   ```

#### Publishing to NPM

```bash
# Publish for the first time
npm publish --access public

# For scoped packages (@username/package), use:
npm publish --access public

# Update version and publish
npm version patch  # or minor, major
npm publish
```

#### User Installation

**Option A: Global Installation**
```bash
npm install -g @your-username/atlassian-mcp
```

**Option B: Local Project Installation**
```bash
npm install @your-username/atlassian-mcp
```

**Option C: Direct Execution via npx (no installation)**
```bash
npx @your-username/atlassian-mcp
```

#### Gemini CLI Configuration

After installing via npm, users can configure in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "npx",
      "args": ["@your-username/atlassian-mcp"],
      "env": {
        "JIRA_HOST": "${JIRA_HOST}",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_PROJECT_KEY": "${JIRA_PROJECT_KEY}",
        "ISSUE_CONFIG_PATH": "${ISSUE_CONFIG_PATH}"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "node",
      "args": ["/path/to/node_modules/@your-username/atlassian-mcp/dist/index.js"],
      "env": {
        "JIRA_HOST": "${JIRA_HOST}",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_PROJECT_KEY": "${JIRA_PROJECT_KEY}",
        "ISSUE_CONFIG_PATH": "${ISSUE_CONFIG_PATH}"
      }
    }
  }
}
```

**Advantages:**
- ✅ Simple installation: `npm install`
- ✅ Automatic version management
- ✅ Easy updates: `npm update`
- ✅ Wide and professional distribution
- ✅ Automatic dependency support

---

### 2. 🔗 Git Repository Distribution

Allows direct installation from a Git repository (GitHub, GitLab, etc.).

#### Preparation

1. **Ensure the repository is public** (or users have access)
2. **Create a release/tag** for stable versions:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

#### User Installation

**Via npm directly from Git:**
```bash
npm install git+https://github.com/your-username/atlassian-mcp.git
```

**Or from a specific tag:**
```bash
npm install git+https://github.com/your-username/atlassian-mcp.git#v1.0.0
```

**Or from a branch:**
```bash
npm install git+https://github.com/your-username/atlassian-mcp.git#main
```

#### Gemini CLI Configuration

After installing, configure in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "node",
      "args": ["./node_modules/atlassian-mcp/dist/index.js"],
      "cwd": "${HOME}/project",
      "env": {
        "JIRA_HOST": "${JIRA_HOST}",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_PROJECT_KEY": "${JIRA_PROJECT_KEY}",
        "ISSUE_CONFIG_PATH": "${ISSUE_CONFIG_PATH}"
      }
    }
  }
}
```

**Advantages:**
- ✅ Version control via Git
- ✅ Easy for collaborative development
- ✅ No npm publication required
- ✅ Direct access to source code

**Disadvantages:**
- ⚠️ Requires users to have Git installed
- ⚠️ Can be slower than npm

---

### 3. 📁 Symbolic Link Distribution (Local Development)

Useful for development and local testing without copying files.

#### Link Creation

```bash
# In the Gemini extensions directory
ln -s /absolute/path/to/atlassian-mcp ~/.gemini/extensions/atlassian-mcp
```

#### Configuration

Use the `gemini-extension.json` that's already in the project root. Gemini CLI will detect it automatically.

**Advantages:**
- ✅ Fast development
- ✅ Changes reflect immediately
- ✅ No need to copy files

**Disadvantages:**
- ⚠️ Local use only
- ⚠️ Requires absolute path

---

### 4. 📦 Tarball Package Distribution

Distribute a compressed `.tgz` file that can be installed directly.

#### Package Creation

```bash
npm pack
# This creates: atlassian-mcp-1.0.0.tgz
```

#### User Installation

```bash
npm install /path/to/atlassian-mcp-1.0.0.tgz
```

Or from a URL:

```bash
npm install https://your-site.com/packages/atlassian-mcp-1.0.0.tgz
```

**Advantages:**
- ✅ Full control over distribution
- ✅ No npm registry required
- ✅ Can be hosted anywhere

---

## Options Comparison

| Method | Ease | Professionalism | Maintenance | Recommended For |
|--------|------|-----------------|--------------|-----------------|
| **NPM** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Production, public distribution |
| **Git** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Collaborative development |
| **Symbolic Link** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | Local development |
| **Tarball** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Private/enterprise distribution |

## Publication Checklist

Before distributing, make sure:

- [ ] ✅ Code tested and working
- [ ] ✅ `package.json` with correct information (name, version, author)
- [ ] ✅ `README.md` updated with installation instructions
- [ ] ✅ `.gitignore` correctly configured
- [ ] ✅ Build executed (`npm run build`)
- [ ] ✅ Sensitive files not included (`.env`, `issue-config.yml`)
- [ ] ✅ License defined in `package.json`
- [ ] ✅ Version updated in `package.json` and `gemini-extension.json`

## Important Files for Distribution

Make sure to include in the package:

- ✅ `dist/` (compiled files)
- ✅ `package.json`
- ✅ `README.md`
- ✅ `issue-config.example.yml`
- ✅ `.env.example` (if exists)
- ✅ `LICENSE` (if exists)

Files that should NOT be included:

- ❌ `node_modules/`
- ❌ `src/` (TypeScript source code - optional, can include for development)
- ❌ `.env`
- ❌ `issue-config.yml` (user configuration)
- ❌ `.git/`
- ❌ IDE files (`.vscode/`, `.idea/`)

## Recommended Next Steps

1. **Publish to NPM:**
   ```bash
   npm login
   npm publish --access public
   ```

2. **Create GitHub releases:**
   - Create tags for versions
   - Add changelog
   - Create releases with notes

3. **Documentation:**
   - Add badges to README (npm version, license, etc.)
   - Create contribution guide
   - Add usage examples

4. **CI/CD:**
   - Configure GitHub Actions for automatic build
   - Automatic npm publication when creating tags
