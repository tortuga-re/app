import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { listLiveTvMediaAssets } from "@/lib/live-tv/media-library";
import { getLiveTvState } from "@/lib/live-tv/store";
import { listSavedPushLibrary } from "@/lib/push/library";
import { listPushSubscriptions } from "@/lib/push/subscription-store";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";
import { listLiveTvCustomerSubmissions } from "@/lib/live-tv/customer-submissions";
import { listAdminActivity } from "@/lib/admin/activity-log";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getVenuesData } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const [
      receiptRequests,
      pushSubscriptions,
      liveTvState,
      liveTvMediaAssets,
      pushLibrary,
      photoSubmissions,
      activities,
      liveGameResult,
      highlightResult,
      supabaseHealth,
      coopertoHealth,
    ] =
      await Promise.all([
        getPendingReceiptRequests().catch(() => []),
        listPushSubscriptions().catch(() => []),
        getLiveTvState().catch(() => null),
        listLiveTvMediaAssets().catch(() => []),
        listSavedPushLibrary().catch(() => ({ segments: [], campaigns: [] })),
        listLiveTvCustomerSubmissions().catch(() => []),
        listAdminActivity().catch(() => []),
        getSupabaseAdmin().from("live_game_state").select("active_game,activated_at,expires_at").eq("id", true).maybeSingle(),
        getSupabaseAdmin().from("highlight_contents").select("id,title,starts_at,ends_at,published").eq("published", true).lte("starts_at", new Date().toISOString()).or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`).order("priority", { ascending: false }).limit(1).maybeSingle(),
        (async () => { try { const { error } = await getSupabaseAdmin().from("app_state").select("key", { head: true, count: "exact" }).limit(1); return { ok: !error, detail: error?.message ?? "Connesso" }; } catch (error) { return { ok: false, detail: error instanceof Error ? error.message : "Non raggiungibile" }; } })(),
        getVenuesData().then((result) => ({ ok: result.source === "live", detail: result.source === "live" ? "Sincronizzato" : "Dati fallback" })).catch((error) => ({ ok: false, detail: error instanceof Error ? error.message : "Non raggiungibile" })),
      ]);

    const liveGame = liveGameResult.error ? null : liveGameResult.data;
    const activeHighlight = highlightResult.error ? null : highlightResult.data;

    return NextResponse.json({
      receiptsPending: receiptRequests.length,
      pushSubscriptions: pushSubscriptions.length,
      liveTvMode: liveTvState?.stageMode ?? "logo",
      liveTvScheduleEnabled: Boolean(liveTvState?.autoScheduleEnabled),
      liveTvMediaAssets: liveTvMediaAssets.length,
      savedPushSegments: pushLibrary.segments.length,
      savedPushCampaigns: pushLibrary.campaigns.length,
      photosPending: photoSubmissions.filter((submission: { status: string }) => submission.status === "pending").length,
      liveGame,
      activeHighlight,
      pushScheduled: 0,
      health: {
        supabase: supabaseHealth,
        cooperto: coopertoHealth,
        liveTv: { ok: Boolean(liveTvState), detail: liveTvState ? "Operativo" : "Non disponibile" },
        push: { ok: pushSubscriptions.length > 0, detail: `${pushSubscriptions.length} dispositivi iscritti` },
      },
      recentActivity: activities.slice(0, 10),
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
