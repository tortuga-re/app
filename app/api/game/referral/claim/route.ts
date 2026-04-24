import { type NextRequest, NextResponse } from "next/server";

import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";
import { claimReferralCode } from "@/lib/game/player-store";
import type { CaptainChallengeReferralClaimInput } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);
  const payload = (await request.json().catch(() => null)) as
    | Partial<CaptainChallengeReferralClaimInput>
    | null;
  const result = claimReferralCode(payload?.referralCode, session.playerId);
  const status = result.reason === "not_found" ? 404 : 200;
  const response = NextResponse.json(result, { status });

  return attachCaptainChallengePlayerCookie(
    response,
    session.playerId,
    session.shouldSetCookie,
  );
}
