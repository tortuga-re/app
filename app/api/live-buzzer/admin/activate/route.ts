import { type NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { activateBuzzer } from "@/lib/live-buzzer/store";
import { forceStageCompatibilityMode } from "@/lib/live-tv/store";
import { sendGameStartPush } from "@/lib/game/activation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(request);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    await activateBuzzer();
    await forceStageCompatibilityMode("buzzer");
    // Invia push a tutti
    void sendGameStartPush("buzzer");
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
