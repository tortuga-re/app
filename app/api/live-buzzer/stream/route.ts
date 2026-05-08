import { NextRequest, NextResponse } from "next/server";
import { getBuzzerStore, subscribeToBuzzerState } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";
import type { BuzzerState } from "@/lib/live-buzzer/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  const email = session?.email;
  // Per ora includiamo sempre le entries per facilitare il testing su localhost
  const isAdmin = true; 


  const formatState = (store: BuzzerState) => {
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
      currentRound: store.currentRound,
      leaderboard: leaderboardToDisplay,
      leaderboardVisible: store.leaderboardVisible,
      userEntry,
      currentResponderEntryId: store.currentResponderEntryId,
      currentResponder,
      entries: isAdmin ? store.entries : undefined,
      roundEnded: store.roundEnded,
      lastUpdateId: store.lastUpdateId,
      countdownStart: store.countdownStart,
      lastScoredEntry: store.lastScoredEntry,
      // Dati YouTube
      youtubePlaylistId: store.youtubePlaylistId,
      youtubeStatus: store.youtubeStatus,
      youtubeCommandId: store.youtubeCommandId,
      youtubeCurrentIndex: store.youtubeCurrentIndex,
      youtubeVideoTitle: store.youtubeVideoTitle,
    };
  };

  const stream = new ReadableStream({
    start(controller) {
      const sendState = (store: BuzzerState) => {
        const data = formatState(store);
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          // Stream might be closed
        }
      };

      // Invia lo stato iniziale
      sendState(getBuzzerStore());

      // Iscriviti ai futuri aggiornamenti
      const unsubscribe = subscribeToBuzzerState((store) => {
        try {
          sendState(store);
        } catch {
          unsubscribe();
        }
      });

      // Pulisci quando il client si disconnette
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        try { controller.close(); } catch {}
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
