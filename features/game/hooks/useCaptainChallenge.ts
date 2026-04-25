"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson } from "@/lib/client";
import type {
  CaptainChallengeLivesResponse,
  CaptainChallengeReferralClaimResponse,
  CaptainChallengeReferralCreateResponse,
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
  | "no_lives"
  | "error";

const claimedReferralStorageKey = "tortuga.captain.claimed-referrals";
const referralLivesPollMs = 2000;

const readClaimedReferralCodes = () => {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(claimedReferralStorageKey) ?? "[]",
    ) as string[];

    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const rememberClaimedReferralCode = (referralCode: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const claimedCodes = readClaimedReferralCodes();
  claimedCodes.add(referralCode);
  window.localStorage.setItem(
    claimedReferralStorageKey,
    JSON.stringify(Array.from(claimedCodes)),
  );
};

export function useCaptainChallenge(incomingReferralCode = "") {
  const explosionTimerRef = useRef<number | null>(null);
  const claimedIncomingReferralRef = useRef("");
  const [phase, setPhase] = useState<CaptainChallengePhase>("idle");
  const [gameId, setGameId] = useState("");
  const [result, setResult] = useState<CaptainChallengeTapResponse | null>(null);
  const [error, setError] = useState("");
  const [lives, setLives] = useState<number | null>(null);
  const [livesLoading, setLivesLoading] = useState(true);
  const [referralUrl, setReferralUrl] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralClaimMessage, setReferralClaimMessage] = useState("");

  const clearExplosionTimer = useCallback(() => {
    if (explosionTimerRef.current !== null) {
      window.clearTimeout(explosionTimerRef.current);
      explosionTimerRef.current = null;
    }
  }, []);

  const loadLives = useCallback(async () => {
    setLivesLoading(true);

    try {
      const response = await requestJson<CaptainChallengeLivesResponse>(
        "/api/game/lives",
      );
      setLives(response.lives);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Non riesco a leggere le vite disponibili.",
      );
    } finally {
      setLivesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialLives = async () => {
      try {
        const response = await requestJson<CaptainChallengeLivesResponse>(
          "/api/game/lives",
        );

        if (!cancelled) {
          setLives(response.lives);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Non riesco a leggere le vite disponibili.",
          );
        }
      } finally {
        if (!cancelled) {
          setLivesLoading(false);
        }
      }
    };

    void loadInitialLives();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const referralCode = incomingReferralCode.trim();

    if (!referralCode || claimedIncomingReferralRef.current === referralCode) {
      return;
    }

    claimedIncomingReferralRef.current = referralCode;

    const claimReferral = async () => {
      const locallyClaimed = readClaimedReferralCodes().has(referralCode);

      if (locallyClaimed) {
        await Promise.resolve();
        setReferralClaimMessage(
          "Questo invito e gia stato registrato su questo dispositivo.",
        );
        return;
      }

      try {
        const response =
          await requestJson<CaptainChallengeReferralClaimResponse>(
            "/api/game/referral/claim",
            {
              method: "POST",
              body: JSON.stringify({ referralCode }),
            },
          );

        if (response.claimed || response.reason === "already_claimed") {
          rememberClaimedReferralCode(referralCode);
        }

        setLives(response.lives);
        setReferralClaimMessage(
          response.claimed
            ? "Invito registrato. Hai aiutato un pirata a tornare in gioco."
            : response.reason === "self_referral"
              ? "Questo e il tuo invito: non puoi arruolare te stesso."
              : response.reason === "already_claimed"
                ? "Questo invito era gia stato registrato da questo dispositivo."
                : "Invito non valido o scaduto.",
        );
      } catch {
        setReferralClaimMessage("Invito non valido o non piu disponibile.");
      }
    };

    void claimReferral();
  }, [incomingReferralCode]);

  useEffect(() => {
    if (!referralUrl || (lives ?? 0) > 0) {
      return;
    }

    let cancelled = false;

    const pollLives = async () => {
      try {
        const response = await requestJson<CaptainChallengeLivesResponse>(
          "/api/game/lives",
        );

        if (cancelled) {
          return;
        }

        setLives(response.lives);

        if (response.lives > 0) {
          setGameId("");
          setResult(null);
          setPhase((currentPhase) =>
            currentPhase === "no_lives" ||
            currentPhase === "idle" ||
            currentPhase === "result"
              ? "idle"
              : currentPhase,
          );
          setReferralClaimMessage(
            "Un pirata ha aperto il tuo invito. Hai una nuova vita.",
          );
        }
      } catch {
        // Polling best effort: la sfida resta usabile anche se un controllo salta.
      }
    };

    const intervalId = window.setInterval(() => {
      void pollLives();
    }, referralLivesPollMs);

    void pollLives();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [lives, referralUrl]);

  const reset = useCallback(() => {
    clearExplosionTimer();
    setPhase(lives !== null && lives <= 0 ? "no_lives" : "idle");
    setGameId("");
    setResult(null);
    setError("");
  }, [clearExplosionTimer, lives]);

  const start = useCallback(async () => {
    if (lives !== null && lives <= 0) {
      setPhase("no_lives");
      return;
    }

    clearExplosionTimer();
    setPhase("starting");
    setGameId("");
    setResult(null);
    setError("");

    try {
      const response = await requestJson<CaptainChallengeStartResponse>(
        "/api/game/start",
        { method: "POST" },
      );

      setLives(response.livesRemaining);
      setGameId(response.gameId);
      setPhase("waiting");

      explosionTimerRef.current = window.setTimeout(() => {
        setPhase((currentPhase) =>
          currentPhase === "waiting" ? "go" : currentPhase,
        );
        explosionTimerRef.current = null;
      }, response.explosionDelayMs);
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Non siamo riusciti ad avviare la sfida.";

      setError(message);
      setPhase(message.toLowerCase().includes("vita") ? "no_lives" : "error");
      void loadLives();
    }
  }, [clearExplosionTimer, lives, loadLives]);

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

      setLives(response.livesRemaining);
      setResult(response);
      setPhase("result");
    } catch (tapError) {
      setError(
        tapError instanceof Error
          ? tapError.message
          : "Il Capitano non ha validato il tap.",
      );
      setPhase("error");
      void loadLives();
    }
  }, [clearExplosionTimer, gameId, loadLives, phase]);

  const createReferral = useCallback(async () => {
    setReferralLoading(true);
    setError("");

    try {
      const response =
        await requestJson<CaptainChallengeReferralCreateResponse>(
          "/api/game/referral/create",
          { method: "POST" },
        );

      setReferralUrl(response.referralUrl);
      setLives(response.lives);
    } catch (referralError) {
      setError(
        referralError instanceof Error
          ? referralError.message
          : "Non riesco a creare il link di arruolamento.",
      );
    } finally {
      setReferralLoading(false);
    }
  }, []);

  return {
    phase,
    gameId,
    result,
    error,
    lives,
    livesLoading,
    referralUrl,
    referralLoading,
    referralClaimMessage,
    start,
    tap,
    reset,
    createReferral,
    canTap: phase === "waiting" || phase === "go",
  };
}
