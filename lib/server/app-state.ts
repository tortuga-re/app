import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export type AppStateRecord = {
  key: string;
  value: string;
  updatedAt: string | null;
};

const APP_STATE_TABLE = "app_state";
const LOCAL_STORAGE_FILE = path.join(process.cwd(), "lib", "server", "local-app-state.json");

function readLocalAppStateFile(): Record<string, string> {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("[AppState] Errore lettura file locale:", err);
  }
  return {};
}

function writeLocalAppStateFile(data: Record<string, string>) {
  try {
    const dir = path.dirname(LOCAL_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[AppState] Errore scrittura file locale:", err);
  }
}

const toRecord = (row: Record<string, unknown>): AppStateRecord => ({
  key: String(row.key ?? ""),
  value: String(row.value ?? ""),
  updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
});

export const getAppStateValue = async (key: string): Promise<string | null> => {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from(APP_STATE_TABLE)
      .select("key, value, updated_at")
      .eq("key", key)
      .maybeSingle();

    if (!error && data?.value) {
      return String(data.value);
    }
  } catch {
    // Fallback su file locale
  }

  const localData = readLocalAppStateFile();
  return localData[key] ?? null;
};

export const setAppStateValue = async (key: string, value: string) => {
  const updatedAt = new Date().toISOString();

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from(APP_STATE_TABLE).upsert(
      {
        key,
        value,
        updated_at: updatedAt,
      },
      { onConflict: "key" },
    );

    if (error) {
      console.warn(`[AppState] Supabase state write warning per '${key}':`, error.message);
    }
  } catch (err) {
    console.warn(`[AppState] Supabase client error per '${key}':`, err);
  }

  // Aggiorna sempre il file di fallback locale per garantire il funzionamento su localhost
  const localData = readLocalAppStateFile();
  localData[key] = value;
  writeLocalAppStateFile(localData);
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
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from(APP_STATE_TABLE)
      .select("key, value, updated_at")
      .ilike("key", `${prefix}%`)
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row) => toRecord(row as Record<string, unknown>));
    }
  } catch {
    // Fallback locale
  }

  const localData = readLocalAppStateFile();
  const matched: AppStateRecord[] = [];
  for (const [key, value] of Object.entries(localData)) {
    if (key.startsWith(prefix)) {
      matched.push({ key, value, updatedAt: new Date().toISOString() });
    }
  }
  return matched;
};
