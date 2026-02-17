import { JIRA_PROJECT_KEY } from "../config/jira.js";
import {
  createJiraClient,
  toSimplifiedIssue,
  DEFAULT_MAX_RESULTS,
} from "../lib/jira-client.js";

interface ListIssuesArgs {
  maxResults?: number;
  nextPageToken?: string;
}

export async function handleListIssues(
  args: ListIssuesArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const maxResults = args.maxResults ?? DEFAULT_MAX_RESULTS;
    const nextPageToken = args.nextPageToken;

    const jql = `project = ${JIRA_PROJECT_KEY} ORDER BY key ASC`;
    const result = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults,
      nextPageToken: nextPageToken || undefined,
      fields: ["summary", "description", "status", "priority", "reporter", "assignee"],
    });

    const list = (result.issues ?? []).map(toSimplifiedIssue);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issues: list,
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
            error: "Failed to list issues",
            message: errorMessage,
          }),
        },
      ],
      isError: true,
    };
  }
}
