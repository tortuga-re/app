import { type NextRequest, NextResponse } from "next/server";

import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";
import {
  ensurePlayer,
  getOrCreateReferralCode,
} from "@/lib/game/player-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);
  const player = ensurePlayer(session.playerId);
  const referralCode = getOrCreateReferralCode(session.playerId);
  const referralUrl = new URL("/game/sfida-capitano", request.url);
  referralUrl.searchParams.set("ref", referralCode);

  const response = NextResponse.json({
    referralCode,
    referralUrl: referralUrl.toString(),
    lives: player.lives,
  });

  return attachCaptainChallengePlayerCookie(
    response,
    session.playerId,
    session.shouldSetCookie,
  );
}
