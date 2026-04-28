import {
  findConfluencePageUpdateTargetByTitle,
  updateConfluencePageById,
} from "../lib/confluence-client.js";

interface UpdateConfluencePageArgs {
  pageId?: string;
  spaceKey?: string;
  title?: string;
  content: string;
  newTitle?: string;
}

export async function handleUpdateConfluencePage(
  args: UpdateConfluencePageArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const hasPageId = Boolean(args.pageId?.trim());
    const hasSpaceTitle = Boolean(args.spaceKey?.trim() && args.title?.trim());

    if (!hasPageId && !hasSpaceTitle) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Provide pageId or spaceKey+title to update a Confluence page",
            }),
          },
        ],
        isError: true,
      };
    }

    let targetPageId = args.pageId?.trim();
    if (!targetPageId) {
      const resolved = await findConfluencePageUpdateTargetByTitle(
        String(args.spaceKey).trim(),
        String(args.title).trim()
      );
      if (!resolved) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Confluence page not found",
                search: {
                  spaceKey: String(args.spaceKey).trim(),
                  title: String(args.title).trim(),
                },
              }),
            },
          ],
          isError: true,
        };
      }
      targetPageId = resolved.id;
    }

    const updated = await updateConfluencePageById({
      pageId: targetPageId,
      content: args.content,
      newTitle: args.newTitle,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(updated, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const ex = error as { response?: { data?: unknown }; message?: string };
    const jiraData =
      ex?.response && typeof ex.response === "object" && "data" in ex.response
        ? (ex.response as { data?: unknown }).data
        : undefined;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: ex?.message || "Failed to update Confluence page",
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
