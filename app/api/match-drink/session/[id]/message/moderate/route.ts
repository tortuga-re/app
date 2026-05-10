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

    const status = (action === "approved" || action === "approve") ? "approved" : 
                   (action === "rejected" || action === "reject") ? "rejected" : 
                   (action === "shown" || action === "show") ? "shown" : null;

    if (status) {
      await moderateMessage(messageId, status as any, approvedText);
      if (status === "shown") {
        await updateStageMode(id, "message", messageId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error moderating message:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
