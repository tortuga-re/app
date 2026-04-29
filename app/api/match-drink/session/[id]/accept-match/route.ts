import { NextRequest, NextResponse } from "next/server";
import { acceptMatch } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { matchId, playerId, accepted } = await req.json();

    if (!matchId || !playerId) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    await acceptMatch(matchId, playerId, accepted);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error accepting match:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
