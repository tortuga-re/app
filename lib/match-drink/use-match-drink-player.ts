import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkMatch, 
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";
import { getSupabase } from "./supabase";

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
  const lastUpdatedAtRef = useRef<string>("");
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
    const currentSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
    const currentPlayerId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (!currentSessionId || !currentPlayerId) {
      if (!currentSessionId) {
        // Proviamo a recuperare la sessione attiva se non ne abbiamo una
        try {
          const activeRes = await fetch("/api/match-drink/session/active", { cache: "no-store" });
          if (activeRes.ok) {
            const activeData = await activeRes.json();
            if (activeData.session) {
              setSession(activeData.session);
            }
          }
        } catch (e) {
          console.error("Error fetching active session", e);
        }
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/match-drink/session/${currentSessionId}/status/${currentPlayerId}`, { cache: "no-store" });
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
      if (data.session) {
        if (!lastUpdatedAtRef.current || data.session.updatedAt >= lastUpdatedAtRef.current) {
          if (data.session.updatedAt) lastUpdatedAtRef.current = data.session.updatedAt;
          setSession(data.session);
        }
        setPlayer(data.player);
        setMyAnswers(data.answers);
        setMyMatch(data.match);
      }
      setError(null);
    } catch (err) {
      console.error("Match & Drink refresh error:", err);
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
    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    const init = async () => {
      await refresh();
      if (!mounted) return;

      const currentSessionId = session?.id || localStorage.getItem(STORAGE_KEY_SESSION_ID);

      if (currentSessionId) {
        channel = supabase
          .channel(`match-drink-${currentSessionId}`)
          .on("broadcast", { event: "session_update" }, ({ payload }: { payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (mounted && payload) {
              if (!lastUpdatedAtRef.current || !payload.updatedAt || payload.updatedAt >= lastUpdatedAtRef.current) {
                if (payload.updatedAt) lastUpdatedAtRef.current = payload.updatedAt;
                setSession(prev => prev ? { ...prev, ...payload } : prev);
              }
            }
          })
          .on("broadcast", { event: "match_updated" }, () => {
            if (mounted) refresh();
          })
          .on("broadcast", { event: "matches_stored" }, () => {
            if (mounted) refresh();
          })
          .subscribe();
      }
    };

    init();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, session?.id]);

  const join = async (nickname: string, details: {
    tableNumber: string;
    ageRange: MatchDrinkPlayer["ageRange"];
    gender: MatchDrinkPlayer["gender"];
    relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
    lookingFor: MatchDrinkPlayer["lookingFor"];
    email?: string;
    phone?: string;
    publicConsent: boolean;
    avatarUrl?: string;
  }) => {
    const activeSessionId = sessionRef.current?.id ?? session?.id;
    if (!activeSessionId) {
      const message = "Nessuna sessione attiva trovata";
      setError(message);
      throw new Error(message);
    }

    try {
      const res = await fetch(`/api/match-drink/session/${activeSessionId}/join`, {
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
    }
  };

  const submitAnswer = async (questionId: string, optionId: string) => {
    if (!player) return;
    try {
      const res = await fetch(`/api/match-drink/session/${player.sessionId}/answer`, {
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
      const res = await fetch(`/api/match-drink/session/${player.sessionId}/accept-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: myMatch.id,
          playerId: player.id,
          accepted,
        }),
      });
      if (!res.ok) throw new Error("Errore nell'accettazione");
      await refresh();
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
