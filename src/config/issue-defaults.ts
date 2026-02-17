import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

export interface CustomFieldConfig {
  field_id: string;
  format: "single" | "array";
  default_value?: string;
  default_option_id?: string;
  options: Record<string, string>;
}

export interface IssueConfig {
  defaults: Record<string, unknown>;
  custom_fields: Record<string, CustomFieldConfig>;
}

function loadIssueConfig(): IssueConfig {
  const configPath = resolve(process.cwd(), process.env.ISSUE_CONFIG_PATH ?? "issue-config.yml");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = parse(raw) as Partial<IssueConfig> | null;
    return {
      defaults: parsed?.defaults ?? {},
      custom_fields: parsed?.custom_fields ?? {},
    };
  } catch {
    return { defaults: {}, custom_fields: {} };
  }
}

export const issueConfig = loadIssueConfig();
