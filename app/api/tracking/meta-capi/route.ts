import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { analyticsConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const hashSha256 = (value?: string) => {
  const clean = value?.trim().toLowerCase();
  if (!clean) return undefined;
  return createHash("sha256").update(clean).digest("hex");
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    eventName?: string;
    eventTime?: number;
    eventSourceUrl?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    eventId?: string;
    customData?: Record<string, unknown>;
  } | null;

  const eventName = body?.eventName?.trim() ?? "PageView";
  const pixelId = analyticsConfig.metaPixelId;
  const token = analyticsConfig.metaCapiToken;

  if (!pixelId || !token) {
    return NextResponse.json({ skipped: true, reason: "Missing pixel or token" });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  const userData: Record<string, unknown> = {
    client_ip_address: clientIp,
    client_user_agent: userAgent,
  };

  if (body?.email) userData.em = [hashSha256(body.email)];
  if (body?.phone) userData.ph = [hashSha256(body.phone)];
  if (body?.firstName) userData.fn = [hashSha256(body.firstName)];
  if (body?.lastName) userData.ln = [hashSha256(body.lastName)];

  const eventData = {
    event_name: eventName,
    event_time: body?.eventTime || Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: body?.eventSourceUrl || request.headers.get("referer") || "https://app.tortugabay.it",
    event_id: body?.eventId || undefined,
    user_data: userData,
    custom_data: body?.customData || undefined,
  };

  try {
    const metaUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`;
    const response = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventData] }),
    });

    const result = await response.json().catch(() => null);
    return NextResponse.json({ success: response.ok, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
