import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkBottleMessage, 
  MatchDrinkMatch,
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";
import { getSupabase } from "./supabase";

export function useMatchDrinkStage(sessionId: string) {
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [players, setPlayers] = useState<MatchDrinkPlayer[]>([]);
  const [answers, setAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [currentMessage, setCurrentMessage] = useState<MatchDrinkBottleMessage | null>(null);
  const [messages, setMessages] = useState<MatchDrinkBottleMessage[]>([]);
  const [matches, setMatches] = useState<MatchDrinkMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const lastUpdatedAtRef = useRef<string>("");
  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/match-drink/session/${sessionId}/stage-status?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.session && (!lastUpdatedAtRef.current || data.session.updatedAt >= lastUpdatedAtRef.current)) {
          if (data.session.updatedAt) lastUpdatedAtRef.current = data.session.updatedAt;
          setSession(data.session);
          setCurrentMessage(data.currentMessage);
          setMessages(data.messages || []);
          setMatches(data.matches || []);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Stage poll error:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();
    const channelName = `match-drink-${sessionId}`;

    const initialRefresh = async () => {
      await refresh();
      if (mounted) {
        pollingRef.current = setInterval(refresh, 2000); // Riduciamo polling ora che c'è Realtime
      }
    };

    initialRefresh();

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "session_update" }, ({ payload }: { payload: any }) => {
        if (mounted && payload) {
          if (!lastUpdatedAtRef.current || !payload.updatedAt || payload.updatedAt >= lastUpdatedAtRef.current) {
            if (payload.updatedAt) lastUpdatedAtRef.current = payload.updatedAt;
            setSession(prev => prev ? { ...prev, ...payload } : prev);
            // Se l'aggiornamento contiene un nuovo messaggio da mostrare, forziamo il refresh per caricarlo
            if (payload.currentStageMessageId) {
              void refresh();
            }
          }
        }
      })
      .on("broadcast", { event: "new_answer" }, () => {
        void refresh(); // Quando arriva una risposta, aggiorniamo i dati
      })
      .on("broadcast", { event: "message_moderated" }, () => {
        void refresh(); // Quando un messaggio viene approvato
      })
      .subscribe();

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      void supabase.removeChannel(channel);
    };
  }, [refresh, sessionId]);

  return { session, players, answers, currentMessage, messages, matches, loading };
}
