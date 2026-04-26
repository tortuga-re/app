import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { sendTransactionalEmail } from "@/lib/email/smtp";
import type { ProfileUpdateInput } from "@/lib/cooperto/types";
import type { EmailChangeRequestResponse } from "@/lib/profile-email-change/types";
import { normalizeProfileEmail } from "@/lib/profile/validation";

const otpValidityMs = 30 * 60 * 1000;
const maxOtpAttempts = 5;
const resendCooldownMs = 60 * 1000;

type EmailChangeRecord = {
  requestId: string;
  currentEmail: string;
  pendingEmail: string;
  profile: ProfileUpdateInput;
  salt: string;
  codeHash: string;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

type LocalEmailChangeStore = Record<string, EmailChangeRecord>;

const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
const localStoreFile =
  process.env.EMAIL_CHANGE_OTP_STORE_FILE?.trim() ??
  path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".data",
    "email-change-otp.json",
  );

const emailChangeKeyPrefix = "tortuga:email-change:";
const isRedisConfigured = Boolean(redisRestUrl && redisRestToken);

export class EmailChangeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmailChangeError";
    this.status = status;
  }
}

const generateRequestId = () => randomBytes(24).toString("base64url");

const generateOtpCode = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

const hashOtpCode = (code: string, salt: string) =>
  createHash("sha256").update(`${salt}:${code}`).digest("hex");

const buildResponse = (record: EmailChangeRecord): EmailChangeRequestResponse => ({
  requestId: record.requestId,
  pendingEmail: record.pendingEmail,
  expiresAt: new Date(record.expiresAt).toISOString(),
  resendAvailableAt: new Date(record.resendAvailableAt).toISOString(),
  attemptsRemaining: Math.max(maxOtpAttempts - record.attempts, 0),
});

const resolveLocalStoreFile = () =>
  path.isAbsolute(localStoreFile)
    ? localStoreFile
    : path.join(/* turbopackIgnore: true */ process.cwd(), localStoreFile);

const ensurePersistentStore = () => {
  if (isRedisConfigured || process.env.NODE_ENV !== "production") {
    return;
  }

  throw new EmailChangeError(
    "Configura UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN per la verifica email in produzione.",
    500,
  );
};

const readLocalStore = async (): Promise<LocalEmailChangeStore> => {
  const filePath = resolveLocalStoreFile();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as LocalEmailChangeStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    await writeFile(filePath, "{}", "utf8");
    return {};
  }
};

const writeLocalStore = async (store: LocalEmailChangeStore) => {
  const filePath = resolveLocalStoreFile();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
};

const pruneLocalStore = (store: LocalEmailChangeStore) => {
  const now = Date.now();

  for (const [requestId, record] of Object.entries(store)) {
    if (record.expiresAt <= now) {
      delete store[requestId];
    }
  }

  return store;
};

const redisCommand = async <T>(command: Array<string | number>) => {
  ensurePersistentStore();

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
    throw new EmailChangeError(
      body?.error || "Storage OTP non disponibile.",
      500,
    );
  }

  return body?.result ?? null;
};

const getRecordKey = (requestId: string) => `${emailChangeKeyPrefix}${requestId}`;

const getEmailChangeRecord = async (requestId: string) => {
  ensurePersistentStore();

  if (isRedisConfigured) {
    const raw = await redisCommand<string>(["GET", getRecordKey(requestId)]);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as EmailChangeRecord;
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

const saveEmailChangeRecord = async (record: EmailChangeRecord) => {
  ensurePersistentStore();

  const ttlSeconds = Math.max(Math.ceil((record.expiresAt - Date.now()) / 1000), 1);

  if (isRedisConfigured) {
    await redisCommand<string>([
      "SET",
      getRecordKey(record.requestId),
      JSON.stringify(record),
      "EX",
      ttlSeconds,
    ]);
    return;
  }

  const store = pruneLocalStore(await readLocalStore());
  store[record.requestId] = record;
  await writeLocalStore(store);
};

const deleteEmailChangeRecord = async (requestId: string) => {
  ensurePersistentStore();

  if (isRedisConfigured) {
    await redisCommand<number>(["DEL", getRecordKey(requestId)]);
    return;
  }

  const store = pruneLocalStore(await readLocalStore());
  delete store[requestId];
  await writeLocalStore(store);
};

const sendEmailChangeOtp = async (to: string, code: string) => {
  await sendTransactionalEmail({
    to,
    subject: "Codice verifica email Tortuga",
    text: [
      "Il tuo codice Tortuga per verificare la nuova email e:",
      "",
      code,
      "",
      "Il codice resta valido per 30 minuti.",
      "Se non hai richiesto tu questa modifica, ignora questo messaggio.",
    ].join("\n"),
    html: [
      "<p>Il tuo codice Tortuga per verificare la nuova email e:</p>",
      `<p style=\"font-size:28px;letter-spacing:6px;font-weight:700;\">${code}</p>`,
      "<p>Il codice resta valido per 30 minuti.</p>",
      "<p>Se non hai richiesto tu questa modifica, ignora questo messaggio.</p>",
    ].join(""),
  });
};

export const createEmailChangeRequest = async ({
  currentEmail,
  profile,
}: {
  currentEmail: string;
  profile: ProfileUpdateInput;
}) => {
  ensurePersistentStore();

  const normalizedCurrentEmail = normalizeProfileEmail(currentEmail);
  const normalizedPendingEmail = normalizeProfileEmail(profile.email);
  const now = Date.now();
  const requestId = generateRequestId();
  const salt = randomBytes(16).toString("hex");
  const code = generateOtpCode();

  await sendEmailChangeOtp(normalizedPendingEmail, code);

  const record: EmailChangeRecord = {
    requestId,
    currentEmail: normalizedCurrentEmail,
    pendingEmail: normalizedPendingEmail,
    profile: {
      ...profile,
      email: normalizedPendingEmail,
    },
    salt,
    codeHash: hashOtpCode(code, salt),
    expiresAt: now + otpValidityMs,
    resendAvailableAt: now + resendCooldownMs,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await saveEmailChangeRecord(record);
  return buildResponse(record);
};

export const resendEmailChangeCode = async (requestId: string) => {
  ensurePersistentStore();

  const record = await getEmailChangeRecord(requestId);
  if (!record) {
    throw new EmailChangeError("Richiesta verifica non trovata o scaduta.", 404);
  }

  const now = Date.now();
  if (record.resendAvailableAt > now) {
    throw new EmailChangeError("Attendi prima di richiedere un nuovo codice.", 429);
  }

  const code = generateOtpCode();
  const salt = randomBytes(16).toString("hex");

  await sendEmailChangeOtp(record.pendingEmail, code);

  record.salt = salt;
  record.codeHash = hashOtpCode(code, salt);
  record.expiresAt = now + otpValidityMs;
  record.resendAvailableAt = now + resendCooldownMs;
  record.attempts = 0;
  record.updatedAt = now;

  await saveEmailChangeRecord(record);
  return buildResponse(record);
};

export const verifyEmailChangeCode = async ({
  requestId,
  code,
}: {
  requestId: string;
  code: string;
}) => {
  ensurePersistentStore();

  const record = await getEmailChangeRecord(requestId);
  if (!record) {
    throw new EmailChangeError("Richiesta verifica non trovata o scaduta.", 404);
  }

  if (record.expiresAt <= Date.now()) {
    await deleteEmailChangeRecord(requestId);
    throw new EmailChangeError("Codice scaduto. Richiedi un nuovo codice.", 410);
  }

  if (record.attempts >= maxOtpAttempts) {
    await deleteEmailChangeRecord(requestId);
    throw new EmailChangeError("Troppi tentativi. Richiedi un nuovo codice.", 429);
  }

  const receivedHash = hashOtpCode(code, record.salt);
  if (receivedHash !== record.codeHash) {
    record.attempts += 1;
    record.updatedAt = Date.now();

    if (record.attempts >= maxOtpAttempts) {
      await deleteEmailChangeRecord(requestId);
      throw new EmailChangeError("Troppi tentativi. Richiedi un nuovo codice.", 429);
    }

    await saveEmailChangeRecord(record);
    throw new EmailChangeError("Codice non corretto.", 400);
  }

  await deleteEmailChangeRecord(requestId);
  return record;
};
