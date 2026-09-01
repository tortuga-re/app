"use client";

import Link from "next/link";
import {
  Activity,
  BellRing,
  Camera,
  ChevronRight,
  FileCheck2,
  HeartPulse,
  Newspaper,
  RefreshCw,
  Send,
  Tv,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PanicButton } from "@/components/admin/panic-button";

type DashboardData = {
  receiptsPending: number;
  photosPending: number;
  pushSubscriptions: number;
  pushScheduled: number;
  liveTvMediaAssets: number;
  savedPushSegments: number;
  savedPushCampaigns: number;
  liveTvMode: string;
  liveTvScheduleEnabled: boolean;
  liveGame: { active_game: string | null; expires_at: string | null } | null;
  activeHighlight: { title: string; starts_at: string; ends_at: string | null } | null;
  health: Record<string, { ok: boolean; detail: string }>;
  recentActivity: { id: string; action: string; detail: string; createdAt: string }[];
};

const quickActions = [
  { key: "photosPending", label: "Foto Live da valutare", href: "/admin/live-tv#foto-live", Icon: Camera },
  { key: "receiptsPending", label: "Scontrini da verificare", href: "/admin/scontrini", Icon: FileCheck2 },
  { key: "pushScheduled", label: "Push programmati", href: "/admin/push", Icon: Send },
] as const;

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) setError(body?.error ?? "Cruscotto non disponibile.");
    else setData(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial asynchronous synchronization with the dashboard API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const gameLabel = data?.liveGame?.active_game
    ? data.liveGame.active_game === "cervellone" ? "Cervellone" : "Kantaquiz"
    : "Nessun gioco";

  return (
    <main className="min-h-screen bg-[#f4efe5] p-5 text-[var(--text)] md:p-8 lg:p-10">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Plancia di comando</p>
          <h1 className="mt-2 font-display text-4xl leading-none text-[var(--text)]">Buon comando, Capitano.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Tutto ciò che serve per la serata, ordinato per priorità.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="button-secondary inline-flex min-h-11 items-center gap-2 px-4" disabled={loading}>
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Aggiorna
        </button>
      </header>

      {error ? <p className="mb-5 rounded-2xl border border-[var(--danger-soft)] bg-white p-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="mb-6 rounded-[2rem] border border-[var(--border)] bg-[#fffdf8] p-6 shadow-[0_12px_35px_rgba(58,44,24,.07)]">
        <p className="eyebrow">Quadro operativo</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/admin/scontrini" className="rounded-[1.35rem] border border-[var(--border)] bg-[#f4efe5] p-4 transition hover:border-[var(--accent)]/35"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">Ricevute in attesa</p><strong className="mt-2 block text-3xl">{data?.receiptsPending ?? "—"}</strong></Link>
          <Link href="/admin/push" className="rounded-[1.35rem] border border-[var(--border)] bg-[#f4efe5] p-4 transition hover:border-[var(--accent)]/35"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">Push registrate</p><strong className="mt-2 block text-3xl">{data?.pushSubscriptions ?? "—"}</strong></Link>
          <Link href="/admin/media" className="rounded-[1.35rem] border border-[var(--border)] bg-[#f4efe5] p-4 transition hover:border-[var(--accent)]/35"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">Media in libreria</p><strong className="mt-2 block text-3xl">{data?.liveTvMediaAssets ?? "—"}</strong></Link>
          <Link href="/admin/push" className="rounded-[1.35rem] border border-[var(--border)] bg-[#f4efe5] p-4 transition hover:border-[var(--accent)]/35"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">Campagne push</p><strong className="mt-2 block text-2xl">{data?.savedPushCampaigns ?? "—"} template</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">Segmenti salvati: {data?.savedPushSegments ?? "—"}</span></Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Link href="/admin/live-tv" className="rounded-[2rem] border border-[var(--border)] bg-[#fffdf8] p-6 shadow-[0_12px_35px_rgba(58,44,24,.07)] transition hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">In diretta</p><h2 className="mt-2 font-display text-3xl">Live TV</h2></div><Tv className="text-[var(--accent)]" size={28} /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--text-muted)]">Schermo</p><p className="mt-1 font-bold">{data?.liveTvMode ?? "—"}</p></div><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--text-muted)]">Palinsesto</p><p className="mt-1 font-bold">{data?.liveTvScheduleEnabled ? "Automatico" : "Manuale"}</p></div><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--text-muted)]">Gioco app</p><p className="mt-1 font-bold">{gameLabel}</p></div></div>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-black text-[var(--accent)]">Apri plancia <ChevronRight size={16} /></span>
        </Link>

        <Link href="/admin/highlights" className="rounded-[2rem] border border-[var(--border)] bg-[#eee3cf] p-6 transition hover:-translate-y-0.5"><Newspaper className="text-[var(--accent)]" size={25} /><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">Contenuto live</p><h2 className="mt-2 font-display text-2xl">{data?.activeHighlight?.title ?? "Nessun contenuto attivo"}</h2><p className="mt-3 text-sm text-[var(--text-muted)]">Gestisci ciò che compare in evidenza nell’app.</p></Link>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {quickActions.map(({ key, label, href, Icon }) => <Link key={key} href={href} className="flex min-h-28 items-center gap-4 rounded-[1.65rem] border border-[var(--border)] bg-[#fffdf8] p-5 transition hover:border-[var(--accent)]/35"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={20} /></span><span><strong className="block text-2xl">{data?.[key] ?? "—"}</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">{label}</span></span></Link>)}
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[#fffdf8] p-6"><div className="flex items-center gap-2"><Activity size={20} className="text-[var(--accent)]" /><h2 className="font-display text-2xl">Ultime azioni</h2></div><div className="mt-5 space-y-2">{data?.recentActivity?.length ? data.recentActivity.map((item) => <div key={item.id} className="rounded-2xl bg-[#f4efe5] px-4 py-3"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{item.action}</strong><time className="text-[10px] text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString("it-IT")}</time></div><p className="mt-1 text-xs text-[var(--text-muted)]">{item.detail}</p></div>) : <p className="text-sm text-[var(--text-muted)]">Nessuna azione recente.</p>}</div></div>
        <div className="space-y-5"><div className="rounded-[2rem] border border-[var(--border)] bg-[#fffdf8] p-6"><div className="flex items-center gap-2"><HeartPulse size={20} className="text-[var(--accent)]" /><h2 className="font-display text-2xl">Servizi</h2></div><div className="mt-4 space-y-2">{Object.entries(data?.health ?? {}).map(([name, status]) => <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-[#f4efe5] px-3 py-2"><span className="text-sm font-bold capitalize">{name}</span><span className={status.ok ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-[var(--accent)]"}>{status.ok ? "Operativo" : "Attenzione"}</span></div>)}</div></div><div className="rounded-[2rem] border border-[rgba(177,43,43,.25)] bg-[#fff8f5] p-6"><p className="eyebrow text-[var(--accent)]">Emergenza</p><div className="mt-4"><PanicButton /></div></div><Link href="/admin/push" className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[#fffdf8] p-4"><BellRing className="text-[var(--accent)]" /><span><strong className="block">{data?.pushSubscriptions ?? "—"} dispositivi push</strong><small className="text-[var(--text-muted)]">Apri notifiche e campagne</small></span></Link></div>
      </section>
    </main>
  );
}
