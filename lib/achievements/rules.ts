import type { AchievementDefinition, AchievementEvaluation, AchievementEvaluationInput, AchievementView } from "./types.ts";

export const specialAchievementIds = {
  curse: "maledizione-tortuga",
  sevenSeas: "giro-sette-mari",
  veteran: "veterano-ciurma",
  cannotStayAway: "non-riesci-stare-lontano",
} as const;

const validDates = (values: string[]) => values
  .map((value) => new Date(value))
  .filter((value) => !Number.isNaN(value.getTime()))
  .sort((left, right) => left.getTime() - right.getTime());

const monthPartsInRome = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "numeric",
  timeZone: "Europe/Rome",
});
const monthKey = (date: Date) => {
  const parts = monthPartsInRome.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return year * 12 + month - 1;
};
const weekdayInRome = (date: Date) => {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Europe/Rome" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
};

export const hasConsecutiveVisitedMonths = (values: string[], requiredMonths: number) => {
  const months = [...new Set(validDates(values).map(monthKey))].sort((a, b) => a - b);
  let streak = 0;
  let previous: number | undefined;
  for (const month of months) {
    streak = previous !== undefined && month === previous + 1 ? streak + 1 : 1;
    if (streak >= requiredMonths) return true;
    previous = month;
  }
  return false;
};

export const hasDistinctVisitedMonths = (values: string[], requiredMonths: number) =>
  new Set(validDates(values).map(monthKey)).size >= requiredMonths;

export const hasReturnWithinHours = (values: string[], hours: number) => {
  const dates = validDates(values);
  const limit = hours * 60 * 60 * 1000;
  return dates.some((date, index) => {
    if (index === 0) return false;
    const difference = date.getTime() - dates[index - 1].getTime();
    return difference > 0 && difference <= limit;
  });
};

export const hasReturnAfterDays = (values: string[], days: number) => {
  const dates = validDates(values);
  const limit = days * 24 * 60 * 60 * 1000;
  return dates.some((date, index) =>
    index > 0 && date.getTime() - dates[index - 1].getTime() >= limit,
  );
};

export const hasVisitsInSameMonth = (values: string[], requiredVisits: number) => {
  const visitsByMonth = new Map<number, number>();
  for (const date of validDates(values)) {
    const key = monthKey(date);
    const count = (visitsByMonth.get(key) ?? 0) + 1;
    if (count >= requiredVisits) return true;
    visitsByMonth.set(key, count);
  }
  return false;
};

export const completedFormats = (
  values: string[],
  formats: AchievementEvaluationInput["formats"],
  eventKeys: string[] = [],
) => {
  const visitedWeekdays = new Set(validDates(values).map(weekdayInRome));
  const recordedEvents = new Set(eventKeys);
  return formats.filter((format) => visitedWeekdays.has(format.weekday) || recordedEvents.has(format.id));
};

export const evaluateSpecialAchievements = ({
  visitDates,
  eventKeys = [],
  unlockedIds,
  formats,
}: AchievementEvaluationInput): AchievementEvaluation[] => {
  const alreadyUnlocked = new Set(unlockedIds);
  const formatsDone = completedFormats(visitDates, formats, eventKeys);
  return [
    {
      id: specialAchievementIds.curse,
      unlocked: alreadyUnlocked.has(specialAchievementIds.curse) || hasConsecutiveVisitedMonths(visitDates, 6),
      completedDetail: "Hai registrato almeno una visita in 6 mesi consecutivi.",
    },
    {
      id: specialAchievementIds.sevenSeas,
      unlocked: alreadyUnlocked.has(specialAchievementIds.sevenSeas) || (formats.length > 0 && formatsDone.length === formats.length),
      completedDetail: `Hai partecipato a tutti i format principali: ${formats.map((format) => format.title).join(", ")}.`,
    },
    {
      id: specialAchievementIds.veteran,
      unlocked: alreadyUnlocked.has(specialAchievementIds.veteran) || hasDistinctVisitedMonths(visitDates, 12),
      completedDetail: "Hai registrato almeno una visita in 12 mesi di calendario differenti.",
    },
    {
      id: specialAchievementIds.cannotStayAway,
      unlocked: alreadyUnlocked.has(specialAchievementIds.cannotStayAway) || hasReturnWithinHours(visitDates, 72),
      completedDetail: "Sei tornato al Tortuga dopo meno di 72 ore. Ammettilo: ti mancavamo già.",
    },
  ];
};

export const buildAchievementViews = (
  definitions: AchievementDefinition[],
  evaluations: AchievementEvaluation[],
): AchievementView[] => definitions.flatMap((definition): AchievementView[] => {
  const evaluation = evaluations.find((item) => item.id === definition.id);
  const unlocked = Boolean(evaluation?.unlocked);
  if (definition.secrecy === "hidden" && !unlocked) return [];
  if (definition.secrecy === "secret" && !unlocked) {
    return [{ id: definition.id, label: "???", description: "Continua a navigare…", icon: "?", secrecy: definition.secrecy, unlocked }];
  }
  return [{
    id: definition.id,
    label: definition.label,
    description: unlocked ? evaluation?.completedDetail ?? definition.hint : definition.hint,
    icon: definition.icon,
    image: definition.image,
    secrecy: definition.secrecy,
    unlocked,
  }];
});
