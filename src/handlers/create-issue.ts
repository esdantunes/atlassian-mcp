import {
  createJiraClient,
} from "../lib/jira-client.js";
import {
  buildCreateIssueFields,
  type CreateIssueBody,
} from "../lib/issue-fields.js";

interface CreateIssueArgs {
  title: string;
  description?: string | Record<string, unknown>;
  priority?: string;
  parent?: string;
  labels?: string[];
  components?: string[];
  assignee?: string | null;
  reporter?: string;
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
      priority: args.priority,
      parent: args.parent,
      labels: args.labels,
      components: args.components,
      assignee: args.assignee,
      reporter: args.reporter,
    };

    const fields = await buildCreateIssueFields(client, body, accountId);
    const created = await client.issues.createIssue({
      fields: fields as {
        summary: string;
        project: { key: string };
        issuetype: { name: string };
        [key: string]: unknown;
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              id: created.id,
              key: created.key,
              self: created.self,
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
