"use client";
import Link from "next/link";
import { Gamepad2, Music } from "lucide-react";
import { useEffect, useState } from "react";
import { liveGames, type LiveGameId, type LiveGameState } from "@/lib/live-game";

export default function GamesAdminPage() {
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/live-game").then((response) => response.json()).then((body) => setGame(body.game ?? null)).catch(() => setMessage("Impossibile caricare lo stato dei giochi."));
  }, []);

  const setActive = async (value: LiveGameId | null) => {
    const response = await fetch("/api/admin/live-game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: value }) });
    const body = await response.json();
    setMessage(response.ok ? value ? `${liveGames[value].label} attivo per 3 ore.` : "Nessun gioco attivo." : body.error ?? "Errore.");
    if (response.ok) setGame(body.game);
  };

  return <main className="p-6 pb-32 lg:p-10 text-white">
    <header className="mb-10"><p className="mb-2 text-xs font-black uppercase tracking-[.3em] text-[var(--accent-strong)]">Plancia Admin</p><h1 className="text-4xl font-black uppercase italic">Giochi Live</h1><p className="mt-2 text-sm font-semibold text-white/50">Gestisci le plance e scegli l’unico gioco mostrato nell’app per le prossime 3 ore.</p></header>
    <div className="grid max-w-2xl gap-4">
      <Link href="/admin/buzzer" className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#111] p-5 transition hover:border-white/20"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400"><Music /></span><span><strong className="block uppercase italic">Tortuga Music Quiz</strong><small className="mt-1 block text-white/50">Apri la plancia, assegna punti e controlla il buzzer.</small></span></Link>
      <section className="rounded-[1.5rem] border border-white/10 bg-[#111] p-5"><div className="mb-4 flex items-center gap-3"><Gamepad2 className="text-[var(--accent-strong)]"/><div><strong className="block uppercase italic">Gioco visibile nell’app</strong><small className="text-white/50">Un solo gioco può essere attivo.</small></div></div><div className="grid gap-3">{(Object.keys(liveGames) as LiveGameId[]).map((id) => <button key={id} type="button" onClick={() => void setActive(id)} className={`rounded-xl border p-4 text-left ${game?.active_game === id ? "border-[var(--accent-strong)] bg-[var(--accent-strong)]/15" : "border-white/15 bg-white/5"}`}><strong>{liveGames[id].label}</strong><span className="mt-1 block text-xs text-white/60">{liveGames[id].url}</span>{game?.active_game === id && game.expires_at ? <span className="mt-2 block text-xs font-bold text-[var(--accent-strong)]">Attivo fino alle {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(game.expires_at))}</span> : null}</button>)}<button type="button" onClick={() => void setActive(null)} className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/75">Disattiva gioco</button></div></section>
    </div>{message ? <p className="mt-4 text-sm text-[var(--accent-strong)]">{message}</p> : null}
  </main>;
}
