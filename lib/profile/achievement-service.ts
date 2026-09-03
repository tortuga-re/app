import "server-only";

import { buildAchievementViews, evaluateSpecialAchievements, hasReturnAfterDays, hasVisitsInSameMonth, specialAchievementIds } from "@/lib/achievements/rules";
import type { AchievementDefinition, AchievementView } from "@/lib/achievements/types";
import { tortugaInfoConfig } from "@/lib/config";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getRomeWeekday } from "@/lib/utils";
import { missions } from "@/lib/missions";

type ActivityRow = { activity_type: "visit" | "event"; activity_key: string | null; occurred_at: string };
const specialDefinitions: AchievementDefinition[] = [
  { id: specialAchievementIds.curse, label: "La Maledizione del Tortuga", hint: "Una vera maledizione non si spezza tanto facilmente…", icon: "🐙", image: "/badges/maledizione-tortuga.webp", secrecy: "hinted" },
  { id: specialAchievementIds.sevenSeas, label: "Il giro dei Sette Mari", hint: "Un vero pirata non percorre sempre la stessa rotta.", icon: "🌊", image: "/badges/giro-sette-mari.webp", secrecy: "hinted" },
  { id: specialAchievementIds.veteran, label: "Veterano della Ciurma", hint: "Continua a navigare…", icon: "⚓", image: "/badges/veterano-ciurma.webp", secrecy: "secret" },
  { id: specialAchievementIds.cannotStayAway, label: "Non riesci proprio a stare lontano", hint: "Sei tornato al Tortuga dopo meno di 72 ore. Ammettilo: ti mancavamo già.", icon: "🧭", image: "/badges/non-riesci-stare-lontano.webp", secrecy: "hinted" },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getLegacyAchievementIds = async (email: string) => {
  const { data } = await getSupabaseAdmin().from("customer_achievements").select("achievement_ids").eq("email", normalizeEmail(email)).maybeSingle();
  return (data?.achievement_ids as string[] | undefined) ?? [];
};

const getNormalizedAchievementIds = async (email: string) => {
  const { data } = await getSupabaseAdmin().from("customer_achievement_unlocks").select("achievement_id").eq("email", normalizeEmail(email));
  return (data ?? []).map((row) => String(row.achievement_id));
};

export async function getCustomerAchievements(email: string): Promise<string[]> {
  const [legacy, normalized] = await Promise.all([getLegacyAchievementIds(email), getNormalizedAchievementIds(email).catch(() => [])]);
  return [...new Set([...legacy, ...normalized])];
}

const persistUnlocks = async (email: string, achievementIds: string[]) => {
  if (!achievementIds.length) return;
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("customer_achievement_unlocks").upsert(
    achievementIds.map((achievementId) => ({ email: normalizedEmail, achievement_id: achievementId, unlocked_at: now })),
    { onConflict: "email,achievement_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  const [legacyIds, normalizedIds] = await Promise.all([
    getLegacyAchievementIds(normalizedEmail),
    getNormalizedAchievementIds(normalizedEmail),
  ]);
  const allIds = [...new Set([...legacyIds, ...normalizedIds])];
  const { error: legacyError } = await supabase.from("customer_achievements").upsert(
    { email: normalizedEmail, achievement_ids: allIds, updated_at: now },
    { onConflict: "email" },
  );
  if (legacyError) throw legacyError;
};

export async function unlockAchievement(email: string, achievementId: string): Promise<void> {
  const recognizedFormat = tortugaInfoConfig.eveningProgram.find((format) => format.id === achievementId);
  if (recognizedFormat) await recordAchievementActivity(email, "event", recognizedFormat.id, new Date().toISOString(), `event:${recognizedFormat.id}`);
  const current = await getCustomerAchievements(email);
  if (current.includes(achievementId)) return;
  await persistUnlocks(email, [achievementId]);
}

export const recordAchievementActivity = async (
  email: string,
  activityType: "visit" | "event",
  activityKey: string | null,
  occurredAt: string,
  dedupeKey: string,
) => {
  const parsed = new Date(occurredAt);
  if (!email.trim() || Number.isNaN(parsed.getTime())) return;
  const { error } = await getSupabaseAdmin().from("customer_achievement_activity").upsert(
    { email: normalizeEmail(email), activity_type: activityType, activity_key: activityKey, occurred_at: parsed.toISOString(), dedupe_key: dedupeKey },
    { onConflict: "email,dedupe_key", ignoreDuplicates: true },
  );
  if (error) throw error;
};

const recordVisitAndRelatedAchievements = async (email: string, occurredAt: string) => {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return;
  const timestamp = date.toISOString();
  await recordAchievementActivity(email, "visit", null, timestamp, `visit:${timestamp}`);

  // I format della serata sono imprese permanenti: non devono sparire alla visita successiva.
  const formatAchievementIds = tortugaInfoConfig.eveningProgram
    .filter((format) => getRomeWeekday(date) === format.weekday)
    .map((format) => format.id);
  await persistUnlocks(email, formatAchievementIds);
};

const recordProfileLatestVisit = async (email: string, profile: ProfileResponse) => {
  const visitDate = profile.contact?.DataUltimaVisita;
  if (!visitDate) return;
  await recordVisitAndRelatedAchievements(email, visitDate);
};

const getActivity = async (email: string): Promise<ActivityRow[]> => {
  const { data, error } = await getSupabaseAdmin().from("customer_achievement_activity").select("activity_type,activity_key,occurred_at").eq("email", normalizeEmail(email)).order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityRow[];
};

export async function evaluateCustomerAchievements(email: string, profile?: ProfileResponse): Promise<{ achievementIds: string[]; achievementViews: AchievementView[] }> {
  if (profile) await recordProfileLatestVisit(email, profile).catch(() => undefined);
  const [currentIds, activity] = await Promise.all([getCustomerAchievements(email), getActivity(email).catch(() => [])]);
  const formats = tortugaInfoConfig.eveningProgram.map((format) => ({ id: format.id, title: format.title, weekday: format.weekday }));
  const visitDates = activity.filter((item) => item.activity_type === "visit").map((item) => item.occurred_at);
  const eventKeys = activity.filter((item) => item.activity_type === "event" && item.activity_key).map((item) => item.activity_key as string);
  const evaluations = evaluateSpecialAchievements({ visitDates, eventKeys, unlockedIds: currentIds, formats });
  const specialIds = evaluations.filter((item) => item.unlocked && !currentIds.includes(item.id)).map((item) => item.id);
  const activityMissionIds = [
    hasReturnAfterDays(visitDates, 60) ? "ritorno-naufragio" : null,
    hasVisitsInSameMonth(visitDates, 3) ? "stessa-rotta-3" : null,
  ].filter((id): id is string => id !== null && !currentIds.includes(id));
  const provisionalIds = [...new Set([...currentIds, ...specialIds, ...activityMissionIds])];
  const profileWithUnlocks = profile
    ? { ...profile, unlockedAchievementIds: provisionalIds }
    : undefined;
  const completionId = profileWithUnlocks && missions
    .filter((mission) => mission.id !== "naufragio-perfetto")
    .every((mission) => mission.isUnlocked(profileWithUnlocks))
    ? ["naufragio-perfetto"]
    : [];
  const newIds = [...new Set([...specialIds, ...activityMissionIds, ...completionId])]
    .filter((id) => !currentIds.includes(id));
  await persistUnlocks(email, newIds);
  const achievementIds = [...new Set([...currentIds, ...newIds])];
  const finalEvaluations = evaluateSpecialAchievements({ visitDates, eventKeys, unlockedIds: achievementIds, formats });
  return { achievementIds, achievementViews: buildAchievementViews(specialDefinitions, finalEvaluations) };
}

export async function recordCustomerVisit(email: string, occurredAt: string) {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) return evaluateCustomerAchievements(email);
  await recordVisitAndRelatedAchievements(email, parsed.toISOString());
  return evaluateCustomerAchievements(email);
}
