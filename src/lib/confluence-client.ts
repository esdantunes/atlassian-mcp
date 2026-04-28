const DEFAULT_CQL_MAX_RESULTS = 25;
const CQL_MAX_RESULTS_LIMIT = 100;

type ConfluenceBodyFormat = "storage" | "view" | "none";

interface ConfluencePageSummary {
  id: string;
  title: string;
  spaceKey?: string;
  status?: string;
  version?: number;
  url?: string;
  body?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ConfluenceListPageSummary {
  id: string;
  title: string;
  spaceKey?: string;
  status?: string;
  version?: number;
  url?: string;
  snippet?: string;
  updatedAt?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function normalizeAtlassianHost(host: string): string {
  return host.endsWith("/") ? host.slice(0, -1) : host;
}

function buildAuthHeaders(): Record<string, string> {
  const email = getRequiredEnv("JIRA_EMAIL");
  const apiToken = getRequiredEnv("JIRA_API_TOKEN");
  const basicToken = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return {
    Authorization: `Basic ${basicToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function parseJsonSafely(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toAbsoluteUrl(host: string, links: unknown): string | undefined {
  if (!links || typeof links !== "object") return undefined;
  const candidate = links as { base?: unknown; webui?: unknown };
  const webui = typeof candidate.webui === "string" ? candidate.webui : undefined;
  const base = typeof candidate.base === "string" ? candidate.base : undefined;
  if (!webui) return undefined;
  if (/^https?:\/\//.test(webui)) return webui;
  if (base) return `${base}${webui}`;
  return `${host}${webui}`;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getBodyByFormat(body: unknown, format: ConfluenceBodyFormat): string | undefined {
  if (format === "none") return undefined;
  if (!body || typeof body !== "object") return undefined;
  const bodyObj = body as { storage?: { value?: unknown }; view?: { value?: unknown } };
  if (format === "storage") {
    return typeof bodyObj.storage?.value === "string" ? bodyObj.storage.value : undefined;
  }
  return typeof bodyObj.view?.value === "string" ? bodyObj.view.value : undefined;
}

function toPageSummary(
  page: unknown,
  bodyFormat: ConfluenceBodyFormat,
  host: string
): ConfluencePageSummary {
  const content = (page ?? {}) as {
    id?: unknown;
    title?: unknown;
    status?: unknown;
    space?: { key?: unknown };
    version?: { number?: unknown; by?: { displayName?: unknown }; when?: unknown };
    history?: { createdDate?: unknown; lastUpdated?: { when?: unknown; by?: { displayName?: unknown } } };
    body?: unknown;
    _links?: unknown;
  };

  const versionAuthor =
    typeof content.version?.by?.displayName === "string"
      ? content.version.by.displayName
      : undefined;
  const lastUpdatedAuthor =
    typeof content.history?.lastUpdated?.by?.displayName === "string"
      ? content.history.lastUpdated.by.displayName
      : undefined;

  return {
    id: String(content.id ?? ""),
    title: typeof content.title === "string" ? content.title : "",
    spaceKey: typeof content.space?.key === "string" ? content.space.key : undefined,
    status: typeof content.status === "string" ? content.status : undefined,
    version:
      typeof content.version?.number === "number" ? content.version.number : undefined,
    url: toAbsoluteUrl(host, content._links),
    body: getBodyByFormat(content.body, bodyFormat),
    author: versionAuthor ?? lastUpdatedAuthor,
    createdAt:
      typeof content.history?.createdDate === "string"
        ? content.history.createdDate
        : undefined,
    updatedAt:
      typeof content.history?.lastUpdated?.when === "string"
        ? content.history.lastUpdated.when
        : typeof content.version?.when === "string"
          ? content.version.when
          : undefined,
  };
}

function toListSummary(page: unknown, host: string): ConfluenceListPageSummary {
  const content = (page ?? {}) as {
    id?: unknown;
    title?: unknown;
    status?: unknown;
    space?: { key?: unknown };
    version?: { number?: unknown; when?: unknown };
    body?: { view?: { value?: unknown } };
    excerpt?: unknown;
    _links?: unknown;
  };

  const rawSnippet =
    typeof content.excerpt === "string"
      ? content.excerpt
      : typeof content.body?.view?.value === "string"
        ? content.body.view.value
        : "";

  const cleanSnippet = rawSnippet ? stripHtmlTags(rawSnippet).slice(0, 280) : undefined;

  return {
    id: String(content.id ?? ""),
    title: typeof content.title === "string" ? content.title : "",
    spaceKey: typeof content.space?.key === "string" ? content.space.key : undefined,
    status: typeof content.status === "string" ? content.status : undefined,
    version:
      typeof content.version?.number === "number" ? content.version.number : undefined,
    url: toAbsoluteUrl(host, content._links),
    snippet: cleanSnippet,
    updatedAt:
      typeof content.version?.when === "string" ? content.version.when : undefined,
  };
}

export function getDefaultConfluenceSpaceKey(): string | undefined {
  return getOptionalEnv("CONFLUENCE_SPACE_KEY");
}

export function encodeCqlNextPageToken(start: number): string {
  return Buffer.from(JSON.stringify({ start }), "utf8").toString("base64");
}

export function decodeCqlNextPageToken(nextPageToken: string): number {
  try {
    const decoded = Buffer.from(nextPageToken, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as { start?: unknown };
    if (typeof parsed.start !== "number" || parsed.start < 0) {
      throw new Error("Invalid pagination token");
    }
    return parsed.start;
  } catch {
    throw new Error("Invalid nextPageToken");
  }
}

export function getDefaultCqlMaxResults(): number {
  return DEFAULT_CQL_MAX_RESULTS;
}

export function getCqlMaxResultsLimit(): number {
  return CQL_MAX_RESULTS_LIMIT;
}

export async function confluenceRequest(
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      ...buildAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = parseJsonSafely(text);

  if (!response.ok) {
    const err = new Error("Confluence API request failed") as Error & {
      status?: number;
      response?: { data?: unknown; status?: number };
    };
    err.status = response.status;
    err.response = {
      data,
      status: response.status,
    };
    throw err;
  }

  return data;
}

export async function getConfluencePageById(
  pageId: string,
  bodyFormat: ConfluenceBodyFormat,
  version?: number
): Promise<ConfluencePageSummary | null> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const expand =
    bodyFormat === "storage"
      ? "version,space,history.lastUpdated,body.storage"
      : bodyFormat === "view"
        ? "version,space,history.lastUpdated,body.view"
        : "version,space,history.lastUpdated";
  try {
    if (typeof version === "number") {
      const query = new URLSearchParams({
        expand:
          bodyFormat === "storage"
            ? "content.space,content.history.lastUpdated,content.body.storage"
            : bodyFormat === "view"
              ? "content.space,content.history.lastUpdated,content.body.view"
              : "content.space,content.history.lastUpdated",
      });

      const versionResult = (await confluenceRequest(
        `/wiki/rest/api/content/${encodeURIComponent(pageId)}/version/${version}?${query.toString()}`
      )) as {
        by?: { displayName?: unknown };
        when?: unknown;
        number?: unknown;
        content?: Record<string, unknown>;
      };

      const contentWithVersion = {
        ...(versionResult.content ?? {}),
        version: {
          number:
            typeof versionResult.number === "number"
              ? versionResult.number
              : version,
          by: versionResult.by,
          when: versionResult.when,
        },
      };

      return toPageSummary(contentWithVersion, bodyFormat, host);
    }

    const query = new URLSearchParams({ expand });
    const page = await confluenceRequest(
      `/wiki/rest/api/content/${encodeURIComponent(pageId)}?${query.toString()}`
    );
    return toPageSummary(page, bodyFormat, host);
  } catch (error: unknown) {
    const ex = error as { status?: number; response?: { status?: number } };
    const status = ex.status ?? ex.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function findConfluencePageByTitle(
  spaceKey: string,
  title: string,
  bodyFormat: ConfluenceBodyFormat
): Promise<ConfluencePageSummary | null> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const expand =
    bodyFormat === "storage"
      ? "version,space,history.lastUpdated,body.storage"
      : bodyFormat === "view"
        ? "version,space,history.lastUpdated,body.view"
        : "version,space,history.lastUpdated";
  const query = new URLSearchParams({
    type: "page",
    spaceKey,
    title,
    expand,
    limit: "1",
  });
  const result = (await confluenceRequest(
    `/wiki/rest/api/content?${query.toString()}`
  )) as { results?: unknown[] };
  const first = Array.isArray(result.results) ? result.results[0] : undefined;
  return first ? toPageSummary(first, bodyFormat, host) : null;
}

export async function searchConfluencePagesByCql(args: {
  cql: string;
  maxResults?: number;
  nextPageToken?: string;
}): Promise<{ items: ConfluenceListPageSummary[]; count: number; nextPageToken?: string }> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const requestedLimit = args.maxResults ?? DEFAULT_CQL_MAX_RESULTS;
  const limit = Math.max(1, Math.min(CQL_MAX_RESULTS_LIMIT, requestedLimit));
  const start = args.nextPageToken ? decodeCqlNextPageToken(args.nextPageToken) : 0;

  const query = new URLSearchParams({
    cql: args.cql,
    limit: String(limit),
    start: String(start),
    expand: "space,version,body.view",
  });

  const result = (await confluenceRequest(
    `/wiki/rest/api/content/search?${query.toString()}`
  )) as { results?: unknown[]; size?: number };
  const rawItems = Array.isArray(result.results) ? result.results : [];
  const items = rawItems.map((entry) => toListSummary(entry, host));
  const nextStart = start + rawItems.length;
  const hasNextPage = rawItems.length === limit;

  return {
    items,
    count: items.length,
    nextPageToken: hasNextPage ? encodeCqlNextPageToken(nextStart) : undefined,
  };
}

export async function createConfluencePage(args: {
  spaceKey: string;
  title: string;
  content: string;
  parentId?: string;
  draft?: boolean;
}): Promise<{ id: string; title: string; spaceKey?: string; url?: string; version?: number; status?: string }> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const body: Record<string, unknown> = {
    type: "page",
    title: args.title,
    space: { key: args.spaceKey },
    body: {
      storage: {
        value: args.content,
        representation: "storage",
      },
    },
  };

  if (args.draft === true) {
    body.status = "draft";
  }

  if (args.parentId) {
    body.ancestors = [{ id: args.parentId }];
  }

  const path = args.draft === true ? "/wiki/rest/api/content?status=draft" : "/wiki/rest/api/content";
  const created = (await confluenceRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  })) as {
    id?: unknown;
    title?: unknown;
    space?: { key?: unknown };
    status?: unknown;
    version?: { number?: unknown };
    _links?: unknown;
  };

  return {
    id: String(created.id ?? ""),
    title: typeof created.title === "string" ? created.title : "",
    spaceKey: typeof created.space?.key === "string" ? created.space.key : undefined,
    url: toAbsoluteUrl(host, created._links),
    version:
      typeof created.version?.number === "number" ? created.version.number : undefined,
    status: typeof created.status === "string" ? created.status : undefined,
  };
}

interface ConfluenceUpdateTarget {
  id: string;
  title: string;
  spaceKey?: string;
  version?: number;
  status?: string;
  url?: string;
}

function toUpdateTarget(page: unknown, host: string): ConfluenceUpdateTarget {
  const content = (page ?? {}) as {
    id?: unknown;
    title?: unknown;
    status?: unknown;
    space?: { key?: unknown };
    version?: { number?: unknown };
    _links?: unknown;
  };

  return {
    id: String(content.id ?? ""),
    title: typeof content.title === "string" ? content.title : "",
    spaceKey: typeof content.space?.key === "string" ? content.space.key : undefined,
    version:
      typeof content.version?.number === "number" ? content.version.number : undefined,
    status: typeof content.status === "string" ? content.status : undefined,
    url: toAbsoluteUrl(host, content._links),
  };
}

export async function getConfluencePageUpdateTargetById(
  pageId: string
): Promise<ConfluenceUpdateTarget | null> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  try {
    const page = await confluenceRequest(
      `/wiki/rest/api/content/${encodeURIComponent(pageId)}?expand=${encodeURIComponent("version,space")}`
    );
    return toUpdateTarget(page, host);
  } catch (error: unknown) {
    const ex = error as { status?: number; response?: { status?: number } };
    const status = ex.status ?? ex.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function findConfluencePageUpdateTargetByTitle(
  spaceKey: string,
  title: string
): Promise<ConfluenceUpdateTarget | null> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const query = new URLSearchParams({
    type: "page",
    spaceKey,
    title,
    expand: "version,space",
    limit: "1",
  });

  const result = (await confluenceRequest(
    `/wiki/rest/api/content?${query.toString()}`
  )) as { results?: unknown[] };
  const first = Array.isArray(result.results) ? result.results[0] : undefined;
  return first ? toUpdateTarget(first, host) : null;
}

export async function updateConfluencePageById(args: {
  pageId: string;
  content: string;
  newTitle?: string;
}): Promise<{
  id: string;
  title: string;
  spaceKey?: string;
  url?: string;
  version?: number;
  status?: string;
  updated: true;
}> {
  const host = normalizeAtlassianHost(getRequiredEnv("JIRA_HOST"));
  const target = await getConfluencePageUpdateTargetById(args.pageId);

  if (!target) {
    throw new Error("Confluence page not found");
  }
  if (!target.version) {
    throw new Error("Failed to read current page version");
  }

  const updateTitle = args.newTitle?.trim() || target.title;
  const payload: Record<string, unknown> = {
    id: target.id,
    type: "page",
    title: updateTitle,
    version: {
      number: target.version + 1,
    },
    body: {
      storage: {
        value: args.content,
        representation: "storage",
      },
    },
  };

  if (target.spaceKey) {
    payload.space = { key: target.spaceKey };
  }

  const updated = (await confluenceRequest(
    `/wiki/rest/api/content/${encodeURIComponent(target.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  )) as {
    id?: unknown;
    title?: unknown;
    space?: { key?: unknown };
    status?: unknown;
    version?: { number?: unknown };
    _links?: unknown;
  };

  return {
    id: String(updated.id ?? target.id),
    title: typeof updated.title === "string" ? updated.title : updateTitle,
    spaceKey:
      typeof updated.space?.key === "string"
        ? updated.space.key
        : target.spaceKey,
    url: toAbsoluteUrl(host, updated._links) ?? target.url,
    version:
      typeof updated.version?.number === "number"
        ? updated.version.number
        : target.version + 1,
    status: typeof updated.status === "string" ? updated.status : target.status,
    updated: true,
  };
}
