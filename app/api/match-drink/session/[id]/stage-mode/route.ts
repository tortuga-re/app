import { NextRequest, NextResponse } from "next/server";
import { updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin, stageMode, currentStageMessageId } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    await updateStageMode(id, stageMode, currentStageMessageId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating stage mode:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
