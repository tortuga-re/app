"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMatchDrinkAdmin } from "@/lib/match-drink/use-match-drink-admin";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";
import { triggerHaptic } from "@/lib/haptics";
import { ChevronLeft } from "lucide-react";

export default function MatchDrinkSessionAdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    session,
    players,
    messages,
    matches,
    answers,
    forecast,
    meetingTableOptions,
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
    toggleMessages,
    updateExcludedMeetingTables,
    updateSecondaryTraitMode,
  } = useMatchDrinkAdmin(id);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [countdownMinutes, setCountdownMinutes] = useState(5);

  if (loading) return null;
  if (!session) return <div className="p-8 text-center">Sessione non trovata.</div>;

  const questions = session.questions || [];
  const currentQuestion = questions[session.currentQuestionIndex];
  const totalAnswers = answers.filter(a => a.questionId === currentQuestion?.id).length;
  const confirmedMatches = matches.filter(m => m.drinkUnlocked);
  const redeemedDrinks = confirmedMatches.filter((match) => match.drinkRedeemed).length;
  const excludedMeetingTables = session.excludedMeetingTables || [];
  const secondaryTraitMode = session.secondaryTraitMode ?? "absolute";
  const realPlayers = players.filter((player) => player.nickname !== "_SYSTEM_");
  const romanticWomen = realPlayers.filter(
    (player) => player.gender === "donna" && player.lookingFor !== "amicizie",
  ).length;
  const romanticMen = realPlayers.filter(
    (player) => player.gender === "uomo" && player.lookingFor !== "amicizie",
  ).length;
  const friendshipSeekers = realPlayers.filter(
    (player) => player.lookingFor === "amicizie",
  ).length;
  const confirmedPlayerIds = new Set<string>();
  confirmedMatches.forEach((match) => {
    confirmedPlayerIds.add(match.playerAId);
    if (!match.isFriendshipGroup) {
      confirmedPlayerIds.add(match.playerBId);
    }
  });
  const peopleWaiting = Math.max(realPlayers.length - confirmedPlayerIds.size, 0);
  const revealReady = session.status === "matching" && matches.length > 0;
  const analytics = session.analytics;
  const lastQuestionIndex = Math.max(questions.length - 1, 0);
  const isLastQuestion = session.currentQuestionIndex >= lastQuestionIndex;

  const getAdvanceButtonLabel = () => {
    if (session.status === "matching") {
      return "REVEAL MATCH";
    }

    if (session.status !== "playing") {
      return null;
    }

    if (session.stageMode === "question") {
      return "MOSTRA RISULTATI";
    }

    if (session.stageMode === "question_results") {
      return isLastQuestion ? "CALCOLA MATCH" : "PROSSIMA DOMANDA";
    }

    return "MOSTRA DOMANDA";
  };

  const advanceButtonLabel = getAdvanceButtonLabel();

  const handleAdvanceStage = async () => {
    if (isAdvancingStage) {
      return;
    }

    setIsAdvancingStage(true);

    try {
      triggerHaptic();

      if (session.status === "matching") {
        await updateStatus("reveal");
        await updateStageMode("reveal");
        return;
      }

      if (session.status !== "playing") {
        return;
      }

      if (session.stageMode === "question") {
        await updateStageMode("question_results");
        return;
      }

      if (session.stageMode === "question_results") {
        if (isLastQuestion) {
          await calculateMatches();
          return;
        }

        await nextQuestion(session.currentQuestionIndex + 1);
        return;
      }

      await updateStageMode("question");
    } finally {
      setIsAdvancingStage(false);
    }
  };

  const handleToggleExcludedTable = async (tableKey: string) => {
    const nextExcluded = excludedMeetingTables.includes(tableKey)
      ? excludedMeetingTables.filter((key) => key !== tableKey)
      : [...excludedMeetingTables, tableKey];

    await updateExcludedMeetingTables(nextExcluded);
  };

  const handleDelete = async () => {
    if (confirm("Sei sicuro? Questa operazione cancella definitivamente tutti i dati della serata.")) {
      setIsDeleting(true);
      try {
        await deleteSession();
        router.push("/admin/match-drink");
      } catch (err) {
        setIsDeleting(false);
        alert("Errore durante l'eliminazione: " + (err instanceof Error ? err.message : "Errore sconosciuto"));
      }
    }
  };

  return (
    <MatchDrinkShell maxWidth="max-w-5xl">
      <Link 
        href="/ciurma" 
        className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline mb-6"
      >
        <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
      </Link>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{session.title}</h1>
            <p className="font-mono text-[var(--accent-strong)]">CODE: {session.joinCode}</p>
          </div>
          <div className="flex gap-2">
            <a href="/stage" target="_blank" rel="noreferrer">
              <MatchDrinkButton variant="secondary" size="md">SMART STAGE</MatchDrinkButton>
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
                    {advanceButtonLabel && (
                      <MatchDrinkButton
                        onClick={() => void handleAdvanceStage()}
                        variant="primary"
                        loading={isAdvancingStage}
                      >
                        {advanceButtonLabel}
                      </MatchDrinkButton>
                    )}
                  </>
                )}
                {session.status === "matching" && (
                  <MatchDrinkButton
                    onClick={() => void handleAdvanceStage()}
                    loading={isAdvancingStage}
                  >
                    REVEAL MATCH
                  </MatchDrinkButton>
                )}
              </div>

              {session.status === "playing" && (
                <div className="mt-6 panel-muted rounded-xl p-4">
                   {(() => {
                     const questions = session.questions || [];
                     const q = questions[session.currentQuestionIndex];
                     if (!q) return <p className="text-sm text-[var(--text-muted)]">Caricamento domanda...</p>;
                     return (
                       <>
                        <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-widest">Domanda {session.currentQuestionIndex + 1}</p>
                        <p className="text-lg font-bold text-white">{q.text}</p>
                        <p className="mt-2 text-sm text-[var(--accent-strong)] font-bold">{totalAnswers} risposte su {players.length} giocatori</p>
                       </>
                     );
                   })()}
                </div>
              )}
            </MatchDrinkCard>

            <MatchDrinkCard>
              <h2 className="eyebrow mb-4">Quadro Operativo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={`panel-muted rounded-xl p-4 ${revealReady ? "border border-[var(--accent-strong)] bg-[var(--accent-soft)]/10" : ""}`}>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Reveal pronto</p>
                  <p className="mt-2 text-2xl font-black text-white">{revealReady ? "SI" : "NO"}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {matches.length} match calcolati
                  </p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Match confermati</p>
                  <p className="mt-2 text-2xl font-black text-white">{analytics?.acceptedMatches ?? confirmedMatches.length}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Drink sbloccati: {analytics?.drinksUnlocked ?? confirmedMatches.length}
                  </p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Drink serviti</p>
                  <p className="mt-2 text-2xl font-black text-white">{analytics?.drinksRedeemed ?? redeemedDrinks}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Iscrizioni: {analytics?.signups ?? realPlayers.length}
                  </p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Persone in attesa</p>
                  <p className="mt-2 text-2xl font-black text-white">{peopleWaiting}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    In attesa di conferma o senza drink servito
                  </p>
                </div>
              </div>
            </MatchDrinkCard>

            <MatchDrinkCard>
              <h2 className="eyebrow mb-4">Previsione Match e Tavoli</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Donne ricerca romantica</p>
                  <p className="mt-2 text-3xl font-black text-white">{romanticWomen}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Cercano uomo, donna o entrambi</p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Uomini ricerca romantica</p>
                  <p className="mt-2 text-3xl font-black text-white">{romanticMen}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Cercano uomo, donna o entrambi</p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Persone ricerca amicizia</p>
                  <p className="mt-2 text-3xl font-black text-white">{friendshipSeekers}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Selezione: solo nuove amicizie</p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Coppie Romance previste</p>
                  <p className="mt-2 text-3xl font-black text-white">{forecast?.romancePairs ?? 0}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Capienza attuale: {forecast?.romanceCapacity ?? 0}</p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Tavoli Friendship previsti</p>
                  <p className="mt-2 text-3xl font-black text-white">{forecast?.friendshipGroups ?? forecast?.friendshipPairs ?? 0}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Persone incluse: {forecast?.friendshipPeople ?? 0} · Capienza tavoli: {forecast?.friendshipCapacity ?? 0}
                  </p>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Persone senza match</p>
                  <p className="mt-2 text-3xl font-black text-white">{forecast?.unmatchedPlayers ?? 0}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Stima sui tavoli e compatibilita attuali</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="panel-muted rounded-xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--accent-strong)]">Tavoli Romance disponibili</p>
                  <div className="mt-3 space-y-2">
                    {meetingTableOptions.filter((table) => table.zone === "romance").map((table) => {
                      const checked = !excludedMeetingTables.includes(table.key);
                      return (
                        <label key={table.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white">
                          <span>
                            {table.label} · {table.seats} posti · {table.slots} match
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => void handleToggleExcludedTable(table.key)}
                            className="h-4 w-4 accent-[var(--accent-strong)]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="panel-muted rounded-xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--accent-strong)]">Tavoli Friendship disponibili</p>
                  <div className="mt-3 space-y-2">
                    {meetingTableOptions.filter((table) => table.zone === "friendship").map((table) => {
                      const checked = !excludedMeetingTables.includes(table.key);
                      return (
                        <label key={table.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white">
                          <span>
                            {table.label} · {table.seats} posti · {table.slots} match
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => void handleToggleExcludedTable(table.key)}
                            className="h-4 w-4 accent-[var(--accent-strong)]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
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

            <MatchDrinkCard>
              <h2 className="eyebrow mb-4">Approccio profili</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void updateSecondaryTraitMode("macro_category")}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    secondaryTraitMode === "macro_category"
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]/10 text-white"
                      : "border-white/10 bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  <p className="text-sm font-black uppercase tracking-widest">Secondario in Macrocategoria</p>
                  <p className="mt-2 text-xs leading-relaxed">
                    Il tratto secondario viene scelto dentro la stessa famiglia del dominante.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void updateSecondaryTraitMode("absolute")}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    secondaryTraitMode === "absolute"
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]/10 text-white"
                      : "border-white/10 bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  <p className="text-sm font-black uppercase tracking-widest">Secondario assoluto</p>
                  <p className="mt-2 text-xs leading-relaxed">
                    Il tratto secondario è il secondo più forte in assoluto, anche fuori macro-categoria.
                  </p>
                </button>
              </div>
            </MatchDrinkCard>

            {/* Confirmed Matches */}
            <MatchDrinkCard>
              <h2 className="eyebrow mb-4">Abbinamenti Confermati ({confirmedMatches.length})</h2>
              <div className="space-y-3">
                {confirmedMatches.map(m => (
                  <div key={m.id} className="panel-muted rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {m.isFriendshipGroup ? (
                        <p className="text-white font-bold">
                          {players.find(p => p.id === m.playerAId)?.nickname}
                          <span className="mx-2 text-[var(--accent-strong)]">·</span>
                          Tavolo friendship con {(m.friendshipGroupMembers ?? [])
                            .filter(member => member.id !== m.playerAId)
                            .map(member => member.nickname)
                            .join(", ")}
                        </p>
                      ) : (
                        <p className="text-white font-bold">
                          {players.find(p => p.id === m.playerAId)?.nickname} (T{players.find(p => p.id === m.playerAId)?.tableNumber}) 
                          <span className="mx-2 text-[var(--accent-strong)]">❤️</span>
                          {players.find(p => p.id === m.playerBId)?.nickname} (T{players.find(p => p.id === m.playerBId)?.tableNumber})
                        </p>
                      )}
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
              <h2 className="eyebrow mb-4">Ciurma ({realPlayers.length})</h2>
              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hidden">
                {realPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                    <span className="text-white font-medium">{p.nickname}</span>
                    <span className="text-[var(--text-muted)]">Tavolo {p.tableNumber}</span>
                  </div>
                ))}
              </div>
            </MatchDrinkCard>

              {/* Moderation */}
            <MatchDrinkCard variant="muted">
              <div className="space-y-4 mb-6">
                <h2 className="eyebrow">Gestione Messaggi</h2>
                <div className="flex gap-2">
                  <MatchDrinkButton 
                    className="flex-1" 
                    variant={session.bottleMessagesEnabled ? "primary" : "secondary"}
                    onClick={() => toggleMessages(true)}
                  >
                    ABILITA
                  </MatchDrinkButton>
                  <MatchDrinkButton 
                    className="flex-1" 
                    variant={!session.bottleMessagesEnabled ? "danger" : "secondary"}
                    onClick={() => toggleMessages(false)}
                  >
                    DISABILITA
                  </MatchDrinkButton>
                </div>
                <div className={`p-2 rounded-lg text-center text-[10px] font-black uppercase tracking-widest ${
                  session.bottleMessagesEnabled ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                }`}>
                  I messaggi sono {session.bottleMessagesEnabled ? "ATTIVI" : "DISATTIVATI"} sui telefoni
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 pt-4 border-t border-white/10">
                <h2 className="eyebrow">Moderazione Manuale</h2>
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
                        {msg.displayMode === "captain" ? "Capitano" : (
                          `${players.find(p => p.id === msg.playerId)?.nickname || "Sconosciuto"}${msg.displayMode === "anonymous" ? " (Anonimo)" : ""}`
                        )}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-white mb-3 italic">&quot;{msg.message}&quot;</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.status === "pending" && (
                        <>
                          <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" onClick={() => moderateMessage(msg.id, "approved")}>APPROVA</MatchDrinkButton>
                          <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" variant="secondary" onClick={() => moderateMessage(msg.id, "rejected")}>RIFIUTA</MatchDrinkButton>
                        </>
                      )}
                      {(msg.status === "approved" || msg.status === "shown") && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded uppercase">In Rotazione</span>
                          {msg.status !== "shown" && (
                             <MatchDrinkButton size="md" className="py-1 min-h-0 text-[10px]" onClick={() => moderateMessage(msg.id, "shown")}>EVIDENZIA</MatchDrinkButton>
                          )}
                        </div>
                      )}
                      {msg.status === "shown" && (
                        <span className="text-[10px] font-bold text-[var(--accent-strong)] ml-auto animate-pulse">LIVE ORA</span>
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
