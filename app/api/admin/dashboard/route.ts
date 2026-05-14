import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getState } from "@/lib/live-buzzer/store";
import { listLiveTvMediaAssets } from "@/lib/live-tv/media-library";
import { getLiveTvState } from "@/lib/live-tv/store";
import { getActiveSession } from "@/lib/match-drink/storage";
import { listSavedPushLibrary } from "@/lib/push/library";
import { listPushSubscriptions } from "@/lib/push/subscription-store";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const [
      buzzerState,
      matchDrinkSession,
      receiptRequests,
      pushSubscriptions,
      liveTvState,
      liveTvMediaAssets,
      pushLibrary,
    ] =
      await Promise.all([
        getState(),
        getActiveSession(),
        getPendingReceiptRequests().catch(() => []),
        listPushSubscriptions().catch(() => []),
        getLiveTvState().catch(() => null),
        listLiveTvMediaAssets().catch(() => []),
        listSavedPushLibrary().catch(() => ({ segments: [], campaigns: [] })),
      ]);

    return NextResponse.json({
      receiptsPending: receiptRequests.length,
      pushSubscriptions: pushSubscriptions.length,
      liveBuzzerActive: Boolean(buzzerState.isLive),
      matchDrinkActive: Boolean(matchDrinkSession),
      latestMatchDrinkTitle: matchDrinkSession?.title ?? null,
      liveTvMode: liveTvState?.stageMode ?? "logo",
      liveTvScheduleEnabled: Boolean(liveTvState?.autoScheduleEnabled),
      liveTvMediaAssets: liveTvMediaAssets.length,
      savedPushSegments: pushLibrary.segments.length,
      savedPushCampaigns: pushLibrary.campaigns.length,
      matchDrinkAnalytics: matchDrinkSession?.analytics ?? null,
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
