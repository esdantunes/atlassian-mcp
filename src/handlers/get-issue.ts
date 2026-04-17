import {
  createJiraClient,
  toSimplifiedIssue,
} from "../lib/jira-client.js";

export async function handleGetIssue(
  issueIdOrKey: string
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();

    const issue = await client.issues.getIssue({
      issueIdOrKey,
      fields: ["summary", "description", "status", "priority", "reporter", "assignee", "fixVersions"],
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(toSimplifiedIssue(issue), null, 2),
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
      status === 404 ? "Issue not found" : "Failed to get issue";

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
