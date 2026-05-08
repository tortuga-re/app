import { type NextRequest, NextResponse } from "next/server";
import { getBuzzerStore } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  const store = getBuzzerStore();
  
  const userEntry = session 
    ? store.entries.find(e => e.email === session.email) 
    : null;

  // Masking logic for leaderboard
  let leaderboardToDisplay = store.leaderboardVisible 
    ? store.leaderboard 
    : (store.frozenLeaderboard || store.leaderboard);

  if (!store.leaderboardVisible) {
    // Mask points as "X" (we use -1 or similar flag or just let client handle it)
    leaderboardToDisplay = leaderboardToDisplay.map(team => ({
      ...team,
      totalPoints: -999, // Flag for "X"
    }));
  }

  const currentResponder = store.currentResponderEntryId 
    ? store.entries.find(e => e.id === store.currentResponderEntryId)
    : null;

  return NextResponse.json({
    status: store.status,
    isLive: store.isLive,
    currentRound: store.currentRound,
    leaderboard: leaderboardToDisplay,
    leaderboardVisible: store.leaderboardVisible,
    userEntry,
    currentResponderEntryId: store.currentResponderEntryId,
    currentResponder,
    roundEnded: store.roundEnded,
    lastUpdateId: store.lastUpdateId,
    countdownStart: store.countdownStart,
    lastScoredEntry: store.lastScoredEntry,
  });
}
