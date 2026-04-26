import { randomInt } from "node:crypto";

import { captainChallengeConfig } from "@/lib/game/config";
import {
  consumePlayerLife,
  getPlayerLives,
} from "@/lib/game/player-store";
import { closeRound, createRound, getRound } from "@/lib/game/round-store";
import type {
  CaptainChallengeOffer,
  CaptainChallengeStartResponse,
  CaptainChallengeTapResponse,
} from "@/lib/game/types";

export class CaptainChallengeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CaptainChallengeError";
    this.status = status;
  }
}

const buildOffer = (
  outcomeType: CaptainChallengeTapResponse["outcomeType"],
): CaptainChallengeOffer | null => {
  if (outcomeType === "win") {
    return {
      title: "Drink Premium",
      description: "Hai vinto un cocktail OMAGGIO!",
      durationSeconds: captainChallengeConfig.winOfferDurationSeconds,
    };
  }

  if (outcomeType === "lose" || outcomeType === "false_start") {
    return {
      title: "Shot a 3\u20ac",
      description: "Offerta consolazione pronta per una promo reale.",
      durationSeconds: captainChallengeConfig.loseOfferDurationSeconds,
    };
  }

  return null;
};

export const startCaptainChallenge = (
  playerId: string,
): CaptainChallengeStartResponse => {
  const lives = getPlayerLives(playerId);

  if (lives <= 0) {
    throw new CaptainChallengeError(
      "Il Capitano non regala seconde possibilita. Arruola un pirata per tornare in gioco.",
      402,
    );
  }

  const explosionDelayMs = randomInt(
    captainChallengeConfig.minDelayMs,
    captainChallengeConfig.maxDelayMs + 1,
  );
  const round = createRound(playerId, explosionDelayMs);

  return {
    gameId: round.gameId,
    explosionDelayMs: round.explosionDelayMs,
    livesRemaining: lives,
  };
};

export const resolveCaptainChallengeTap = (
  rawGameId: string | undefined,
): CaptainChallengeTapResponse => {
  const gameId = rawGameId?.trim();

  if (!gameId) {
    throw new CaptainChallengeError("Round non valido.", 400);
  }

  const round = getRound(gameId);

  if (!round) {
    throw new CaptainChallengeError("Round inesistente o scaduto.", 404);
  }

  if (round.status !== "open") {
    throw new CaptainChallengeError("Round gia chiuso o gia utilizzato.", 409);
  }

  const tapReceivedAt = Date.now();
  const explosionAt = round.startedAt + round.explosionDelayMs;
  const reactionTimeMs = Math.round(tapReceivedAt - explosionAt);

  let outcomeType: CaptainChallengeTapResponse["outcomeType"];
  let outcome: string;

  if (tapReceivedAt < explosionAt) {
    outcomeType = "false_start";
    outcome = "Troppo in fretta. Hai perso.";
  } else if (reactionTimeMs <= captainChallengeConfig.winWindowMs) {
    outcomeType = "win";
    outcome = "Hai battuto il Capitano.";
  } else {
    outcomeType = "lose";
    outcome = "Il Capitano ha vinto la battaglia.";
  }

  const lifeConsumed = consumePlayerLife(round.playerId);
  closeRound(gameId, tapReceivedAt);

  if (!lifeConsumed) {
    throw new CaptainChallengeError(
      "Nessuna vita disponibile per chiudere questa sfida.",
      402,
    );
  }

  const offer = buildOffer(outcomeType);

  return {
    outcome,
    outcomeType,
    reactionTimeMs,
    offer,
    offerDurationSeconds: offer?.durationSeconds ?? 0,
    livesRemaining: getPlayerLives(round.playerId),
  };
};
