import { NextResponse } from "next/server";
import { getState } from "@/lib/live-buzzer/store";
import { getActiveSession } from "@/lib/match-drink/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [buzzerState, matchDrinkSession] = await Promise.all([
      getState(),
      getActiveSession(),
    ]);

    return NextResponse.json({
      buzzer: !!buzzerState.isLive,
      matchDrink: !!matchDrinkSession,
    });
  } catch (error) {
    console.error("[Game Status API] Error checking game status:", error);
    return NextResponse.json({ buzzer: false, matchDrink: false }, { status: 500 });
  }
}
