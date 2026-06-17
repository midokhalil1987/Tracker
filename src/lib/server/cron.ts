/** True when the current day is Monday–Friday in the given IANA timezone. */
export function isWeekday(timeZone = process.env.CRON_TIMEZONE ?? "Africa/Cairo"): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(new Date());
  return weekday !== "Sat" && weekday !== "Sun";
}

/** YYYY-MM-DD in the cron timezone — used to avoid duplicate sends per day. */
export function todayKey(
  timeZone = process.env.CRON_TIMEZONE ?? "Africa/Cairo"
): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date());
}

export function alreadySentToday(
  lastEmailSentAt: string | null,
  timeZone = process.env.CRON_TIMEZONE ?? "Africa/Cairo"
): boolean {
  if (!lastEmailSentAt) return false;
  const sentDay = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(lastEmailSentAt));
  return sentDay === todayKey(timeZone);
}
