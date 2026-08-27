import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAchievementViews,
  evaluateSpecialAchievements,
  hasConsecutiveVisitedMonths,
  hasDistinctVisitedMonths,
  hasReturnWithinHours,
  specialAchievementIds,
} from "./rules.ts";

const months = (count: number, step = 1) => Array.from({ length: count }, (_, index) =>
  new Date(Date.UTC(2025, index * step, 10, 20)).toISOString());

test("six consecutive visited months unlock the curse", () => {
  assert.equal(hasConsecutiveVisitedMonths(months(6), 6), true);
  assert.equal(hasConsecutiveVisitedMonths(months(6, 2), 6), false);
});

test("veteran accepts twelve non-consecutive calendar months", () => {
  assert.equal(hasDistinctVisitedMonths(months(12, 2), 12), true);
});

test("a valid return inside 72 hours unlocks the hidden achievement", () => {
  const start = new Date("2026-01-10T20:00:00Z");
  assert.equal(hasReturnWithinHours([start.toISOString(), new Date(start.getTime() + 71 * 60 * 60 * 1000).toISOString()], 72), true);
  assert.equal(hasReturnWithinHours([start.toISOString(), new Date(start.getTime() + 73 * 60 * 60 * 1000).toISOString()], 72), false);
  assert.equal(hasReturnWithinHours([start.toISOString(), start.toISOString()], 72), false);
});

test("all configured format weekdays are required", () => {
  const formats = [
    { id: "wed", title: "Mercoledì", weekday: 3 },
    { id: "fri", title: "Venerdì", weekday: 5 },
  ];
  const result = evaluateSpecialAchievements({
    visitDates: ["2026-01-07T20:00:00Z", "2026-01-09T20:00:00Z"],
    unlockedIds: [],
    formats,
  });
  assert.equal(result.find((item) => item.id === specialAchievementIds.sevenSeas)?.unlocked, true);
});

test("recorded event keys also satisfy configured formats", () => {
  const formats = [
    { id: "wed", title: "Mercoledì", weekday: 3 },
    { id: "fri", title: "Venerdì", weekday: 5 },
  ];
  const result = evaluateSpecialAchievements({ visitDates: [], eventKeys: ["wed", "fri"], unlockedIds: [], formats });
  assert.equal(result.find((item) => item.id === specialAchievementIds.sevenSeas)?.unlocked, true);
});

test("previous unlocks remain unlocked when current evidence is absent", () => {
  const result = evaluateSpecialAchievements({ visitDates: [], unlockedIds: [specialAchievementIds.curse], formats: [] });
  assert.equal(result.find((item) => item.id === specialAchievementIds.curse)?.unlocked, true);
});

test("secrecy levels filter client-visible achievements", () => {
  const definitions = [
    { id: "hint", label: "Hinted", hint: "Indizio", icon: "H", secrecy: "hinted" as const },
    { id: "secret", label: "Secret", hint: "Segreto", icon: "S", secrecy: "secret" as const },
    { id: "hidden", label: "Hidden", hint: "Nascosto", icon: "X", secrecy: "hidden" as const },
  ];
  const locked = definitions.map((definition) => ({ id: definition.id, unlocked: false }));
  const views = buildAchievementViews(definitions, locked);
  assert.deepEqual(views.map((view) => view.label), ["Hinted", "???"]);
  assert.equal(JSON.stringify(views).includes("Hidden"), false);

  const unlockedViews = buildAchievementViews(definitions, [
    ...locked.filter((item) => item.id !== "hidden"),
    { id: "hidden", unlocked: true, completedDetail: "Completata" },
  ]);
  assert.equal(unlockedViews.find((view) => view.id === "hidden")?.description, "Completata");
});
