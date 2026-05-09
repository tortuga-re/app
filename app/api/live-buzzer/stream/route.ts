import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";
import type { BuzzerState } from "@/lib/live-buzzer/types";

export const dynamic = "force-dynamic";

const formatState = (store: BuzzerState, email: string | undefined) => {
  const userEntry = email
    ? store.entries.find(e => e.email === email)
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

  return {
    status: store.status,
    isLive: store.isLive,
    currentRound: store.currentRound,
    leaderboard: leaderboardToDisplay,
    leaderboardVisible: store.leaderboardVisible,
    leaderboardRevealStep: store.leaderboardRevealStep,
    userEntry,
    currentResponderEntryId: store.currentResponderEntryId,
    currentResponder,
    entries: store.entries,
    roundEnded: store.roundEnded,
    lastUpdateId: store.lastUpdateId,
    countdownStart: store.countdownStart,
    lastScoredEntry: store.lastScoredEntry,
    youtubePlaylistId: store.youtubePlaylistId,
    youtubeStatus: store.youtubeStatus,
    youtubeCommandId: store.youtubeCommandId,
    youtubeCurrentIndex: store.youtubeCurrentIndex,
    youtubeVideoTitle: store.youtubeVideoTitle,
  };
};

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  const email = session?.email;

  const stream = new ReadableStream({
    start(controller) {
      let lastUpdateId = "";
      let closed = false;

      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {
          closed = true;
        }
      };

      const poll = async () => {
        if (closed) return;
        try {
          const state = await getState();
          if (state.lastUpdateId !== lastUpdateId) {
            lastUpdateId = state.lastUpdateId;
            send(formatState(state, email));
          }
        } catch {
          // silently continue polling
        }
      };

      // Initial send
      void poll();

      const interval = setInterval(() => { void poll(); }, 750);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
