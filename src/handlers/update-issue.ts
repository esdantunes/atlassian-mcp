import {
  createJiraClient,
} from "../lib/jira-client.js";
import {
  buildUpdateIssueFields,
  type UpdateIssueBody,
  type JiraAdfDocument,
} from "../lib/issue-fields.js";
import { transitionIssueToStatus } from "../lib/jira-transitions.js";

interface UpdateIssueArgs {
  id: string;
  title?: string;
  description?: JiraAdfDocument;
  priority?: string;
  parent?: string;
  labels?: string[];
  components?: string[];
  assignee?: string | null;
  /** Replace fix versions when set; `[]` clears them. Omit to leave unchanged. */
  fix_versions?: string[];
  /** Target workflow status name (e.g. "In Progress"). Applied via Jira transition API (not edit fields). */
  status?: string;
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
      description: updateFields.description,
      priority: updateFields.priority,
      parent: updateFields.parent,
      labels: updateFields.labels,
      components: updateFields.components,
      assignee: updateFields.assignee,
      fix_versions: updateFields.fix_versions,
    };

    const { fields, fixVersionsMeta } = await buildUpdateIssueFields(client, body);
    const hasFieldUpdates = Object.keys(fields).length > 0;
    const fixVersionsTouched = args.fix_versions !== undefined;
    const statusArg = args.status?.trim();
    const wantsStatus = Boolean(statusArg);

    if (!hasFieldUpdates && !fixVersionsTouched && !wantsStatus) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "At least one field or status must be provided for update",
            }),
          },
        ],
        isError: true,
      };
    }

    if (hasFieldUpdates) {
      await client.issues.editIssue({
        issueIdOrKey: id,
        fields: fields as Record<string, unknown>,
      });
    }

    if (statusArg) {
      await transitionIssueToStatus(client, id, statusArg);
    }

    const response: Record<string, unknown> = {
      success: true,
      message: "Issue updated successfully",
    };
    if (fixVersionsMeta !== undefined) {
      response.fixVersionsApplied = fixVersionsMeta.applied;
      response.fixVersionsSkipped = fixVersionsMeta.skipped;
      if (fixVersionsMeta.note) response.fixVersionsNote = fixVersionsMeta.note;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
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
