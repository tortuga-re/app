"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { requestJson } from "@/lib/client";
import { triggerHaptic } from "@/lib/haptics";
import { triggerBuzzerVibration, VIBRATION_PATTERNS } from "@/lib/live-buzzer/vibration";
import { StatusBlock } from "@/components/status-block";
import type { BuzzerState, Team, BuzzerEntry } from "@/lib/live-buzzer/types";

export default function BuzzerPage() {
  const { identity, hasIdentity } = useCustomerIdentity();
  const { hasAccess: isPresent } = useOnPremiseAccess();
  const [gameState, setGameState] = useState<BuzzerState | null>(null);
  const [teamInfo, setTeamInfo] = useState({ nickname: "", tableNumber: "" });
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Feedback State
  const [feedback, setFeedback] = useState<{ message: string; type: "result" | "position" | null }>({ message: "", type: null });
  const lastScoredIdRef = useRef<string | null>(null);
  const lastResponderIdRef = useRef<string | null>(null);
  const lastRoundEndedRef = useRef<boolean>(false);
  const gameStateRef = useRef<BuzzerState | null>(null);

  const syncSession = useCallback(async () => {
    if (identity.email) {
      await fetch("/api/session/customer", {
        method: "POST",
        body: JSON.stringify({ email: identity.email }),
        headers: { "Content-Type": "application/json" },
      });
    }
  }, [identity.email]);

  const triggerFeedbackSequence = useCallback((entry: BuzzerEntry, team: Team | undefined) => {
    let resultMsg = "";
    switch (entry.result) {
      case "correct":
        resultMsg = `Risposta esatta! +${entry.scoreAwarded} punti alla tua ciurma.`;
        triggerBuzzerVibration(VIBRATION_PATTERNS.CORRECT_ANSWER);
        break;
      case "wrong":
        resultMsg = "Risposta affondata. Purtroppo hai sbagliato!";
        triggerBuzzerVibration(VIBRATION_PATTERNS.WRONG_ANSWER);
        break;
    }

    setFeedback({ message: resultMsg, type: "result" });
    triggerHaptic();

    setTimeout(() => {
      setFeedback({ message: "", type: null });
      setTimeout(() => {
        const currentLeaderboard = gameStateRef.current?.leaderboard || [];
        const isVisible = gameStateRef.current?.leaderboardVisible ?? true;
        const rank = currentLeaderboard.findIndex(t => t.email === identity.email);
        const pos = rank !== -1 ? rank + 1 : 1;

        if (team && isVisible) {
          setFeedback({ message: `Sei in posizione ${pos}!`, type: "position" });
          setTimeout(() => {
            setFeedback({ message: "", type: null });
          }, 3000);
        } else {
          setFeedback({ message: "", type: null });
        }
      }, 500);
    }, 4000);
  }, [identity.email]);

  useEffect(() => {
    if (!hasIdentity) return;

    let cancelled = false;
    let eventSource: EventSource | null = null;

    void syncSession().then(() => {
      if (cancelled) return;
      
      eventSource = new EventSource("/api/live-buzzer/stream");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as BuzzerState;
          setGameState(data);
          gameStateRef.current = data;
          
          const userInLeaderboard = data.leaderboard?.find((t: Team) => t.email === identity.email);
          setIsRegistered(Boolean(userInLeaderboard));
          if (userInLeaderboard) {
            setTeamInfo(prev => ({ ...prev, nickname: userInLeaderboard.nickname, tableNumber: userInLeaderboard.tableNumber }));
          }

          // Check for new score feedback
          if (data.userEntry?.scored && data.userEntry.id !== lastScoredIdRef.current) {
            lastScoredIdRef.current = data.userEntry.id;
            triggerFeedbackSequence(data.userEntry, userInLeaderboard);
          }
          setLoading(false);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection error");
      };
    });

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [hasIdentity, syncSession, identity.email, triggerFeedbackSequence]);

  // Haptic Detection for Turn and Round End
  useEffect(() => {
    if (!gameState) return;

    // Detect "Your Turn"
    const isCurrentResponder = gameState.userEntry?.id === gameState.currentResponderEntryId;
    if (isCurrentResponder && gameState.currentResponderEntryId !== lastResponderIdRef.current) {
      lastResponderIdRef.current = gameState.currentResponderEntryId;
      triggerBuzzerVibration(VIBRATION_PATTERNS.CALL_TO_ACTION);
    }

    // Detect Round End
    if (gameState.roundEnded && !lastRoundEndedRef.current) {
      lastRoundEndedRef.current = true;
      triggerBuzzerVibration(VIBRATION_PATTERNS.ROUND_ENDED);
    } else if (!gameState.roundEnded) {
      lastRoundEndedRef.current = false;
    }
  }, [gameState]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamInfo.nickname.trim() || !teamInfo.tableNumber.trim()) {
      setError("Inserisci nickname e numero tavolo.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await requestJson("/api/live-buzzer/team", {
        method: "POST",
        body: JSON.stringify(teamInfo),
      });
      setIsRegistered(true);
      triggerHaptic();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante la registrazione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuzz = async () => {
    if (gameState?.userEntry || gameState?.status !== "open" || submitting) return;

    setSubmitting(true);
    triggerHaptic();
    try {
      await requestJson("/api/live-buzzer/buzz", { method: "POST" });
      triggerBuzzerVibration(VIBRATION_PATTERNS.BUZZ_SENT);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore buzzer");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasIdentity) {
    return (
      <StatusBlock
        variant="info"
        title="Accesso richiesto"
        description="Devi entrare nella ciurma per usare il buzzer del Capitano."
        action={
          <Link href="/ciurma" className="button-primary inline-flex min-h-12 items-center justify-center px-6">
            Vai al profilo
          </Link>
        }
      />
    );
  }

  if (loading) {
    return <StatusBlock variant="loading" title="Caricamento..." description="Sto preparando il buzzer..." />;
  }

  if (!isRegistered) {
    if (!isPresent) {
      return (
        <StatusBlock
          variant="info"
          title="Sei nel locale?"
          description="Per partecipare al Music Quiz devi essere presente al Tortuga Bay. Inquadra il QR code sul tuo tavolo per sbloccare l'accesso!"
          action={
            <div className="flex flex-col gap-3 w-full">
              <a
                href="https://www.cooperto.link/ac6cdf"
                className="button-primary inline-flex min-h-12 items-center justify-center gap-2 px-6 w-full text-center font-bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3"/><path d="M17 21v-3h3"/></svg>
                Scannerizza il QR del Tavolo
              </a>
              <Link href="/ciurma" className="button-secondary inline-flex min-h-12 items-center justify-center px-6 w-full">
                Torna alla Ciurma
              </Link>
            </div>
          }
        />
      );
    }

    return (
      <div className="panel rounded-[2rem] p-6 space-y-6">
        <div className="space-y-2">
          <p className="eyebrow">Tortuga Music Quiz</p>
          <h2 className="text-2xl font-bold text-white">Preparati alla sfida</h2>
          <p className="text-sm text-[var(--text-muted)]">Inserisci i dati della tua squadra per iniziare.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-muted)]">Nickname Squadra</label>
            <input
              className="field"
              placeholder="E.g. I Pirati del Bar"
              value={teamInfo.nickname}
              onChange={(e) => setTeamInfo({ ...teamInfo, nickname: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-muted)]">Numero Tavolo</label>
            <input
              className="field"
              placeholder="E.g. 12"
              value={teamInfo.tableNumber}
              onChange={(e) => setTeamInfo({ ...teamInfo, tableNumber: e.target.value })}
              required
            />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" className="button-primary w-full min-h-12" disabled={submitting}>
            {submitting ? "Registrazione..." : "Entra in gioco"}
          </button>
        </form>
      </div>
    );
  }

  const isCurrentResponder = gameState?.userEntry?.id === gameState?.currentResponderEntryId;
  const userRank = gameState ? gameState.leaderboard.findIndex(t => t.email === identity.email) + 1 : 0;
  const isWinner = gameState?.roundEnded && userRank === 1;

  const getStatusMessage = () => {
    if (gameState?.roundEnded) {
      if (isWinner) return "IL CAPITANO DI TORTUGA!";
      if (userRank === 2) return "Complimenti, sei arrivato 2°!";
      if (userRank === 3) return "Complimenti, sei arrivato 3°!";
      return `Sei arrivato ${userRank}°!`;
    }
    if (feedback.type) return feedback.message;
    if (isCurrentResponder) return "Il Capitano chiama te!";
    if (gameState?.userEntry) return "Risposta prenotata. Attendi il Capitano.";
    if (gameState?.status === "idle") return "Gioco non ancora avviato. Attendi il Capitano.";
    if (gameState?.status === "paused") return "Buzzer in pausa. Guarda il Capitano.";
    if (gameState?.status === "closed") return "Risposte chiuse. Attendi il tuo turno.";
    if (gameState?.status === "result_screen") return "Il Capitano ha deciso...";
    if (gameState?.status === "countdown") return "Preparati... al via premi!";
    if (gameState?.status === "open") return "Round aperto: tocca il buzzer!";
    return "";
  };

  return (
    <div className="h-[100dvh] flex flex-col p-4 gap-4 overflow-hidden bg-black text-white">
      {/* Winner Overlay */}
      {isWinner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-700">
          <div className="text-center space-y-8 animate-in zoom-in duration-1000">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-[var(--accent)] blur-[80px] opacity-40 animate-pulse" />
               <span className="relative text-9xl">👑</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase animate-bounce">Vittoria!</h1>
              <p className="text-[var(--accent-strong)] text-xl font-bold uppercase tracking-widest italic">Sei il nuovo Capitano</p>
            </div>
            <div className="panel p-6 rounded-[2rem] border-[var(--accent-strong)] bg-black/50 backdrop-blur-md">
               <p className="text-sm text-[var(--text-muted)] uppercase mb-1">Squadra Vincitrice</p>
               <p className="text-3xl font-black text-white uppercase italic">{gameState?.leaderboard[0]?.nickname}</p>
            </div>
            <button 
              onClick={() => { /* maybe close overlay or just let it be */ }} 
              className="button-primary px-10 min-h-14 uppercase font-black italic tracking-widest"
            >
              Onore alla Ciurma
            </button>
          </div>
        </div>
      )}

      {/* Feedback Overlay */}
      {feedback.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="panel rounded-[2.5rem] p-10 text-center space-y-6 max-w-sm border-[var(--accent-strong)] shadow-[0_0_50px_rgba(178,122,52,0.3)] scale-in-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
              {feedback.message}
            </h2>
            <div className="w-16 h-1 bg-[var(--accent-strong)] mx-auto rounded-full" />
          </div>
        </div>
      )}

      <div className={`panel rounded-3xl p-6 text-center space-y-4 shrink-0 transition-all duration-500 flex flex-col justify-center items-center ${isCurrentResponder ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]" : ""}`}>
        <div className="space-y-1">
          <p className="eyebrow text-xs">Round {gameState?.currentRound}</p>
          <h2 className={`text-lg font-bold uppercase transition-all duration-300 ${isCurrentResponder ? "text-[var(--accent-strong)] scale-110" : "text-white"}`}>
            {getStatusMessage()}
          </h2>
          {error && <p className="text-xs text-[var(--danger)] animate-pulse">{error}</p>}
        </div>

        <div className="flex justify-center py-2">
          <button
            onClick={handleBuzz}
            disabled={gameState?.status !== "open" || !!gameState?.userEntry || submitting || gameState?.roundEnded}
            className={`
              relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300
              ${gameState?.status === "open" && !gameState?.userEntry 
                ? "button-primary shadow-[0_0_50px_rgba(178,122,52,0.4)] scale-105 active:scale-95" 
                : "bg-white/5 border border-white/10 text-[var(--text-muted)] opacity-50 grayscale"}
              ${isCurrentResponder ? "border-[var(--accent-strong)] shadow-[0_0_80px_rgba(178,122,52,0.6)] animate-pulse" : ""}
            `}
          >
            <div className="text-center">
              <span className="block text-2xl font-black uppercase tracking-tighter italic">BUZZ</span>
            </div>
            {gameState?.status === "open" && !gameState?.userEntry && !gameState?.roundEnded && (
              <div className="absolute inset-0 rounded-full animate-ping bg-[var(--accent)] opacity-20" />
            )}
          </button>
        </div>

        {gameState?.roundEnded && (
          <p className="text-xs text-[var(--text-muted)] italic">Classifica finale!</p>
        )}
      </div>

      <div className="panel rounded-3xl p-4 flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider italic">Classifica</h3>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{gameState?.leaderboardVisible ? "Live" : "Nascosta"}</span>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 scrollbar-hidden pr-1">
          {(() => {
            if (!gameState?.leaderboard?.length) return <p className="text-center py-4 text-sm text-[var(--text-muted)]">Ancora nessuna risposta data.</p>;
            
            const lb = gameState.leaderboard;

            return lb.map((team, index) => (
                <div 
                  key={team.email} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-500 shrink-0 ${
                    team.email === identity.email 
                      ? "border-[var(--accent-strong)] bg-[var(--accent-strong)]/20" 
                      : "border-white/5 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center w-8">
                      <span className="font-black text-[var(--accent-strong)] text-lg">{index + 1}</span>
                    </div>
                    <div>
                      <p className={`font-bold text-sm leading-tight truncate max-w-[200px] ${team.email === identity.email ? "text-white" : "text-white/80"}`}>
                        {team.nickname}
                      </p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase font-black">Tavolo {team.tableNumber}</p>
                    </div>
                  </div>
                  {team.email === identity.email && (
                    <div className="bg-[var(--accent-strong)] text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                      TU
                    </div>
                  )}
                </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
