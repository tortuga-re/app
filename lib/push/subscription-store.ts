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
): Promise<StoredPushSubscription> => {
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
    createdAt: now,
    updatedAt: now,
  };

  const existingIndex = records.findIndex(
    (record) => record.endpoint === nextRecord.endpoint,
  );

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

  return existingIndex >= 0 ? records[existingIndex] : nextRecord;
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
