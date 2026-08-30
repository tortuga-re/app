import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

export type WelcomeChestStart = { email: string; firstName: string; rewardTier: "full" | "basic" };
const cookieName = "tortuga_welcome_chest";
const secret = () => process.env.CUSTOMER_SESSION_SECRET?.trim() || process.env.COOPERTO_API_KEY?.trim() || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export const readWelcomeChestStart = (request: NextRequest): WelcomeChestStart | null => {
  const raw = request.cookies.get(cookieName)?.value;
  if (!raw || !secret()) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try { const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WelcomeChestStart; return value.email && value.firstName && (value.rewardTier === "full" || value.rewardTier === "basic") ? value : null; } catch { return null; }
};

export const attachWelcomeChestStart = (response: NextResponse, value: WelcomeChestStart) => {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  response.cookies.set(cookieName, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 2 });
  return response;
};
