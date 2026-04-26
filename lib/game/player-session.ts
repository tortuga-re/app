import { randomBytes } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

export const captainChallengePlayerCookieName = "tortuga_captain_player";
export const captainChallengePlayerCookieMaxAgeSeconds = 60 * 60 * 24 * 90;

export const createCaptainChallengePlayerId = () =>
  randomBytes(18).toString("base64url");

export const getCaptainChallengePlayerSession = (request: NextRequest) => {
  const existingPlayerId =
    request.cookies.get(captainChallengePlayerCookieName)?.value.trim() ?? "";

  if (existingPlayerId) {
    return {
      playerId: existingPlayerId,
      shouldSetCookie: true,
    };
  }

  return {
    playerId: createCaptainChallengePlayerId(),
    shouldSetCookie: true,
  };
};

export const attachCaptainChallengePlayerCookie = (
  response: NextResponse,
  playerId: string,
  shouldSetCookie: boolean,
) => {
  if (!shouldSetCookie) {
    return response;
  }

  response.cookies.set(captainChallengePlayerCookieName, playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: captainChallengePlayerCookieMaxAgeSeconds,
  });

  return response;
};
