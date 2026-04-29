"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { requestJson } from "@/lib/client";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { isAdmin } from "@/lib/live-buzzer/admin";
import type { BuzzerState, BuzzerEntry, BuzzerResult } from "@/lib/live-buzzer/types";

type ConfirmAction = "reset-game" | "end-round" | null;

export default function AdminBuzzerPage() {
  const { identity, hasIdentity } = useCustomerIdentity();
  const canAccess = hasIdentity && isAdmin(identity.email);
  const [gameState, setGameState] = useState<BuzzerState | null>(null);
  const [entries, setEntries] = useState<BuzzerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmStep, setConfirmStep] = useState(0);

  const syncSession = useCallback(async () => {
    if (identity.email) {
      await fetch("/api/session/customer", {
        method: "POST",
        body: JSON.stringify({ email: identity.email }),
        headers: { "Content-Type": "application/json" },
      });
    }
  }, [identity.email]);

  const fetchState = useCallback(async () => {
    try {
      const stateData = await requestJson<BuzzerState>("/api/live-buzzer/state");
      setGameState(stateData);

      const entriesData = await requestJson<{ entries: BuzzerEntry[] }>("/api/live-buzzer/admin/entries");
      setEntries(entriesData.entries);
    } catch (err) {
      console.error("Failed to fetch admin state", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    void syncSession().then(() => {
      if (cancelled) return;
      void fetchState();
      interval = setInterval(fetchState, 1000);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [canAccess, syncSession, fetchState]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    triggerHaptic();
    try {
      await requestJson(`/api/live-buzzer/admin/${action}`, { method: "POST" });
      await fetchState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore azione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScore = async (email: string, points: number, result: BuzzerResult) => {
    setActionLoading(true);
    triggerHaptic();
    try {
      await requestJson("/api/live-buzzer/admin/score", {
        method: "POST",
        body: JSON.stringify({ email, points, result }),
      });
      await fetchState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore punteggio");
    } finally {
      setActionLoading(false);
    }
  };

  const initiateConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
    setConfirmStep(1);
    triggerHaptic();
  };

  const handleConfirmedAction = () => {
    if (!confirmAction) return;

    if (confirmStep === 1) {
      setConfirmStep(2);
      triggerHaptic();
    } else {
      handleAction(confirmAction);
      setConfirmAction(null);
      setConfirmStep(0);
    }
  };

  if (!canAccess) {
    return (
      <StatusBlock
        variant="error"
        title="Accesso negato"
        description="Non hai i permessi per accedere alla plancia del Capitano."
        action={
          <Link href="/" className="button-secondary inline-flex min-h-12 items-center justify-center px-6">
            Torna alla base
          </Link>
        }
      />
    );
  }

  if (loading) {
    return <StatusBlock variant="loading" title="Caricamento..." description="Sto preparando la plancia..." />;
  }

  const currentResponder = entries.find(e => e.id === gameState?.currentResponderEntryId);

  return (
    <div className="space-y-6">
      {/* Universal Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="panel rounded-[2.5rem] p-8 text-center space-y-6 max-w-sm border-[var(--danger)] shadow-[0_0_50px_rgba(240,139,117,0.3)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic">
                {confirmStep === 1 ? "Sei sicuro?" : "SICURO SICURO?"}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {confirmAction === "reset-game" 
                  ? (confirmStep === 1 
                      ? "Questo azzererà TUTTO: squadre, punti e round. Non si torna indietro!" 
                      : "Stai per cancellare l'intera partita. Conferma per procedere.")
                  : (confirmStep === 1
                      ? "Stai per terminare la partita e mostrare la classifica finale a tutti."
                      : "Tutte le squadre vedranno il loro piazzamento. Confermi la fine della gara?")
                }
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setConfirmAction(null); setConfirmStep(0); }}
                className="button-secondary min-h-12 text-xs uppercase font-black"
              >
                Annulla
              </button>
              <button 
                onClick={handleConfirmedAction}
                className="button-primary bg-[var(--danger)] border-[var(--danger)] min-h-12 text-xs uppercase font-black text-white"
              >
                {confirmStep === 1 ? "Sì, procedi" : "SÌ, CONFERMA"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel rounded-[2rem] p-6 space-y-6 border-[var(--accent-strong)]">
        <div className="space-y-2">
          <p className="eyebrow">Plancia del Capitano</p>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Gestione Round {gameState?.currentRound}</h2>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${gameState?.status === "open" ? "bg-green-600 text-white" : "bg-white/10 text-[var(--text-muted)]"}`}>
              {gameState?.status}
            </span>
            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${gameState?.leaderboardVisible ? "bg-blue-600 text-white" : "bg-orange-600 text-white"}`}>
              {gameState?.leaderboardVisible ? "Classifica Live" : "Classifica Nascosta"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            className="button-primary min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction("open")}
            disabled={actionLoading || gameState?.status === "open"}
          >
            Apri Prenotazioni
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction("close-entries")}
            disabled={actionLoading || gameState?.status === "closed" || gameState?.status === "idle"}
          >
            Chiudi Prenotazioni
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction("pause")}
            disabled={actionLoading || gameState?.status === "paused" || gameState?.status === "idle"}
          >
            Pausa
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black" 
            onClick={() => initiateConfirm("end-round")}
            disabled={actionLoading || gameState?.roundEnded}
          >
            Termina Partita
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction(gameState?.leaderboardVisible ? "hide-leaderboard" : "show-leaderboard")}
            disabled={actionLoading}
          >
            {gameState?.leaderboardVisible ? "Nascondi Classifica" : "Mostra Classifica"}
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black border-[var(--danger-soft)] text-[var(--danger)]" 
            onClick={() => initiateConfirm("reset-game")}
            disabled={actionLoading}
          >
            RESET PARTITA
          </button>
          <button 
            className="button-primary col-span-2 min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction("next-round")}
            disabled={actionLoading}
          >
            Prossima Canzone (Round {(gameState?.currentRound ?? 0) + 1})
          </button>
        </div>

        {error && <p className="text-xs text-[var(--danger)] text-center">{error}</p>}
      </div>

      {currentResponder && (
        <div className="panel rounded-3xl p-6 border-2 border-green-500 bg-green-500/5 animate-pulse">
           <p className="eyebrow text-green-500">ORA RISPONDE</p>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mt-1">
             Tavolo {currentResponder.tableNumber} - {currentResponder.nickname}
           </h3>
           <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={() => handleScore(currentResponder.email, 10, "perfect")} className="bg-green-600/30 border border-green-600/50 text-green-300 text-[10px] font-black py-3 rounded-xl hover:bg-green-600/50">3/3 (+10)</button>
              <button onClick={() => handleScore(currentResponder.email, 6, "partial2")} className="bg-blue-600/30 border border-blue-600/50 text-blue-300 text-[10px] font-black py-3 rounded-xl hover:bg-blue-600/50">2/3 (+6)</button>
              <button onClick={() => handleScore(currentResponder.email, 3, "partial1")} className="bg-yellow-600/30 border border-yellow-600/50 text-yellow-300 text-[10px] font-black py-3 rounded-xl hover:bg-yellow-600/50">1/3 (+3)</button>
              <button onClick={() => handleScore(currentResponder.email, -2, "wrong")} className="bg-red-600/30 border border-red-600/50 text-red-300 text-[10px] font-black py-3 rounded-xl hover:bg-red-600/50">SBAGLIATA (-2)</button>
           </div>
        </div>
      )}

      <div className="panel rounded-[2rem] p-6 space-y-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider italic">Coda Prenotazioni</h3>
        
        <div className="space-y-3">
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <div key={entry.id} className={`panel-muted rounded-2xl p-4 space-y-4 border transition-all duration-300 ${entry.id === gameState?.currentResponderEntryId ? "border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]" : "border-white/5 bg-white/2"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center font-black text-white text-sm italic">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{entry.nickname}</p>
                      <p className="text-xs text-[var(--text-muted)]">Tavolo {entry.tableNumber} • {entry.relativeTimeMs / 1000}s</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.scored ? (
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-white/5 ${entry.result === "wrong" ? "text-red-400" : "text-green-400"}`}>
                        {entry.result === "perfect" ? "3/3 (+10)" : 
                         entry.result === "partial2" ? "2/3 (+6)" : 
                         entry.result === "partial1" ? "1/3 (+3)" : "SBAGLIATA (-2)"}
                      </span>
                    ) : (
                      entry.id === gameState?.currentResponderEntryId ? (
                        <span className="text-[10px] font-black uppercase text-green-400 animate-pulse">CHIAMATO</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">In attesa</span>
                      )
                    )}
                  </div>
                </div>

                {!entry.scored && entry.id !== gameState?.currentResponderEntryId && (
                  <div className="grid grid-cols-4 gap-2 opacity-50">
                    <button disabled className="bg-white/5 border border-white/10 text-[9px] font-bold py-2 rounded-lg">3/3</button>
                    <button disabled className="bg-white/5 border border-white/10 text-[9px] font-bold py-2 rounded-lg">2/3</button>
                    <button disabled className="bg-white/5 border border-white/10 text-[9px] font-bold py-2 rounded-lg">1/3</button>
                    <button disabled className="bg-white/5 border border-white/10 text-[9px] font-bold py-2 rounded-lg">Sbagliata</button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center py-8 text-sm text-[var(--text-muted)]">Nessuna prenotazione per questo round.</p>
          )}
        </div>
      </div>
    </div>
  );
}
