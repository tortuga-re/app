import { NextRequest, NextResponse } from "next/server";
import { createBottleMessage } from "@/lib/match-drink/storage";

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

    if (message.length > 180) {
      return NextResponse.json({ error: "Messaggio troppo lungo" }, { status: 400 });
    }

    const newMessage = await createBottleMessage({
      sessionId: id,
      playerId,
      message,
      displayMode,
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
