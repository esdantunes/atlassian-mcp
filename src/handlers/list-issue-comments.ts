import { createJiraClient } from "../lib/jira-client.js";
import {
  DEFAULT_COMMENT_MAX_RESULTS,
  MAX_COMMENT_MAX_RESULTS,
  toSimplifiedComment,
} from "../lib/jira-comments.js";

export interface ListIssueCommentsArgs {
  issueIdOrKey: string;
  startAt?: number;
  maxResults?: number;
  orderBy?: "created" | "-created" | "+created";
}

export async function handleListIssueComments(
  args: ListIssueCommentsArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const maxResults = Math.min(
      args.maxResults ?? DEFAULT_COMMENT_MAX_RESULTS,
      MAX_COMMENT_MAX_RESULTS
    );
    const startAt = args.startAt ?? 0;

    const page = await client.issueComments.getComments({
      issueIdOrKey: args.issueIdOrKey,
      startAt,
      maxResults,
      orderBy: args.orderBy,
    });

    const comments = (page.comments ?? []).map(toSimplifiedComment);
    const total = page.total ?? comments.length;
    const nextStartAt =
      startAt + comments.length < total ? startAt + comments.length : null;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issueIdOrKey: args.issueIdOrKey,
              comments,
              startAt: page.startAt ?? startAt,
              maxResults: page.maxResults ?? maxResults,
              total,
              nextStartAt,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const ex = error as { response?: { data?: unknown; status?: number }; status?: number };
    const jiraData =
      ex?.response && typeof ex.response === "object" && "data" in ex.response
        ? (ex.response as { data?: unknown }).data
        : undefined;
    const status =
      (ex?.response && typeof ex.response === "object" && "status" in ex.response
        ? (ex.response as { status?: number }).status
        : undefined) ?? ex?.status ?? 500;

    const errorMessage =
      status === 404 ? "Issue not found" : "Failed to list issue comments";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
