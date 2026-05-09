import { type NextRequest, NextResponse } from "next/server";
import { assignScore } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (false) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const { email, points, result } = await request.json();

    if (!email || typeof points !== "number" || !result) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    await assignScore(email, points, result);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
}
