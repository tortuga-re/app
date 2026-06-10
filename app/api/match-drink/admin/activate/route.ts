import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { forceStageCompatibilityMode } from "@/lib/live-tv/store";
import { getActiveSession } from "@/lib/match-drink/storage";
import { sendGameStartPush } from "@/lib/game/activation";
import { broadcastActiveGamesStatus } from "@/lib/game/active-games-realtime";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(request);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const session = await getActiveSession();
    
    // Se non c'è una sessione attiva, non facciamo nulla.
    // L'utente deve crearne una manualmente dalla dashboard.
    if (!session) {
      return NextResponse.json({ success: true, message: "Nessuna sessione attiva da attivare" });
    }

    await forceStageCompatibilityMode("match_drink");
    void broadcastActiveGamesStatus({ matchDrink: true });
    // Invia push a tutti
    void sendGameStartPush("matchDrink");
    
    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("[MatchDrink Activate] Error:", error);
    return NextResponse.json({ error: "Failed to activate Match & Drink" }, { status: 500 });
  }
}
