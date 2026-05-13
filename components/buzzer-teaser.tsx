"use client";

import Link from "next/link";
import { useActiveGamesStatus } from "@/lib/game/use-active-games";

export function BuzzerTeaser() {
  const { buzzer: isLive } = useActiveGamesStatus();

  if (!isLive) return null;

  return (
    <div
      id="tortuga-music-quiz"
      className="panel hash-scroll-target rounded-[2rem] p-5 border-2 border-[var(--accent-strong)]/40 bg-[var(--accent-strong)]/5 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="space-y-4">
        <div>
          <p className="eyebrow text-[var(--accent-strong)]">🎵 Evento Live</p>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            Tortuga Music Quiz
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            La partita è in corso! Unisciti subito al quiz musicale, premi il
            buzzer e scala la classifica!
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-xs font-bold text-green-400 uppercase tracking-widest">
            Partita in corso
          </p>
        </div>

        <Link
          href="/game/buzzer"
          className="button-primary w-full py-3 text-xs font-black uppercase tracking-widest text-center block"
        >
          Partecipa al Tortuga Music Quiz →
        </Link>
      </div>
    </div>
  );
}
