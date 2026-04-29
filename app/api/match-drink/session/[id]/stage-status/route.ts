import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { 
  getAnswers,
  getBottleMessage,
  getMessages,
  getPlayers, 
  getSession 
} from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [session, players, answers, messages] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getAnswers(id),
      getMessages(id),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    let currentMessage = null;
    if (session.currentStageMessageId) {
      currentMessage = await getBottleMessage(session.currentStageMessageId);
      // Safety net: never serve a countdown as a display message
      if (currentMessage?.message?.trim().startsWith("COUNTDOWN:")) {
        currentMessage = null;
      }
    }

    return NextResponse.json({
      session,
      players,
      answers,
      currentMessage,
      messages,
    });
  } catch (error) {
    console.error("Error getting stage status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
