import { NextRequest, NextResponse } from "next/server";
import { updateSessionStatus, updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

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

    await updateSessionStatus(id, "playing");
    await updateStageMode(id, "question");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
