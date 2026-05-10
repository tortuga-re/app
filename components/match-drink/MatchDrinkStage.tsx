"use client";

import { useMatchDrinkStage } from "@/lib/match-drink/use-match-drink-stage";
import React from "react";
import { useRouter } from "next/navigation";
import { useMatchDrinkAdmin } from "@/lib/match-drink/use-match-drink-admin";
import { MatchDrinkMatch } from "@/lib/match-drink/types";

function CountdownTimer({ targetTime, onFinish }: { targetTime: number; onFinish?: () => void }) {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft("00:00");
        if (onFinish) onFinish();
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetTime, onFinish]);

  return <span className="text-6xl md:text-8xl font-black text-white font-mono">{timeLeft}</span>;
}

export function MatchDrinkStage({ sessionId }: { sessionId: string }) {
  const { session, players, answers, currentMessage, messages, matches, loading } = useMatchDrinkStage(sessionId);
  const [messageIndex, setMessageIndex] = React.useState(0);
  
  const approvedMessages = React.useMemo(() => 
    messages.filter(m => (m.status === "approved" || m.status === "shown") && !m.message.startsWith("COUNTDOWN:")), 
    [messages]
  );

  // Automated rotation logic (7 seconds) - No loop
  React.useEffect(() => {
    if (session?.stageMode !== "message" || approvedMessages.length <= 1) {
      // Non resettiamo l'indice a 0 se siamo già in modalità messaggio e ne arrivano di nuovi
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex(prev => {
        if (prev < approvedMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [session?.stageMode, approvedMessages.length]);


  const activeMessage = session?.stageMode === "message" 
    ? (approvedMessages[messageIndex] || currentMessage)
    : null;

  const router = useRouter();
  const admin = useMatchDrinkAdmin(sessionId);

  const handleCountdownFinish = React.useCallback(async () => {
    await admin.updateStatus("playing");
    router.push(`/admin/match-drink/session/${sessionId}`);
  }, [admin, router, sessionId]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--accent-strong)] animate-pulse uppercase tracking-[0.5em]">Tortuga Match & Drink</p>
      </div>
    );
  }

  return (
    <main className="h-screen bg-black text-white flex flex-col overflow-hidden select-none relative">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.1),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(178,122,52,0.05),transparent_60%)]" />
        
        {/* Watermark Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] select-none pointer-events-none">
          <p className="text-[18vw] font-black leading-none uppercase tracking-tighter whitespace-nowrap -rotate-6 text-white drop-shadow-2xl">
            Match & Drink
          </p>
        </div>
      </div>

      <div className="relative h-full flex flex-col p-6 md:p-12">
        {/* Dynamic Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center w-full relative z-10">
          {session.stageMode === "lobby" && (
            <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700">
               <div className="space-y-6">
                <p className="text-3xl text-[var(--accent-strong)] uppercase tracking-[0.5em] font-black">Benvenuti a Bordo</p>
                <h2 className="text-7xl md:text-8xl font-black leading-tight uppercase gold-gradient tracking-tighter">
                  TORTUGA<br />MATCH & DRINK
                </h2>
                <div className="space-y-4 max-w-4xl mx-auto">
                  <p className="text-3xl text-white font-bold uppercase tracking-tight">
                    Pronti a sfidare il destino stasera?
                  </p>
                  <div className="panel p-8 rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-sm border-2">
                    <p className="text-2xl text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">
                      Apri l&apos;app <span className="text-white font-black">TORTUGA</span> &gt; Sezione <span className="text-[var(--accent-strong)] font-black">CIURMA</span><br />
                      Entra in <span className="text-white font-black italic">MATCH & DRINK</span> per partecipare!
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-16">
                <div className="text-right space-y-2">
                  <p className="text-7xl font-black text-white tracking-tighter bg-white/5 px-8 py-3 rounded-[2rem] border border-white/10 shadow-[0_0_60px_rgba(216,176,106,0.1)]">{session.joinCode}</p>
                  <p className="text-xl text-[var(--accent-strong)] uppercase tracking-[0.5em] font-black">Codice Sessione</p>
                </div>
                <div className="text-left space-y-3">
                  <p className="text-5xl font-black text-white uppercase italic">{players.filter(p => p.nickname !== "_SYSTEM_").length} Pirati a bordo</p>
                  <p className="text-2xl text-[var(--text-muted)] uppercase tracking-widest">In attesa dell&apos;inizio...</p>
                </div>
              </div>
            </div>
          )}

          {(session.stageMode === "intro" || (session.stageMode === "message" && !currentMessage)) && (
            <div className="w-full max-w-[95%] mx-auto flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000 h-full text-center space-y-4 min-h-0">
              <div className="space-y-1 shrink-0">
                <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter italic ${session.status === "lobby" ? "text-[var(--success)] drop-shadow-[0_0_30px_rgba(34,197,94,0.4)]" : "text-[var(--danger)]"}`}>
                  ISCRIZIONI {session.status === "lobby" ? "APERTE" : "CHIUSE"}
                </h1>
                <p className="text-2xl md:text-3xl text-[var(--accent-strong)] font-black uppercase tracking-[0.5em]">A bordo questa sera:</p>
              </div>
 
              {(() => {
                const realPlayers = players.filter(p => p.nickname !== "_SYSTEM_");
                const total = realPlayers.length;
                const single = realPlayers.filter(p => p.relationshipStatus === "single").length;
                const complicato = realPlayers.filter(p => p.relationshipStatus === "complicato").length;
                const ridere = realPlayers.filter(p => p.relationshipStatus === "solo_per_ridere").length;
                
                const dangerLevel = 
                  complicato > total * 0.3 ? "ESTREMO (SI SALVI CHI PUÒ)" :
                  single > total * 0.5 ? "PREOCCUPANTE" :
                  ridere > total * 0.5 ? "SOLO PER CHIACCHERE" :
                  "ALTAMENTE INFIAMMABILE";

                // Check for countdown message
                const countdownMsg = messages.find(m => m.displayMode === "captain" && m.message.startsWith("COUNTDOWN:"));
                let countdownEnd: number | null = null;
                if (countdownMsg) {
                  const dateStr = countdownMsg.message.split(":")[1];
                  if (dateStr !== "CLEAR") {
                    const parsed = new Date(dateStr).getTime();
                    if (!isNaN(parsed)) {
                      countdownEnd = parsed;
                    }
                  }
                }

                return (
                  <div className="flex flex-col items-center gap-6 w-full max-w-6xl min-h-0 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4 w-full min-h-0 overflow-hidden">
                      <div className="panel p-5 rounded-[2rem] border-white/20 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center space-y-1">
                        <span className="text-5xl md:text-7xl font-black text-white">{total}</span>
                        <span className="text-xl font-black uppercase text-[var(--accent-strong)]">Naufraghi</span>
                      </div>
                      <div className="panel p-5 rounded-[2rem] border-white/20 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center space-y-1">
                        <span className="text-5xl md:text-7xl font-black text-white">{single}</span>
                        <span className="text-xl font-black uppercase text-[var(--accent-strong)]">Single</span>
                      </div>
                    </div>

                    {countdownEnd && (
                      <div className="w-full panel p-4 rounded-[2rem] border-[var(--accent-strong)] bg-black/40 border-2 flex flex-col items-center justify-center animate-pulse">
                         <p className="text-xl font-black uppercase tracking-[0.3em] text-[var(--accent-strong)] mb-1">Tempo Rimasto per salire a bordo</p>
                         <CountdownTimer targetTime={countdownEnd} onFinish={handleCountdownFinish} />
                      </div>
                    )}

                    <div className="w-full panel p-5 rounded-[3rem] border-[var(--accent-strong)] border-2 bg-[var(--accent-soft)]/20 flex flex-col items-center justify-center space-y-2 shrink-0">
                      <span className="text-xl font-black uppercase text-[var(--accent-strong)] tracking-widest">Livello medio di pericolo</span>
                      <span className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_20px_rgba(216,176,106,0.5)] text-center">
                        {dangerLevel}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {session.stageMode === "question" && (
            <div className="w-full max-w-[95%] mx-auto flex flex-col justify-center h-full space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500 min-h-0">
              {(() => {
                const questions = session.questions || [];
                const q = questions[session.currentQuestionIndex];
                if (!q) return <div className="text-center text-white/50">Caricamento domande...</div>;
                return (
                  <>
                    <div className="space-y-1 text-center shrink-0">
                      <p className="text-2xl text-[var(--accent-strong)] font-black uppercase tracking-[0.5em]">Domanda {session.currentQuestionIndex + 1}</p>
                      <h2 className="text-4xl md:text-6xl font-black leading-tight uppercase tracking-tight text-white">{q.text}</h2>
                    </div>                    <div className="flex-1 flex flex-col gap-4 w-full min-h-0 overflow-y-auto py-6 max-w-5xl mx-auto px-4">
                      {q.options.map(opt => (
                        <div 
                          key={opt.id} 
                          className="relative flex items-center group animate-in slide-in-from-bottom duration-500"
                          style={{ animationDelay: `${parseInt(opt.id) * 150}ms` }}
                        >
                          {/* Option Bar */}
                          <div className="w-full min-h-[5rem] md:min-h-[7rem] bg-white/5 border-l-[1rem] border-[var(--accent-strong)] rounded-r-[2rem] flex items-center px-8 shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-sm border border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)]/20 to-transparent pointer-events-none" />
                            
                            {/* Number Circle */}
                            <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white text-black shrink-0 shadow-2xl border-4 border-[var(--accent-strong)] transform -rotate-3 group-hover:rotate-0 transition-transform">
                              <span className="text-3xl md:text-5xl font-black leading-none">{opt.id}</span>
                            </div>
 
                            {/* Text */}
                            <div className="flex-1 ml-8 md:ml-12 overflow-hidden">
                              <span className="text-3xl md:text-5xl lg:text-6xl font-black uppercase text-white tracking-tighter block leading-tight drop-shadow-lg">
                                {opt.text}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </>
                );
              })()}
            </div>
          )}

          {session.stageMode === "question_results" && (
            <div className="w-full max-w-[95%] mx-auto flex flex-col justify-center h-full space-y-4 animate-in fade-in duration-700 min-h-0">
              {(() => {
                const questions = session.questions || [];
                const q = questions[session.currentQuestionIndex];
                if (!q) return null;
                
                const qAnswers = answers.filter(a => a.questionId === q.id);
                const counts = q.options.map(opt => ({
                  ...opt,
                  count: qAnswers.filter(a => a.selectedOptionId === opt.id).length
                }));
                const maxCount = Math.max(...counts.map(c => c.count)) || 1;

                return (
                  <>
                    <div className="space-y-1 text-center shrink-0">
                      <p className="text-2xl text-[var(--accent-strong)] font-black uppercase tracking-[0.5em]">Risultati Domanda {session.currentQuestionIndex + 1}</p>
                      <h2 className="text-4xl md:text-6xl font-black leading-tight uppercase tracking-tight text-white">{q.text}</h2>
                    </div>                    <div className="flex-1 flex flex-col gap-4 w-full min-h-0 overflow-y-auto py-6 max-w-5xl mx-auto px-4">
                      {counts.map(c => (
                        <div key={c.id} className="relative bg-white/5 rounded-r-[2rem] border border-white/10 overflow-hidden flex items-center px-8 min-h-0 shadow-2xl backdrop-blur-sm">
                          {/* Progress Bar Background */}
                          <div 
                            className="absolute inset-y-0 left-0 bg-[var(--accent-strong)]/30 border-r-4 border-[var(--accent-strong)] transition-all duration-1000 shadow-[0_0_20px_rgba(216,176,106,0.3)]"
                            style={{ width: `${(c.count / (qAnswers.length || 1)) * 100}%` }}
                          />
                          
                          <div className="relative z-10 w-full flex items-center">
                            {/* Number Circle */}
                            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white text-black shrink-0 shadow-xl border-2 border-[var(--accent-strong)]">
                              <span className="text-2xl md:text-3xl font-black leading-none">{c.id}</span>
                            </div>
 
                            <div className="flex-1 ml-6 md:ml-10 overflow-hidden">
                              <span className="text-2xl md:text-4xl font-black uppercase text-white tracking-tighter truncate block drop-shadow-lg">{c.text}</span>
                            </div>
                            
                            <div className="ml-4 flex flex-col items-end shrink-0">
                              <span className="text-2xl md:text-4xl font-black text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                {Math.round((c.count / (qAnswers.length || 1)) * 100)}%
                              </span>
                              <span className="text-[10px] md:text-xs font-black text-[var(--accent-strong)] uppercase tracking-[0.2em]">{c.count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {maxCount > 0 && (
                      <div className="text-center pt-2 shrink-0">
                         <p className="text-2xl md:text-3xl italic text-[var(--accent-strong)] font-black uppercase tracking-tight leading-tight">
                           &quot;{counts.find(c => c.count === maxCount)?.comment || "Il Capitano sta prendendo appunti."}&quot;
                         </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {session.stageMode === "message" && 
           activeMessage && 
           !activeMessage.message.trim().startsWith("COUNTDOWN:") && (
            <div className="w-full max-w-[95%] mx-auto flex flex-col items-center justify-center animate-in zoom-in fade-in duration-700 h-full overflow-hidden">
              {(() => {
                const msgText = activeMessage.approvedText || activeMessage.message;
                const len = msgText.length;
                // Font dinamico in base alla lunghezza (ottimizzato per max 300 char)
                const fontSize = 
                  len < 40 ? "text-7xl md:text-9xl" : 
                  len < 80 ? "text-6xl md:text-7xl" : 
                  len < 150 ? "text-5xl md:text-6xl" : 
                  len < 220 ? "text-4xl md:text-5xl" :
                  "text-3xl md:text-4xl";
 
                const isCaptain = activeMessage.displayMode === "captain";
                
                return (
                  <div className={`panel w-full max-h-[85vh] p-12 md:p-20 rounded-[4rem] border-4 shadow-[0_0_150px_rgba(216,176,106,0.2)] text-center relative flex flex-col justify-center overflow-hidden transition-all duration-500 ${
                    isCaptain 
                      ? "border-[var(--accent-strong)] bg-black/80 shadow-[0_0_150px_rgba(216,176,106,0.4)] ring-4 ring-[var(--accent-soft)]" 
                      : "border-[var(--accent-strong)] bg-[var(--accent-soft)]"
                  }`}>
                    <p className={`eyebrow mb-6 text-2xl md:text-4xl tracking-[0.5em] shrink-0 ${isCaptain ? "gold-gradient font-black" : ""}`}>
                      {isCaptain ? "COMUNICAZIONE DAL CAPITANO" : "Message in a Bottle"}
                    </p>
                    <div className="flex-1 flex items-center justify-center overflow-hidden py-4">
                      <p className={`${fontSize} font-black leading-[1.1] italic text-white uppercase tracking-tighter`}>
                        &quot;{msgText}&quot;
                      </p>
                    </div>
                    <div className="pt-8 border-t border-white/10 shrink-0">
                      <p className={`text-3xl md:text-4xl font-black uppercase tracking-[0.3em] ${isCaptain ? "gold-gradient" : "text-[var(--accent-strong)]"}`}>
                        — {isCaptain ? "IL VOSTRO CAPITANO" : (activeMessage.displayMode === "anonymous" 
                            ? "Messaggio anonimo dalla ciurma" 
                            : (players.find(p => p.id === activeMessage.playerId)?.nickname || "Un misterioso Pirata"))}
                      </p>
                    </div>
                    {isCaptain && (
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(216,176,106,0.1),transparent_70%)] animate-pulse" />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {session.stageMode === "matching" && (
            <div className="text-center space-y-12 animate-in pulse duration-1000 infinite">
              <h2 className="text-9xl font-black text-white italic tracking-tighter">IL CAPITANO STA GIUDICANDO...</h2>
              <p className="text-4xl text-[var(--accent-strong)] tracking-[0.3em] uppercase font-black">Incrocio dati, traumi e pessime decisioni in corso</p>
              <div className="flex justify-center gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-[var(--accent-strong)] animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {session.stageMode === "reveal" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-1000 min-h-0 w-full">
              <h2 className="text-6xl md:text-8xl font-black gold-gradient uppercase tracking-tighter">IL VERDETTO È PRONTO</h2>
              <div className="space-y-2">
                <p className="text-4xl md:text-5xl text-white font-black uppercase tracking-tight">
                  I match sono stati inviati sui vostri telefoni.
                </p>
                <p className="text-6xl md:text-7xl text-[var(--accent-strong)] font-black uppercase tracking-[0.2em] animate-pulse">
                  CONTROLLATE ORA!
                </p>
              </div>

              {/* Match Stats */}
              {matches && matches.length > 0 && (
                <div className="w-full max-w-5xl mx-auto mt-8">
                  {(() => {
                    const byLabel = matches.reduce((acc: Record<string, number>, m: MatchDrinkMatch) => {
                      acc[m.label] = (acc[m.label] || 0) + 1;
                      return acc;
                    }, {});
                    const entries = Object.entries(byLabel).sort((a, b) => b[1] - a[1]);
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        <div className="col-span-full mb-2">
                          <p className="text-2xl font-black uppercase tracking-widest text-[var(--text-muted)]">Coppie Formate: <span className="text-white text-4xl ml-2">{matches.length}</span></p>
                        </div>
                        {entries.map(([label, count]) => (
                          <div key={label} className="panel bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center space-y-1">
                            <span className="text-4xl font-black text-[var(--accent-strong)]">{count}</span>
                            <span className="text-sm font-bold text-white uppercase tracking-wider text-center">{label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="panel-muted inline-block p-8 rounded-[2rem] border-white/20 bg-white/5 backdrop-blur-md mt-4">
                <p className="text-3xl md:text-4xl text-white leading-tight uppercase font-black">
                  Se accettate entrambi l&apos;abbinamento,<br />
                  sbloccate il <span className="gold-gradient">DRINK DEL MATCH</span>
                </p>
                <p className="text-5xl md:text-6xl font-black text-white uppercase mt-6 block tracking-tighter border-t border-white/10 pt-6">
                  1 DRINK PER 2 PERSONE<br />
                  <span className="text-[var(--accent-strong)]">AL PREZZO DI 1</span>
                </p>
              </div>
            </div>
          )}

          {session.stageMode === "ended" && (
            <div className="text-center space-y-10 animate-in fade-in zoom-in duration-1000">
              <div className="space-y-4">
                <h2 className="text-7xl md:text-8xl font-black gold-gradient uppercase tracking-tighter">BUON VENTO, PIRATI!</h2>
                <p className="text-3xl text-[var(--accent-strong)] font-black uppercase tracking-[0.4em]">Il Match & Drink si conclude qui</p>
              </div>
              
              <div className="panel p-10 rounded-[3rem] border-white/10 bg-white/5 backdrop-blur-md max-w-4xl mx-auto space-y-6">
                <p className="text-4xl text-white font-bold leading-tight uppercase italic">
                  Grazie per aver giocato con noi e aver sfidato il destino tra i mari di Tortuga.
                </p>
                <div className="h-px bg-white/10 w-1/2 mx-auto" />
                <p className="text-3xl text-[var(--text-muted)] uppercase tracking-wide">
                  Che le nuove rotte tracciate stasera<br />
                  portino a <span className="text-white font-black">scoperte leggendarie</span> e <span className="text-[var(--accent-strong)] font-black">nuovi brindisi</span>.
                </p>
              </div>
              
              <p className="text-5xl font-black gold-gradient mt-8 uppercase tracking-widest italic animate-pulse">
                ALLA PROSSIMA AVVENTURA!
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
