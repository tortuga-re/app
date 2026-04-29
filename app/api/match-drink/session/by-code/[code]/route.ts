import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSessionByJoinCode } from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await getSessionByJoinCode(code);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error getting session by code:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
