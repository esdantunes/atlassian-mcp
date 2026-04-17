import {
  createJiraClient,
} from "../lib/jira-client.js";
import {
  buildCreateIssueFields,
  type CreateIssueBody,
  type JiraAdfDocument,
} from "../lib/issue-fields.js";
import { transitionIssueToStatus } from "../lib/jira-transitions.js";

interface CreateIssueArgs {
  title: string;
  description: JiraAdfDocument;
  issue_type?: string;
  priority?: string;
  parent?: string;
  labels?: string[];
  components?: string[];
  assignee?: string | null;
  reporter?: string;
  fix_versions?: string[];
  status?: string;
}

export async function handleCreateIssue(
  args: CreateIssueArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const currentUser = await client.myself.getCurrentUser();
    const accountId = currentUser.accountId ?? "";

    const body: CreateIssueBody = {
      title: args.title,
      description: args.description,
      issue_type: args.issue_type,
      priority: args.priority,
      parent: args.parent,
      labels: args.labels,
      components: args.components,
      assignee: args.assignee,
      reporter: args.reporter,
      fix_versions: args.fix_versions,
    };

    const { fields, fixVersionsMeta } = await buildCreateIssueFields(client, body, accountId);
    const created = await client.issues.createIssue({
      fields: fields as {
        summary: string;
        project: { key: string };
        issuetype: { name: string };
        [key: string]: unknown;
      },
    });

    const issueKey = created.key ?? created.id;
    const payload: Record<string, unknown> = {
      id: created.id,
      key: created.key,
      self: created.self,
    };

    if (fixVersionsMeta !== undefined) {
      payload.fixVersionsApplied = fixVersionsMeta.applied;
      payload.fixVersionsSkipped = fixVersionsMeta.skipped;
      if (fixVersionsMeta.note) payload.fixVersionsNote = fixVersionsMeta.note;
    }

    if (args.status?.trim() && issueKey) {
      try {
        const { alreadyThere } = await transitionIssueToStatus(
          client,
          String(issueKey),
          args.status.trim()
        );
        payload.statusApplied = true;
        payload.statusNote = alreadyThere
          ? "Issue was already in the requested status."
          : undefined;
      } catch (statusError: unknown) {
        payload.statusApplied = false;
        payload.statusError =
          statusError instanceof Error ? statusError.message : String(statusError);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const ex = error as { response?: { data?: unknown; status?: number }; status?: number };
    const jiraData =
      ex?.response && typeof ex.response === "object" && "data" in ex.response
        ? (ex.response as { data?: unknown }).data
        : undefined;

    const errorMessage = "Failed to create issue";

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
