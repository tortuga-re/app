import "server-only";

import path from "node:path";

import { sendTransactionalEmail } from "@/lib/email/smtp";
import type { ProfileUpdateInput } from "@/lib/cooperto/types";
import type { EmailChangeRequestResponse } from "@/lib/profile-email-change/types";
import { normalizeProfileEmail } from "@/lib/profile/validation";
import { createOtpStore, OtpError } from "@/lib/otp/store";

type EmailChangePayload = {
  currentEmail: string;
  pendingEmail: string;
  profile: ProfileUpdateInput;
};

export class EmailChangeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmailChangeError";
    this.status = status;
  }
}

const mapOtpError = (error: unknown): never => {
  if (error instanceof OtpError) {
    throw new EmailChangeError(error.message, error.status);
  }
  throw error;
};

const store = createOtpStore<EmailChangePayload>({
  redisUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
  localStoreFile:
    process.env.EMAIL_CHANGE_OTP_STORE_FILE?.trim() ??
    path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "email-change-otp.json"),
  keyPrefix: "tortuga:email-change:",
});

const buildResponse = (record: import("@/lib/otp/store").BaseOtpRecord<EmailChangePayload>): EmailChangeRequestResponse => ({
  requestId: record.requestId,
  pendingEmail: record.payload.pendingEmail,
  expiresAt: new Date(record.expiresAt).toISOString(),
  resendAvailableAt: new Date(record.resendAvailableAt).toISOString(),
  attemptsRemaining: Math.max(store.maxOtpAttempts - record.attempts, 0),
});

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
      `<p style="font-size:28px;letter-spacing:6px;font-weight:700;">${code}</p>`,
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
  try {
    const normalizedCurrentEmail = normalizeProfileEmail(currentEmail);
    const normalizedPendingEmail = normalizeProfileEmail(profile.email);

    const { record, code } = await store.create({
      currentEmail: normalizedCurrentEmail,
      pendingEmail: normalizedPendingEmail,
      profile: {
        ...profile,
        email: normalizedPendingEmail,
      },
    });

    await sendEmailChangeOtp(normalizedPendingEmail, code);
    return buildResponse(record);
  } catch (error) {
    return mapOtpError(error);
  }
};

export const resendEmailChangeCode = async (requestId: string) => {
  try {
    const { record, code } = await store.resend(requestId);
    await sendEmailChangeOtp(record.payload.pendingEmail, code);
    return buildResponse(record);
  } catch (error) {
    return mapOtpError(error);
  }
};

export const verifyEmailChangeCode = async ({
  requestId,
  code,
}: {
  requestId: string;
  code: string;
}) => {
  try {
    const record = await store.verify(requestId, code);
    return {
      ...record,
      ...record.payload, // Spread payload for compatibility with existing code
    };
  } catch (error) {
    return mapOtpError(error);
  }
};

