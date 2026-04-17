import type { Version3Client } from "jira.js";
import type { Version3 } from "jira.js";

export type SelectableGroupKey = "RELEASED" | "UNRELEASED";

export interface EnrichedProjectVersion {
  id: string;
  name: string;
  released: boolean;
  archived: boolean;
  releaseDate?: string;
  startDate?: string;
  selectableGroupKey: SelectableGroupKey;
  selectableLabel: string;
}

export interface FixVersionApplied {
  id: string;
  name: string;
  selectableGroupKey: SelectableGroupKey;
}

export interface FixVersionsResolutionResult {
  applied: FixVersionApplied[];
  skipped: string[];
  fixVersionFieldValue: Array<{ id: string }>;
}

function versionReleased(v: Version3.Version3Models.Version): boolean {
  return v.released === true;
}

export function selectableGroupKeyForVersion(v: Version3.Version3Models.Version): SelectableGroupKey {
  return versionReleased(v) ? "RELEASED" : "UNRELEASED";
}

export function buildSelectableLabel(v: Version3.Version3Models.Version): string {
  const name = (v.name ?? "").trim();
  const rd = v.releaseDate?.trim();
  if (name && rd) return `${name} (${rd})`;
  return name || (v.id ?? "");
}

export function enrichProjectVersion(v: Version3.Version3Models.Version): EnrichedProjectVersion | null {
  const id = v.id;
  const name = v.name;
  if (!id || !name) return null;
  return {
    id,
    name,
    released: versionReleased(v),
    archived: v.archived === true,
    releaseDate: v.releaseDate,
    startDate: v.startDate,
    selectableGroupKey: selectableGroupKeyForVersion(v),
    selectableLabel: buildSelectableLabel(v),
  };
}

export async function fetchProjectVersions(
  client: Version3Client,
  projectIdOrKey: string
): Promise<Version3.Version3Models.Version[]> {
  return client.projectVersions.getProjectVersions({ projectIdOrKey });
}

export function listEnrichedProjectVersions(
  versions: Version3.Version3Models.Version[]
): EnrichedProjectVersion[] {
  const out: EnrichedProjectVersion[] = [];
  for (const v of versions) {
    const e = enrichProjectVersion(v);
    if (e) out.push(e);
  }
  return out;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function resolveFixVersionStrings(
  versions: Version3.Version3Models.Version[],
  requested: string[]
): FixVersionsResolutionResult {
  const enriched = listEnrichedProjectVersions(versions);
  const byId = new Map<string, EnrichedProjectVersion>();
  const byName = new Map<string, EnrichedProjectVersion>();
  const byLabel = new Map<string, EnrichedProjectVersion>();
  for (const e of enriched) {
    byId.set(e.id, e);
    byName.set(norm(e.name), e);
    byLabel.set(norm(e.selectableLabel), e);
  }

  const applied: FixVersionApplied[] = [];
  const skipped: string[] = [];
  const seenIds = new Set<string>();

  for (const raw of requested) {
    const t = raw.trim();
    if (!t) continue;

    let hit: EnrichedProjectVersion | undefined;
    if (byId.has(t)) hit = byId.get(t);
    if (!hit) hit = byName.get(norm(t));
    if (!hit) hit = byLabel.get(norm(t));

    if (!hit) {
      skipped.push(t);
      continue;
    }
    if (seenIds.has(hit.id)) continue;
    seenIds.add(hit.id);
    applied.push({
      id: hit.id,
      name: hit.name,
      selectableGroupKey: hit.selectableGroupKey,
    });
  }

  return {
    applied,
    skipped,
    fixVersionFieldValue: applied.map((a) => ({ id: a.id })),
  };
}

export function fixVersionsResolutionNote(result: FixVersionsResolutionResult): string | undefined {
  if (result.skipped.length === 0) return undefined;
  const skippedList = result.skipped.map((s) => JSON.stringify(s)).join(", ");
  return `No project version matched: ${skippedList}. Issue was still processed; only existing versions were applied. Use list_project_versions to copy id, name, or selectableLabel.`;
}

export function normalizeDefaultFixVersions(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    const xs = raw.map((x) => String(x).trim()).filter(Boolean);
    return xs.length ? xs : [];
  }
  const s = String(raw).trim();
  if (!s) return [];
  return [s];
}
