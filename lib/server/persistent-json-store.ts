import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { logServerEvent } from "@/lib/observability";

type PersistentStoreConfig<T> = {
  key: string;
  localFile: string;
  initialState: () => T;
  requireRedisInProduction?: boolean;
};

const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
const isRedisConfigured = Boolean(redisRestUrl && redisRestToken);

const resolveFilePath = (filePath: string) =>
  path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);

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
    throw new Error(body?.error || "Storage persistente non disponibile.");
  }

  return body?.result ?? null;
};

const assertStorageAvailability = (
  key: string,
  requireRedisInProduction: boolean | undefined,
) => {
  if (!isRedisConfigured && process.env.NODE_ENV === "production" && requireRedisInProduction) {
    throw new Error(
      `Persistenza Redis obbligatoria per ${key} in produzione. Configura UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.`,
    );
  }
};

export const createPersistentJsonStore = <T>({
  key,
  localFile,
  initialState,
  requireRedisInProduction = false,
}: PersistentStoreConfig<T>) => {
  let updateQueue: Promise<unknown> = Promise.resolve();

  const readLocalState = async () => {
    const filePath = resolveFilePath(localFile);
    await mkdir(path.dirname(filePath), { recursive: true });

    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      const emptyState = initialState();
      await writeFile(filePath, JSON.stringify(emptyState, null, 2), "utf8");
      return emptyState;
    }
  };

  const writeLocalState = async (state: T) => {
    const filePath = resolveFilePath(localFile);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
  };

  const read = async (): Promise<T> => {
    assertStorageAvailability(key, requireRedisInProduction);

    if (isRedisConfigured) {
      const raw = await redisCommand<string>(["GET", key]);
      if (!raw) {
        return initialState();
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        await redisCommand<number>(["DEL", key]);
        logServerEvent("warn", "persistent_store_corrupted", { key });
        return initialState();
      }
    }

    return readLocalState();
  };

  const write = async (state: T) => {
    assertStorageAvailability(key, requireRedisInProduction);

    if (isRedisConfigured) {
      await redisCommand<string>(["SET", key, JSON.stringify(state)]);
      return;
    }

    await writeLocalState(state);
  };

  const update = async (updater: (state: T) => T | Promise<T>) => {
    const operation = updateQueue.then(async () => {
      const current = await read();
      const next = await updater(current);
      await write(next);
      return next;
    });

    updateQueue = operation.catch(() => undefined);
    return operation;
  };

  const setIfNotExists = async (lockKey: string, ttlSeconds: number) => {
    assertStorageAvailability(lockKey, false);

    if (!isRedisConfigured) {
      return true;
    }

    const result = await redisCommand<string | null>([
      "SET",
      lockKey,
      "1",
      "EX",
      ttlSeconds,
      "NX",
    ]);

    return result === "OK";
  };

  const deleteKey = async (deleteKeyValue: string) => {
    if (!isRedisConfigured) {
      return;
    }

    await redisCommand<number>(["DEL", deleteKeyValue]);
  };

  return {
    read,
    write,
    update,
    setIfNotExists,
    deleteKey,
    isRedisConfigured,
  };
};
