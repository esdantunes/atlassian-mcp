import type { Version3Client } from "jira.js";

type TransitionItem = {
  id?: string;
  name?: string;
  to?: { name?: string };
};

export function normalizeStatusLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickTransition(
  transitions: TransitionItem[] | undefined,
  targetStatus: string
): TransitionItem | undefined {
  const target = normalizeStatusLabel(targetStatus);
  if (!transitions?.length) return undefined;

  for (const tr of transitions) {
    const toName = tr.to?.name;
    if (toName && normalizeStatusLabel(toName) === target) {
      return tr;
    }
  }
  for (const tr of transitions) {
    if (tr.name && normalizeStatusLabel(tr.name) === target) {
      return tr;
    }
  }
  return undefined;
}

function destinationLabels(transitions: TransitionItem[] | undefined): string[] {
  const out: string[] = [];
  for (const tr of transitions ?? []) {
    const n = tr.to?.name;
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Moves an issue to a workflow status by name using an available transition.
 * Jira does not allow setting `status` via edit issue; transitions are required.
 */
export async function transitionIssueToStatus(
  client: Version3Client,
  issueIdOrKey: string,
  targetStatus: string
): Promise<{ alreadyThere: boolean }> {
  const trimmed = targetStatus.trim();
  if (!trimmed) {
    throw new Error("Status must be a non-empty string");
  }

  const issue = await client.issues.getIssue({
    issueIdOrKey,
    fields: ["status"],
  });

  const fields = issue.fields as { status?: { name?: string } } | undefined;
  const currentName = fields?.status?.name;
  if (currentName && normalizeStatusLabel(currentName) === normalizeStatusLabel(trimmed)) {
    return { alreadyThere: true };
  }

  const { transitions } = await client.issues.getTransitions({ issueIdOrKey });
  const tr = pickTransition(transitions, trimmed);
  if (!tr?.id) {
    const dests = destinationLabels(transitions);
    const hint =
      dests.length > 0
        ? `Available destination statuses from the current state: ${dests.join(", ")}`
        : "No transitions are available from the current state (check permissions and workflow).";
    throw new Error(`No transition found to status "${trimmed}". ${hint}`);
  }

  await client.issues.doTransition({
    issueIdOrKey,
    transition: { id: tr.id },
  });

  return { alreadyThere: false };
}
