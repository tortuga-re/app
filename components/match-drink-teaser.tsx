"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function MatchDrinkTeaser() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/game/active-status", { cache: "no-store" });
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setIsLive(!!data.matchDrink);
        }
      } catch (err) {
        console.error("Polling error in MatchDrink teaser", err);
      }
    };

    void fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 10000); // Polling ogni 10 secondi

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!isLive) return null;

  return (
    <div
      id="match-drink-live"
      className="panel hash-scroll-target rounded-[2rem] p-5 border-2 border-[#D8B06A]/40 bg-[#D8B06A]/5 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="space-y-4">
        <div>
          <p className="eyebrow text-[#D8B06A]">🍸 Evento Live</p>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            Match & Drink
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Nuove amicizie o anima gemella? Incontra persone che condividono i tuoi stessi interessi stasera al Tortuga!
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-xs font-bold text-green-400 uppercase tracking-widest">
            Sessione Aperta
          </p>
        </div>

        <Link
          href="/game/match-drink"
          className="button-primary w-full py-3 text-xs font-black uppercase tracking-widest text-center block"
          style={{ backgroundColor: '#D8B06A', borderColor: '#D8B06A', color: '#000' }}
        >
          Partecipa al Match & Drink →
        </Link>
      </div>
    </div>
  );
}
