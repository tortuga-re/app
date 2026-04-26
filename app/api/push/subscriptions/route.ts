import { NextResponse } from "next/server";

import {
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/push/subscription-store";
import type {
  DeletePushSubscriptionInput,
  DeletePushSubscriptionResponse,
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

export async function DELETE(request: Request) {
  let payload: DeletePushSubscriptionInput;

  try {
    payload = (await request.json()) as DeletePushSubscriptionInput;
  } catch {
    return NextResponse.json(
      { error: "Payload cancellazione subscription non valido." },
      { status: 400 },
    );
  }

  if (!payload.endpoint?.trim()) {
    return NextResponse.json(
      { error: "Endpoint push non valido." },
      { status: 400 },
    );
  }

  try {
    const response: DeletePushSubscriptionResponse = {
      deleted: await deletePushSubscription(payload.endpoint),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cancellazione subscription non riuscita.",
      },
      { status: 500 },
    );
  }
}
