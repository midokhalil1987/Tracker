import type { TimeEntry } from "@/lib/types";

const MAX_SUGGESTION_LEN = 120;

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Recent unique descriptions from time entries, optionally filtered by query.
 */
export function getDescriptionSuggestions(
  entries: Pick<TimeEntry, "description" | "projectId" | "startedAt">[],
  options: {
    query?: string;
    projectId?: string | null;
    limit?: number;
  } = {}
): string[] {
  const limit = options.limit ?? 8;
  const query = options.query?.trim().toLowerCase() ?? "";
  const seen = new Set<string>();
  const sameProject: string[] = [];
  const other: string[] = [];

  const sorted = [...entries].sort((a, b) => b.startedAt - a.startedAt);

  for (const entry of sorted) {
    const text = normalizeDescription(entry.description);
    if (!text || text.length > MAX_SUGGESTION_LEN) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    if (query && !key.includes(query)) continue;
    seen.add(key);

    if (options.projectId && entry.projectId === options.projectId) {
      sameProject.push(text);
    } else {
      other.push(text);
    }
  }

  return [...sameProject, ...other].slice(0, limit);
}

/**
 * Short starter templates — useful when history is empty or for quick picks.
 */
export function getDescriptionTemplates(projectName?: string): string[] {
  if (projectName) {
    return [
      `${projectName} — development`,
      `${projectName} — client meeting`,
      `${projectName} — planning & scoping`,
      `${projectName} — code review`,
    ];
  }
  return [
    "Planning & prioritization",
    "Client meeting",
    "Development",
    "Code review",
    "Email & admin",
  ];
}
