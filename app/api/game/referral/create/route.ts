import { type NextRequest, NextResponse } from "next/server";

import {
  attachCaptainChallengePlayerCookie,
  getCaptainChallengePlayerSession,
} from "@/lib/game/player-session";
import {
  ensurePlayer,
  getOrCreateReferralCode,
} from "@/lib/game/player-store";
import { siteConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const localHostnames = new Set(["0.0.0.0", "localhost", "127.0.0.1", "::1"]);

const getHostnameFromHostHeader = (host: string) => {
  if (host.startsWith("[")) {
    return host.slice(1, host.indexOf("]"));
  }

  return host.split(":")[0] ?? "";
};

const getReferralBaseUrl = (request: NextRequest) => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  const hostname = getHostnameFromHostHeader(host).toLowerCase();

  if (host && !localHostnames.has(hostname)) {
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    return `${protocol}://${host}`;
  }

  return siteConfig.productionUrl;
};

export async function POST(request: NextRequest) {
  const session = getCaptainChallengePlayerSession(request);
  const player = ensurePlayer(session.playerId);
  const referralCode = getOrCreateReferralCode(session.playerId);
  const referralUrl = new URL("/game/sfida-capitano", getReferralBaseUrl(request));
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
