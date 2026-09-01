import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/client";

export type AppStateRecord = {
  key: string;
  value: string;
  updatedAt: string | null;
};

const APP_STATE_TABLE = "app_state";

const toRecord = (row: Record<string, unknown>): AppStateRecord => ({
  key: String(row.key ?? ""),
  value: String(row.value ?? ""),
  updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
});

export const getAppStateValue = async (key: string): Promise<string | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(APP_STATE_TABLE)
    .select("key, value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error || !data?.value) {
    return null;
  }

  return String(data.value);
};

export const setAppStateValue = async (key: string, value: string) => {
  const admin = getSupabaseAdmin();
  const updatedAt = new Date().toISOString();

  const { error } = await admin.from(APP_STATE_TABLE).upsert(
    {
      key,
      value,
      updated_at: updatedAt,
    },
    { onConflict: "key" },
  );

  if (error) {
    throw error;
  }
};

export const getAppStateJson = async <T>(
  key: string,
  fallback: T,
): Promise<T> => {
  const rawValue = await getAppStateValue(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

export const setAppStateJson = async <T>(key: string, value: T) =>
  setAppStateValue(key, JSON.stringify(value));

export const listAppStateByPrefix = async (
  prefix: string,
): Promise<AppStateRecord[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(APP_STATE_TABLE)
    .select("key, value, updated_at")
    .ilike("key", `${prefix}%`)
    .order("updated_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => toRecord(row as Record<string, unknown>));
};
