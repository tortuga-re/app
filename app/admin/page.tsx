"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { trackAppEvent } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/haptics";

type AdminDashboardSnapshot = {
  receiptsPending: number;
  pushSubscriptions: number;
  liveBuzzerActive: boolean;
  matchDrinkActive: boolean;
  latestMatchDrinkTitle?: string | null;
};

const cards = [
  {
    href: "/admin/live-tv",
    title: "Tortuga Live TV",
    description: "Stage mode globale, scaletta TV, overlay e contenuti in onda.",
  },
  {
    href: "/admin/buzzer",
    title: "Tortuga Music Quiz",
    description: "Controllo live round, classifica e playlist YouTube.",
  },
  {
    href: "/admin/match-drink",
    title: "Match & Drink",
    description: "Sessioni, reveal match, messaggi e drink confermati.",
  },
  {
    href: "/admin/scontrini",
    title: "Scontrini",
    description: "Validazione richieste, accredito punti e follow-up manuali.",
  },
  {
    href: "/admin/push",
    title: "Push marketing",
    description: "Invii segmentati per presenti, clienti, compleanni e ritorni.",
  },
];

export default function AdminConsolePage() {
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | AdminDashboardSnapshot
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(body && "error" in body ? body.error : "Console non disponibile.");
        }

        if (!cancelled) {
          const nextSnapshot = body as AdminDashboardSnapshot;
          setSnapshot(nextSnapshot);
          setError("");
          trackAppEvent("admin_console_view", {
            app_section: "admin",
            receipts_pending: nextSnapshot.receiptsPending,
            push_subscriptions: nextSnapshot.pushSubscriptions,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Non sono riuscito a leggere la plancia.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="panel rounded-[2rem] p-6">
        <p className="eyebrow">Snapshot serata</p>
        <h2 className="text-2xl font-black uppercase italic text-white">
          Tutto sotto controllo
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Una sola console per tenere d&apos;occhio gioco live, scontrini, push e
          matchmaking senza saltare da una plancia all&apos;altra.
        </p>
      </div>

      {error ? (
        <StatusBlock variant="error" title="Console parziale" description={error} />
      ) : null}

      {loading ? (
        <StatusBlock
          variant="loading"
          title="Sto leggendo la serata"
          description="Recupero contatori operativi, sessioni live e stato dei canali."
        />
      ) : null}

      {snapshot ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="panel rounded-[1.6rem] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Buzzer
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {snapshot.liveBuzzerActive ? "Live" : "Stand-by"}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {snapshot.liveBuzzerActive
                ? "Quiz aperto o in onda sulla serata."
                : "Nessuna partita live attiva."}
            </p>
          </div>

          <div className="panel rounded-[1.6rem] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Match & Drink
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {snapshot.matchDrinkActive ? "Attivo" : "Offline"}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {snapshot.latestMatchDrinkTitle || "Nessuna sessione aperta al momento."}
            </p>
          </div>

          <div className="panel rounded-[1.6rem] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Scontrini in coda
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {snapshot.receiptsPending}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Richieste ancora da approvare o rifiutare.
            </p>
          </div>

          <div className="panel rounded-[1.6rem] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Push pronte
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {snapshot.pushSubscriptions}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Device iscritti raggiungibili dalla plancia marketing.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="panel rounded-[1.8rem] p-5 transition-colors hover:border-[var(--accent-strong)]/40 hover:bg-white/5"
            onClick={() => {
              triggerHaptic();
              trackAppEvent("admin_console_navigate", {
                app_section: "admin",
                destination: card.href,
              });
            }}
          >
            <p className="eyebrow">{card.title}</p>
            <h3 className="mt-3 text-xl font-bold text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
