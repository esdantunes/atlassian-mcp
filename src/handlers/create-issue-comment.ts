import { createJiraClient } from "../lib/jira-client.js";
import type { JiraAdfDocument } from "../lib/issue-fields.js";
import { toJiraDocument, toSimplifiedComment } from "../lib/jira-comments.js";

export interface CreateIssueCommentArgs {
  issueIdOrKey: string;
  body: JiraAdfDocument;
  parentId?: string;
}

export async function handleCreateIssueComment(
  args: CreateIssueCommentArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const created = await client.issueComments.addComment({
      issueIdOrKey: args.issueIdOrKey,
      comment: toJiraDocument(args.body),
      parentId: args.parentId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issueIdOrKey: args.issueIdOrKey,
              comment: toSimplifiedComment(created),
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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Failed to create issue comment",
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
