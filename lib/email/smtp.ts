import "server-only";

import nodemailer from "nodemailer";

type TransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const parseSmtpSecure = (value?: string) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT?.trim() ?? "");
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const from = process.env.SMTP_FROM?.trim() ?? "";
  const secureValue = process.env.SMTP_SECURE?.trim() ?? "";

  if (!host || !port || Number.isNaN(port) || !user || !pass || !from || !secureValue) {
    throw new Error("Configurazione SMTP incompleta.");
  }

  return {
    host,
    port,
    secure: parseSmtpSecure(secureValue),
    auth: {
      user,
      pass,
    },
    from,
  };
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
}: TransactionalEmailInput) => {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });
};
