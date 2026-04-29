import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkMatch, 
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";

const STORAGE_KEY_SESSION_ID = "match-drink.sessionId";
const STORAGE_KEY_PLAYER_ID = "match-drink.playerId";

export function useMatchDrinkPlayer() {
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [player, setPlayer] = useState<MatchDrinkPlayer | null>(null);
  const [myMatch, setMyMatch] = useState<MatchDrinkMatch | null>(null);
  const [myAnswers, setMyAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
    const storedPlayerId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (!storedSessionId || !storedPlayerId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/match-drink/session/${storedSessionId}/status/${storedPlayerId}`);
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem(STORAGE_KEY_SESSION_ID);
          localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
          setSession(null);
          setPlayer(null);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSession(data.session);
      setPlayer(data.player);
      setMyAnswers(data.answers);
      setMyMatch(data.match);
      setError(null);
    } catch (err) {
      console.error("Poll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const initialRefresh = async () => {
      await refresh();
      if (mounted) {
        pollingRef.current = setInterval(refresh, 1000);
      }
    };

    initialRefresh();

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh]);

  const join = async (
    joinCode: string, 
    nickname: string, 
    details: {
      tableNumber: string;
      ageRange: MatchDrinkPlayer["ageRange"];
      gender: MatchDrinkPlayer["gender"];
      relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
      lookingFor: MatchDrinkPlayer["lookingFor"];
      publicConsent: boolean;
    }
  ) => {
    try {
      // 1. Get session by join code
      const sessRes = await fetch(`/api/match-drink/session/by-code/${joinCode.toUpperCase()}`);
      if (!sessRes.ok) throw new Error("Codice sessione non valido");
      const sessData = await sessRes.json();

      // 2. Join
      const joinRes = await fetch(`/api/match-drink/session/${sessData.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, ...details }),
      });
      if (!joinRes.ok) throw new Error("Errore durante l'ingresso");
      const playerData = await joinRes.json();

      localStorage.setItem(STORAGE_KEY_SESSION_ID, sessData.id);
      localStorage.setItem(STORAGE_KEY_PLAYER_ID, playerData.id);
      
      setSession(sessData);
      setPlayer(playerData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante l'ingresso";
      setError(message);
      throw err;
    }
  };

  const submitAnswer = async (questionId: string, optionId: string) => {
    if (!session || !player) return;
    try {
      const res = await fetch(`/api/match-drink/session/${session.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          questionId,
          selectedOptionId: optionId,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'invio della risposta");
      const answer = await res.json();
      setMyAnswers(prev => [...prev.filter(a => a.questionId !== questionId), answer]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nell'invio della risposta";
      setError(message);
    }
  };

  const respondToMatch = async (accepted: boolean) => {
    if (!session || !player || !myMatch) return;
    try {
      const res = await fetch(`/api/match-drink/session/${session.id}/accept-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: myMatch.id,
          playerId: player.id,
          accepted,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'invio della scelta");
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nell'invio della scelta";
      setError(message);
    }
  };

  const sendMessage = async (text: string, displayMode: "anonymous" | "nickname") => {
    if (!session || !player) return;
    try {
      const res = await fetch(`/api/match-drink/session/${session.id}/message/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          message: text,
          displayMode,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'invio del messaggio");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nell'invio del messaggio";
      setError(message);
      throw err;
    }
  };

  return {
    session,
    player,
    myMatch,
    myAnswers,
    loading,
    error,
    join,
    submitAnswer,
    respondToMatch,
    sendMessage,
  };
}
