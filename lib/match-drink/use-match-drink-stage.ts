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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/match-drink/session/${sessionId}/stage-status`);
      if (!res.ok) return;
      const data = await res.json();
      setSession(data.session);
      setPlayers(data.players);
      setAnswers(data.answers);
      setCurrentMessage(data.currentMessage);
      setMessages(data.messages || []);
      setMatches(data.matches || []);
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
      .on("broadcast", { event: "session_update" }, ({ payload }) => {
        if (mounted && payload) {
          setSession(prev => prev ? { ...prev, ...payload } : prev);
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
