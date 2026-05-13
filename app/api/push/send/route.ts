import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { logServerEvent, measureServerOperation } from "@/lib/observability";
import { sendPushNotification } from "@/lib/push/send";
import type { PushAudienceSegment, PushSendPayload } from "@/lib/push/types";
import {
  expectEnum,
  expectOptionalString,
  expectString,
  readJsonBody,
  RequestValidationError,
} from "@/lib/validation/request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const payload = await readJsonBody<Partial<PushSendPayload>>(request);
    const segment = expectEnum(
      payload.segment ?? "all",
      "Segmento push",
      allowedSegments,
    );
    const response = await measureServerOperation(
      "admin_push_send",
      async () =>
        sendPushNotification({
          title: expectString(payload.title, "Titolo notifica", {
            minLength: 2,
            maxLength: 80,
          }),
          body: expectString(payload.body, "Testo notifica", {
            minLength: 2,
            maxLength: 240,
          }),
          url:
            expectOptionalString(payload.url, "URL destinazione", {
              maxLength: 120,
            }) || "/ciurma",
          tag:
            expectOptionalString(payload.tag, "Tag notifica", {
              maxLength: 60,
            }) || "tortuga-update",
          email:
            segment === "specific_email"
              ? expectString(payload.email, "Email destinatario", {
                  minLength: 5,
                  maxLength: 120,
                }).toLowerCase()
              : expectOptionalString(payload.email, "Email destinatario", {
                  maxLength: 120,
                })?.toLowerCase(),
          icon: expectOptionalString(payload.icon, "Icona", { maxLength: 120 }),
          badge: expectOptionalString(payload.badge, "Badge", { maxLength: 120 }),
          renotify: Boolean(payload.renotify),
          onlyVenuePresent: segment === "venue_present",
          segment,
        }),
      {
        adminRole: adminRequest.session.role,
        segment,
      },
    );

    logServerEvent("info", "admin_push_send_completed", {
      adminRole: adminRequest.session.role,
      segment,
      sent: response.sent,
      failed: response.failed,
      removed: response.removed,
      total: response.total,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RequestValidationError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Invio push non disponibile.",
      },
      { status: error instanceof RequestValidationError ? error.status : 500 },
    );
  }
}
