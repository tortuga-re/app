"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useMatchDrinkStage } from "@/lib/match-drink/use-match-drink-stage";
import { MATCH_DRINK_QUESTIONS } from "@/lib/match-drink/questions";

export default function MatchDrinkStagePage() {
  const { id } = useParams<{ id: string }>();
  const { session, players, answers, currentMessage, loading } = useMatchDrinkStage(id);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--accent-strong)] animate-pulse uppercase tracking-[0.5em]">Tortuga Match & Drink</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.1),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(178,122,52,0.05),transparent_60%)]" />
      </div>

      <div className="relative flex-1 flex flex-col p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex flex-col">
            <h1 className="text-5xl font-black gold-gradient uppercase tracking-tighter">Match & Drink</h1>
            <p className="text-xl uppercase tracking-[0.4em] text-[var(--accent-strong)] font-bold">Il gioco live più pericolosamente social</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-sm text-[var(--text-muted)] uppercase tracking-widest mb-1">Codice per salire a bordo</p>
            <p className="text-7xl font-black text-white tracking-tighter bg-white/5 px-6 py-2 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">{session.joinCode}</p>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 flex flex-col justify-center">
          {session.stageMode === "lobby" && (
            <div className="text-center space-y-12 animate-in fade-in zoom-in duration-700">
               <div className="space-y-4">
                <h2 className="text-6xl font-bold leading-tight">
                  Rispondi dal telefono.<br />
                  Scopri il tuo match in sala.<br />
                  Decidi se brindarci sopra.
                </h2>
                <p className="text-2xl text-[var(--text-muted)]">Scansiona il QR, scegli il tuo nickname e sali a bordo.</p>
              </div>
              <div className="flex items-center justify-center gap-12">
                <div className="panel p-8 rounded-3xl flex items-center justify-center w-64 h-64 bg-white/5 border-white/10">
                   <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest text-center">QR CODE<br />COMING SOON</p>
                </div>
                <div className="text-left space-y-2">
                  <p className="text-3xl font-bold text-[var(--accent-strong)]">{players.length} Pirati pronti</p>
                  <p className="text-xl text-[var(--text-muted)]">La sfida inizierà tra poco...</p>
                </div>
              </div>
            </div>
          )}

          {session.stageMode === "question" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
              {(() => {
                const q = MATCH_DRINK_QUESTIONS[session.currentQuestionIndex];
                const qAnswers = answers.filter(a => a.questionId === q.id);
                return (
                  <>
                    <div className="space-y-4">
                      <p className="text-2xl text-[var(--accent-strong)] font-black uppercase tracking-[0.3em]">Domanda {session.currentQuestionIndex + 1}</p>
                      <h2 className="text-7xl font-bold leading-[1.1]">{q.text}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      {q.options.map(opt => (
                        <div key={opt.id} className="panel rounded-3xl p-8 flex items-center gap-8 border-white/10 bg-white/5">
                          <span className="text-6xl font-black text-[var(--accent-strong)]">{opt.id}</span>
                          <span className="text-3xl font-bold leading-snug">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-8">
                      <p className="text-2xl text-[var(--text-muted)]">Prendi il telefono e scegli A, B, C, D o E</p>
                      <p className="text-3xl font-bold"><span className="text-[var(--accent-strong)]">{qAnswers.length}</span> / {players.length} Risposte</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {session.stageMode === "question_results" && (
            <div className="space-y-12 animate-in fade-in duration-700">
              {(() => {
                const q = MATCH_DRINK_QUESTIONS[session.currentQuestionIndex];
                const qAnswers = answers.filter(a => a.questionId === q.id);
                const counts = q.options.map(opt => ({
                  ...opt,
                  count: qAnswers.filter(a => a.selectedOptionId === opt.id).length
                }));
                const maxCount = Math.max(...counts.map(c => c.count)) || 1;

                return (
                  <>
                    <div className="space-y-4 text-center">
                      <p className="text-2xl text-[var(--accent-strong)] font-black uppercase tracking-[0.3em]">Risultati Domanda {session.currentQuestionIndex + 1}</p>
                      <h2 className="text-5xl font-bold">{q.text}</h2>
                    </div>
                    <div className="space-y-6 max-w-5xl mx-auto w-full">
                      {counts.map(c => (
                        <div key={c.id} className="relative h-20 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center px-8">
                          <div 
                            className="absolute inset-y-0 left-0 bg-[var(--accent-soft)] border-r border-[var(--accent-strong)] transition-all duration-1000"
                            style={{ width: `${(c.count / qAnswers.length) * 100 || 0}%` }}
                          />
                          <span className="relative z-10 text-3xl font-black mr-6 text-[var(--accent-strong)]">{c.id}</span>
                          <span className="relative z-10 text-2xl font-bold flex-1">{c.text}</span>
                          <span className="relative z-10 text-3xl font-black">{Math.round((c.count / qAnswers.length) * 100 || 0)}%</span>
                        </div>
                      ))}
                    </div>
                    {maxCount > 0 && (
                      <div className="text-center pt-8">
                         <p className="text-3xl italic text-[var(--accent-strong)]">
                           &quot;{counts.find(c => c.count === maxCount)?.comment || "Il Capitano sta prendendo appunti."}&quot;
                         </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {session.stageMode === "message" && currentMessage && (
            <div className="flex flex-col items-center justify-center animate-in zoom-in fade-in duration-700">
              <div className="panel max-w-5xl p-16 rounded-[4rem] border-[var(--accent-strong)] border-2 bg-[var(--accent-soft)] shadow-[0_0_100px_rgba(216,176,106,0.15)] text-center relative">
                <p className="eyebrow mb-8 text-2xl">Message in a Bottle</p>
                <p className="text-7xl font-bold leading-tight mb-12 italic text-white">
                  &quot;{currentMessage.approvedText || currentMessage.message}&quot;
                </p>
                <p className="text-3xl font-black uppercase tracking-[0.4em] text-[var(--accent-strong)]">
                  — {currentMessage.displayMode === "anonymous" ? "Messaggio anonimo dalla ciurma" : players.find(p => p.id === currentMessage.playerId)?.nickname}
                </p>
              </div>
            </div>
          )}

          {session.stageMode === "matching" && (
            <div className="text-center space-y-12 animate-in pulse duration-1000 infinite">
              <h2 className="text-8xl font-black text-white italic">IL CAPITANO STA GIUDICANDO...</h2>
              <p className="text-3xl text-[var(--text-muted)] tracking-widest uppercase">Incrocio dati, traumi e pessime decisioni in corso</p>
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-4 h-4 rounded-full bg-[var(--accent-strong)] animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {session.stageMode === "reveal" && (
            <div className="text-center space-y-12 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-8xl font-black gold-gradient uppercase tracking-tighter">IL VERDETTO È PRONTO</h2>
              <p className="text-4xl text-white font-bold leading-relaxed">
                I match sono stati inviati sui vostri telefoni.<br />
                <span className="text-[var(--accent-strong)]">Controllate ora!</span>
              </p>
              <div className="panel-muted inline-block p-8 rounded-3xl border-white/20">
                <p className="text-2xl text-[var(--text-muted)] leading-relaxed">
                  Se accettate entrambi l&apos;abbinamento,<br />
                  sbloccate il <span className="text-white font-black">DRINK DEL MATCH</span>:<br />
                  <span className="text-4xl font-black text-white uppercase mt-4 block">1 drink per 2 persone al prezzo di 1</span>
                </p>
              </div>
            </div>
          )}

          {session.stageMode === "ended" && (
            <div className="text-center space-y-8 animate-in fade-in duration-1000">
              <h2 className="text-7xl font-black gold-gradient uppercase">MATCH & DRINK CONCLUSO</h2>
              <p className="text-3xl text-[var(--text-muted)] max-w-4xl mx-auto leading-relaxed">
                Se avete trovato l&rsquo;amore, bene. Se avete trovato un errore, almeno avete una storia da raccontare.
              </p>
              <p className="text-5xl font-bold text-[var(--accent-strong)] mt-12 uppercase">BUONA SERATA DALLA CIURMA!</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between text-[var(--text-muted)]">
          <p className="text-xl font-bold uppercase tracking-[0.2em]">{session.title}</p>
          <p className="text-xl font-bold uppercase tracking-[0.2em]">{players.length} Pirati collegati</p>
          <p className="text-xl font-bold uppercase tracking-[0.2em]">app.tortugabay.it</p>
        </div>
      </div>
    </main>
  );
}
