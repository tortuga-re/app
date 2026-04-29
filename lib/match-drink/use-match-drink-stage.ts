import { useEffect, useState, useCallback, useRef } from "react";
import { 
  MatchDrinkAnswer, 
  MatchDrinkBottleMessage, 
  MatchDrinkPlayer, 
  MatchDrinkSession 
} from "./types";

export function useMatchDrinkStage(sessionId: string) {
  const [session, setSession] = useState<MatchDrinkSession | null>(null);
  const [players, setPlayers] = useState<MatchDrinkPlayer[]>([]);
  const [answers, setAnswers] = useState<MatchDrinkAnswer[]>([]);
  const [currentMessage, setCurrentMessage] = useState<MatchDrinkBottleMessage | null>(null);
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
      setLoading(false);
    } catch (err) {
      console.error("Stage poll error:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    pollingRef.current = setInterval(refresh, 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh]);

  return { session, players, answers, currentMessage, loading };
}
