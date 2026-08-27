import * as React from "react";
import Link from "next/link";
import { isAdmin } from "@/lib/live-buzzer/admin";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { ScratchAndWinCard } from "@/components/scratch-and-win-card";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import dynamic from "next/dynamic";

// Dynamically import LiveTvContributionCard as it was in profile-screen.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LiveTvContributionCard = dynamic<any>(() => import("@/features/live-tv/components/LiveTvContributionCard").then(mod => mod.LiveTvContributionCard).catch(() => ({ default: () => null } as any)), { ssr: false });

export interface ProfileGamesAndAdminProps {
  data: ProfileResponse;
  identityEmail: string;
  isLoggedAdmin: boolean;
  showUnifiedCommandDeck: boolean;
  hasOnPremiseAccess: boolean;
  activeGames: { matchDrink: boolean; buzzer: boolean };
  registerVisit: (customerCode: string) => void;
  triggerHaptic: () => void;
}

export function ProfileGamesAndAdmin({
  data,
  identityEmail,
  isLoggedAdmin,
  showUnifiedCommandDeck,
  hasOnPremiseAccess,
  activeGames,
  registerVisit,
  triggerHaptic,
}: ProfileGamesAndAdminProps) {
  return (
    <div id="sfide" className="panel hash-scroll-target rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Sfide e contenuti</p>
        </div>

        <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Esclusive
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {/* Client-facing cards (Hidden for Admins) */}
        {!isAdmin(identityEmail) && (
          <>
            {hasOnPremiseAccess && (
              <>
                <ScratchAndWinCard
                  className="mt-4"
                  onClick={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                />
                <LiveTvContributionCard
                  contact={data.contact}
                  onVisitTrigger={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                />
              </>
            )}

            {/* Receipt Upload Card - Client */}
            <Link
              href="/ciurma/carica-scontrino"
              className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[var(--accent-strong)] bg-[var(--accent-soft)]/5 mt-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white uppercase italic">💰 Carica Scontrino</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Hai cenato al Tortuga? Carica la foto dello scontrino per accumulare punti sulla tua card!
                  </p>
                </div>
                <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-strong)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  CARICA
                </span>
              </div>
            </Link>
          </>
        )}

        {showUnifiedCommandDeck && (
          <a
            href="https://app.tortugabay.it/admin/live-tv"
            className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[var(--accent-strong)] bg-[var(--accent-soft)]/5"
            onClick={() => {
              triggerHaptic();
              if (data?.contact?.CodiceContatto) {
                void registerVisit(data.contact.CodiceContatto);
              }
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white uppercase italic">Plancia di Comando</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Un unico accesso alla plancia operativa Tortuga.
                </p>
              </div>
              <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-soft)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                ADMIN
              </span>
            </div>
          </a>
        )}

        {/* Buzzer Card - Admin (Captain only) */}
        {isLoggedAdmin && !showUnifiedCommandDeck && (
          <a
            href="/admin/buzzer"
            className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-purple-500 bg-purple-500/5"
            onClick={() => {
              triggerHaptic();
              if (data?.contact?.CodiceContatto) {
                void registerVisit(data.contact.CodiceContatto);
              }
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white uppercase italic">⚓ Plancia Tortuga Music Quiz</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Gestisci le prenotazioni e assegna il bottino.
                </p>
              </div>
              <span className="rounded-full border border-blue-500 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                ADMIN
              </span>
            </div>
          </a>
        )}

        {/* Match & Drink Admin Removed */}
        {/* Kantaquiz Admin */}
        {isLoggedAdmin && !showUnifiedCommandDeck && (
          <button
            onClick={async () => {
              const pin = prompt("Inserisci PIN Capitano:");
              if (!pin) return;
              try {
                const res = await fetch("/api/game/kantaquiz", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pin }),
                });
                if (res.ok) {
                  alert("Kantaquiz avviato! La guida Dr. Why sarà visibile per 3 ore.");
                } else {
                  const errData = await res.json();
                  alert("Errore: " + errData.error);
                }
              } catch {
                alert("Errore di connessione.");
              }
            }}
            className="panel-muted rounded-[1.5rem] px-4 py-4 block w-full text-left transition-all hover:scale-[1.02] active:scale-95 border-orange-500 bg-orange-500/5 mt-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white uppercase italic">🎤 Avvia Kantaquiz</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Attiva la guida Dr. Why nella tab Info per i clienti.
                </p>
              </div>
              <span className="rounded-full border border-orange-500 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">
                ADMIN
              </span>
            </div>
          </button>
        )}

        {/* Push Admin */}
        {isLoggedAdmin && !showUnifiedCommandDeck && (
          <Link
            href="/admin/push"
            className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-purple-500 bg-purple-500/5 mt-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white uppercase italic">📣 Plancia Push</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Invia notifiche personalizzate a tutta la ciurma o solo ai presenti.
                </p>
              </div>
              <span className="rounded-full border border-purple-500 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-400">
                ADMIN
              </span>
            </div>
          </Link>
        )}

        {/* Receipts Admin */}
        {isLoggedAdmin && !showUnifiedCommandDeck && (
          <Link
            href="/admin/scontrini"
            className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-emerald-500 bg-emerald-500/5 mt-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white uppercase italic">💰 Gestione Scontrini</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Valida gli scontrini inviati dai pirati e assegna i punti.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                ADMIN
              </span>
            </div>
          </Link>
        )}

      </div>
    </div>
  );
}
