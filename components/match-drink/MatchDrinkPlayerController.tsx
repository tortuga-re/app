"use client";

import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useMatchDrinkPlayer } from "@/lib/match-drink/use-match-drink-player";
import { MatchDrinkShell } from "./MatchDrinkShell";
import { MatchDrinkCard } from "./MatchDrinkCard";
import { MatchDrinkButton } from "./MatchDrinkButton";
import { MATCH_DRINK_QUESTIONS } from "@/lib/match-drink/questions";

export function MatchDrinkPlayerController() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || "";
  
  const {
    session,
    player,
    myMatch,
    myAnswers,
    loading,
    error,
    join,
    submitAnswer,
    respondToMatch,
    sendMessage,
  } = useMatchDrinkPlayer();

  if (loading) {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center">
          <p className="eyebrow animate-pulse">Caricamento in corso...</p>
        </div>
      </MatchDrinkShell>
    );
  }

  if (!player || !session) {
    return <JoinForm onJoin={join} defaultCode={codeFromUrl} error={error} />;
  }

  // Lobby
  if (session.status === "lobby") {
    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard className="text-center">
            <p className="eyebrow mb-2">Sei a bordo</p>
            <h1 className="text-3xl font-bold text-white">Aspetta il Capitano</h1>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              La vergogna inizierà tra poco. Tieni il telefono acceso.
            </p>
          </MatchDrinkCard>
          
          <BottleMessageForm onSend={sendMessage} />
        </div>
      </MatchDrinkShell>
    );
  }

  // Question Pad
  if (session.status === "playing") {
    const currentQuestion = MATCH_DRINK_QUESTIONS[session.currentQuestionIndex];
    const hasAnswered = myAnswers.some(a => a.questionId === currentQuestion?.id);

    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard variant="accent">
            <p className="eyebrow mb-2">Domanda {session.currentQuestionIndex + 1}</p>
            <h2 className="text-2xl font-bold text-white">
              Guarda lo schermo e scegli la tua risposta
            </h2>
          </MatchDrinkCard>

          {hasAnswered ? (
            <MatchDrinkCard variant="muted" className="text-center py-12">
              <p className="text-lg font-semibold text-[var(--accent-strong)]">Risposta registrata.</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Il Capitano sta giudicando le tue scelte di vita.</p>
            </MatchDrinkCard>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {["A", "B", "C", "D", "E"].map((opt) => (
                <MatchDrinkButton
                  key={opt}
                  variant="primary"
                  size="xl"
                  onClick={() => submitAnswer(currentQuestion.id, opt)}
                >
                  {opt}
                </MatchDrinkButton>
              ))}
            </div>
          )}
          
          <BottleMessageForm onSend={sendMessage} />
        </div>
      </MatchDrinkShell>
    );
  }

  // Matching / Suspense
  if (session.status === "matching") {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center text-center">
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full border-2 border-[var(--accent-strong)] animate-spin border-t-transparent" />
            <p className="text-lg font-medium text-white">
              Il sistema sta incrociando risposte, traumi e pessime decisioni…
            </p>
          </div>
        </div>
      </MatchDrinkShell>
    );
  }

  // Reveal
  if (session.status === "reveal") {
    if (!myMatch) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Nessun match sicuro trovato</h2>
            <p className="text-[var(--text-muted)]">
              A volte anche il sistema preferisce non prendersi responsabilità. Goditi il drink in solitaria o con la ciurma!
            </p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    const isPlayerA = myMatch.playerAId === player.id;
    const iAccepted = isPlayerA ? myMatch.acceptedByA : myMatch.acceptedByB;
    const theyAccepted = isPlayerA ? myMatch.acceptedByB : myMatch.acceptedByA;
    const myMatchNickname = isPlayerA ? "Il tuo match" : "Il tuo match"; // TODO: In un'app reale vorresti il nickname, ma qui dovremmo recuperarlo

    if (myMatch.drinkUnlocked) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard variant="accent" className="text-center">
            <p className="eyebrow mb-4">Match confermato!</p>
            <h2 className="text-3xl font-bold text-white mb-6">DRINK DEL MATCH SBLOCCATO</h2>
            <div className="panel-muted rounded-xl p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent-strong)] mb-1">Codice Drink</p>
              <p className="text-4xl font-black tracking-tighter text-white">{myMatch.drinkCode}</p>
            </div>
            <p className="text-sm mb-6">
              Mostrate questa schermata allo staff per avere <strong>1 drink per 2 persone al prezzo di 1</strong>.
            </p>
            <p className="text-xs text-[var(--text-muted)]">Criterio: {myMatch.commonCriterion}</p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    if (iAccepted === false) {
       return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center">
            <h2 className="text-xl font-bold text-white">Va bene così.</h2>
            <p className="mt-4 text-[var(--text-muted)]">Il Capitano rispetta la fuga. Il tuo match resterà nell'ombra.</p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    if (iAccepted === true) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center">
            <h2 className="text-xl font-bold text-white">Tu hai accettato.</h2>
            <p className="mt-4 text-[var(--text-muted)]">
              Ora aspettiamo l'altra metà del naufragio. Se accetta anche lei/lui, sbloccherete il Drink del Match.
            </p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard variant="accent">
            <p className="eyebrow mb-2">Hai un abbinamento!</p>
            <h2 className="text-2xl font-bold text-white mb-4">Il Capitano ha parlato.</h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Compatibilità</span>
                <span className="font-bold text-[var(--accent-strong)]">{myMatch.score}%</span>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-muted)]">Siete entrambi:</p>
                <p className="font-semibold text-white">{myMatch.commonCriterion}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-muted)]">Perché:</p>
                <p className="italic">{myMatch.reason}</p>
              </div>
            </div>
          </MatchDrinkCard>

          <div className="flex flex-col gap-3">
            <MatchDrinkButton size="lg" onClick={() => respondToMatch(true)}>
              SÌ, ACCETTO IL MATCH
            </MatchDrinkButton>
            <MatchDrinkButton variant="secondary" size="lg" onClick={() => respondToMatch(false)}>
              NO, RESTO NELL'OMBRA
            </MatchDrinkButton>
          </div>
          
          <p className="text-center text-xs text-[var(--text-muted)] px-4">
            Se entrambi accettate, sbloccate il Drink del Match (2 al prezzo di 1).
          </p>
        </div>
      </MatchDrinkShell>
    );
  }

  return (
    <MatchDrinkShell>
      <MatchDrinkCard className="text-center">
        <h2 className="text-xl font-bold text-white">Match & Drink è finito.</h2>
        <p className="mt-4 text-[var(--text-muted)]">Se avete trovato l'amore, bene. Se avete trovato un errore, almeno avete una storia da raccontare.</p>
      </MatchDrinkCard>
    </MatchDrinkShell>
  );
}

function JoinForm({ onJoin, defaultCode, error }: { onJoin: any, defaultCode: string, error: string | null }) {
  const [code, setCode] = useState(defaultCode);
  const [nickname, setNickname] = useState("");
  const [table, setTable] = useState("");
  const [age, setAge] = useState("25-34");
  const [gender, setGender] = useState("donna");
  const [status, setStatus] = useState("single");
  const [looking, setLooking] = useState("uomo");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onJoin(code, nickname, {
        tableNumber: table,
        ageRange: age,
        gender,
        relationshipStatus: status,
        lookingFor: looking,
        publicConsent: consent,
      });
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <MatchDrinkShell>
      <div className="space-y-6 pb-12">
        <div className="text-center">
          <h1 className="hero-title text-4xl font-black gold-gradient uppercase">Match & Drink</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--accent-strong)]">Il gioco live più pericolosamente social</p>
        </div>

        <MatchDrinkCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="eyebrow mb-2 block">Codice Sessione</label>
              <input 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ES. A1B2C3" 
                className="field text-center font-mono text-xl tracking-widest"
                required
              />
            </div>

            <div>
              <label className="eyebrow mb-2 block">Il tuo Nickname</label>
              <input 
                value={nickname} 
                onChange={e => setNickname(e.target.value)}
                placeholder="Nome da battaglia..." 
                className="field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="eyebrow mb-2 block">Tavolo</label>
                <input 
                  value={table} 
                  onChange={e => setTable(e.target.value)}
                  placeholder="Es. 12" 
                  className="field"
                  required
                />
              </div>
              <div>
                <label className="eyebrow mb-2 block">Età</label>
                <select value={age} onChange={e => setAge(e.target.value)} className="field">
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-45">35-45</option>
                  <option value="46-plus">46+</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow mb-2 block">Sei</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="field">
                  <option value="donna">Donna</option>
                  <option value="uomo">Uomo</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="eyebrow mb-2 block">Stato</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="field">
                  <option value="single">Single</option>
                  <option value="in_coppia">In coppia</option>
                  <option value="complicato">Complicato</option>
                  <option value="solo_per_ridere">Per ridere</option>
                </select>
              </div>
            </div>

            <div>
              <label className="eyebrow mb-2 block">Cerchi</label>
              <select value={looking} onChange={e => setLooking(e.target.value)} className="field">
                <option value="uomo">Uomo</option>
                <option value="donna">Donna</option>
                <option value="entrambi">Entrambi</option>
                <option value="nessun_match">Nessun match</option>
              </select>
            </div>

            <div className="flex items-start gap-3 py-2">
              <input 
                type="checkbox" 
                id="consent" 
                checked={consent} 
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-transparent accent-[var(--accent-strong)]"
              />
              <label htmlFor="consent" className="text-xs text-[var(--text-muted)] leading-relaxed">
                Autorizzo a mostrare il mio nickname e tavolo sul grande schermo in caso di match pubblico.
              </label>
            </div>

            {error && <p className="text-center text-sm text-red-400 font-medium">{error}</p>}

            <MatchDrinkButton type="submit" size="lg" className="w-full mt-4" loading={submitting}>
              SALI A BORDO
            </MatchDrinkButton>
          </form>
        </MatchDrinkCard>
      </div>
    </MatchDrinkShell>
  );
}

function BottleMessageForm({ onSend }: { onSend: any }) {
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await onSend(message, anon ? "anonymous" : "nickname");
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      // handled in hook
    } finally {
      setSending(false);
    }
  };

  return (
    <MatchDrinkCard variant="muted">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Message in a Bottle</p>
          {sent && <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Inviato!</span>}
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Invia un messaggio al Capitano..."
          className="field min-h-[80px] resize-none py-3 text-sm"
          maxLength={180}
          required
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="anon" 
              checked={anon} 
              onChange={e => setAnon(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] bg-transparent accent-[var(--accent-strong)]"
            />
            <label htmlFor="anon" className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Anonimo</label>
          </div>
          <MatchDrinkButton type="submit" size="md" loading={sending} disabled={!message.trim()}>
            INVIA
          </MatchDrinkButton>
        </div>
      </form>
    </MatchDrinkCard>
  );
}
