import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { recordMatchDrinkMatchesCalculated } from "@/lib/match-drink/analytics";
import { calculateMatches } from "@/lib/match-drink/scoring";
import { 
  getAnswers, 
  getPlayers, 
  getSession, 
  storeMatches, 
  updateSessionStatus, 
  updateStageMode, 
  getSessionQuestions 
} from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req, "captain");
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const [session, players, answers, questions] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getAnswers(id),
      getSessionQuestions(id)
    ]);

    if (!session) return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });

    const matches = calculateMatches(session, players, answers, questions);
    await storeMatches(matches);
    if (matches.length === 0) {
      await recordMatchDrinkMatchesCalculated(id, 0);
    }

    await updateSessionStatus(id, "matching");
    await updateStageMode(id, "matching");

    return NextResponse.json({ count: matches.length });
  } catch (error) {
    console.error("Error calculating matches:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
