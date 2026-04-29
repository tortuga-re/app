import { NextRequest, NextResponse } from "next/server";
import { updateSessionStatus, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pin, status } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    if (!status) {
      return NextResponse.json({ error: "Status mancante" }, { status: 400 });
    }

    await updateSessionStatus(id, status);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
