# Atlassian MCP Server

I built this MCP because I needed a free-ish way to manage Jira issues without giving an AI the keys to the whole company kingdom.
So yes, the scope is intentionally reduced to my area and my projects. That is the point.
You can do the same for other teams: keep each MCP narrow, keep blast radius small, sleep better.
Also: this was my first MCP project, so part painkiller, part learning-by-fire.

## Why this exists

- Interact with Jira Cloud through MCP using practical tool inputs
- Keep automation scoped to specific projects and defaults
- Avoid broad, risky org-wide actions by design

## Prerequisites

- Node.js `>=24`
- Jira Cloud account + API token
- MCP client such as Gemini CLI or Cursor

## Installation

Use npm package distribution only (the GitHub repo is private).

### Option 1: Run with npx (recommended)

```bash
npx -y @esdantunes/atlassian-mcp@latest
```

### Option 2: Global install

```bash
npm install -g @esdantunes/atlassian-mcp
```

## Quick Setup (Gemini CLI + Cursor)

Use the same MCP block in both clients:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "npx",
      "args": ["-y", "@esdantunes/atlassian-mcp@latest"],
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

- Gemini CLI: `~/.gemini/settings.json`
- Cursor: `.cursor/mcp.json`
- Copy-ready example: `examples/mcp.json`

## Environment variables

Required:

- `JIRA_HOST` (example: `https://company.atlassian.net`)
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

Optional:

- `ISSUE_CONFIG_PATH` (defaults to `issue-config.yml` in current working directory)

## Issue defaults config

Use `issue-config.example.yml` as your template:

```bash
cp issue-config.example.yml issue-config.yml
```

This file lets you define defaults and custom field mappings for your project.

## Tool behavior details

This README is intentionally short.
Detailed behavior, tool inputs, and schema-level contract live in:

- `src/mcp/tools.ts`

## License

MIT
