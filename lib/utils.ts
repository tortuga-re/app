export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** The venue's canonical display and calendar timezone. */
export const ROME_TIME_ZONE = "Europe/Rome";

type RomeDatePart = "year" | "month" | "day" | "hour" | "minute" | "second";

export const getRomeDateParts = (value: Date | string | number = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type as RomeDatePart, part.value]),
  ) as Record<RomeDatePart, string>;
  return values;
};

export const getRomeWeekday = (value: Date | string | number = new Date()) => {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
  }).format(new Date(value));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
};

export const getRomeTime = (value: Date | string | number = new Date()) => {
  const { hour, minute } = getRomeDateParts(value);
  return `${hour}:${minute}`;
};

export const formatInRome = (
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat("it-IT", { ...options, timeZone: ROME_TIME_ZONE }).format(new Date(value));

export const todayIso = (now = new Date()) => {
  const { year, month, day } = getRomeDateParts(now);

  return `${year}-${month}-${day}`;
};

/** Returns a Rome calendar date shifted by whole calendar days (not 24-hour intervals). */
export const getRomeDateIsoWithOffset = (offsetDays: number, now = new Date()) => {
  const { year, month, day } = getRomeDateParts(now);
  const shifted = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + offsetDays));
  return shifted.toISOString().slice(0, 10);
};

/** Difference between two calendar days in Rome, resilient to daylight-saving changes. */
export const getRomeCalendarDayDifference = (
  from: Date | string | number,
  to: Date | string | number = new Date(),
) => {
  const start = getRomeDateParts(from);
  const end = getRomeDateParts(to);
  const startDay = Date.UTC(Number(start.year), Number(start.month) - 1, Number(start.day));
  const endDay = Date.UTC(Number(end.year), Number(end.month) - 1, Number(end.day));
  return Math.round((endDay - startDay) / (24 * 60 * 60 * 1000));
};

export const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatDateInput = (value: string) => value.slice(0, 10);

const getOffsetMinutesForRome = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(utcGuess)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const romeUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return Math.round((romeUtc - utcGuess.getTime()) / 60000);
};

const formatOffset = (offsetMinutes: number) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
};

export const buildCoopertoDateTime = (date: string, time: string) => {
  const offset = getOffsetMinutesForRome(date, time);
  return `${date}T${time}:00${formatOffset(offset)}`;
};

export const buildCoopertoNowDateTime = (now = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;

  return buildCoopertoDateTime(date, time);
};

export const initialsFromName = (firstName?: string, lastName?: string) => {
  const initial = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim();
  return initial || "TB";
};

export const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
