import "server-only";

import path from "node:path";
import { createOtpStore } from "@/lib/otp/store";
import { sendTransactionalEmail } from "@/lib/email/smtp";

export type LoginOtpPayload = {
  email: string;
};

export const loginOtpStore = createOtpStore<LoginOtpPayload>({
  redisUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
  localStoreFile:
    process.env.LOGIN_OTP_STORE_FILE?.trim() ??
    path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "login-otp.json"),
  keyPrefix: "tortuga:login-otp:",
});

export const sendLoginOtpEmail = async (to: string, code: string) => {
  await sendTransactionalEmail({
    to,
    subject: "Codice di accesso Tortuga",
    text: [
      "Benvenuto a bordo!",
      "",
      "Il tuo codice segreto per entrare nella ciurma e':",
      "",
      code,
      "",
      "Il codice scade tra 30 minuti.",
      "Se non hai richiesto questo accesso, ignora semplicemente questa email.",
    ].join("\n"),
    html: [
      "<p>Benvenuto a bordo!</p>",
      "<p>Il tuo codice segreto per entrare nella ciurma e':</p>",
      `<p style="font-size:28px;letter-spacing:6px;font-weight:700;">${code}</p>`,
      "<p>Il codice scade tra 30 minuti.</p>",
      "<p>Se non hai richiesto questo accesso, ignora semplicemente questa email.</p>",
    ].join(""),
  });
};
