import {
  createConfluencePage,
  findConfluencePageByTitle,
  getDefaultConfluenceSpaceKey,
} from "../lib/confluence-client.js";

interface CreateConfluencePageArgs {
  spaceKey?: string;
  title: string;
  content: string;
  parentId?: string;
  draft?: boolean;
}

function resolveSpaceKey(spaceKey?: string): string | undefined {
  return spaceKey?.trim() || getDefaultConfluenceSpaceKey();
}

export async function handleCreateConfluencePage(
  args: CreateConfluencePageArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const spaceKey = resolveSpaceKey(args.spaceKey);
    if (!spaceKey) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Missing spaceKey. Provide spaceKey or set CONFLUENCE_SPACE_KEY.",
            }),
          },
        ],
        isError: true,
      };
    }

    const title = args.title.trim();
    const existing = await findConfluencePageByTitle(spaceKey, title, "none");
    if (existing) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "PageAlreadyExists",
              message:
                "A page with the same title already exists in this space. This tool only creates new pages.",
              existingPage: {
                id: existing.id,
                title: existing.title,
                spaceKey: existing.spaceKey,
                url: existing.url,
              },
            }),
          },
        ],
        isError: true,
      };
    }

    const created = await createConfluencePage({
      spaceKey,
      title,
      content: args.content,
      parentId: args.parentId,
      draft: args.draft,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(created, null, 2),
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
            error: "Failed to create Confluence page",
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
