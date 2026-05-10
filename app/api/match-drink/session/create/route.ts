import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createSession, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(req: NextRequest) {
  try {
    const { title, pin, questionCount } = await req.json();

    if (!title || !pin) {
      return NextResponse.json({ error: "Titolo e PIN richiesti" }, { status: 400 });
    }

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    const parsedQuestionCount = questionCount ? parseInt(questionCount, 10) : 20;

    const session = await createSession(title, parsedQuestionCount);
    
    // Invia push di attivazione
    try {
      const { sendGameStartPush } = await import("@/lib/game/activation");
      void sendGameStartPush("matchDrink");
    } catch (e) {
      console.error("Failed to send start push:", e);
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
