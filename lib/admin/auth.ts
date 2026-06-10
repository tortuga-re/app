import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { RequestValidationError } from "@/lib/validation/request";

export type AdminRole = "captain" | "staff";

export type AdminSession = {
  role: AdminRole;
  label: string;
  issuedAt: number;
  nonce: string;
};

export const adminSessionCookieName = "tortuga_admin_session";
const adminSessionMaxAgeSeconds = 60 * 60 * 8;

const ADMIN_ROLE_RANK: Record<AdminRole, number> = {
  staff: 1,
  captain: 2,
};

const cleanText = (value?: string) => value?.trim() ?? "";

const getAdminSessionSecret = () =>
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  process.env.CUSTOMER_SESSION_SECRET?.trim() ||
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "tortuga-local-admin-session-secret");

const getCaptainPin = () =>
  process.env.TORTUGA_ADMIN_PIN?.trim() ||
  process.env.MATCH_DRINK_ADMIN_PIN?.trim() ||
  "2809";

const base64UrlEncode = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const signPayload = (payload: string) =>
  createHmac("sha256", getAdminSessionSecret()).update(payload).digest("base64url");

const isSignatureValid = (payload: string, signature: string) => {
  const expected = signPayload(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

export const getAdminRoleLabel = (role: AdminRole) =>
  role === "captain" ? "Capitano" : "Staff";

export const hasAdminRole = (
  session: Pick<AdminSession, "role"> | null | undefined,
  requiredRole: AdminRole = "staff",
) => {
  if (!session) {
    return false;
  }

  return ADMIN_ROLE_RANK[session.role] >= ADMIN_ROLE_RANK[requiredRole];
};

export const createAdminSessionFromPin = (pin: string): AdminSession => {
  if (cleanText(pin) !== getCaptainPin()) {
    throw new RequestValidationError("PIN admin non valido.", 401);
  }

  return {
    role: "captain",
    label: getAdminRoleLabel("captain"),
    issuedAt: Date.now(),
    nonce: randomBytes(8).toString("base64url"),
  };
};

export const encodeAdminSession = (session: AdminSession) => {
  const secret = getAdminSessionSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET non configurato.");
  }

  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${signPayload(payload)}`;
};

export const decodeAdminSession = (rawValue?: string): AdminSession | null => {
  const secret = getAdminSessionSecret();
  const raw = cleanText(rawValue);

  if (!secret || !raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");

  if (!payload || !signature || !isSignatureValid(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<AdminSession>;

    if (!parsed.role || !["captain", "staff"].includes(parsed.role)) {
      return null;
    }

    return {
      role: parsed.role,
      label: cleanText(parsed.label) || getAdminRoleLabel(parsed.role),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      nonce: cleanText(parsed.nonce) || randomBytes(8).toString("base64url"),
    };
  } catch {
    return null;
  }
};

export const getAdminSession = (request: NextRequest | Request) => {
  if ("cookies" in request) {
    return decodeAdminSession(
      request.cookies.get(adminSessionCookieName)?.value,
    );
  }

  return null;
};

export const attachAdminSessionCookie = (
  response: NextResponse,
  session: AdminSession,
) => {
  response.cookies.set(adminSessionCookieName, encodeAdminSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAgeSeconds,
  });

  return response;
};

export const clearAdminSessionCookie = (response: NextResponse) => {
  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
};
