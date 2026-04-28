import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { handleListIssues } from "../handlers/list-issues.js";
import { handleGetIssue } from "../handlers/get-issue.js";
import { handleCreateIssue } from "../handlers/create-issue.js";
import { handleUpdateIssue } from "../handlers/update-issue.js";
import { handleQueryIssues } from "../handlers/query-issues.js";
import { handleListProjectVersions } from "../handlers/list-project-versions.js";
import { handleReadConfluencePages } from "../handlers/read-confluence-pages.js";
import { handleCreateConfluencePage } from "../handlers/create-confluence-page.js";
import { handleUpdateConfluencePage } from "../handlers/update-confluence-page.js";
import { rulesContext } from "../config/rules-context.js";

const INTERNAL_RULES_CONTEXT_FIELD = "_rulesContext";

function normalizeToolArgs(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

function injectInternalRulesContext(
  args: Record<string, unknown>
): Record<string, unknown> {
  if (!rulesContext) return args;
  return {
    ...args,
    [INTERNAL_RULES_CONTEXT_FIELD]: rulesContext,
  };
}

function stripInternalFields(args: Record<string, unknown>): Record<string, unknown> {
  const safeArgs = { ...args };
  delete safeArgs[INTERNAL_RULES_CONTEXT_FIELD];
  return safeArgs;
}

const jiraAdfDocInputSchemaProperty = {
  type: "object" as const,
  description:
    "Atlassian Document Format (ADF) root document: { type: 'doc', version: 1, content: [...] }. For updates, reuse descriptionAdf from get_issue to preserve formatting. https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/",
  additionalProperties: true,
  properties: {
    type: { type: "string" as const, const: "doc" as const },
    version: { type: "number" as const },
    content: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: true,
      },
    },
  },
  required: ["type", "version", "content"] as const,
};

const jiraAdfDocumentSchema = z
  .object({
    type: z.literal("doc"),
    version: z.number(),
    content: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

const readConfluencePagesSchema = z
  .object({
    pageId: z.string().min(1).optional(),
    version: z.number().int().min(1).optional(),
    spaceKey: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    cql: z.string().min(1).optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    nextPageToken: z.string().optional(),
    bodyFormat: z.enum(["storage", "view", "none"]).optional(),
  })
  .superRefine((value, ctx) => {
    const hasPageId = Boolean(value.pageId);
    const hasTitleMode = Boolean(value.title);
    const hasCql = Boolean(value.cql);
    const modeCount = [hasPageId, hasTitleMode, hasCql].filter(Boolean).length;

    if (modeCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Exactly one read mode is required: pageId OR title (optional spaceKey/default CONFLUENCE_SPACE_KEY) OR cql",
      });
    }

    if (value.spaceKey && !value.title) {
      ctx.addIssue({
        code: "custom",
        message: "spaceKey requires title when not using pageId or cql",
      });
    }

    if (value.nextPageToken && !hasCql) {
      ctx.addIssue({
        code: "custom",
        message: "nextPageToken is only allowed with cql mode",
      });
    }

    if (value.maxResults !== undefined && !hasCql) {
      ctx.addIssue({
        code: "custom",
        message: "maxResults is only allowed with cql mode",
      });
    }

    if (value.version !== undefined && hasCql) {
      ctx.addIssue({
        code: "custom",
        message: "version is not supported with cql mode",
      });
    }
  });

const createConfluencePageSchema = z.object({
  spaceKey: z.string().min(1).optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  parentId: z.string().min(1).optional(),
});

const updateConfluencePageSchema = z
  .object({
    pageId: z.string().min(1).optional(),
    spaceKey: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    content: z.string().min(1),
    newTitle: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasPageId = Boolean(value.pageId);
    const hasSpaceTitle = Boolean(value.spaceKey && value.title);
    const modeCount = [hasPageId, hasSpaceTitle].filter(Boolean).length;

    if (modeCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one update mode is required: pageId OR (spaceKey + title)",
      });
    }

    if ((value.spaceKey && !value.title) || (!value.spaceKey && value.title)) {
      ctx.addIssue({
        code: "custom",
        message: "spaceKey and title must be provided together in title mode",
      });
    }
  });

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_issues",
        description: "List Jira issues with pagination support. Returns a list of issues from the configured project ordered by key.",
        inputSchema: {
          type: "object",
          properties: {
            maxResults: {
              type: "number",
              description: "Maximum number of results per page (default: 50, max: 5000)",
              minimum: 1,
              maximum: 5000,
            },
            nextPageToken: {
              type: "string",
              description: "Pagination token from a previous response to get the next page",
            },
          },
        },
      },
      {
        name: "get_issue",
        description:
          "Get details of a specific Jira issue by ID or key (e.g., PROJ-123). Includes fixVersions when set on the issue.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Issue ID or key (e.g., PROJ-123 or 2599962)",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_project_versions",
        description:
          "List all Jira fix versions for a project (released and unreleased). Use id, name, or selectableLabel when setting fix_versions on create_issue or update_issue. Does not create versions.",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Optional project key; defaults to JIRA_PROJECT_KEY",
            },
          },
        },
      },
      {
        name: "create_issue",
        description:
          "Create a new Jira issue. Description must be ADF (Atlassian Document Format). Uses default values from the configuration file when not specified. Optional fix_versions: pass [] to skip defaults.fix_versions and leave fix versions unset. Optional status sets workflow status after create via a transition (must match a destination status name available from the initial state).",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title (required)",
            },
            issue_type: {
              type: "string",
              description:
                "Jira issue type name (e.g. Story, Task, Bug). Required when issue-config.yml has no defaults.issue_type.",
            },
            description: jiraAdfDocInputSchemaProperty,
            priority: {
              type: "string",
              description: "Issue priority (e.g., High, Medium, Low)",
            },
            parent: {
              type: "string",
              description: "Parent issue key (e.g., PROJ-1)",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "List of labels for the issue",
            },
            components: {
              type: "array",
              items: { type: "string" },
              description: "List of components for the issue",
            },
            assignee: {
              type: "string",
              description: "Assignee account ID, or null to unassign",
            },
            reporter: {
              type: "string",
              description: "Reporter account ID",
            },
            fix_versions: {
              type: "array",
              items: { type: "string" },
              description:
                "Fix version names, version ids, or selectableLabel strings from list_project_versions. Unknown values are skipped (issue still created); see fixVersionsSkipped in the response. Omit to use defaults.fix_versions from issue-config when configured.",
            },
            status: {
              type: "string",
              description:
                "Workflow status name to move the issue to after creation (e.g. To Do, In Progress, Backlog). Uses Jira transitions; spelling should match the status in Jira. If no transition exists, the issue is still created and statusError is returned in the response.",
            },
          },
          required: ["title", "description"],
        },
      },
      {
        name: "query_issues",
        description:
          "Run raw JQL queries with optional fields and pagination. Uses JIRA_PROJECT_KEY by default when JQL has no project clause.",
        inputSchema: {
          type: "object",
          properties: {
            jql: {
              type: "string",
              description: "Raw JQL query string",
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description: "Optional Jira fields to return",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results per page (default: 50, max: 5000)",
              minimum: 1,
              maximum: 5000,
            },
            nextPageToken: {
              type: "string",
              description: "Pagination token from a previous response to get the next page",
            },
            project: {
              type: "string",
              description:
                "Optional project override used only when the provided JQL has no explicit project clause",
            },
          },
          required: ["jql"],
        },
      },
      {
        name: "update_issue",
        description:
          "Update an existing Jira issue. Only provided fields will be updated. When setting description, pass ADF (reuse descriptionAdf from get_issue when possible). fix_versions replaces the set of fix versions; pass [] to clear them. Status changes use workflow transitions (not the edit-fields API); provide the target status name as it appears in Jira.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Issue ID or key to update (e.g., PROJ-123)",
            },
            title: {
              type: "string",
              description: "New issue title",
            },
            description: jiraAdfDocInputSchemaProperty,
            priority: {
              type: "string",
              description: "New issue priority",
            },
            parent: {
              type: "string",
              description: "New parent issue key",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "New list of labels",
            },
            components: {
              type: "array",
              items: { type: "string" },
              description: "New list of components",
            },
            assignee: {
              type: "string",
              description: "New assignee account ID, or null to unassign",
            },
            fix_versions: {
              type: "array",
              items: { type: "string" },
              description:
                "Replace fix versions with this list (names, ids, or selectableLabel from list_project_versions). Pass [] to clear. Omit to leave fix versions unchanged.",
            },
            status: {
              type: "string",
              description:
                "Target workflow status name (e.g. In Progress, Done). Must be reachable via an allowed transition from the issue's current status.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "read_confluence_pages",
        description:
          "Read Confluence pages using one of three modes: pageId, spaceKey+title, or CQL search with pagination. pageId/title mode returns a single page object; CQL mode returns paginated items.",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "Confluence page ID (single-page lookup mode)",
            },
            version: {
              type: "number",
              description:
                "Optional Confluence page version number for historical read (supported with pageId or title mode)",
              minimum: 1,
            },
            spaceKey: {
              type: "string",
              description: "Confluence space key (required with title mode)",
            },
            title: {
              type: "string",
              description: "Confluence page title (required with spaceKey mode)",
            },
            cql: {
              type: "string",
              description: "Confluence Query Language expression for search mode",
            },
            maxResults: {
              type: "number",
              description: "CQL mode only. Maximum results per page (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
            },
            nextPageToken: {
              type: "string",
              description: "CQL mode only. Pagination token from previous response",
            },
            bodyFormat: {
              type: "string",
              description: "Body format for pageId/title mode. Defaults to storage",
              enum: ["storage", "view", "none"],
            },
          },
        },
      },
      {
        name: "create_confluence_page",
        description:
          "Create a new Confluence page (create-only). Rejects title conflicts in the same space and does not update existing pages.",
        inputSchema: {
          type: "object",
          properties: {
            spaceKey: {
              type: "string",
              description:
                "Confluence space key. Optional when CONFLUENCE_SPACE_KEY is configured",
            },
            title: {
              type: "string",
              description: "New Confluence page title",
            },
            content: {
              type: "string",
              description: "Page body as storage-format XHTML content",
            },
            parentId: {
              type: "string",
              description: "Optional parent page ID",
            },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "update_confluence_page",
        description:
          "Update an existing Confluence page by pageId or by spaceKey+title. Replaces page body with storage-format XHTML content.",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "Confluence page ID (update-by-id mode)",
            },
            spaceKey: {
              type: "string",
              description: "Confluence space key (required with title mode)",
            },
            title: {
              type: "string",
              description: "Confluence page title to resolve the target page (with spaceKey)",
            },
            content: {
              type: "string",
              description: "New full page body in Confluence storage XHTML format",
            },
            newTitle: {
              type: "string",
              description: "Optional new title applied in the same update request",
            },
          },
          required: ["content"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const normalizedArgs = normalizeToolArgs(args);
    const enrichedArgs = injectInternalRulesContext(normalizedArgs);
    const safeArgs = stripInternalFields(enrichedArgs);

    try {
      switch (name) {
        case "list_issues": {
          const schema = z.object({
            maxResults: z.number().int().min(1).max(5000).optional(),
            nextPageToken: z.string().optional(),
          });
          const validated = schema.parse(safeArgs);
          return await handleListIssues(validated);
        }

        case "get_issue": {
          const schema = z.object({
            id: z.string().min(1),
          });
          const validated = schema.parse(safeArgs);
          return await handleGetIssue(validated.id);
        }

        case "list_project_versions": {
          const schema = z.object({
            project: z.string().min(1).optional(),
          });
          const validated = schema.parse(safeArgs);
          return await handleListProjectVersions(validated.project);
        }

        case "create_issue": {
          const schema = z.object({
            title: z.string().min(1),
            description: jiraAdfDocumentSchema,
            issue_type: z.string().optional(),
            priority: z.string().optional(),
            parent: z.string().optional(),
            labels: z.array(z.string()).optional(),
            components: z.array(z.string()).optional(),
            assignee: z.union([z.string(), z.null()]).optional(),
            reporter: z.string().optional(),
            fix_versions: z.array(z.string()).optional(),
            status: z.string().optional(),
          });
          const validated = schema.parse(safeArgs);
          return await handleCreateIssue(validated);
        }

        case "update_issue": {
          const schema = z.object({
            id: z.string().min(1),
            title: z.string().optional(),
            description: jiraAdfDocumentSchema.optional(),
            priority: z.string().optional(),
            parent: z.string().optional(),
            labels: z.array(z.string()).optional(),
            components: z.array(z.string()).optional(),
            assignee: z.union([z.string(), z.null()]).optional(),
            fix_versions: z.array(z.string()).optional(),
            status: z.string().optional(),
          });
          const validated = schema.parse(safeArgs);
          return await handleUpdateIssue(validated);
        }

        case "query_issues": {
          const schema = z.object({
            jql: z.string().min(1),
            fields: z.array(z.string().min(1)).optional(),
            maxResults: z.number().int().min(1).max(5000).optional(),
            nextPageToken: z.string().optional(),
            project: z.string().min(1).optional(),
          });
          const validated = schema.parse(safeArgs);
          return await handleQueryIssues(validated);
        }

        case "read_confluence_pages": {
          const validated = readConfluencePagesSchema.parse(safeArgs);
          return await handleReadConfluencePages(validated);
        }

        case "create_confluence_page": {
          const validated = createConfluencePageSchema.parse(safeArgs);
          return await handleCreateConfluencePage(validated);
        }

        case "update_confluence_page": {
          const validated = updateConfluencePageSchema.parse(safeArgs);
          return await handleUpdateConfluencePage(validated);
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Invalid arguments",
                details: error.issues,
              }),
            },
          ],
          isError: true,
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorMessage,
            }),
          },
        ],
        isError: true,
      };
    }
  });
}
