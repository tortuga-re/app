import { randomBytes } from "node:crypto";

import { captainChallengeConfig } from "@/lib/game/config";
import type { CaptainChallengeRound } from "@/lib/game/types";
import { createPersistentJsonStore } from "@/lib/server/persistent-json-store";

type RoundStore = Record<string, CaptainChallengeRound>;

const roundStateStore = createPersistentJsonStore<RoundStore>({
  key: "tortuga:captain-challenge:rounds",
  localFile: ".data/captain-challenge-rounds.json",
  initialState: () => ({}),
  requireRedisInProduction: true,
});

const cleanupExpiredRounds = (store: RoundStore, now = Date.now()) => {
  const nextStore = { ...store };

  for (const [gameId, round] of Object.entries(nextStore)) {
    const referenceTime = round.closedAt ?? round.startedAt;
    if (now - referenceTime > captainChallengeConfig.roundTtlMs) {
      delete nextStore[gameId];
    }
  }

  return nextStore;
};

export const createRound = async (playerId: string, explosionDelayMs: number) => {
  const round: CaptainChallengeRound = {
    gameId: randomBytes(24).toString("base64url"),
    playerId,
    startedAt: Date.now(),
    explosionDelayMs,
    status: "open",
  };

  await roundStateStore.update((store) => {
    const prunedStore = cleanupExpiredRounds(store ?? {});
    prunedStore[round.gameId] = round;
    return prunedStore;
  });

  return round;
};

export const getRound = async (gameId: string) => {
  const nextStore = await roundStateStore.update((store) => cleanupExpiredRounds(store ?? {}));
  return nextStore[gameId] ?? null;
};

export const closeRound = async (gameId: string, closedAt: number) => {
  let closedRound: CaptainChallengeRound | null = null;

  await roundStateStore.update((store) => {
    const prunedStore = cleanupExpiredRounds(store ?? {});
    const round = prunedStore[gameId];

    if (!round) {
      return prunedStore;
    }

    closedRound = {
      ...round,
      status: "closed",
      closedAt,
    };
    prunedStore[gameId] = closedRound;
    return prunedStore;
  });

  return closedRound;
};

export const acquireRoundResolutionLock = async (gameId: string) =>
  roundStateStore.setIfNotExists(
    `tortuga:captain-challenge:round-lock:${gameId}`,
    Math.ceil(captainChallengeConfig.roundTtlMs / 1000),
  );
