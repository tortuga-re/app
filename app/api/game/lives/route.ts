import { type NextRequest, NextResponse } from "next/server";

import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";
import { ensurePlayer } from "@/lib/game/player-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);
  const player = ensurePlayer(session.playerId);
  const response = NextResponse.json({
    lives: player.lives,
    referralCode: player.referralCode ?? null,
  });

  return attachCaptainChallengePlayerCookie(
    response,
    session.playerId,
    session.shouldSetCookie,
  );
}

export const POST = GET;
