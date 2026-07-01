export const MAX_EMAIL_RECIPIENTS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Deduplicated, lowercased list — at most MAX_EMAIL_RECIPIENTS valid addresses. */
export function normalizeEmailRecipients(
  input: unknown,
  fallback = ""
): string[] {
  const raw: string[] = Array.isArray(input)
    ? input.filter((v): v is string => typeof v === "string")
    : typeof input === "string" && input.trim()
      ? [input]
      : fallback.trim()
        ? [fallback]
        : [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const trimmed = item.trim().toLowerCase();
    if (!isValidEmail(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_EMAIL_RECIPIENTS) break;
  }

  return result;
}

export function formatRecipientList(emails: string[]): string {
  if (emails.length === 0) return "no recipients";
  if (emails.length === 1) return emails[0];
  if (emails.length === 2) return `${emails[0]} and ${emails[1]}`;
  return `${emails[0]}, ${emails[1]}, and ${emails[2]}`;
}
