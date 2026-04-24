import { type NextRequest, NextResponse } from "next/server";

import {
  CaptainChallengeError,
  startCaptainChallenge,
} from "@/lib/game/engine";
import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);

  try {
    const response = NextResponse.json(
      startCaptainChallenge(session.playerId),
    );
    return attachCaptainChallengePlayerCookie(
      response,
      session.playerId,
      session.shouldSetCookie,
    );
  } catch (error) {
    const status = error instanceof CaptainChallengeError ? error.status : 500;
    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Non siamo riusciti ad avviare la sfida.",
      },
      { status },
    );

    return attachCaptainChallengePlayerCookie(
      response,
      session.playerId,
      session.shouldSetCookie,
    );
  }
}
