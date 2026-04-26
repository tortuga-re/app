import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import type { CustomerSessionIdentity } from "@/lib/session/types";

export const customerSessionCookieName = "tortuga_customer_session";
export const customerSessionMaxAgeSeconds = 60 * 60 * 24 * 90;

const cleanText = (value?: string) => value?.trim() ?? "";
const normalizeEmail = (value?: string) => cleanText(value).toLowerCase();
const isValidEmail = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const base64UrlEncode = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const getSessionSecret = () =>
  process.env.CUSTOMER_SESSION_SECRET?.trim() ||
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  process.env.COOPERTO_API_KEY?.trim() ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "tortuga-local-customer-session-secret");

const signPayload = (payload: string) =>
  createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");

const isSignatureValid = (payload: string, signature: string) => {
  const expected = signPayload(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

export const normalizeCustomerSessionIdentity = (
  value: Partial<CustomerSessionIdentity>,
): CustomerSessionIdentity | null => {
  const email = normalizeEmail(value.email);

  if (!isValidEmail(email)) {
    return null;
  }

  return {
    email,
    firstName: cleanText(value.firstName),
    lastName: cleanText(value.lastName),
    phone: cleanText(value.phone),
    marketingConsent:
      typeof value.marketingConsent === "boolean"
        ? value.marketingConsent
        : undefined,
  };
};

export const encodeCustomerSession = (identity: CustomerSessionIdentity) => {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET non configurato.");
  }

  const payload = base64UrlEncode(
    JSON.stringify({
      ...identity,
      issuedAt: Date.now(),
      nonce: randomBytes(8).toString("base64url"),
    }),
  );

  return `${payload}.${signPayload(payload)}`;
};

export const decodeCustomerSession = (
  rawValue?: string,
): CustomerSessionIdentity | null => {
  const secret = getSessionSecret();
  const raw = rawValue?.trim() ?? "";

  if (!secret || !raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");

  if (!payload || !signature || !isSignatureValid(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<CustomerSessionIdentity>;
    return normalizeCustomerSessionIdentity(parsed);
  } catch {
    return null;
  }
};

export const getCustomerSession = (request: NextRequest) =>
  decodeCustomerSession(request.cookies.get(customerSessionCookieName)?.value);

export const attachCustomerSessionCookie = (
  response: NextResponse,
  identity: CustomerSessionIdentity,
) => {
  response.cookies.set(customerSessionCookieName, encodeCustomerSession(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: customerSessionMaxAgeSeconds,
  });

  return response;
};

export const clearCustomerSessionCookie = (response: NextResponse) => {
  response.cookies.set(customerSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
};
