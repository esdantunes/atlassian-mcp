import {
  findConfluencePageByTitle,
  getConfluencePageById,
  getDefaultConfluenceSpaceKey,
  searchConfluencePagesByCql,
} from "../lib/confluence-client.js";

type BodyFormat = "storage" | "view" | "none";

interface ReadConfluencePagesArgs {
  pageId?: string;
  version?: number;
  spaceKey?: string;
  title?: string;
  cql?: string;
  maxResults?: number;
  nextPageToken?: string;
  bodyFormat?: BodyFormat;
}

function resolveSpaceKey(spaceKey?: string): string | undefined {
  return spaceKey?.trim() || getDefaultConfluenceSpaceKey();
}

export async function handleReadConfluencePages(
  args: ReadConfluencePagesArgs
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const bodyFormat = args.bodyFormat ?? "storage";

  try {
    if (args.pageId) {
      const page = await getConfluencePageById(args.pageId, bodyFormat, args.version);
      if (!page) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Confluence page not found" }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ page }, null, 2),
          },
        ],
      };
    }

    if (args.cql) {
      const result = await searchConfluencePagesByCql({
        cql: args.cql,
        maxResults: args.maxResults,
        nextPageToken: args.nextPageToken,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    const title = args.title?.trim();
    const spaceKey = resolveSpaceKey(args.spaceKey);
    if (!title || !spaceKey) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Missing required search fields: provide pageId, cql, or title with spaceKey/CONFLUENCE_SPACE_KEY",
            }),
          },
        ],
        isError: true,
      };
    }

    const page = await findConfluencePageByTitle(spaceKey, title, bodyFormat);
    if (!page) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Confluence page not found",
              search: { spaceKey, title },
            }),
          },
        ],
        isError: true,
      };
    }

    if (args.version) {
      const historicalPage = await getConfluencePageById(
        page.id,
        bodyFormat,
        args.version
      );
      if (!historicalPage) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Confluence page version not found",
                search: { spaceKey, title, version: args.version },
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ page: historicalPage }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ page }, null, 2),
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
            error: "Failed to read Confluence pages",
            jira: jiraData,
          }),
        },
      ],
      isError: true,
    };
  }
}
