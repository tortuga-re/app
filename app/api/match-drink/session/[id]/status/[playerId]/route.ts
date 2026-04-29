import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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

    let enrichedMatch = match;
    if (match) {
      const [pA, pB] = await Promise.all([
        getPlayer(match.playerAId),
        getPlayer(match.playerBId),
      ]);
      enrichedMatch = {
        ...match,
        playerANickname: pA?.nickname,
        playerATable: pA?.tableNumber,
        playerBNickname: pB?.nickname,
        playerBTable: pB?.tableNumber,
      };
    }

    return NextResponse.json({
      session,
      player,
      answers,
      match: enrichedMatch,
    });
  } catch (error) {
    console.error("Error getting status:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
