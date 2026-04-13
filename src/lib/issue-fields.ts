import type { Version3Client } from "jira.js";
import { JIRA_PROJECT_KEY } from "../config/jira.js";
import { issueConfig } from "../config/issue-defaults.js";

 export type JiraAdfDocument = {
  type: "doc";
  version: number;
  content: unknown[];
};

export interface CreateIssueBody {
  title: string;
  description: JiraAdfDocument;
  issue_type?: string;
  priority?: string;
  reporter?: string;
  assignee?: string | null;
  parent?: string;
  labels?: string[];
  components?: string[];
  [customField: string]: unknown;
}

export interface UpdateIssueBody {
  title?: string;
  description?: JiraAdfDocument;
  priority?: string;
  assignee?: string | null;
  parent?: string;
  labels?: string[];
  components?: string | string[];
  [customField: string]: unknown;
}

function textToAdf(text: string): { type: "doc"; version: number; content: unknown[] } {
  const paragraphs = text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: p }],
    }));
  if (paragraphs.length === 0) paragraphs.push({ type: "paragraph" as const, content: [{ type: "text" as const, text: "" }] });
  return { type: "doc", version: 1, content: paragraphs };
}

function isValidAdfObject(obj: unknown): obj is { type: "doc"; version: number; content: unknown[] } {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  
  const adf = obj as Record<string, unknown>;
  return (
    adf.type === "doc" &&
    typeof adf.version === "number" &&
    Array.isArray(adf.content)
  );
}

function processDescription(description: string | { type: "doc"; version: number; content: unknown[] } | Record<string, unknown> | undefined): { type: "doc"; version: number; content: unknown[] } {
  if (!description) {
    return textToAdf("");
  }
  
  if (typeof description === "string") {
    const trimmed = description.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(description);
        if (isValidAdfObject(parsed)) {
          return parsed;
        }
      } catch {
      }
    }
    return textToAdf(description);
  }
  
  if (description && typeof description === "object" && !Array.isArray(description)) {
    if (isValidAdfObject(description)) {
      return description;
    }
    try {
      const asString = JSON.stringify(description);
      return textToAdf(asString);
    } catch {
      return textToAdf(String(description));
    }
  }
  
  return textToAdf(String(description));
}

function resolveValue<T>(bodyValue: T | undefined, defaultValue: unknown): T | undefined {
  if (bodyValue !== undefined && bodyValue !== null) return bodyValue;
  return defaultValue as T | undefined;
}

export async function buildCreateIssueFields(
  _client: Version3Client,
  body: CreateIssueBody,
  currentUserAccountId: string
): Promise<Record<string, unknown>> {
  const { defaults, custom_fields } = issueConfig;
  const fields: Record<string, unknown> = {
    project: { key: JIRA_PROJECT_KEY },
    summary: body.title,
    description: processDescription(body.description),
    reporter: { accountId: body.reporter ?? currentUserAccountId },
  };

  const issueType = resolveValue(body.issue_type, defaults.issue_type);
  if (issueType) fields.issuetype = { name: String(issueType) };

  const parentKey = resolveValue(body.parent, defaults.parent_key);
  if (parentKey) fields.parent = { key: parentKey };

  const labels = resolveValue(body.labels, defaults.labels);
  if (labels) fields.labels = labels;

  const priority = resolveValue(body.priority, defaults.priority);
  if (priority) fields.priority = { name: priority };

  const componentsValue = body.components ?? (body as Record<string, unknown>)["Components"];
  const components = resolveValue(componentsValue, defaults.components);
  if (components) {
    const componentsArray = Array.isArray(components) ? components : [String(components)];
    fields.components = componentsArray.map((c: string) => ({ name: c }));
  }

  if (body.assignee !== undefined) {
    if (body.assignee) fields.assignee = { accountId: body.assignee };
  }

  for (const [fieldName, config] of Object.entries(custom_fields)) {
    const fromBody = body[fieldName];
    
    if (fromBody === undefined || fromBody === null) {
      if (config.default_value) {
        const defaultOptionId = config.default_option_id;
        if (defaultOptionId) {
          const defaultOption = { id: defaultOptionId, value: config.default_value };
          fields[config.field_id] = config.format === "array" ? [defaultOption] : defaultOption;
        }
      }
      continue;
    }

    const value = String(fromBody);
    const optionId = config.options[value];
    
    if (!optionId) {
      continue;
    }

    const option = { id: optionId, value };
    fields[config.field_id] = config.format === "array" ? [option] : option;
  }

  return fields;
}

export async function buildUpdateIssueFields(
  body: UpdateIssueBody
): Promise<Record<string, unknown>> {
  const { custom_fields } = issueConfig;
  const fields: Record<string, unknown> = {};

  if (body.title !== undefined) {
    fields.summary = body.title;
  }

  if (body.description !== undefined) {
    fields.description = processDescription(body.description);
  }

  if (body.priority !== undefined && body.priority !== null) {
    fields.priority = { name: body.priority };
  }

  if (body.parent !== undefined && body.parent !== null) {
    fields.parent = { key: body.parent };
  }

  if (body.labels !== undefined) {
    fields.labels = body.labels;
  }

  const componentsValue = body.components ?? (body as Record<string, unknown>)["Components"];
  if (componentsValue !== undefined) {
    const componentsArray = Array.isArray(componentsValue) ? componentsValue : [String(componentsValue)];
    fields.components = componentsArray.map((c: string) => ({ name: c }));
  }

  if (body.assignee !== undefined) {
    if (body.assignee === null) {
      fields.assignee = null;
    } else {
      fields.assignee = { accountId: body.assignee };
    }
  }

  for (const [fieldName, config] of Object.entries(custom_fields)) {
    const fromBody = body[fieldName];
    
    if (fromBody === undefined || fromBody === null) {
      continue;
    }

    const value = String(fromBody);
    const optionId = config.options[value];
    
    if (!optionId) {
      continue;
    }

    const option = { id: optionId, value };
    fields[config.field_id] = config.format === "array" ? [option] : option;
  }

  return fields;
}
