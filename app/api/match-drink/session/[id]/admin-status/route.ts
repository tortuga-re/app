import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { 
  getAnswers,
  getMatches,
  getMessages,
  getPlayers, 
  getSession, 
  validateAdminPin
} from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    if (!validateAdminPin(pin || "")) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    const [session, players, answers, matches, messages] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getAnswers(id),
      getMatches(id),
      getMessages(id),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    return NextResponse.json({
      session,
      players,
      answers,
      matches,
      messages,
    });
  } catch (error) {
    console.error("Error getting admin status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
