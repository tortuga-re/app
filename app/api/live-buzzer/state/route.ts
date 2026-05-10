import { type NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  const store = await getState();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const userEntry = session
    ? store.entries.find(e => e.email === session.email)
    : null;

  let leaderboardToDisplay = store.leaderboardVisible
    ? store.leaderboard
    : (store.frozenLeaderboard || store.leaderboard);

  if (!store.leaderboardVisible) {
    leaderboardToDisplay = leaderboardToDisplay.map((team: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...team,
      totalPoints: -999,
    }));
  }

  const currentResponder = store.currentResponderEntryId
    ? store.entries.find(e => e.id === store.currentResponderEntryId)
    : null;

  // Restituiamo TUTTO lo stato per evitare che il polling sovrascriva campi mancanti (es. playlistId)
  return NextResponse.json({
    ...store,
    userEntry,
    currentResponder,
    leaderboard: leaderboardToDisplay,
  });
}
