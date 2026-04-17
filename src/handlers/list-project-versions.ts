import { JIRA_PROJECT_KEY } from "../config/jira.js";
import { createJiraClient } from "../lib/jira-client.js";
import { fetchProjectVersions, listEnrichedProjectVersions } from "../lib/jira-versions.js";

export async function handleListProjectVersions(project?: string): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const client = createJiraClient();
    const projectKey = project?.trim() || JIRA_PROJECT_KEY;
    const raw = await fetchProjectVersions(client, projectKey);
    const list = listEnrichedProjectVersions(raw);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ project: projectKey, versions: list }, null, 2),
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
            error: "Failed to list project versions",
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
