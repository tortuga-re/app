import { NextRequest, NextResponse } from "next/server";
import { saveAnswer } from "@/lib/match-drink/storage";
import { MatchDrinkAnswer } from "@/lib/match-drink/types";

const VALID_OPTION_IDS = new Set(["A", "B", "C", "D"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { playerId, questionId, selectedOptionId } = await req.json();

    if (!playerId || !questionId || !selectedOptionId) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    if (!VALID_OPTION_IDS.has(selectedOptionId)) {
      return NextResponse.json({ error: "Opzione non valida" }, { status: 400 });
    }

    const answer = await saveAnswer({
      sessionId: id,
      playerId,
      questionId,
      selectedOptionId: selectedOptionId as MatchDrinkAnswer["selectedOptionId"],
    });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("Error saving answer:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
