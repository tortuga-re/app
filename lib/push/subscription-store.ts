import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pwaConfig } from "@/lib/config";
import type {
  SavePushSubscriptionInput,
  StoredPushSubscription,
} from "@/lib/push/types";

const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
const redisSubscriptionsKey = "tortuga:push-subscriptions";
const isRedisConfigured = Boolean(redisRestUrl && redisRestToken);

const DEFAULT_SUBSCRIPTIONS_PATH = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  ".data",
  "push-subscriptions.json",
);

const resolveSubscriptionsFile = () => {
  if (!pwaConfig.pushSubscriptionsFile) {
    return DEFAULT_SUBSCRIPTIONS_PATH;
  }

  return path.isAbsolute(pwaConfig.pushSubscriptionsFile)
    ? pwaConfig.pushSubscriptionsFile
    : path.join(
        /* turbopackIgnore: true */ process.cwd(),
        pwaConfig.pushSubscriptionsFile,
      );
};

const ensureSubscriptionsFile = async () => {
  const filePath = resolveSubscriptionsFile();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }

  return filePath;
};

const redisCommand = async <T>(command: Array<string | number>) => {
  const response = await fetch(redisRestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisRestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | { result?: T; error?: string }
    | null;

  if (!response.ok || body?.error) {
    throw new Error(body?.error || "Storage push non disponibile.");
  }

  return body?.result ?? null;
};

export const listPushSubscriptions = async (): Promise<StoredPushSubscription[]> => {
  if (isRedisConfigured) {
    const raw = await redisCommand<string>(["GET", redisSubscriptionsKey]);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as StoredPushSubscription[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      await redisCommand<string>(["SET", redisSubscriptionsKey, "[]"]);
      return [];
    }
  }

  const filePath = await ensureSubscriptionsFile();

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredPushSubscription[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePushSubscriptions = async (records: StoredPushSubscription[]) => {
  if (isRedisConfigured) {
    await redisCommand<string>([
      "SET",
      redisSubscriptionsKey,
      JSON.stringify(records),
    ]);
    return;
  }

  const filePath = await ensureSubscriptionsFile();
  await writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
};

export const savePushSubscription = async (
  input: SavePushSubscriptionInput,
): Promise<{ record: StoredPushSubscription; isNew: boolean }> => {
  const records = await listPushSubscriptions();
  const now = new Date().toISOString();

  const nextRecord: StoredPushSubscription = {
    endpoint: input.subscription.endpoint,
    expirationTime: input.subscription.expirationTime ?? null,
    keys: {
      auth: input.subscription.keys?.auth ?? "",
      p256dh: input.subscription.keys?.p256dh ?? "",
    },
    email: input.email?.trim().toLowerCase() || undefined,
    permission: input.permission,
    userAgent: input.userAgent?.trim() || undefined,
    installed: Boolean(input.installed),
    venueAccessExpiresAt: input.venueAccessExpiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const existingIndex = records.findIndex(
    (record) => record.endpoint === nextRecord.endpoint,
  );

  const isNew = existingIndex < 0;

  if (existingIndex >= 0) {
    const existingRecord = records[existingIndex];
    records[existingIndex] = {
      ...existingRecord,
      ...nextRecord,
      createdAt: existingRecord.createdAt,
      updatedAt: now,
    };
  } else {
    records.push(nextRecord);
  }

  await writePushSubscriptions(records);

  return { 
    record: isNew ? nextRecord : records[existingIndex], 
    isNew 
  };
};
export const deletePushSubscription = async (endpoint: string) => {
  const normalizedEndpoint = endpoint.trim();

  if (!normalizedEndpoint) {
    return false;
  }

  const records = await listPushSubscriptions();
  const nextRecords = records.filter(
    (record) => record.endpoint !== normalizedEndpoint,
  );

  if (nextRecords.length === records.length) {
    return false;
  }

  await writePushSubscriptions(nextRecords);
  return true;
};

// --- Gestione Visite per Cron Sondaggio ---

const redisVisitsKey = (dateIso: string) => `tortuga:visits:${dateIso}`;

export interface StoredVisit {
  contactCode: string;
  email?: string;
  timestamp: string;
  surveySent: boolean;
}

export const saveVisitToStorage = async (contactCode: string, email?: string) => {
  if (!isRedisConfigured) return;

  const today = new Date().toISOString().split("T")[0];
  const key = redisVisitsKey(today);

  try {
    const raw = await redisCommand<string>(["GET", key]);
    const visits: StoredVisit[] = raw ? (JSON.parse(raw) as StoredVisit[]) : [];

    if (!visits.find((v) => v.contactCode === contactCode)) {
      visits.push({
        contactCode,
        email: email?.trim().toLowerCase(),
        timestamp: new Date().toISOString(),
        surveySent: false,
      });
      await redisCommand<string>(["SET", key, JSON.stringify(visits)]);
      // Scadenza dopo 7 giorni per pulizia
      await redisCommand<string>(["EXPIRE", key, 60 * 60 * 24 * 7]);
    }
  } catch (err) {
    console.error("[Visit Storage] Errore salvataggio visita:", err);
  }
};

export const listVisitsForDate = async (dateIso: string): Promise<StoredVisit[]> => {
  if (!isRedisConfigured) return [];
  try {
    const raw = await redisCommand<string>(["GET", redisVisitsKey(dateIso)]);
    return raw ? (JSON.parse(raw) as StoredVisit[]) : [];
  } catch {
    return [];
  }
};

export const updateVisitSurveyStatus = async (
  dateIso: string,
  contactCode: string,
) => {
  if (!isRedisConfigured) return;
  const key = redisVisitsKey(dateIso);
  try {
    const raw = await redisCommand<string>(["GET", key]);
    if (!raw) return;

    const visits: StoredVisit[] = JSON.parse(raw) as StoredVisit[];
    const index = visits.findIndex((v) => v.contactCode === contactCode);
    if (index >= 0) {
      visits[index].surveySent = true;
      await redisCommand<string>(["SET", key, JSON.stringify(visits)]);
    }
  } catch (err) {
    console.error("[Visit Storage] Errore update status:", err);
  }
};
