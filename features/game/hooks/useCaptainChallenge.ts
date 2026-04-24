"use client";

import { useCallback, useRef, useState } from "react";

import { requestJson } from "@/lib/client";
import type {
  CaptainChallengeStartResponse,
  CaptainChallengeTapResponse,
} from "@/lib/game/types";

export type CaptainChallengePhase =
  | "idle"
  | "starting"
  | "waiting"
  | "go"
  | "submitting"
  | "result"
  | "error";

export function useCaptainChallenge() {
  const explosionTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<CaptainChallengePhase>("idle");
  const [gameId, setGameId] = useState("");
  const [explosionDelayMs, setExplosionDelayMs] = useState(0);
  const [result, setResult] = useState<CaptainChallengeTapResponse | null>(null);
  const [error, setError] = useState("");

  const clearExplosionTimer = useCallback(() => {
    if (explosionTimerRef.current !== null) {
      window.clearTimeout(explosionTimerRef.current);
      explosionTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearExplosionTimer();
    setPhase("idle");
    setGameId("");
    setExplosionDelayMs(0);
    setResult(null);
    setError("");
  }, [clearExplosionTimer]);

  const start = useCallback(async () => {
    clearExplosionTimer();
    setPhase("starting");
    setGameId("");
    setExplosionDelayMs(0);
    setResult(null);
    setError("");

    try {
      const response = await requestJson<CaptainChallengeStartResponse>(
        "/api/game/start",
        { method: "POST" },
      );

      setGameId(response.gameId);
      setExplosionDelayMs(response.explosionDelayMs);
      setPhase("waiting");

      explosionTimerRef.current = window.setTimeout(() => {
        setPhase((currentPhase) =>
          currentPhase === "waiting" ? "go" : currentPhase,
        );
        explosionTimerRef.current = null;
      }, response.explosionDelayMs);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Non siamo riusciti ad avviare la sfida.",
      );
      setPhase("error");
    }
  }, [clearExplosionTimer]);

  const tap = useCallback(async () => {
    if (!gameId || phase === "submitting" || phase === "result") {
      return;
    }

    clearExplosionTimer();
    setPhase("submitting");
    setError("");

    try {
      const response = await requestJson<CaptainChallengeTapResponse>(
        "/api/game/tap",
        {
          method: "POST",
          body: JSON.stringify({ gameId }),
        },
      );

      setResult(response);
      setPhase("result");
    } catch (tapError) {
      setError(
        tapError instanceof Error
          ? tapError.message
          : "Il Capitano non ha validato il tap.",
      );
      setPhase("error");
    }
  }, [clearExplosionTimer, gameId, phase]);

  return {
    phase,
    gameId,
    explosionDelayMs,
    result,
    error,
    start,
    tap,
    reset,
    canTap: phase === "waiting" || phase === "go",
  };
}
