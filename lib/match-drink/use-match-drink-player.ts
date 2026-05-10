import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkMatch, 
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";

const STORAGE_KEY_SESSION_ID = "match-drink.sessionId";
const STORAGE_KEY_PLAYER_ID = "match-drink.playerId";
const STORAGE_KEY_PROFILE = "match-drink.profileData";

export function useMatchDrinkPlayer() {
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [player, setPlayer] = useState<MatchDrinkPlayer | null>(null);
  const [myMatch, setMyMatch] = useState<MatchDrinkMatch | null>(null);
  const [myAnswers, setMyAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<{
    nickname: string;
    tableNumber: string;
    ageRange: MatchDrinkPlayer["ageRange"];
    gender: MatchDrinkPlayer["gender"];
    relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
    lookingFor: MatchDrinkPlayer["lookingFor"];
    avatarUrl?: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Error parsing saved profile", e);
        }
      }
    }
    return null;
  });

  const refresh = useCallback(async () => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
    const storedPlayerId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (!storedSessionId || !storedPlayerId) {
      // Prova a recuperare la sessione attiva se non siamo ancora loggati
      try {
        const res = await fetch("/api/match-drink/active-session");
        if (res.ok) {
          const activeSession = await res.json();
          if (activeSession) {
            setSession(activeSession);
          }
        }
      } catch (err) {
        console.error("Error fetching discovery session:", err);
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/match-drink/session/${storedSessionId}/player/${storedPlayerId}`);
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

  const sessionRef = useRef<MatchDrinkSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;
    
    const init = async () => {
      if (!session) {
        await refresh();
      }
      
      // Usa l'ID dallo stato (discovery) o da localStorage
      const currentSessionId = session?.id || localStorage.getItem(STORAGE_KEY_SESSION_ID);
      if (!currentSessionId || !mounted) return;

      eventSource = new EventSource(`/api/match-drink/session/${currentSessionId}/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.session) {
             setSession(data.session);
          } else if (data.type === "session_update") {
            setSession(data.session);
          } else if (data.type === "player_update") {
            if (sessionRef.current?.stageMode === "reveal") {
              refresh();
            }
          } else if (data.type === "match_found") {
            setMyMatch(data.match);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        if (mounted) {
          eventSource?.close();
          setTimeout(init, 3000); // Reconnect
        }
      };
    };

    init();

    return () => {
      mounted = false;
      if (eventSource) eventSource.close();
    };
  }, [refresh, session?.id]);

  const join = async (nickname: string, details: {
    tableNumber: string;
    ageRange: MatchDrinkPlayer["ageRange"];
    gender: MatchDrinkPlayer["gender"];
    relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
    lookingFor: MatchDrinkPlayer["lookingFor"];
    publicConsent: boolean;
    avatarUrl?: string;
  }) => {
    setLoading(true);
    // Ottieni sessionId dalla sessione attiva se non disponibile (ma dovrebbe esserci caricata nel controller)
    // Nel controller viene passato il sessionId caricato. 
    // Aspetta, il controller non passa sessionId a join, lo pesca dal contesto? 
    // No, il controller lo prende da session.id.
    
    // Vediamo il controller di nuovo... line 59: return <JoinForm onJoin={join} ... />
    // JoinForm chiama onJoin(nickname, details).
    // Quindi 'join' deve sapere a quale sessione unirsi.
    // Usiamo l'ID della sessione caricata.
    
    const activeSessionId = session?.id;
    if (!activeSessionId) {
      setError("Nessuna sessione attiva trovata");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/match-drink/player/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          nickname,
          ...details
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore durante l'accesso");
      }

      const data = await res.json();
      localStorage.setItem(STORAGE_KEY_SESSION_ID, activeSessionId);
      localStorage.setItem(STORAGE_KEY_PLAYER_ID, data.id);
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({ nickname, ...details }));
      
      setPlayer(data);
      setSavedProfile({ nickname, ...details });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId: string, optionId: string) => {
    if (!player) return;
    try {
      const res = await fetch("/api/match-drink/player/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: player.sessionId,
          playerId: player.id,
          questionId,
          selectedOptionId: optionId,
        }),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      
      const data = await res.json();
      setMyAnswers(prev => {
        const other = prev.filter(a => a.questionId !== questionId);
        return [...other, data];
      });
    } catch (err) {
      console.error("Answer error:", err);
    }
  };

  const sendMessage = async (message: string, displayMode: "public" | "anonymous" | "nickname" = "public") => {
    if (!player) return;
    try {
      const res = await fetch(`/api/match-drink/session/${player.sessionId}/message/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: player.sessionId,
          playerId: player.id,
          message,
          displayMode: displayMode === "nickname" ? "public" : displayMode,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'invio");
    } catch (err) {
      console.error("Message error:", err);
      throw err;
    }
  };

  const respondToMatch = async (accepted: boolean) => {
    if (!player || !myMatch) return;
    try {
      const res = await fetch(`/api/match-drink/session/${player.sessionId}/match/${myMatch.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          accepted,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'accettazione");
      
      const data = await res.json();
      setMyMatch(data);
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  return {
    session,
    player,
    myMatch,
    myAnswers,
    loading,
    error,
    savedProfile,
    join,
    submitAnswer,
    sendMessage,
    respondToMatch,
    refresh,
    setSavedProfile
  };
}
