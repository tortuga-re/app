import { type NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { activateBuzzer } from "@/lib/live-buzzer/store";
import { sendGameStartPush } from "@/lib/game/activation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const unauthorizedResponse = requireAdminRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    await activateBuzzer();
    // Invia push a tutti
    void sendGameStartPush("buzzer");
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
