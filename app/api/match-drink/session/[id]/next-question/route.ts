import { NextRequest, NextResponse } from "next/server";
import { updateQuestionIndex, updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin, index } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    await updateQuestionIndex(id, index);
    await updateStageMode(id, "question");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error advancing question:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
