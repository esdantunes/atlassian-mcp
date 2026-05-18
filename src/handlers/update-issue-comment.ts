import { createJiraClient } from "../lib/jira-client.js";
import type { JiraAdfDocument } from "../lib/issue-fields.js";
import { toJiraDocument, toSimplifiedComment } from "../lib/jira-comments.js";

export interface UpdateIssueCommentArgs {
  issueIdOrKey: string;
  commentId: string;
  body: JiraAdfDocument;
  notifyUsers?: boolean;
}

export async function handleUpdateIssueComment(
  args: UpdateIssueCommentArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const updated = await client.issueComments.updateComment({
      issueIdOrKey: args.issueIdOrKey,
      id: args.commentId,
      body: toJiraDocument(args.body),
      notifyUsers: args.notifyUsers,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issueIdOrKey: args.issueIdOrKey,
              comment: toSimplifiedComment(updated),
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
      status === 404 ? "Issue or comment not found" : "Failed to update issue comment";

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
