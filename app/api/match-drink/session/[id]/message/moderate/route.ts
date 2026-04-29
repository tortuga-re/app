import { NextRequest, NextResponse } from "next/server";
import { moderateMessage, updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin, messageId, action, approvedText } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    if (action === "approve") {
      await moderateMessage(messageId, "approved", approvedText);
    } else if (action === "reject") {
      await moderateMessage(messageId, "rejected");
    } else if (action === "show") {
      await moderateMessage(messageId, "shown");
      await updateStageMode(id, "message", messageId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error moderating message:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
