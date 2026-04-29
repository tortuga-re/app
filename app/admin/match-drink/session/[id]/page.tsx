"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMatchDrinkAdmin } from "@/lib/match-drink/use-match-drink-admin";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";
import { MATCH_DRINK_QUESTIONS } from "@/lib/match-drink/questions";

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
    moderateMessage,
    redeemDrink,
    deleteSession,
  } = useMatchDrinkAdmin(id);

  const [isDeleting, setIsDeleting] = useState(false);

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
                   <MatchDrinkButton onClick={() => updateStageMode("reveal")}>REVEAL MATCH</MatchDrinkButton>
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
              <h2 className="eyebrow mb-4">Ciurma ({players.length})</h2>
              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hidden">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                    <span className="text-white font-medium">{p.nickname}</span>
                    <span className="text-[var(--text-muted)]">Tavolo {p.tableNumber}</span>
                  </div>
                ))}
              </div>
            </MatchDrinkCard>

            {/* Moderation */}
            <MatchDrinkCard variant="muted">
              <h2 className="eyebrow mb-4">Moderazione Messaggi</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hidden">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-lg border ${msg.status === "shown" ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-black/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[var(--accent-strong)] uppercase">
                        {msg.displayMode === "anonymous" ? "Anonimo" : players.find(p => p.id === msg.playerId)?.nickname}
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
