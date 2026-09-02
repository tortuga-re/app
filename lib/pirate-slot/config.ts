export const pirateSlotConfig = {
  couponCode: "8b47ac05-f273-4ee2-8a91-1815781eb7f2",
  maxAttempts: 3,
  // La Slot accompagna sempre al Baule: il premio diretto non e' ottenibile.
  winProbability: 0,
  timeZone: "Europe/Rome",
} as const;

export const getTortugaCalendarDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: pirateSlotConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
