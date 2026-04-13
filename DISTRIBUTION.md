# Atlassian MCP Continuous Distribution

This guide defines the official distribution model for `atlassian-jira` with a single MCP contract that works in both Gemini CLI and Cursor.

## Distribution Model

Primary channel:
- npm public package: `@esdantunes/atlassian-mcp`

Runtime strategy:
- Always run via `npx` for users (`no manual install` path)
- Use pinned major or `@latest` according to your release policy

Canonical MCP server block:

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

## Client Compatibility

- Gemini CLI: place block in `~/.gemini/settings.json` under `mcpServers`
- Cursor: place block in `.cursor/mcp.json` (workspace) or equivalent global MCP config

Use the same command and args for both clients to reduce support complexity.

## User Onboarding Flow

1. Copy `examples/mcp.json` into the MCP config file used by client.
2. Copy `examples/.env.example` values into your shell/profile/secrets manager.
3. Fill:
   - `JIRA_HOST`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `JIRA_PROJECT_KEY`
   - `ISSUE_CONFIG_PATH` (optional but recommended)
4. Start client and validate server listing:
   - Gemini: `/mcp tools atlassian-jira`
   - Cursor: open MCP tools and verify `atlassian-jira` is available

## Release Workflow (Continuous)

Recommended trigger:
- Create a Git tag in semantic version format: `vX.Y.Z`

Recommended CI sequence:
1. Install dependencies
2. Audit (`bun audit`)
3. Build (`bun run build`)
4. Lint (`bun run lint`)
5. Publish to npm with provenance (`npm publish --access public --provenance`)

The repository includes `.github/workflows/publish.yml` for this flow.

## Publishing Prerequisites

- npm package owner for `@esdantunes/atlassian-mcp`
- npm Trusted Publishing configured for this repository/workflow
- GitHub Actions workflow permissions include `id-token: write`
- Correct package metadata in `package.json`:
  - `name`
  - `repository.url`
  - `bugs.url`
  - `homepage`

## Troubleshooting

- `npm ERR! 404` for package:
  - Verify package name and scope.
  - Check if package version is already published.
- `npm publish` fails with auth/trust error:
  - Confirm Trusted Publisher is configured in npm for this exact GitHub repo and workflow.
  - Confirm workflow has `permissions.id-token: write`.
  - Confirm publish is running from the expected tag/branch policy configured in npm.
- MCP starts but Jira calls fail:
  - Verify Jira env vars and token validity.
  - Confirm `JIRA_HOST` includes `https://`.
- `ISSUE_CONFIG_PATH` not found:
  - Use absolute path or ensure relative path resolves from client working directory.
