import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { 
  getAnswers,
  getPlayers, 
  getSession 
} from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [session, players, answers] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getAnswers(id),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    let currentMessage = null;
    if (session.currentStageMessageId) {
      const admin = getSupabaseAdmin();
      const { data } = await admin
        .from("match_drink_bottle_messages")
        .select("*")
        .eq("id", session.currentStageMessageId)
        .single();
      currentMessage = data;
    }

    return NextResponse.json({
      session,
      players,
      answers,
      currentMessage,
    });
  } catch (error) {
    console.error("Error getting stage status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
