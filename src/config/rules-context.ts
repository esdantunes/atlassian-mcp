import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

function isMarkdownFile(pathname: string): boolean {
  const extension = extname(pathname).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function loadRulesContext(): string | undefined {
  const rulesPath = process.env.RULES?.trim();
  if (!rulesPath) return undefined;
  if (!isMarkdownFile(rulesPath)) return undefined;

  try {
    const resolvedPath = resolve(process.cwd(), rulesPath);
    const content = readFileSync(resolvedPath, "utf-8").trim();
    return content.length > 0 ? content : undefined;
  } catch {
    return undefined;
  }
}

export const rulesContext = loadRulesContext();
