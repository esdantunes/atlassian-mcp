import { Hono } from "hono";
import { JIRA_PROJECT_KEY } from "../config/jira.js";
import {
  createJiraClient,
  toSimplifiedIssue,
  DEFAULT_MAX_RESULTS,
  MAX_RESULTS_LIMIT,
} from "../lib/jira-client.js";
import { buildCreateIssueFields, buildUpdateIssueFields, type CreateIssueBody, type UpdateIssueBody } from "../lib/issue-fields.js";
import { jsonResponse } from "../utils/json-response.js";

const issues = new Hono();
const client = createJiraClient();

function clampMaxResults(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_MAX_RESULTS;
  return Math.min(Math.max(1, n), MAX_RESULTS_LIMIT);
}

issues.get("/", async (c) => {
  const maxResults = clampMaxResults(c.req.query("maxResults"));
  const nextPageToken = c.req.query("nextPageToken") ?? undefined;

  const jql = `project = ${JIRA_PROJECT_KEY} ORDER BY key ASC`;
  const result = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
    jql,
    maxResults,
    nextPageToken: nextPageToken || undefined,
    fields: ["summary", "description", "status", "priority", "reporter", "assignee"],
  });

  const list = (result.issues ?? []).map(toSimplifiedIssue);
  return jsonResponse(c, {
    issues: list,
    nextPageToken: result.nextPageToken ?? null,
  });
});

issues.get("/:id", async (c) => {
  const issueIdOrKey = c.req.param("id");
  if (!issueIdOrKey) {
    return jsonResponse(c, { error: "Issue ID or key is required" }, 400);
  }

  try {
    const issue = await client.issues.getIssue({
      issueIdOrKey,
      fields: ["summary", "description", "status", "priority", "reporter", "assignee"],
    });
    return jsonResponse(c, toSimplifiedIssue(issue));
  } catch (err: unknown) {
    const ex = err as { response?: { data?: unknown; status?: number }; status?: number };
    const jiraData = ex?.response && typeof ex.response === "object" && "data" in ex.response ? (ex.response as { data?: unknown }).data : undefined;
    const status = (ex?.response && typeof ex.response === "object" && "status" in ex.response ? (ex.response as { status?: number }).status : undefined) ?? ex?.status ?? 500;
    const httpStatus = (status >= 400 && status < 600 ? status : 404) as 400 | 404 | 502;
    return jsonResponse(c, { error: "Issue not found", jira: jiraData }, httpStatus);
  }
});

issues.post("/", async (c) => {
  try {
    const body = (await c.req.json()) as CreateIssueBody;
    if (!body?.title || typeof body.title !== "string") {
      return jsonResponse(c, { error: "title is required" }, 400);
    }
    const currentUser = await client.myself.getCurrentUser();
    const accountId = currentUser.accountId ?? "";
    const fields = await buildCreateIssueFields(client, body, accountId);
    const created = await client.issues.createIssue({ fields: fields as { summary: string; project: { key: string }; issuetype: { name: string }; [key: string]: unknown } });
    return jsonResponse(c, { id: created.id, key: created.key, self: created.self }, 201);
  } catch (err: unknown) {
    const ex = err as { response?: { data?: unknown; status?: number }; status?: number };
    const jiraData = ex?.response && typeof ex.response === "object" && "data" in ex.response ? (ex.response as { data?: unknown }).data : undefined;
    const status = (ex?.response && typeof ex.response === "object" && "status" in ex.response ? (ex.response as { status?: number }).status : undefined) ?? ex?.status ?? 500;
    const httpStatus = (status >= 400 && status < 600 ? status : 502) as 400 | 502;
    return jsonResponse(c, { error: "Jira API error", jira: jiraData }, httpStatus);
  }
});

issues.patch("/:id", async (c) => {
  const issueIdOrKey = c.req.param("id");
  if (!issueIdOrKey) {
    return jsonResponse(c, { error: "Issue ID or key is required" }, 400);
  }

  try {
    const body = (await c.req.json()) as UpdateIssueBody;
    const fields = await buildUpdateIssueFields(body);
    
    if (Object.keys(fields).length === 0) {
      return jsonResponse(c, { error: "At least one field must be provided for update" }, 400);
    }

    await client.issues.editIssue({
      issueIdOrKey,
      fields: fields as Record<string, unknown>,
    });

    return jsonResponse(c, { success: true, message: "Issue updated successfully" });
  } catch (err: unknown) {
    const ex = err as { response?: { data?: unknown; status?: number }; status?: number };
    const jiraData = ex?.response && typeof ex.response === "object" && "data" in ex.response ? (ex.response as { data?: unknown }).data : undefined;
    const status = (ex?.response && typeof ex.response === "object" && "status" in ex.response ? (ex.response as { status?: number }).status : undefined) ?? ex?.status ?? 500;
    const httpStatus = (status >= 400 && status < 600 ? status : 404) as 400 | 404 | 502;
    return jsonResponse(c, { error: "Failed to update issue", jira: jiraData }, httpStatus);
  }
});

export default issues;
