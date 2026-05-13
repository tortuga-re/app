import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getState } from "@/lib/live-buzzer/store";
import { getActiveSession } from "@/lib/match-drink/storage";
import { listPushSubscriptions } from "@/lib/push/subscription-store";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const [buzzerState, matchDrinkSession, receiptRequests, pushSubscriptions] =
      await Promise.all([
        getState(),
        getActiveSession(),
        getPendingReceiptRequests().catch(() => []),
        listPushSubscriptions().catch(() => []),
      ]);

    return NextResponse.json({
      receiptsPending: receiptRequests.length,
      pushSubscriptions: pushSubscriptions.length,
      liveBuzzerActive: Boolean(buzzerState.isLive),
      matchDrinkActive: Boolean(matchDrinkSession),
      latestMatchDrinkTitle: matchDrinkSession?.title ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Console admin non disponibile.",
      },
      { status: 500 },
    );
  }
}
