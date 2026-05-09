"use client";

import { useEffect, useState } from "react";
import { BuzzerStage } from "@/components/live-buzzer/BuzzerStage";
import { MatchDrinkStage } from "@/components/match-drink/MatchDrinkStage";

export default function SmartStagePage() {
  const [status, setStatus] = useState<{ buzzer: boolean; matchDrink: boolean; matchDrinkId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [statusRes, mdRes] = await Promise.all([
          fetch("/api/game/active-status"),
          fetch("/api/match-drink/active-session")
        ]);
        
        const statusData = await statusRes.json();
        const mdData = await mdRes.json();

        setStatus({
          buzzer: statusData.buzzer,
          matchDrink: statusData.matchDrink,
          matchDrinkId: mdData?.id
        });
      } catch (err) {
        console.error("Smart Stage status check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--accent-strong)] animate-pulse uppercase tracking-[0.5em] font-black">Tortuga Smart Stage</p>
      </div>
    );
  }

  // Se il Buzzer è live, ha la priorità (per ora)
  if (status?.buzzer) {
    return <BuzzerStage />;
  }

  // Altrimenti se Match & Drink è live e abbiamo un ID
  if (status?.matchDrink && status.matchDrinkId) {
    return <MatchDrinkStage sessionId={status.matchDrinkId} />;
  }

  // Schermo IDLE se nulla è attivo
  return (
    <main className="h-screen bg-black text-white flex flex-col overflow-hidden select-none relative">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.15),transparent_70%)] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(178,122,52,0.05),transparent_60%)]" />
      </div>

      <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="space-y-12 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-4">
            <h1 className="text-[10vw] font-black italic gold-gradient leading-none tracking-tighter">
              TORTUGA
            </h1>
            <p className="text-4xl md:text-5xl font-black text-white uppercase tracking-[0.3em] opacity-80">
              STAGE CENTER
            </p>
          </div>

          <div className="h-px w-64 bg-[var(--accent-strong)]/30 mx-auto" />

          <div className="space-y-6">
            <p className="text-2xl text-[var(--text-muted)] font-bold uppercase tracking-widest animate-pulse">
              In attesa del prossimo evento...
            </p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-3 h-3 rounded-full bg-[var(--accent-strong)]/50 animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-12 left-0 w-full">
           <p className="text-[var(--text-muted)] text-sm uppercase tracking-[0.2em] font-black">
             Il contenuto cambierà automaticamente all&apos;avvio di una sfida.
           </p>
        </div>
      </div>
    </main>
  );
}
