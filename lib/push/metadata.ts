import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const cleanUserAgent = (value?: string) => value?.trim() ?? "";

export const getVapidKeyVersion = (publicKey?: string) => {
  const normalized = publicKey?.trim() ?? "";
  if (!normalized) return "";
  return createHash("sha256").update(normalized).digest("hex").slice(0, 12);
};

export const getCurrentVapidKeyVersion = () =>
  getVapidKeyVersion(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export const getEndpointFingerprint = (endpoint: string) =>
  createHash("sha256").update(endpoint).digest("hex").slice(0, 12);

const getTrackingSecret = () =>
  process.env.VAPID_PRIVATE_KEY?.trim() ||
  process.env.CUSTOMER_SESSION_SECRET?.trim() ||
  "";

export const createPushTrackingToken = (
  deliveryId: string,
  endpointFingerprint: string,
) => {
  const secret = getTrackingSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${deliveryId}:${endpointFingerprint}`)
    .digest("base64url");
};

export const verifyPushTrackingToken = (
  deliveryId: string,
  endpointFingerprint: string,
  token: string,
) => {
  const expected = createPushTrackingToken(deliveryId, endpointFingerprint);
  if (!expected || !token) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(token);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

export const describePushDevice = (userAgent?: string) => {
  const value = cleanUserAgent(userAgent);

  const platform = /iPhone|iPad|iPod/i.test(value)
    ? "iPhone / iPad"
    : /Android/i.test(value)
      ? "Android"
      : /Windows/i.test(value)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(value)
          ? "macOS"
          : /Linux/i.test(value)
            ? "Linux"
            : "Dispositivo sconosciuto";

  const browser = /CriOS/i.test(value)
    ? "Chrome iOS"
    : /FxiOS/i.test(value)
      ? "Firefox iOS"
      : /EdgiOS/i.test(value)
        ? "Edge iOS"
        : /OPiOS/i.test(value)
          ? "Opera iOS"
          : /Edg\//i.test(value)
            ? "Edge"
            : /OPR\//i.test(value)
              ? "Opera"
              : /Chrome\//i.test(value)
                ? "Chrome"
                : /Firefox\//i.test(value)
                  ? "Firefox"
                  : /Safari\//i.test(value)
                    ? "Safari"
                    : "Browser sconosciuto";

  return {
    browser,
    platform,
    isIos: platform === "iPhone / iPad",
  };
};
