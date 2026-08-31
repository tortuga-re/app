import { NextResponse } from "next/server";

import { markPushHistoryOpened } from "@/lib/push/history-store";
import { verifyPushTrackingToken } from "@/lib/push/metadata";
import { markPushSubscriptionOpened } from "@/lib/push/subscription-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OpenPayload = {
  deliveryId?: string;
  endpointFingerprint?: string;
  token?: string;
  url?: string;
};

export async function POST(request: Request) {
  let payload: OpenPayload;
  try {
    payload = (await request.json()) as OpenPayload;
  } catch {
    return NextResponse.json({ tracked: false }, { status: 400 });
  }

  const deliveryId = payload.deliveryId?.trim() ?? "";
  const endpointFingerprint = payload.endpointFingerprint?.trim() ?? "";
  const token = payload.token?.trim() ?? "";

  if (
    !verifyPushTrackingToken(deliveryId, endpointFingerprint, token) ||
    deliveryId.length > 80 ||
    endpointFingerprint.length > 32
  ) {
    return NextResponse.json({ tracked: false }, { status: 403 });
  }

  await Promise.all([
    markPushSubscriptionOpened(endpointFingerprint, payload.url?.slice(0, 240)),
    markPushHistoryOpened(deliveryId, endpointFingerprint),
  ]);

  return NextResponse.json({ tracked: true });
}
