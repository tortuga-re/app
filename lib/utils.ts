export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatDateInput = (value: string) => value.slice(0, 10);

const getOffsetMinutesForRome = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
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

export const initialsFromName = (firstName?: string, lastName?: string) => {
  const initial = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim();
  return initial || "TB";
};

export const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
