import { type NextRequest, NextResponse } from "next/server";

import {
  CaptainChallengeError,
  resolveCaptainChallengeTap,
} from "@/lib/game/engine";
import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";
import type { CaptainChallengeTapInput } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);
  const payload = (await request.json().catch(() => null)) as
    | Partial<CaptainChallengeTapInput>
    | null;

  if (!payload) {
    const response = NextResponse.json(
      { error: "Payload gioco mancante o non valido." },
      { status: 400 },
    );
    return attachCaptainChallengePlayerCookie(
      response,
      session.playerId,
      session.shouldSetCookie,
    );
  }

  try {
    const response = NextResponse.json(resolveCaptainChallengeTap(payload.gameId));
    return attachCaptainChallengePlayerCookie(
      response,
      session.playerId,
      session.shouldSetCookie,
    );
  } catch (error) {
    if (error instanceof CaptainChallengeError) {
      const response = NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
      return attachCaptainChallengePlayerCookie(
        response,
        session.playerId,
        session.shouldSetCookie,
      );
    }

    const response = NextResponse.json(
      { error: "Tap non validabile al momento." },
      { status: 500 },
    );
    return attachCaptainChallengePlayerCookie(
      response,
      session.playerId,
      session.shouldSetCookie,
    );
  }
}
