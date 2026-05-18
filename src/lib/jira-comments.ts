import type { Version3 } from "jira.js";
import type { JiraAdfDocument } from "./issue-fields.js";
import type { SimplifiedComment } from "../types/comment.js";
import type { UserDetails } from "../types/issue.js";

export function toJiraDocument(body: JiraAdfDocument): Version3.Version3Models.Document {
  return body as Version3.Version3Models.Document;
}

export const DEFAULT_COMMENT_MAX_RESULTS = 50;
export const MAX_COMMENT_MAX_RESULTS = 100;

function bodyToPlainText(doc: unknown): string {
  if (doc == null) return "";
  if (typeof doc === "string") return doc;
  const d = doc as { content?: Array<{ text?: string; content?: unknown[] }> };
  if (!d.content) return "";
  const parts: string[] = [];
  for (const node of d.content) {
    if (node.text) parts.push(node.text);
    if (node.content) parts.push(bodyToPlainText({ content: node.content }));
  }
  return parts.join(" ").trim();
}

function extractAdfBody(
  doc: unknown
): { type: "doc"; version: number; content: unknown[] } | undefined {
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

function toUserDetails(
  user: { accountId?: string; displayName?: string; emailAddress?: string } | null | undefined
): UserDetails | null {
  if (!user) return null;
  return {
    id: user.accountId ?? "",
    displayName: user.displayName ?? "",
    emailAddress: user.emailAddress ?? undefined,
  };
}

export function toSimplifiedComment(comment: Version3.Version3Models.Comment): SimplifiedComment {
  const bodyAdf = extractAdfBody(comment.body);
  const result: SimplifiedComment = {
    id: comment.id ?? "",
    body: bodyToPlainText(comment.body),
    author: toUserDetails(comment.author ?? null),
    created: comment.created,
    updated: comment.updated,
  };
  if (bodyAdf) {
    result.bodyAdf = bodyAdf;
  }
  return result;
}
