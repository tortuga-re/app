import { NextRequest, NextResponse } from "next/server";
import { 
  getPlayer, 
  getPlayerAnswers, 
  getPlayerMatch, 
  getSession 
} from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;

    const [session, player, answers, match] = await Promise.all([
      getSession(id),
      getPlayer(playerId),
      getPlayerAnswers(id, playerId),
      getPlayerMatch(id, playerId),
    ]);

    if (!session || !player || player.sessionId !== id) {
      return NextResponse.json({ error: "Invalid context" }, { status: 404 });
    }

    return NextResponse.json({
      session,
      player,
      answers,
      match,
    });
  } catch (error) {
    console.error("Error getting status:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
