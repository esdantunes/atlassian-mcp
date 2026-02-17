import {
  createJiraClient,
} from "../lib/jira-client.js";
import {
  buildUpdateIssueFields,
  type UpdateIssueBody,
} from "../lib/issue-fields.js";

interface UpdateIssueArgs {
  id: string;
  title?: string;
  description?: string | Record<string, unknown>;
  priority?: string;
  parent?: string;
  labels?: string[];
  components?: string[];
  assignee?: string | null;
}

export async function handleUpdateIssue(
  args: UpdateIssueArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const { id, ...updateFields } = args;

    const body: UpdateIssueBody = {
      title: updateFields.title,
      description: updateFields.description as string | { type: "doc"; version: number; content: unknown[] } | undefined,
      priority: updateFields.priority,
      parent: updateFields.parent,
      labels: updateFields.labels,
      components: updateFields.components,
      assignee: updateFields.assignee,
    };

    const fields = await buildUpdateIssueFields(body);

    if (Object.keys(fields).length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "At least one field must be provided for update",
            }),
          },
        ],
        isError: true,
      };
    }

    await client.issues.editIssue({
      issueIdOrKey: id,
      fields: fields as Record<string, unknown>,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Issue updated successfully",
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

    const errorMessage = "Failed to update issue";

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
