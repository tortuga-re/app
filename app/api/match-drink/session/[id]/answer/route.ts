import { NextRequest, NextResponse } from "next/server";
import { saveAnswer } from "@/lib/match-drink/storage";

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

    const answer = await saveAnswer({
      sessionId: id,
      playerId,
      questionId,
      selectedOptionId,
    });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("Error saving answer:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
