# Atlassian MCP Server

MCP (Model Context Protocol) server for interacting with Jira Cloud, designed to simplify issue creation and querying by using human-readable field names instead of Jira IDs, with configurable defaults to minimize required input.

## Purpose

This project provides an MCP server that enables AI assistants (like Gemini CLI) to interact with Jira Cloud through a simplified interface that:
- Uses human-readable field names instead of Jira custom field IDs
- Supports configurable default values to minimize API payloads
- Works with any Jira project through configuration files
- Provides clean, simplified responses

## Prerequisites

- **Node.js**: >= 24.0.0
- **Bun**: Latest version (package manager) - or npm/yarn
- **Jira Cloud** account with API token
- **Gemini CLI** (or another MCP-compatible client)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Jira credentials:
   ```env
   JIRA_HOST=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token-here
   JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
   ```

3. **Configure issue defaults and custom fields:**
   ```bash
   cp issue-config.example.yml issue-config.yml
   ```
   Edit `issue-config.yml` with your project-specific defaults and custom field mappings.

4. **Build the project:**
   ```bash
   bun run build
   # or
   npm run build
   ```

5. **Configure Gemini CLI:**

   **Via CLI command:**
   ```bash
   gemini mcp add atlassian-jira node dist/index.js
   ```

   **Or via settings.json** (`~/.gemini/settings.json` or `.gemini/settings.json`):
   ```json
   {
     "mcpServers": {
       "atlassian-jira": {
         "command": "node",
         "args": ["dist/index.js"],
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

## Configuration

### `.env` File

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Your Jira Cloud instance URL | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Your Jira account email | `user@example.com` |
| `JIRA_API_TOKEN` | Jira API token ([create one](https://id.atlassian.com/manage-profile/security/api-tokens)) | `ATATT3xFfGF0...` |
| `JIRA_PROJECT_KEY` | Default Jira project key | `PROJ` |
| `ISSUE_CONFIG_PATH` | Path to issue config file (optional, default: `issue-config.yml`) | `issue-config.yml` |

### `issue-config.yml` File

Configure default values and custom field mappings for your Jira project:

```yaml
defaults:
  parent_key: "PROJ-1"
  issue_type: "Task"
  priority: "Low"
  labels:
    - label1
    - label2
  components:
    - component-name

custom_fields:
  my-custom-field:
    field_id: customfield_12345
    format: single              # "single" or "array"
    default_value: "Option A"
    default_option_id: "10001"
    options:
      "Option A": "10001"
      "Option B": "10002"
```

**Notes:**
- Omit any `defaults` key to not send that field unless provided in the request
- Custom fields map human-readable names to Jira field IDs and option IDs
- See `issue-config.example.yml` for detailed documentation

## MCP Tools

The server exposes the following MCP tools:

### `list_issues`

List issues with pagination support.

**Parameters:**
- `maxResults` (optional): Number of issues per page (default: 50, max: 5000)
- `nextPageToken` (optional): Token from previous response for pagination

**Example usage with Gemini CLI:**
```
/mcp call atlassian-jira list_issues {"maxResults": 10}
```

**Response:**
```json
{
  "issues": [
    {
      "id": "PROJ-1",
      "title": "Issue title",
      "description": "Issue description",
      "descriptionAdf": {
        "version": 1,
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "Issue description" }
            ]
          }
        ]
      },
      "status": "To Do",
      "priority": "Medium",
      "reporter": {
        "id": "account-id",
        "displayName": "John Doe",
        "emailAddress": "john@example.com"
      },
      "assignee": null
    }
  ],
  "nextPageToken": "token-for-next-page"
}
```

**Note:** The `description` field always contains plain text for backward compatibility. The `descriptionAdf` field (optional) contains the full ADF (Atlassian Document Format) structure with all formatting preserved when available. Use `descriptionAdf` when you need to preserve or work with rich text formatting.

### `get_issue`

Get a specific issue by ID or key.

**Parameters:**
- `id` (required): Issue ID or key (e.g., `PROJ-123`)

**Example usage with Gemini CLI:**
```
/mcp call atlassian-jira get_issue {"id": "PROJ-1"}
```

**Response:**
```json
{
  "id": "PROJ-1",
  "title": "Issue title",
  "description": "Issue description",
  "descriptionAdf": {
    "version": 1,
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Issue description" }
        ]
      }
    ]
  },
  "status": "In Progress",
  "priority": "High",
  "reporter": { ... },
  "assignee": { ... }
}
```

**Note:** The `description` field always contains plain text for backward compatibility. The `descriptionAdf` field (optional) contains the full ADF (Atlassian Document Format) structure with all formatting preserved when available. Use `descriptionAdf` when you need to preserve or work with rich text formatting.

### `create_issue`

Create a new issue.

**Parameters:**
- `title` (required): Issue title
- `description` (optional): Description as plain text string or ADF object
- `priority` (optional): Priority name (e.g., "High", "Medium", "Low")
- `parent` (optional): Parent issue key (e.g., "PROJ-1")
- `labels` (optional): Array of label strings
- `components` (optional): Array of component names
- `assignee` (optional): Account ID of assignee, or `null` to unassign
- `reporter` (optional): Account ID of reporter
- Any custom field names from `issue-config.yml`

**Description Field:**

The `description` field accepts two formats:

1. **Plain text string** - Automatically converted to basic ADF format:
   ```json
   {
     "title": "New issue",
     "description": "Simple text description"
   }
   ```

2. **ADF (Atlassian Document Format) object** - Full rich text formatting support:
   ```json
   {
     "title": "New issue",
     "description": {
       "version": 1,
       "type": "doc",
       "content": [
         {
           "type": "heading",
           "attrs": { "level": 1 },
           "content": [
             { "type": "text", "text": "Heading 1" }
           ]
         },
         {
           "type": "paragraph",
           "content": [
             { "type": "text", "text": "Text with " },
             { 
               "type": "text", 
               "text": "bold", 
               "marks": [{ "type": "strong" }] 
             }
           ]
         }
       ]
     }
   }
   ```

   ADF supports: headings, bold/italic, lists, tables, links, code blocks, and more. See [Atlassian Document Format documentation](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure) for full specification.

**Example usage with Gemini CLI:**
```
/mcp call atlassian-jira create_issue {"title": "New issue", "description": "Issue description", "priority": "High"}
```

**Response:**
```json
{
  "id": "2599962",
  "key": "PROJ-123",
  "self": "https://domain.atlassian.net/rest/api/3/issue/2599962"
}
```

**Behavior:**
- Fields provided override defaults
- Fields not provided use defaults from `issue-config.yml` (if configured)
- Fields without defaults are omitted from the Jira API request

### `update_issue`

Update an existing issue. Only provided fields will be updated (partial update).

**Parameters:**
- `id` (required): Issue ID or key (e.g., `PROJ-123`)
- `title` (optional): New title
- `description` (optional): New description (string or ADF object)
- `priority` (optional): New priority
- `parent` (optional): New parent issue key
- `labels` (optional): New array of labels
- `components` (optional): New array of components
- `assignee` (optional): New assignee account ID, or `null` to unassign
- Any custom field names from `issue-config.yml`

**Example usage with Gemini CLI:**
```
/mcp call atlassian-jira update_issue {"id": "PROJ-123", "title": "Updated title", "priority": "High"}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue updated successfully"
}
```

**Behavior:**
- Only fields provided in the request are updated
- Fields not provided remain unchanged
- At least one field must be provided
- Supports same `description` formats as `create_issue`
- Custom fields work the same way as in `create_issue`

## Development

```bash
bun run dev      # Start development server with hot reload (tsx watch)
bun run build    # Build for production
bun run start    # Run production build
bun run lint     # Run ESLint
```

## Testing with Gemini CLI

After configuring the MCP server, you can test it:

1. **List available tools:**
   ```
   /mcp list
   ```

2. **List tools from this server:**
   ```
   /mcp tools atlassian-jira
   ```

3. **Call a tool:**
   ```
   /mcp call atlassian-jira list_issues {"maxResults": 5}
   ```

## Project Structure

```
.
├── src/
│   ├── mcp/
│   │   ├── server.ts          # MCP server initialization
│   │   └── tools.ts            # Tool registration and routing
│   ├── handlers/
│   │   ├── list-issues.ts     # Handler for list_issues tool
│   │   ├── get-issue.ts       # Handler for get_issue tool
│   │   ├── create-issue.ts    # Handler for create_issue tool
│   │   └── update-issue.ts    # Handler for update_issue tool
│   ├── config/                # Configuration loaders (Jira, issue defaults)
│   ├── lib/                   # Jira client and issue field builders
│   ├── types/                 # TypeScript type definitions
│   └── index.ts               # Entry point
├── .env                       # Environment variables (gitignored)
├── .env.example               # Environment variables template
├── issue-config.yml           # Issue defaults and custom field mappings (gitignored)
├── issue-config.example.yml   # Issue configuration template
├── tsconfig.json              # TypeScript configuration
├── eslint.config.js           # ESLint configuration
└── package.json               # Project dependencies and scripts
```

## Security Notes

### Known Vulnerabilities

The project may show a moderate vulnerability in `ajv` (< 8.18.0) when running `bun audit`. This vulnerability affects:

- **ESLint** (development dependency only)
- **@modelcontextprotocol/sdk** (transitive dependency)

**Impact:** This is a moderate severity ReDoS (Regular Expression Denial of Service) vulnerability that only affects the `$data` option in ajv. Since:
1. This is a development-time dependency (ESLint)
2. The vulnerability requires specific usage patterns (`$data` option) that are not used in this project's runtime code
3. ESLint 10.0.0 does not yet support ajv 8.x (required for the fix)

**Status:** This vulnerability does not affect the production runtime of the MCP server. The ESLint maintainers are aware of this issue and will address it in a future release.

## License

MIT
