import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkBottleMessage, 
  MatchDrinkForecastSummary,
  MatchDrinkMatch, 
  MatchDrinkMeetingTableOption,
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";
import { getSupabase } from "./supabase";
import {
  applyModeratedMessage,
  mergeMessages,
  upsertMessage,
  type MatchDrinkMessageModeratedPayload
} from "./message-state";

export function useMatchDrinkAdmin(sessionId?: string) {
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [players, setPlayers] = useState<MatchDrinkPlayer[]>([]);
  const [messages, setMessages] = useState<MatchDrinkBottleMessage[]>([]);
  const [matches, setMatches] = useState<MatchDrinkMatch[]>([]);
  const [answers, setAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [forecast, setForecast] = useState<MatchDrinkForecastSummary | null>(null);
  const [meetingTableOptions, setMeetingTableOptions] = useState<MatchDrinkMeetingTableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const lastUpdatedAtRef = useRef<string>("");
  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/match-drink/session/${sessionId}/admin-status?t=${Date.now()}`);
      if (!res.ok) {
        if (res.status === 401) setError("Sessione admin scaduta");
        return;
      }
      const data = await res.json();
      if (data.session) {
        if (!lastUpdatedAtRef.current || data.session.updatedAt >= lastUpdatedAtRef.current) {
          if (data.session.updatedAt) lastUpdatedAtRef.current = data.session.updatedAt;
          setSession(data.session);
        }
        setPlayers(data.players);
        setMessages(prev => mergeMessages(prev, data.messages || []));
        setMatches(data.matches);
        setAnswers(data.answers);
        setForecast(data.forecast ?? null);
        setMeetingTableOptions(data.meetingTableOptions ?? []);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error("Admin poll error:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    const initialRefresh = async () => {
      if (sessionId) {
        await refresh();
        if (mounted) {
          pollingRef.current = setInterval(refresh, 3000); // 3s backup
        }
      } else {
        setLoading(false);
      }
    };

    initialRefresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    if (sessionId) {
      channel = supabase
        .channel(`match-drink-${sessionId}`)
        .on("broadcast", { event: "new_answer" }, () => void refresh())
        .on("broadcast", { event: "new_message" }, ({ payload }) => {
          if (mounted && payload) {
            setMessages(prev => upsertMessage(prev, payload));
          }
          void refresh();
        })
        .on("broadcast", { event: "message_moderated" }, ({ payload }: { payload: MatchDrinkMessageModeratedPayload }) => {
          if (mounted && payload) {
            setMessages(prev => applyModeratedMessage(prev, payload));
          }
          void refresh();
        })
        .on("broadcast", { event: "match_updated" }, () => void refresh())
        .on("broadcast", { event: "player_joined" }, () => void refresh())
        .on("broadcast", { event: "session_update" }, ({ payload }: { payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (mounted && payload) {
            if (!lastUpdatedAtRef.current || !payload.updatedAt || payload.updatedAt >= lastUpdatedAtRef.current) {
              if (payload.updatedAt) lastUpdatedAtRef.current = payload.updatedAt;
              setSession(prev => prev ? { ...prev, ...payload } : prev);
              void refresh(); // Forza aggiornamento completo per catturare messaggi evidenziati ecc
            }
          }
        })
        .subscribe();
    }

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  const apiCall = async (endpoint: string, body: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/match-drink/session/${sessionId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    session,
    players,
    messages,
    matches,
    answers,
    forecast,
    meetingTableOptions,
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
    toggleMessages: (enabled: boolean) => apiCall("settings", { bottleMessagesEnabled: enabled }),
    updateExcludedMeetingTables: (excludedMeetingTables: string[]) =>
      apiCall("settings", { excludedMeetingTables }),
  };
}
