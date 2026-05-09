"use client";

import { useEffect, useState } from "react";
import { MatchDrinkStage } from "@/components/match-drink/MatchDrinkStage";

export default function MatchDrinkLiveStagePage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch("/api/match-drink/active-session");
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setActiveSessionId(data.id);
          } else {
            setActiveSessionId(null);
          }
        }
      } catch (err) {
        console.error("Error checking active Match & Drink session:", err);
      } finally {
        setLoading(false);
      }
    };

    checkActive();
    const interval = setInterval(checkActive, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--accent-strong)] animate-pulse uppercase tracking-[0.5em]">Tortuga Match & Drink</p>
      </div>
    );
  }

  if (!activeSessionId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-12">
        <h1 className="text-6xl font-black gold-gradient uppercase italic mb-8">Match & Drink</h1>
        <div className="panel p-12 rounded-[3rem] border-white/10 bg-white/5 backdrop-blur-md">
          <p className="text-3xl text-white font-bold uppercase tracking-tight mb-4">Nessuna sessione attiva</p>
          <p className="text-xl text-[var(--text-muted)] uppercase tracking-widest">
            Lo Stage si attiverà automaticamente quando il Capitano aprirà una nuova partita.
          </p>
        </div>
      </div>
    );
  }

  return <MatchDrinkStage sessionId={activeSessionId} />;
}
