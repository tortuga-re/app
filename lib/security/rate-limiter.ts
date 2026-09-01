import { NextRequest } from "next/server";

type RateLimitRecord = {
  failedAttempts: number;
  blockedUntil: number;
};

const attemptsMap = new Map<string, RateLimitRecord>();

// Pulizia automatica in background delle voci scadute
if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsMap.entries()) {
      if (record.blockedUntil > 0 && record.blockedUntil <= now) {
        attemptsMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export const getClientIp = (request: Request | NextRequest): string => {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
};

export const checkRateLimit = (
  ip: string,
  actionKey = "admin_auth",
  maxAttempts = 5,
  lockoutMs = 15 * 60 * 1000,
) => {
  const key = `${actionKey}:${ip}`;
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (record && record.blockedUntil > now) {
    const remainingMs = record.blockedUntil - now;
    const retryAfterSeconds = Math.ceil(remainingMs / 1000);
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      retryAfterMinutes,
      error: `Troppi tentativi errati consecutivi. Questo IP è bloccato per i prossimi ${retryAfterMinutes} minuti.`,
    };
  }

  const failedAttempts = record ? record.failedAttempts : 0;
  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - failedAttempts),
    retryAfterSeconds: 0,
    retryAfterMinutes: 0,
    error: null,
  };
};

export const recordFailedAttempt = (
  ip: string,
  actionKey = "admin_auth",
  maxAttempts = 5,
  lockoutMs = 15 * 60 * 1000,
) => {
  const key = `${actionKey}:${ip}`;
  const now = Date.now();
  const record = attemptsMap.get(key) || { failedAttempts: 0, blockedUntil: 0 };

  if (record.blockedUntil > 0 && record.blockedUntil <= now) {
    record.failedAttempts = 0;
    record.blockedUntil = 0;
  }

  record.failedAttempts += 1;

  if (record.failedAttempts >= maxAttempts) {
    record.blockedUntil = now + lockoutMs;
  }

  attemptsMap.set(key, record);
  return record;
};

export const resetFailedAttempts = (ip: string, actionKey = "admin_auth") => {
  const key = `${actionKey}:${ip}`;
  attemptsMap.delete(key);
};
