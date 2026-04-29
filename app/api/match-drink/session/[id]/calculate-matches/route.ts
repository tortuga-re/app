import { NextRequest, NextResponse } from "next/server";
import { calculateMatches } from "@/lib/match-drink/scoring";
import { getAnswers, getPlayers, getSession, storeMatches, updateSessionStatus, updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });

    const players = await getPlayers(id);
    const answers = await getAnswers(id);

    const matches = calculateMatches(session, players, answers);
    await storeMatches(matches);

    await updateSessionStatus(id, "matching");
    await updateStageMode(id, "matching");

    return NextResponse.json({ count: matches.length });
  } catch (error) {
    console.error("Error calculating matches:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
