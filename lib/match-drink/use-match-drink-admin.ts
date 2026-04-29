import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkBottleMessage, 
  MatchDrinkMatch, 
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";

const STORAGE_KEY_ADMIN_PIN = "match-drink.adminPin";

export function useMatchDrinkAdmin(sessionId?: string) {
  const [pin, setPin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_ADMIN_PIN) || "";
    }
    return "";
  });
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [players, setPlayers] = useState<MatchDrinkPlayer[]>([]);
  const [messages, setMessages] = useState<MatchDrinkBottleMessage[]>([]);
  const [matches, setMatches] = useState<MatchDrinkMatch[]>([]);
  const [answers, setAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const savePin = (newPin: string) => {
    setPin(newPin);
    localStorage.setItem(STORAGE_KEY_ADMIN_PIN, newPin);
  };

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      // Consolidated status for admin too? Yes, let's create it.
      const res = await fetch(`/api/match-drink/session/${sessionId}/admin-status?pin=${pin}`);
      if (!res.ok) {
        if (res.status === 401) setError("PIN non valido");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setPlayers(data.players);
      setMessages(data.messages);
      setMatches(data.matches);
      setAnswers(data.answers);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Admin poll error:", err);
    }
  }, [sessionId, pin]);

  useEffect(() => {
    let mounted = true;

    const initialRefresh = async () => {
      if (sessionId && pin) {
        await refresh();
        if (mounted) {
          pollingRef.current = setInterval(refresh, 2000);
        }
      } else {
        setLoading(false);
      }
    };

    initialRefresh();

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, pin, refresh]);

  const apiCall = async (endpoint: string, body: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/match-drink/session/${sessionId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, ...body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Operazione fallita");
      }
      if (endpoint !== "delete") {
        await refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operazione fallita";
      setError(message);
      throw err;
    }
  };

  return {
    pin,
    savePin,
    session,
    players,
    messages,
    matches,
    answers,
    loading,
    error,
    refresh,
    start: () => apiCall("start"),
    nextQuestion: (index: number) => apiCall("next-question", { index }),
    updateStageMode: (mode: string, msgId?: string) => apiCall("stage-mode", { stageMode: mode, currentStageMessageId: msgId }),
    calculateMatches: () => apiCall("calculate-matches"),
    seedMessage: () => apiCall("seed-message"),
    sendCaptainMessage: (msg: string) => apiCall("captain-message", { message: msg }),
    moderateMessage: (id: string, action: string, text?: string) => apiCall("message/moderate", { messageId: id, action, approvedText: text }),
    redeemDrink: (matchId: string) => apiCall("redeem-drink", { matchId }),
    deleteSession: () => apiCall("delete"),
    updateStatus: (status: string) => apiCall("status", { status }),
  };
}
