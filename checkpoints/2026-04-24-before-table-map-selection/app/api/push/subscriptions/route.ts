import { NextResponse } from "next/server";

import { savePushSubscription } from "@/lib/push/subscription-store";
import type {
  SavePushSubscriptionInput,
  SavePushSubscriptionResponse,
} from "@/lib/push/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

export async function POST(request: Request) {
  let payload: SavePushSubscriptionInput;

  try {
    payload = (await request.json()) as SavePushSubscriptionInput;
  } catch {
    return NextResponse.json(
      { error: "Payload subscription non valido." },
      { status: 400 },
    );
  }

  if (!payload.subscription?.endpoint?.trim()) {
    return NextResponse.json(
      { error: "Endpoint push non valido." },
      { status: 400 },
    );
  }

  if (
    !payload.subscription.keys?.auth?.trim() ||
    !payload.subscription.keys?.p256dh?.trim()
  ) {
    return NextResponse.json(
      { error: "Chiavi push non valide." },
      { status: 400 },
    );
  }

  try {
    const record = await savePushSubscription({
      ...payload,
      email: normalizeEmail(payload.email),
    });

    const response: SavePushSubscriptionResponse = {
      saved: true,
      record,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Salvataggio subscription non riuscito.",
      },
      { status: 500 },
    );
  }
}
