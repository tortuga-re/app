"use client";

import Link from "next/link";
import { Activity, BellRing, Camera, FileCheck2, Gamepad2, HeartPulse, Newspaper, RefreshCw, Send, Tv } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PanicButton } from "@/components/admin/panic-button";

type DashboardData = {
  receiptsPending: number;
  photosPending: number;
  pushSubscriptions: number;
  pushScheduled: number;
  liveTvMode: string;
  liveGame: { active_game: string | null; expires_at: string | null } | null;
  activeHighlight: { title: string; starts_at: string; ends_at: string | null } | null;
  health: Record<string, { ok: boolean; detail: string }>;
  recentActivity: { id: string; action: string; detail: string; createdAt: string }[];
};

const cards = [
  { key: "photosPending", label: "Foto Live in attesa", href: "/admin/live-tv", Icon: Camera },
  { key: "receiptsPending", label: "Scontrini da verificare", href: "/admin/scontrini", Icon: FileCheck2 },
  { key: "pushScheduled", label: "Push programmati", href: "/admin/push", Icon: Send },
] as const;

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) setError(body?.error ?? "Dashboard non disponibile."); else setData(body);
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return <main className="min-h-screen bg-[#0a0a0a] p-5 text-white md:p-8">
    <div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow">Situazione in tempo reale</p><h1 className="mt-2 text-3xl font-black">Cruscotto</h1></div><button type="button" onClick={() => void load()} className="button-secondary inline-flex min-h-11 items-center gap-2 px-4" disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} />Aggiorna</button></div>
    {error ? <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/admin/games" className="rounded-2xl border border-white/10 bg-white/5 p-5"><Gamepad2 className="text-[var(--accent-strong)]" /><p className="mt-4 text-xs uppercase tracking-widest text-white/50">Gioco attivo</p><strong className="mt-1 block text-xl">{data?.liveGame?.active_game ?? "Nessuno"}</strong><span className="mt-2 block text-xs text-white/50">{data?.liveGame?.expires_at ? `Scade ${new Date(data.liveGame.expires_at).toLocaleString("it-IT")}` : "Nessuna scadenza"}</span></Link>
      <Link href="/admin/highlights" className="rounded-2xl border border-white/10 bg-white/5 p-5"><Newspaper className="text-[var(--accent-strong)]" /><p className="mt-4 text-xs uppercase tracking-widest text-white/50">Editoriale live</p><strong className="mt-1 block text-xl">{data?.activeHighlight?.title ?? "Nessuno"}</strong><span className="mt-2 block text-xs text-white/50">Stato pubblico attuale</span></Link>
      {cards.map(({ key, label, href, Icon }) => <Link key={key} href={href} className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon className="text-[var(--accent-strong)]" /><p className="mt-4 text-xs uppercase tracking-widest text-white/50">{label}</p><strong className="mt-1 block text-3xl">{data?.[key] ?? "—"}</strong></Link>)}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><BellRing className="text-[var(--accent-strong)]" /><p className="mt-4 text-xs uppercase tracking-widest text-white/50">Dispositivi push</p><strong className="mt-1 block text-3xl">{data?.pushSubscriptions ?? "—"}</strong></div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><Tv className="text-[var(--accent-strong)]" /><p className="mt-4 text-xs uppercase tracking-widest text-white/50">Stato schermo</p><strong className="mt-1 block text-xl">{data?.liveTvMode ?? "—"}</strong></div>
    </div>

    <section id="health" className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2"><HeartPulse className="text-[var(--accent-strong)]" /><h2 className="text-xl font-black">Health servizi</h2></div><div className="grid gap-3 md:grid-cols-2">{Object.entries(data?.health ?? {}).map(([name, status]) => <div key={name} className="flex items-center justify-between rounded-xl bg-black/20 p-4"><div><strong className="capitalize">{name}</strong><p className="mt-1 text-xs text-white/50">{status.detail}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${status.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{status.ok ? "Operativo" : "Attenzione"}</span></div>)}</div></section>

    <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto]"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2"><Activity className="text-[var(--accent-strong)]" /><h2 className="text-xl font-black">Ultime azioni</h2></div><div className="space-y-2">{data?.recentActivity?.length ? data.recentActivity.map((item) => <div key={item.id} className="rounded-xl bg-black/20 p-3"><div className="flex justify-between gap-3"><strong className="text-sm">{item.action}</strong><time className="text-[10px] text-white/40">{new Date(item.createdAt).toLocaleString("it-IT")}</time></div><p className="mt-1 text-xs text-white/50">{item.detail}</p></div>) : <p className="text-sm text-white/50">Nessuna azione registrata.</p>}</div></div><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5"><h2 className="mb-4 text-sm font-black uppercase tracking-widest text-red-200">Emergenza</h2><PanicButton /><Link href="/admin/live-tv" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold">Controlla Live TV</Link></div></section>
  </main>;
}
