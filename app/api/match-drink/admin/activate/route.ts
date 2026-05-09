import { NextResponse } from "next/server";
import { getActiveSession, createSession } from "@/lib/match-drink/storage";
import { sendGameStartPush } from "@/lib/game/activation";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    let session = await getActiveSession();
    
    // Se non c'è una sessione attiva, ne creiamo una automatica in Lobby
    if (!session) {
      const today = new Date().toLocaleDateString("it-IT", { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      session = await createSession(`Sessione ${today}`, 20);
    }

    // Invia push a tutti
    void sendGameStartPush("matchDrink");
    
    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("[MatchDrink Activate] Error:", error);
    return NextResponse.json({ error: "Failed to activate Match & Drink" }, { status: 500 });
  }
}
