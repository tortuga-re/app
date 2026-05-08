import { NextRequest, NextResponse } from "next/server";
import { startLeaderboardReveal, nextLeaderboardReveal, showLeaderboard } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "start":
        startLeaderboardReveal();
        break;
      case "next":
        nextLeaderboardReveal();
        break;
      case "full":
        showLeaderboard();
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
