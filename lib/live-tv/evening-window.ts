/**
 * Helper utility to determine whether a submission timestamp belongs to the current active evening.
 * Daily Evening Window rule:
 * Resets every day at 19:30 Italian Time (Europe/Rome).
 * - A photo/greeting sent before midnight (e.g. 22:00) remains active until 19:30 the next day.
 * - A photo/greeting sent after midnight (e.g. 01:30 AM) belongs to the evening session started at 19:30 yesterday and remains active until 19:30 the same day.
 */

export function getRomeEveningSessionKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const year = getVal("year");
  const month = getVal("month");
  const day = getVal("day");
  let hour = getVal("hour");
  if (hour === 24) hour = 0;
  const minute = getVal("minute");

  const sessionDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // If local time in Rome is before 19:30, the session belongs to yesterday's 19:30 start
  if (hour < 19 || (hour === 19 && minute < 30)) {
    sessionDate.setUTCDate(sessionDate.getUTCDate() - 1);
  }

  const resYear = sessionDate.getUTCFullYear();
  const resMonth = String(sessionDate.getUTCMonth() + 1).padStart(2, "0");
  const resDay = String(sessionDate.getUTCDate()).padStart(2, "0");

  return `${resYear}-${resMonth}-${resDay}`;
}

export function isSubmissionInCurrentEvening(
  createdAtIsoOrNum: string | number,
  now: Date = new Date(),
): boolean {
  const created = new Date(createdAtIsoOrNum);
  if (isNaN(created.getTime())) return false;

  const createdSessionKey = getRomeEveningSessionKey(created);
  const currentSessionKey = getRomeEveningSessionKey(now);

  return createdSessionKey === currentSessionKey;
}

