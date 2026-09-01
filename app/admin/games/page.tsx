"use client";

import { Gamepad2, Radio, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";

import { liveGames, type LiveGameId, type LiveGameState } from "@/lib/live-game";
import { formatTime } from "@/lib/utils";

export default function GamesAdminPage() {
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await fetch("/api/admin/live-game", { cache: "no-store" });
      const body = await response.json();
      setGame(body.game ?? null);
    } catch {
      setMessage("Impossibile leggere lo stato dei giochi.");
    }
  };

  useEffect(() => {
    // Initial asynchronous synchronization with the admin API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const setActive = async (value: LiveGameId | null) => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/live-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: value }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Operazione non riuscita.");
      setGame(body.game ?? null);
      setMessage(value ? `${liveGames[value].label} è visibile nell'app per 3 ore.` : "Istruzioni gioco disattivate.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#f4efe5] p-5 text-[var(--text)] md:p-8 lg:p-10">
    <header className="max-w-3xl"><p className="eyebrow">Operatività serata</p><h1 className="mt-2 font-display text-4xl">Giochi Live</h1><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Può essere attivo un solo gioco alla volta. Le istruzioni restano visibili nell’app per tre ore, anche fuori dal locale.</p></header>
    <section className="mt-7 grid max-w-3xl gap-4 md:grid-cols-2">{(Object.keys(liveGames) as LiveGameId[]).map((id) => { const definition = liveGames[id]; const active = game?.active_game === id; return <button key={id} type="button" onClick={() => void setActive(id)} disabled={busy} className={`rounded-[2rem] border p-6 text-left transition ${active ? "border-[var(--accent)] bg-[#f2e5d5] shadow-[0_12px_28px_rgba(165,43,43,.12)]" : "border-[var(--border)] bg-[#fffdf8] hover:border-[var(--accent)]/40"}`}><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><Gamepad2 size={21} /></span>{active ? <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-white">Attivo</span> : null}</div><h2 className="mt-6 font-display text-2xl">{definition.label}</h2><p className="mt-2 break-all text-sm text-[var(--text-muted)]">{definition.url}</p>{active && game?.expires_at ? <p className="mt-5 flex items-center gap-2 text-xs font-bold text-[var(--accent)]"><TimerReset size={15} />Scade alle {formatTime(game.expires_at)}</p> : null}</button>})}</section>
    <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-3"><button type="button" className="button-secondary inline-flex min-h-11 items-center gap-2 px-5" onClick={() => void setActive(null)} disabled={busy}><Radio size={16} />Disattiva gioco</button>{message ? <p className="text-sm font-semibold text-[var(--accent)]">{message}</p> : null}</div>
  </main>;
}
