"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMatchDrinkAdmin } from "@/lib/match-drink/use-match-drink-admin";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";
import { MATCH_DRINK_QUESTIONS } from "@/lib/match-drink/questions";
import { triggerHaptic } from "@/lib/haptics";

export default function MatchDrinkSessionAdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    session,
    players,
    messages,
    matches,
    answers,
    loading,
    start,
    nextQuestion,
    updateStageMode,
    calculateMatches,
    seedMessage,
    sendCaptainMessage,
    moderateMessage,
    redeemDrink,
    deleteSession,
    updateStatus,
  } = useMatchDrinkAdmin(id);

  const [isDeleting, setIsDeleting] = useState(false);
  const [countdownMinutes, setCountdownMinutes] = useState(5);

  if (loading) return null;
  if (!session) return <div className="p-8 text-center">Sessione non trovata.</div>;

  const currentQuestion = MATCH_DRINK_QUESTIONS[session.currentQuestionIndex];
  const totalAnswers = answers.filter(a => a.questionId === currentQuestion?.id).length;
  const confirmedMatches = matches.filter(m => m.drinkUnlocked);

  const handleDelete = async () => {
    if (confirm("Sei sicuro? Questa operazione cancella definitivamente tutti i dati della serata.")) {
      setIsDeleting(true);
      try {
        await deleteSession();
        router.push("/admin/match-drink");
      } catch {
        setIsDeleting(false);
      }
    }
  };

  return (
    <MatchDrinkShell maxWidth="max-w-5xl">
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{session.title}</h1>
            <p className="font-mono text-[var(--accent-strong)]">CODE: {session.joinCode}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/stage/match-drink/${session.id}`} target="_blank" rel="noreferrer">
              <MatchDrinkButton variant="secondary" size="md">STAGE SCREEN</MatchDrinkButton>
            </a>
            <MatchDrinkButton variant="danger" size="md" onClick={handleDelete} loading={isDeleting}>ELIMINA</MatchDrinkButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <MatchDrinkCard variant="accent">
              <h2 className="eyebrow mb-4">Controllo Gioco</h2>
              <div className="flex flex-wrap gap-3">
                {session.status === "lobby" && (
                  <MatchDrinkButton size="lg" onClick={start}>AVVIA GIOCO</MatchDrinkButton>
                )}
                {session.status === "playing" && (
                  <>
                    <MatchDrinkButton 
                      variant="secondary" 
                      onClick={() => updateStageMode("intro")}
                      disabled={session.stageMode === "intro"}
                    >MOSTRA STATISTICHE</MatchDrinkButton>
                    <MatchDrinkButton 
                      variant="secondary" 
                      onClick={() => updateStageMode("question")}
                      disabled={session.stageMode === "question"}
                    >MOSTRA DOMANDA</MatchDrinkButton>
                    <MatchDrinkButton 
                      variant="secondary" 
                      onClick={() => updateStageMode("question_results")}
                      disabled={session.stageMode === "question_results"}
                    >MOSTRA RISULTATI</MatchDrinkButton>
                    {session.currentQuestionIndex < MATCH_DRINK_QUESTIONS.length - 1 ? (
                      <MatchDrinkButton onClick={() => nextQuestion(session.currentQuestionIndex + 1)}>
                        PROSSIMA DOMANDA
                      </MatchDrinkButton>
                    ) : (
                      <MatchDrinkButton onClick={calculateMatches} variant="primary">CALCOLA MATCH</MatchDrinkButton>
                    )}
                  </>
                )}
                {session.status === "matching" && (
                   <MatchDrinkButton 
                     onClick={() => {
                       updateStatus("reveal");
                       updateStageMode("reveal");
                     }}
                   >
                     REVEAL MATCH
                   </MatchDrinkButton>
                )}
              </div>

              {session.status === "playing" && currentQuestion && (
                <div className="mt-6 panel-muted rounded-xl p-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-widest">Domanda {session.currentQuestionIndex + 1}</p>
                  <p className="text-lg font-bold text-white">{currentQuestion.text}</p>
                  <p className="mt-2 text-sm text-[var(--accent-strong)] font-bold">{totalAnswers} risposte su {players.length} giocatori</p>
                </div>
              )}
            </MatchDrinkCard>

            {/* Registration & Countdown Management */}
            <MatchDrinkCard>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="eyebrow">Iscrizioni</h2>
                  <div className="flex flex-col gap-3">
                    <div className={`p-4 rounded-2xl border-2 text-center font-black text-xl transition-all ${
                      session.status === "lobby" 
                        ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]" 
                        : "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                    }`}>
                      {session.status === "lobby" ? "APERTE" : "CHIUSE"}
                    </div>
                    <MatchDrinkButton 
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        triggerHaptic();
                        updateStatus(session.status === "lobby" ? "playing" : "lobby");
                      }}
                    >
                      {session.status === "lobby" ? "CHIUDI ISCRIZIONI" : "RIAPRI ISCRIZIONI"}
                    </MatchDrinkButton>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="eyebrow">Countdown Stage</h2>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {[2, 5, 10].map(m => (
                        <button
                          key={m}
                          onClick={() => setCountdownMinutes(m)}
                          className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-all ${
                            countdownMinutes === m 
                              ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-black" 
                              : "border-white/10 bg-white/5 text-[var(--text-muted)]"
                          }`}
                        >
                          {m} MIN
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <MatchDrinkButton 
                        className="flex-1"
                        onClick={() => {
                          triggerHaptic();
                          const end = new Date(Date.now() + countdownMinutes * 60000).toISOString();
                          sendCaptainMessage(`COUNTDOWN:${end}`);
                        }}
                      >
                        AVVIA
                      </MatchDrinkButton>
                      <MatchDrinkButton 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          triggerHaptic();
                          // To clear, we look for a countdown message and delete/moderate it?
                          // Actually, sending a "CLEAR" command or just a message with empty countdown works.
                          sendCaptainMessage(`COUNTDOWN:CLEAR`);
                        }}
                      >
                        RESET
                      </MatchDrinkButton>
                    </div>
                  </div>
                </div>
              </div>
            </MatchDrinkCard>

            {/* Confirmed Matches */}
            <MatchDrinkCard>
              <h2 className="eyebrow mb-4">Abbinamenti Confermati ({confirmedMatches.length})</h2>
              <div className="space-y-3">
                {confirmedMatches.map(m => (
                  <div key={m.id} className="panel-muted rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white font-bold">
                        {players.find(p => p.id === m.playerAId)?.nickname} (T{players.find(p => p.id === m.playerAId)?.tableNumber}) 
                        <span className="mx-2 text-[var(--accent-strong)]">❤️</span>
                        {players.find(p => p.id === m.playerBId)?.nickname} (T{players.find(p => p.id === m.playerBId)?.tableNumber})
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{m.commonCriterion} - {m.drinkCode}</p>
                    </div>
                    {m.drinkRedeemed ? (
                      <span className="text-[10px] font-bold text-green-400 border border-green-500/30 px-2 py-1 rounded">SERVITO</span>
                    ) : (
                      <MatchDrinkButton size="md" onClick={() => redeemDrink(m.id)}>SERVI</MatchDrinkButton>
                    )}
                  </div>
                ))}
                {confirmedMatches.length === 0 && (
                  <p className="text-center text-sm text-[var(--text-muted)] py-4 italic">Nessun match ancora confermato.</p>
                )}
              </div>
            </MatchDrinkCard>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
             {/* Player List */}
             <MatchDrinkCard variant="muted">
              <h2 className="eyebrow mb-4">Ciurma ({players.filter(p => p.nickname !== "_SYSTEM_").length})</h2>
              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hidden">
                {players.filter(p => p.nickname !== "_SYSTEM_").map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                    <span className="text-white font-medium">{p.nickname}</span>
                    <span className="text-[var(--text-muted)]">Tavolo {p.tableNumber}</span>
                  </div>
                ))}
              </div>
            </MatchDrinkCard>

            {/* Moderation */}
            <MatchDrinkCard variant="muted">
              <div className="flex items-center justify-between mb-4">
                <h2 className="eyebrow">Moderazione Messaggi</h2>
                <MatchDrinkButton 
                  variant="secondary" 
                  size="md" 
                  className="text-[10px] py-1 min-h-0" 
                  onClick={() => {
                    triggerHaptic();
                    seedMessage();
                  }}
                >
                  GENERA MESSAGGIO ESCA
                </MatchDrinkButton>
              </div>

              {/* Captain Message Input */}
              <div className="mb-6 panel-muted rounded-xl p-4 border-[var(--accent-strong)] bg-[var(--accent-strong)]/5 space-y-3">
                <p className="text-[10px] font-black text-[var(--accent-strong)] uppercase tracking-widest">Invia come Capitano</p>
                <div className="flex gap-2">
                  <textarea 
                    id="captain-msg"
                    placeholder="Scrivi un ordine o una perla di saggezza..."
                    className="field flex-1 min-h-[60px] text-xs resize-none py-2"
                  />
                  <MatchDrinkButton 
                    className="h-auto"
                    onClick={() => {
                      const el = document.getElementById("captain-msg") as HTMLTextAreaElement;
                      if (el.value.trim()) {
                        triggerHaptic();
                        sendCaptainMessage(el.value);
                        el.value = "";
                      }
                    }}
                  >
                    INVIA
                  </MatchDrinkButton>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hidden">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-lg border ${msg.status === "shown" ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-black/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[var(--accent-strong)] uppercase">
                        {msg.displayMode === "captain" ? "Capitano" : (msg.displayMode === "anonymous" ? "Anonimo" : players.find(p => p.id === msg.playerId)?.nickname)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-white mb-3 italic">&quot;{msg.message}&quot;</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.status === "pending" && (
                        <>
                          <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" onClick={() => moderateMessage(msg.id, "approve")}>OK</MatchDrinkButton>
                          <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" variant="secondary" onClick={() => moderateMessage(msg.id, "reject")}>NO</MatchDrinkButton>
                        </>
                      )}
                      {msg.status === "approved" && (
                        <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" onClick={() => moderateMessage(msg.id, "show")}>MOSTRA IN STAGE</MatchDrinkButton>
                      )}
                      {msg.status === "shown" && (
                        <span className="text-[10px] font-bold text-[var(--accent-strong)] ml-auto">LIVE</span>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-[10px] text-[var(--text-muted)] py-4">Nessun messaggio.</p>}
              </div>
            </MatchDrinkCard>
          </div>
        </div>
      </div>
    </MatchDrinkShell>
  );
}
