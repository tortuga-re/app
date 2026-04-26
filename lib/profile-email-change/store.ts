import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

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

declare global {
  var __tortugaEmailChangeStore: Map<string, EmailChangeRecord> | undefined;
}

const store = globalThis.__tortugaEmailChangeStore ?? new Map<string, EmailChangeRecord>();
globalThis.__tortugaEmailChangeStore = store;

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

const pruneExpiredRecords = () => {
  const now = Date.now();

  for (const [requestId, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(requestId);
    }
  }
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
  pruneExpiredRecords();

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

  store.set(requestId, record);
  return buildResponse(record);
};

export const resendEmailChangeCode = async (requestId: string) => {
  pruneExpiredRecords();

  const record = store.get(requestId);
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

  store.set(requestId, record);
  return buildResponse(record);
};

export const verifyEmailChangeCode = ({
  requestId,
  code,
}: {
  requestId: string;
  code: string;
}) => {
  pruneExpiredRecords();

  const record = store.get(requestId);
  if (!record) {
    throw new EmailChangeError("Richiesta verifica non trovata o scaduta.", 404);
  }

  if (record.expiresAt <= Date.now()) {
    store.delete(requestId);
    throw new EmailChangeError("Codice scaduto. Richiedi un nuovo codice.", 410);
  }

  if (record.attempts >= maxOtpAttempts) {
    store.delete(requestId);
    throw new EmailChangeError("Troppi tentativi. Richiedi un nuovo codice.", 429);
  }

  const receivedHash = hashOtpCode(code, record.salt);
  if (receivedHash !== record.codeHash) {
    record.attempts += 1;
    record.updatedAt = Date.now();
    store.set(requestId, record);

    if (record.attempts >= maxOtpAttempts) {
      store.delete(requestId);
      throw new EmailChangeError("Troppi tentativi. Richiedi un nuovo codice.", 429);
    }

    throw new EmailChangeError("Codice non corretto.", 400);
  }

  store.delete(requestId);
  return record;
};
