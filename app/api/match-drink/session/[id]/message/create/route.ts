import { NextRequest, NextResponse } from "next/server";
import { createBottleMessage } from "@/lib/match-drink/storage";
import { moderateContent } from "@/lib/match-drink/moderation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { playerId, message, displayMode } = await req.json();

    if (!playerId || !message || !displayMode) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    if (message.length > 280) {
      return NextResponse.json({ error: "Messaggio troppo lungo" }, { status: 400 });
    }

    // Moderazione Automatica
    const { approved, reason } = moderateContent(message);
    const status = approved ? "approved" : "rejected";

    const newMessage = await createBottleMessage({
      sessionId: id,
      playerId,
      message,
      displayMode,
      status, // Passiamo lo stato calcolato
    });

    if (status === "rejected") {
      return NextResponse.json({ 
        error: reason === "profanity" ? "Linguaggio non appropriato." : "Usa solo la lingua italiana.",
        rejected: true 
      }, { status: 400 });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
