import { NextResponse } from "next/server";
import { activateBuzzer } from "@/lib/live-buzzer/store";
import { sendGameStartPush } from "@/lib/game/activation";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await activateBuzzer();
    // Invia push a tutti
    void sendGameStartPush("buzzer");
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
