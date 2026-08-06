"use client";

import Link from "next/link";
import { Music, Wine, Mic2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

type GameCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

function GameCard({ icon, title, description, badge, badgeColor, href, onClick, disabled, loading }: GameCardProps) {
  const inner = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${badgeColor.replace("text-", "border-").replace("bg-", "").split(" ")[0]}/30 ${badgeColor.split(" ").find(c => c.startsWith("bg-")) ?? "bg-white/5"}`}>
          {loading ? <Loader2 size={22} className="animate-spin" /> : icon}
        </div>
        <div>
          <p className="text-base font-bold text-white uppercase italic">{title}</p>
          <p className="mt-1 text-sm leading-6 text-white/50">{description}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeColor}`}>
        {badge}
      </span>
    </div>
  );

  const baseClass = `block w-full rounded-[1.5rem] border border-white/10 bg-[#111] px-5 py-5 text-left transition-all hover:scale-[1.01] hover:border-white/20 active:scale-[0.99] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={baseClass}>
      {inner}
    </button>
  );
}

export default function GamesHubPage() {
  const [kantaquizStatus, setKantaquizStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [kantaquizMessage, setKantaquizMessage] = useState("");

  const handleKantaquiz = async () => {
    const pin = window.prompt("Inserisci PIN Capitano:");
    if (!pin) return;
    setKantaquizStatus("loading");
    setKantaquizMessage("");
    try {
      const res = await fetch("/api/game/kantaquiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setKantaquizStatus("ok");
        setKantaquizMessage("Kantaquiz avviato! La guida Dr. Why sarà visibile per 3 ore.");
      } else {
        const errData = await res.json() as { error?: string };
        setKantaquizStatus("error");
        setKantaquizMessage(errData.error ?? "Errore sconosciuto.");
      }
    } catch {
      setKantaquizStatus("error");
      setKantaquizMessage("Errore di connessione.");
    }
  };

  return (
    <div className="p-6 pb-32 lg:p-10">
      <header className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent-strong)] mb-2">Plancia Admin</p>
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-white">
          Giochi Live
        </h1>
        <p className="mt-2 text-white/50 font-semibold text-sm">
          Accesso rapido a tutte le plance di controllo dei giochi della serata.
        </p>
      </header>

      <div className="grid gap-4 max-w-2xl">
        {/* Music Quiz */}
        <GameCard
          icon={<Music size={22} className="text-purple-400" />}
          title="Tortuga Music Quiz"
          description="Gestisci le prenotazioni, assegna punti e controlla il buzzer in tempo reale."
          badge="APRI PLANCIA"
          badgeColor="border-purple-500/30 bg-purple-500/10 text-purple-400"
          href="/admin/buzzer"
        />

        {/* Kantaquiz */}
        <GameCard
          icon={<Mic2 size={22} className="text-orange-400" />}
          title="Avvia Kantaquiz"
          description="Attiva la guida Dr. Why nella tab Info per i clienti per 3 ore."
          badge={kantaquizStatus === "loading" ? "..." : "ATTIVA"}
          badgeColor="border-orange-500/30 bg-orange-500/10 text-orange-400"
          onClick={handleKantaquiz}
          loading={kantaquizStatus === "loading"}
          disabled={kantaquizStatus === "ok"}
        />

        {/* Kantaquiz feedback message */}
        {kantaquizMessage && (
          <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
            kantaquizStatus === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}>
            {kantaquizStatus === "ok"
              ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              : <XCircle size={18} className="shrink-0 mt-0.5" />}
            {kantaquizMessage}
          </div>
        )}
      </div>
    </div>
  );
}
