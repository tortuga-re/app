import { NextResponse } from "next/server";
import { getBuzzerStore } from "@/lib/live-buzzer/store";
import { getActiveSession } from "@/lib/match-drink/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check Buzzer Status
    const buzzerStore = getBuzzerStore();
    const isBuzzerActive = buzzerStore.status !== "idle" || buzzerStore.leaderboard.length > 0;

    // Check Match & Drink Status
    const matchDrinkSession = await getActiveSession();
    const isMatchDrinkActive = !!matchDrinkSession;

    return NextResponse.json({
      buzzer: isBuzzerActive,
      matchDrink: isMatchDrinkActive,
    });
  } catch (error) {
    console.error("[Game Status API] Error checking game status:", error);
    return NextResponse.json({
      buzzer: false,
      matchDrink: false,
    }, { status: 500 });
  }
}
