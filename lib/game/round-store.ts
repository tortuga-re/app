import { randomBytes } from "node:crypto";

import { captainChallengeConfig } from "@/lib/game/config";
import type { CaptainChallengeRound } from "@/lib/game/types";

type RoundStore = Map<string, CaptainChallengeRound>;

const globalStore = globalThis as typeof globalThis & {
  __tortugaCaptainChallengeRounds?: RoundStore;
};

const getRoundStore = () => {
  if (!globalStore.__tortugaCaptainChallengeRounds) {
    globalStore.__tortugaCaptainChallengeRounds = new Map();
  }

  return globalStore.__tortugaCaptainChallengeRounds;
};

const cleanupExpiredRounds = (now = Date.now()) => {
  const store = getRoundStore();

  for (const [gameId, round] of store.entries()) {
    const referenceTime = round.closedAt ?? round.startedAt;
    if (now - referenceTime > captainChallengeConfig.roundTtlMs) {
      store.delete(gameId);
    }
  }
};

export const createRound = (explosionDelayMs: number) => {
  cleanupExpiredRounds();

  const round: CaptainChallengeRound = {
    gameId: randomBytes(24).toString("base64url"),
    startedAt: Date.now(),
    explosionDelayMs,
    status: "open",
  };

  getRoundStore().set(round.gameId, round);
  return round;
};

export const getRound = (gameId: string) => {
  cleanupExpiredRounds();
  return getRoundStore().get(gameId) ?? null;
};

export const closeRound = (gameId: string, closedAt: number) => {
  const round = getRoundStore().get(gameId);

  if (!round) {
    return null;
  }

  const closedRound: CaptainChallengeRound = {
    ...round,
    status: "closed",
    closedAt,
  };

  getRoundStore().set(gameId, closedRound);
  return closedRound;
};

// TODO production-ready: replace this in-memory store with Redis or a database
// that supports TTL and atomic one-use updates across serverless instances.
