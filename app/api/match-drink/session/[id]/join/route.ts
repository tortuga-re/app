import { NextRequest, NextResponse } from "next/server";
import { getSession, joinSession } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    const player = await joinSession({
      sessionId: id,
      nickname: body.nickname,
      tableNumber: body.tableNumber,
      ageRange: body.ageRange,
      gender: body.gender,
      relationshipStatus: body.relationshipStatus,
      lookingFor: body.lookingFor,
      publicConsent: body.publicConsent ?? false,
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
