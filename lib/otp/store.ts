import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const otpValidityMs = 30 * 60 * 1000;
const maxOtpAttempts = 5;
const resendCooldownMs = 60 * 1000;

export type BaseOtpRecord<T> = {
  requestId: string;
  payload: T;
  salt: string;
  codeHash: string;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

export class OtpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OtpError";
    this.status = status;
  }
}

export const generateRequestId = () => randomBytes(24).toString("base64url");
export const generateOtpCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
export const hashOtpCode = (code: string, salt: string) => createHash("sha256").update(`${salt}:${code}`).digest("hex");

export const createOtpStore = <T>(config: {
  redisUrl: string;
  redisToken: string;
  localStoreFile: string;
  keyPrefix: string;
}) => {
  const isRedisConfigured = Boolean(config.redisUrl && config.redisToken);

  const resolveLocalStoreFile = () =>
    path.isAbsolute(config.localStoreFile)
      ? config.localStoreFile
      : path.join(/* turbopackIgnore: true */ process.cwd(), config.localStoreFile);

  const ensurePersistentStore = () => {
    if (!isRedisConfigured && process.env.NODE_ENV === "production") {
      console.warn("ATTENZIONE: UPSTASH_REDIS_REST_URL non configurato in produzione. Verrà usato il file system locale per gli OTP.");
    }
  };

  type StoreType = Record<string, BaseOtpRecord<T>>;

  const readLocalStore = async (): Promise<StoreType> => {
    const filePath = resolveLocalStoreFile();
    await mkdir(path.dirname(filePath), { recursive: true });
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreType;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      await writeFile(filePath, "{}", "utf8");
      return {};
    }
  };

  const writeLocalStore = async (store: StoreType) => {
    const filePath = resolveLocalStoreFile();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
  };

  const pruneLocalStore = (store: StoreType) => {
    const now = Date.now();
    for (const [requestId, record] of Object.entries(store)) {
      if (record.expiresAt <= now) {
        delete store[requestId];
      }
    }
    return store;
  };

  const redisCommand = async <R>(command: Array<string | number>) => {
    ensurePersistentStore();
    const response = await fetch(config.redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as { result?: R; error?: string } | null;
    if (!response.ok || body?.error) {
      throw new OtpError(body?.error || "Storage OTP non disponibile.", 500);
    }
    return body?.result ?? null;
  };

  const getRecordKey = (requestId: string) => `${config.keyPrefix}${requestId}`;

  const getRecord = async (requestId: string): Promise<BaseOtpRecord<T> | null> => {
    ensurePersistentStore();
    if (isRedisConfigured) {
      const raw = await redisCommand<string>(["GET", getRecordKey(requestId)]);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as BaseOtpRecord<T>;
      } catch {
        await redisCommand<number>(["DEL", getRecordKey(requestId)]);
        return null;
      }
    }
    const store = pruneLocalStore(await readLocalStore());
    const record = store[requestId] ?? null;
    await writeLocalStore(store);
    return record;
  };

  const saveRecord = async (record: BaseOtpRecord<T>) => {
    ensurePersistentStore();
    const ttlSeconds = Math.max(Math.ceil((record.expiresAt - Date.now()) / 1000), 1);
    if (isRedisConfigured) {
      await redisCommand<string>(["SET", getRecordKey(record.requestId), JSON.stringify(record), "EX", ttlSeconds]);
      return;
    }
    const store = pruneLocalStore(await readLocalStore());
    store[record.requestId] = record;
    await writeLocalStore(store);
  };

  const deleteRecord = async (requestId: string) => {
    ensurePersistentStore();
    if (isRedisConfigured) {
      await redisCommand<number>(["DEL", getRecordKey(requestId)]);
      return;
    }
    const store = pruneLocalStore(await readLocalStore());
    delete store[requestId];
    await writeLocalStore(store);
  };

  const verify = async (requestId: string, code: string): Promise<BaseOtpRecord<T>> => {
    const record = await getRecord(requestId);
    if (!record) throw new OtpError("Richiesta verifica non trovata o scaduta.", 404);
    if (record.expiresAt <= Date.now()) {
      await deleteRecord(requestId);
      throw new OtpError("Codice scaduto. Richiedi un nuovo codice.", 410);
    }
    if (record.attempts >= maxOtpAttempts) {
      await deleteRecord(requestId);
      throw new OtpError("Troppi tentativi. Richiedi un nuovo codice.", 429);
    }
    const receivedHash = hashOtpCode(code, record.salt);
    if (receivedHash !== record.codeHash) {
      record.attempts += 1;
      record.updatedAt = Date.now();
      if (record.attempts >= maxOtpAttempts) {
        await deleteRecord(requestId);
        throw new OtpError("Troppi tentativi. Richiedi un nuovo codice.", 429);
      }
      await saveRecord(record);
      throw new OtpError("Codice non corretto.", 400);
    }
    await deleteRecord(requestId);
    return record;
  };

  const resend = async (requestId: string): Promise<{ record: BaseOtpRecord<T>; code: string }> => {
    const record = await getRecord(requestId);
    if (!record) throw new OtpError("Richiesta verifica non trovata o scaduta.", 404);
    const now = Date.now();
    if (record.resendAvailableAt > now) throw new OtpError("Attendi prima di richiedere un nuovo codice.", 429);
    
    const code = generateOtpCode();
    const salt = randomBytes(16).toString("hex");
    
    record.salt = salt;
    record.codeHash = hashOtpCode(code, salt);
    record.expiresAt = now + otpValidityMs;
    record.resendAvailableAt = now + resendCooldownMs;
    record.attempts = 0;
    record.updatedAt = now;
    
    await saveRecord(record);
    return { record, code };
  };

  const create = async (payload: T): Promise<{ record: BaseOtpRecord<T>; code: string }> => {
    const now = Date.now();
    const requestId = generateRequestId();
    const salt = randomBytes(16).toString("hex");
    const code = generateOtpCode();
    
    const record: BaseOtpRecord<T> = {
      requestId,
      payload,
      salt,
      codeHash: hashOtpCode(code, salt),
      expiresAt: now + otpValidityMs,
      resendAvailableAt: now + resendCooldownMs,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    await saveRecord(record);
    return { record, code };
  };

  return {
    getRecord,
    saveRecord,
    deleteRecord,
    verify,
    resend,
    create,
    maxOtpAttempts,
  };
};
