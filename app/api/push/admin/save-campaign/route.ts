import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { savePushCampaign } from "@/lib/push/library";
import type { PushAudienceSegment } from "@/lib/push/types";
import {
  expectEnum,
  expectOptionalString,
  expectString,
  readJsonBody,
  RequestValidationError,
} from "@/lib/validation/request";

const allowedSegments = [
  "all",
  "venue_present",
  "installed_app",
  "identified_customers",
  "recent_visitors_30d",
  "birthday_soon_14d",
  "vip_inactive_60d",
  "specific_email",
] as const satisfies readonly PushAudienceSegment[];

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const payload = await readJsonBody<{
      id?: string;
      name?: string;
      title?: string;
      body?: string;
      url?: string;
      segment?: PushAudienceSegment;
      email?: string;
    }>(request);

    const segment = expectEnum(payload.segment ?? "all", "Segmento", allowedSegments);
    const saved = await savePushCampaign({
      id: expectOptionalString(payload.id, "ID campagna", { maxLength: 80 }) || undefined,
      name: expectString(payload.name, "Nome campagna", { minLength: 2, maxLength: 60 }),
      title: expectString(payload.title, "Titolo", { minLength: 2, maxLength: 80 }),
      body: expectString(payload.body, "Messaggio", { minLength: 2, maxLength: 240 }),
      url:
        expectOptionalString(payload.url, "URL", {
          maxLength: 120,
        }) || "/ciurma",
      segment,
      email:
        segment === "specific_email"
          ? expectString(payload.email, "Email segmento", {
              minLength: 5,
              maxLength: 120,
            }).toLowerCase()
          : expectOptionalString(payload.email, "Email segmento", {
              maxLength: 120,
            })?.toLowerCase(),
    });

    return NextResponse.json({ success: true, campaign: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RequestValidationError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Campagna non valida.",
      },
      { status: error instanceof RequestValidationError ? error.status : 400 },
    );
  }
}
