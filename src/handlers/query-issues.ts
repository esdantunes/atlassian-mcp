import { JIRA_PROJECT_KEY } from "../config/jira.js";
import {
  createJiraClient,
  toSimplifiedIssue,
  DEFAULT_MAX_RESULTS,
} from "../lib/jira-client.js";

interface QueryIssuesArgs {
  jql: string;
  fields?: string[];
  maxResults?: number;
  nextPageToken?: string;
  project?: string;
}

const DEFAULT_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "reporter",
  "assignee",
];

function hasProjectClause(jql: string): boolean {
  return /(?:^|[\s(])project\s*(?:=|in)\s*/i.test(jql);
}

function quoteProject(project: string): string {
  const trimmed = project.trim();
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/"/g, '\\"')}"`;
}

function withDefaultProject(jql: string, project: string): string {
  const trimmedJql = jql.trim();
  if (!trimmedJql) return `project = ${quoteProject(project)}`;
  if (hasProjectClause(trimmedJql)) return trimmedJql;
  return `project = ${quoteProject(project)} AND (${trimmedJql})`;
}

export async function handleQueryIssues(
  args: QueryIssuesArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const maxResults = args.maxResults ?? DEFAULT_MAX_RESULTS;
    const fields = args.fields && args.fields.length > 0 ? args.fields : DEFAULT_FIELDS;
    const effectiveProject = args.project ?? JIRA_PROJECT_KEY;
    const jql = withDefaultProject(args.jql, effectiveProject);

    const result = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults,
      nextPageToken: args.nextPageToken || undefined,
      fields,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              jql,
              issues: (result.issues ?? []).map(toSimplifiedIssue),
              nextPageToken: result.nextPageToken ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Failed to query issues",
            message: errorMessage,
          }),
        },
      ],
      isError: true,
    };
  }
}
