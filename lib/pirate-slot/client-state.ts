"use client";

import { getTortugaCalendarDate } from "@/lib/pirate-slot/config";

const storageKey = "tortuga.pirate-slot-daily-play";

type StoredDailyPlay = {
  email: string;
  playDate: string;
};

const readStoredPlay = (): StoredDailyPlay | null => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Partial<StoredDailyPlay> | null;
    return parsed && typeof parsed.email === "string" && typeof parsed.playDate === "string"
      ? { email: parsed.email, playDate: parsed.playDate }
      : null;
  } catch {
    return null;
  }
};

export const hasPlayedPirateSlotToday = (email?: string) => {
  const stored = readStoredPlay();
  if (!stored || stored.playDate !== getTortugaCalendarDate()) return false;
  return !email || stored.email === email.trim().toLowerCase();
};

export const rememberPirateSlotPlayedToday = (email: string, playDate: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify({
    email: email.trim().toLowerCase(),
    playDate,
  } satisfies StoredDailyPlay));
};

export const clearPirateSlotPlayedToday = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
};
