import { NextResponse } from "next/server";
import { getActiveSession, createSession } from "@/lib/match-drink/storage";
import { sendGameStartPush } from "@/lib/game/activation";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    let session = await getActiveSession();
    
    // Se non c'è una sessione attiva, non facciamo nulla.
    // L'utente deve crearne una manualmente dalla dashboard.
    if (!session) {
      return NextResponse.json({ success: true, message: "Nessuna sessione attiva da attivare" });
    }

    // Invia push a tutti
    void sendGameStartPush("matchDrink");
    
    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("[MatchDrink Activate] Error:", error);
    return NextResponse.json({ error: "Failed to activate Match & Drink" }, { status: 500 });
  }
}
