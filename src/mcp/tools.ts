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
        description: "Get details of a specific Jira issue by ID or key (e.g., PROJ-123).",
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
        name: "create_issue",
        description: "Create a new Jira issue. Uses default values from the configuration file when not specified.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title (required)",
            },
            description: {
              oneOf: [
                {
                  type: "string",
                  description: "Plain text description (automatically converted to basic ADF format)",
                  examples: ["Simple text description"],
                },
                {
                  type: "object",
                  description: "ADF (Atlassian Document Format) object for rich text formatting",
                  properties: {
                    type: { type: "string", const: "doc" },
                    version: { type: "number" },
                    content: { type: "array" },
                  },
                  required: ["type", "version", "content"],
                  examples: [
                    {
                      type: "doc",
                      version: 1,
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Issue description" }],
                        },
                      ],
                    },
                  ],
                },
              ],
              description:
                "Issue description. Use plain text string for simple descriptions, or ADF object for rich text formatting (headings, bold, italic, lists, tables, code blocks, etc.). When updating an issue with existing ADF formatting, prefer passing the ADF object directly (from descriptionAdf field) to preserve formatting. See https://developer.atlassian.com/cloud/jira/platform/apis/document/structure for ADF specification.",
            },
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
          },
          required: ["title"],
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
        description: "Update an existing Jira issue. Only provided fields will be updated (partial update).",
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
            description: {
              oneOf: [
                {
                  type: "string",
                  description: "Plain text description (automatically converted to basic ADF format)",
                  examples: ["Simple text description"],
                },
                {
                  type: "object",
                  description: "ADF (Atlassian Document Format) object for rich text formatting",
                  properties: {
                    type: { type: "string", const: "doc" },
                    version: { type: "number" },
                    content: { type: "array" },
                  },
                  required: ["type", "version", "content"],
                  examples: [
                    {
                      type: "doc",
                      version: 1,
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Issue description" }],
                        },
                      ],
                    },
                  ],
                },
              ],
              description:
                "New issue description. Use plain text string for simple descriptions, or ADF object for rich text formatting (headings, bold, italic, lists, tables, code blocks, etc.). IMPORTANT: When updating an issue that already has ADF formatting, always pass the ADF object (from descriptionAdf field) to preserve existing formatting. Passing plain text will replace all formatting. See https://developer.atlassian.com/cloud/jira/platform/apis/document/structure for ADF specification.",
            },
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
          },
          required: ["id"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_issues": {
          const schema = z.object({
            maxResults: z.number().int().min(1).max(5000).optional(),
            nextPageToken: z.string().optional(),
          });
          const validated = schema.parse(args || {});
          return await handleListIssues(validated);
        }

        case "get_issue": {
          const schema = z.object({
            id: z.string().min(1),
          });
          const validated = schema.parse(args || {});
          return await handleGetIssue(validated.id);
        }

        case "create_issue": {
          const schema = z.object({
            title: z.string().min(1),
            description: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
            priority: z.string().optional(),
            parent: z.string().optional(),
            labels: z.array(z.string()).optional(),
            components: z.array(z.string()).optional(),
            assignee: z.union([z.string(), z.null()]).optional(),
            reporter: z.string().optional(),
          });
          const validated = schema.parse(args || {});
          return await handleCreateIssue(validated);
        }

        case "update_issue": {
          const schema = z.object({
            id: z.string().min(1),
            title: z.string().optional(),
            description: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
            priority: z.string().optional(),
            parent: z.string().optional(),
            labels: z.array(z.string()).optional(),
            components: z.array(z.string()).optional(),
            assignee: z.union([z.string(), z.null()]).optional(),
          });
          const validated = schema.parse(args || {});
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
          const validated = schema.parse(args || {});
          return await handleQueryIssues(validated);
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
