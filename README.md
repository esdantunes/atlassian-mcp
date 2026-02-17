# Atlassian Bot

REST API utility for interacting with Jira Cloud, designed to simplify issue creation and querying by using human-readable field names instead of Jira IDs, with configurable defaults to minimize required input.

## Purpose

This project provides a simplified interface to Jira Cloud that:
- Uses human-readable field names instead of Jira custom field IDs
- Supports configurable default values to minimize API payloads
- Works with any Jira project through configuration files
- Provides clean, simplified responses

## Prerequisites

- **Node.js**: >= 24.0.0
- **Bun**: Latest version (package manager)
- **Jira Cloud** account with API token

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   bun install
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

4. **Start the server:**
   ```bash
   bun run dev    # Development with hot reload
   # or
   bun run start  # Production build
   ```

The server runs on `http://localhost:3000` by default (configurable via `PORT` env var).

## Configuration

### `.env` File

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Your Jira Cloud instance URL | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Your Jira account email | `user@example.com` |
| `JIRA_API_TOKEN` | Jira API token ([create one](https://id.atlassian.com/manage-profile/security/api-tokens)) | `ATATT3xFfGF0...` |
| `JIRA_PROJECT_KEY` | Default Jira project key | `PROJ` |
| `PORT` | Server port (optional, default: 3000) | `3000` |
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
- Omit any `defaults` key to not send that field unless provided in the request body
- Custom fields map human-readable names to Jira field IDs and option IDs
- See `issue-config.example.yml` for detailed documentation

## API Endpoints

### GET `/jira/issues`

List issues with pagination support.

**Query Parameters:**
- `maxResults` (optional): Number of issues per page (default: 50, max: 5000)
- `nextPageToken` (optional): Token from previous response for pagination

**Example:**
```bash
curl 'http://localhost:3000/jira/issues?maxResults=10'
```

**Response:**
```json
{
  "issues": [
    {
      "id": "PROJ-1",
      "title": "Issue title",
      "description": "Issue description",
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

### GET `/jira/issues/:id`

Get a specific issue by ID or key.

**Example:**
```bash
curl 'http://localhost:3000/jira/issues/PROJ-1'
```

**Response:**
```json
{
  "id": "PROJ-1",
  "title": "Issue title",
  "description": "Issue description",
  "status": "In Progress",
  "priority": "High",
  "reporter": { ... },
  "assignee": { ... }
}
```

### POST `/jira/issues`

Create a new issue.

**Request Body:**
```json
{
  "title": "Issue title (required)",
  "description": "Optional description (string or ADF object)",
  "priority": "High",
  "parent": "PROJ-1",
  "labels": ["label1", "label2"],
  "components": "component-name",  // or ["component1", "component2"]
  "reporter": "account-id",
  "assignee": "account-id",        // or null to unassign
  "custom-field-name": "value"     // Any custom field from issue-config.yml
}
```

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
             },
             { "type": "text", "text": " and " },
             { 
               "type": "text", 
               "text": "italic", 
               "marks": [{ "type": "em" }] 
             }
           ]
         }
       ]
     }
   }
   ```

   ADF supports: headings, bold/italic, lists, tables, links, code blocks, and more. See [Atlassian Document Format documentation](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure) for full specification.

**Example (plain text):**
```bash
curl -X POST 'http://localhost:3000/jira/issues' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "New issue",
    "description": "Issue description",
    "priority": "High"
  }'
```

**Example (ADF formatted):**
```bash
curl -X POST 'http://localhost:3000/jira/issues' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "New issue",
    "description": {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "heading",
          "attrs": { "level": 1 },
          "content": [{ "type": "text", "text": "Title" }]
        },
        {
          "type": "paragraph",
          "content": [
            { "type": "text", "text": "Formatted " },
            { "type": "text", "text": "text", "marks": [{ "type": "strong" }] }
          ]
        }
      ]
    }
  }'
```

**Response (201):**
```json
{
  "id": "2599962",
  "key": "PROJ-123",
  "self": "https://domain.atlassian.net/rest/api/3/issue/2599962"
}
```

**Behavior:**
- Fields provided in the request body override defaults
- Fields not provided use defaults from `issue-config.yml` (if configured)
- Fields without defaults are omitted from the Jira API request

### PATCH `/jira/issues/:id`

Update an existing issue. Only provided fields will be updated (partial update).

**Path Parameters:**
- `id` (required): Issue ID or key (e.g., `PROJ-123`)

**Request Body:**
All fields are optional. Only fields provided will be updated:
```json
{
  "title": "Updated title",
  "description": "Updated description (string or ADF object)",
  "priority": "High",
  "assignee": "account-id",  // or null to unassign
  "parent": "PROJ-1",
  "labels": ["label1", "label2"],
  "components": "component-name",  // or ["component1", "component2"]
  "custom-field-name": "value"     // Any custom field from issue-config.yml
}
```

**Example:**
```bash
curl -X PATCH 'http://localhost:3000/jira/issues/PROJ-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Updated title",
    "priority": "High",
    "assignee": null
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Issue updated successfully"
}
```

**Behavior:**
- Only fields provided in the request body are updated
- Fields not provided remain unchanged
- At least one field must be provided
- Supports same `description` formats as POST (string or ADF object)
- Custom fields work the same way as in POST

## Development

```bash
bun run dev      # Start development server with hot reload
bun run build    # Build for production
bun run start    # Run production build
bun run lint     # Run ESLint
```

## Project Structure

```
.
├── src/
│   ├── config/         # Configuration loaders (Jira, issue defaults)
│   ├── lib/            # Jira client and issue field builders
│   ├── routes/         # API route handlers
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions (JSON response helpers)
├── issue-config.yml    # Issue defaults and custom field mappings (gitignored)
├── issue-config.example.yml  # Template for issue configuration
└── .env                # Environment variables (gitignored)
```

## License

MIT
