import { type NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  const store = await getState();

  const userEntry = session
    ? store.entries.find(e => e.email === session.email)
    : null;

  let leaderboardToDisplay = store.leaderboardVisible
    ? store.leaderboard
    : (store.frozenLeaderboard || store.leaderboard);

  if (!store.leaderboardVisible) {
    leaderboardToDisplay = leaderboardToDisplay.map(team => ({
      ...team,
      totalPoints: -999,
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
    leaderboardRevealStep: store.leaderboardRevealStep,
    userEntry,
    currentResponderEntryId: store.currentResponderEntryId,
    currentResponder,
    roundEnded: store.roundEnded,
    lastUpdateId: store.lastUpdateId,
    countdownStart: store.countdownStart,
    lastScoredEntry: store.lastScoredEntry,
  });
}
