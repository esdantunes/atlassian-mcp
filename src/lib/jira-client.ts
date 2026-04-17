import { Version3Client, type Version3 } from "jira.js";
import type { IssueFixVersion, SimplifiedIssue, UserDetails } from "../types/issue.js";

export const DEFAULT_MAX_RESULTS = 50;
export const MAX_RESULTS_LIMIT = 5000;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function createJiraClient(): Version3Client {
  return new Version3Client({
    host: getEnv("JIRA_HOST"),
    authentication: {
      basic: {
        email: getEnv("JIRA_EMAIL"),
        apiToken: getEnv("JIRA_API_TOKEN"),
      },
    },
  });
}

function descriptionToPlainText(doc: unknown): string {
  if (doc == null) return "";
  if (typeof doc === "string") return doc;
  const d = doc as { content?: Array<{ text?: string; content?: unknown[] }> };
  if (!d.content) return "";
  const parts: string[] = [];
  for (const node of d.content) {
    if (node.text) parts.push(node.text);
    if (node.content) parts.push(descriptionToPlainText({ content: node.content }));
  }
  return parts.join(" ").trim();
}

function extractAdfDescription(doc: unknown): { type: "doc"; version: number; content: unknown[] } | undefined {
  if (doc == null) return undefined;
  if (typeof doc === "string") return undefined;
  const d = doc as { type?: string; version?: number; content?: unknown[] };
  if (d.type === "doc" && typeof d.version === "number" && Array.isArray(d.content)) {
    return {
      type: "doc",
      version: d.version,
      content: d.content,
    };
  }
  return undefined;
}

function toUserDetails(user: { accountId?: string; displayName?: string; emailAddress?: string } | null | undefined): UserDetails | null {
  if (!user) return null;
  return {
    id: user.accountId ?? "",
    displayName: user.displayName ?? "",
    emailAddress: user.emailAddress ?? undefined,
  };
}

function mapFixVersions(raw: Version3.Version3Models.Fields["fixVersions"]): IssueFixVersion[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: IssueFixVersion[] = [];
  for (const v of raw) {
    if (!v?.id || !v?.name) continue;
    out.push({
      id: v.id,
      name: v.name,
      selectableGroupKey: v.released === true ? "RELEASED" : "UNRELEASED",
      releaseDate: v.releaseDate,
      archived: v.archived === true,
    });
  }
  return out.length ? out : undefined;
}

export function toSimplifiedIssue(issue: Version3.Version3Models.Issue): SimplifiedIssue {
  const fields = (issue.fields ?? {}) as Version3.Version3Models.Fields;
  const descriptionAdf = extractAdfDescription(fields.description);

  const result: SimplifiedIssue = {
    id: issue.key ?? issue.id,
    title: fields.summary ?? "",
    description: descriptionToPlainText(fields.description),
    status: fields.status?.name ?? "",
    priority: fields.priority?.name ?? "",
    reporter: toUserDetails(fields.reporter ?? null),
    assignee: toUserDetails(fields.assignee ?? null),
  };

  if (descriptionAdf) {
    result.descriptionAdf = descriptionAdf;
  }

  const fv = mapFixVersions(fields.fixVersions);
  if (fv) result.fixVersions = fv;

  return result;
}
