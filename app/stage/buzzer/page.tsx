"use client";

import { useEffect, useState, useRef } from "react";
import type { BuzzerState, BuzzerEntry, Team } from "@/lib/live-buzzer/types";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

type StageState = BuzzerState & {
  userEntry?: BuzzerEntry | null;
  currentResponder?: BuzzerEntry | null;
};

function YouTubePlayer({ playlistId, status, commandId }: { playlistId: string, status: string, commandId: number }) {
  const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCommandId = useRef(commandId);
  const lastCommandTimeRef = useRef<number>(0);
  const lastSeekedUrl = useRef<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onStateChange = (event: any) => {
    // Evitiamo feedback loop di STOP o PAUSE durante il cambio canzone (ignora per 3 secondi)
    if (Date.now() - lastCommandTimeRef.current < 3000) {
      if (event.data === 0 || event.data === 2) return;
    }

    // -1 = unstarted, 3 = buffering
    if (event.data === -1 || event.data === 3) {
      const target = event.target;
      const videoId = target?.getVideoData?.()?.video_id || target?.getVideoUrl?.();
      // Se è un nuovo video, muta subito l'audio per non far sentire l'inizio da 0s
      if (videoId && videoId !== lastSeekedUrl.current) {
        target.mute();
      }
    }

    // 1 = playing, 2 = paused, 0 = ended
    if (event.data === 1) {
      const target = event.target;
      const title = target?.getVideoData?.()?.title;
      const currentUrl = target?.getVideoUrl?.();
      const videoId = target?.getVideoData?.()?.video_id || currentUrl;
      
      // Salta a 25 secondi solo la prima volta che questo specifico video va in play
      if (videoId && videoId !== lastSeekedUrl.current) {
        lastSeekedUrl.current = videoId;
        target.mute(); // Assicuriamoci che sia muto
        setTimeout(() => {
          if (target && typeof target.seekTo === 'function') {
            target.seekTo(25, true);
            setTimeout(() => {
              target.unMute();
              target.setVolume(100);
            }, 150); // Smuta dopo aver saltato
          }
        }, 150); // Piccolo timeout per permettere al buffer di inizializzarsi
      } else {
        // Se non è un nuovo video, assicuriamoci che l'audio sia attivo (es. ripresa dalla pausa)
        target.unMute();
        target.setVolume(100);
      }
      
      const sendTitle = (t: string) => {
        console.log("STAGE: Sending title to server:", t);
        void fetch("/api/live-buzzer/admin/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setStatus", status: "playing", title: t }),
        });
      };

      if (title && title !== "") {
        sendTitle(title);
      } else {
        // Fallback: try to get it from our proxy to bypass CORS
        const url = target?.getVideoUrl?.();
        if (url) {
          let cleanUrl = "";
          if (url.includes("watch?v=")) {
            cleanUrl = url.split('&')[0];
          } else if (url.includes("embed/")) {
            const videoId = url.split("embed/")[1].split("?")[0];
            cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
          } else {
            cleanUrl = url;
          }
          
          fetch(`/api/live-buzzer/admin/youtube-title?url=${encodeURIComponent(cleanUrl)}`)
            .then(res => res.json())
            .then(data => {
              sendTitle(data.title || "Brano in riproduzione");
            })
            .catch(() => sendTitle("Brano in riproduzione"));
        } else {
          sendTitle("Brano in riproduzione");
        }
      }
    } else if (event.data === 0) {
      // VIDEO FINITO
      void fetch("/api/live-buzzer/admin/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setStatus", status: "stopped" }),
      });
    }
  };

  useEffect(() => {
    // Carica l'API di YouTube se non presente
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        },
        events: {
          onReady: (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            event.target.setShuffle(true);
            if (status === "playing") {
              event.target.playVideo();
            }
          },
          onStateChange
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [playlistId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (commandId > lastCommandId.current && playerRef.current) {
      lastCommandId.current = commandId;
      lastCommandTimeRef.current = Date.now();
      
      void fetch("/api/live-buzzer/admin/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setStatus", status: "playing", title: "Caricamento brano..." }),
      });

      if (typeof playerRef.current.nextVideo === 'function') {
        playerRef.current.nextVideo();
      }
    }
  }, [commandId]);

  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;

    if (status === "playing") {
      playerRef.current.setVolume?.(100);
      playerRef.current.playVideo();
    } else if (status === "paused") {
      playerRef.current.pauseVideo();
    } else if (status === "stopped") {
      playerRef.current.stopVideo();
    }
  }, [status]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0 scale-150 origin-center" />
    </div>
  );
}

function CountdownDisplay({ countdownStart }: { countdownStart: number }) {
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.ceil((countdownStart + 3000 - Date.now()) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 100);
    return () => clearInterval(interval);
  }, [countdownStart]);

  return (
    <div className="text-center space-y-12 animate-in zoom-in duration-500 w-full h-full flex flex-col items-center justify-center">
      <h2 className="text-5xl md:text-7xl font-black uppercase tracking-widest text-[var(--accent-strong)]">
        PREPARATE I BUZZER
      </h2>
      <div className="relative">
        <div className="absolute inset-0 bg-[var(--accent)] blur-[100px] opacity-40 animate-pulse" />
        <span className="relative text-[15rem] md:text-[20rem] font-black leading-none uppercase text-white drop-shadow-2xl">
          {timeLeft > 0 ? timeLeft : "GO!"}
        </span>
      </div>
    </div>
  );
}

function LeaderboardList({ leaderboard, revealStep }: { leaderboard: Team[], revealStep: number | null }) {
  // Se c'è un reveal step, calcola quali posizioni mostrare
  // Esempio: 10 squadre, revealStep = 1 -> mostra solo index 9 (l'ultimo)
  // revealStep = 2 -> mostra index 8 e 9
  const thresholdIndex = revealStep !== null 
    ? leaderboard.length - revealStep 
    : 0;

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[50vh] overflow-hidden mt-12">
      {leaderboard.map((team, index) => {
        // Se l'indice è minore del threshold, nascondi l'elemento
        if (revealStep !== null && index < thresholdIndex) return null;

        // Calcola una posizione top dinamica ignorando gli elementi nascosti
        // (così l'elemento mostrato sale verso l'alto o resta centrato in basso?)
        // In realtà, vogliamo che le posizioni fisse rimangano coerenti o che si impilino partendo dal basso?
        // Facciamo impilare partendo dall'alto della lista visibile:
        const visibleIndex = revealStep !== null ? index - thresholdIndex : index;

        return (
          <div 
            key={team.email} 
            className="absolute w-full flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-in slide-in-from-bottom-8 fade-in"
            style={{ top: `${visibleIndex * 80}px`, zIndex: 100 - index }}
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className="font-black text-[var(--accent-strong)] text-3xl">{index + 1}</span>
              </div>
              <div>
                <p className="font-black text-2xl text-white leading-tight uppercase truncate max-w-[400px]">{team.nickname}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {team.totalPoints !== -999 && team.movement !== "same" && revealStep === null && (
                <span className={`text-xl font-black px-3 py-1 rounded-full ${team.movement === "up" ? "text-green-400 bg-green-500/20" : "text-red-400 bg-red-500/20"} animate-in zoom-in`}>
                  {team.movement === "up" ? "↑" : "↓"} {Math.abs(team.rankDelta)}
                </span>
              )}
              <p className="text-4xl font-black text-white italic min-w-[80px] text-right">
                {team.totalPoints === -999 ? "X" : team.totalPoints}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BuzzerStagePage() {
  const [gameState, setGameState] = useState<StageState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;

    eventSource = new EventSource("/api/live-buzzer/stream");
    eventSource.onmessage = (event) => {
      try {
        if (cancelled) return;
        const data = JSON.parse(event.data) as StageState;
        setGameState(data);
        setLoading(false);
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--accent-strong)] animate-pulse uppercase tracking-[0.5em] font-black">Tortuga Music Quiz</p>
      </div>
    );
  }

  const currentResponder = gameState?.currentResponder;
  const isPlaying = gameState?.status === "open";
  const isCountdown = gameState?.status === "countdown";
  const isResultScreen = gameState?.status === "result_screen";
  const isClosedWithoutResponder = gameState?.status === "closed" && !currentResponder;

  return (
    <main className="h-screen bg-black text-white flex flex-col overflow-hidden select-none relative">
      {/* YouTube Layer */}
      {gameState?.youtubePlaylistId && (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isPlaying ? "opacity-100" : "opacity-40"}`}>
          <YouTubePlayer 
            playlistId={gameState.youtubePlaylistId}
            status={gameState.youtubeStatus}
            commandId={gameState.youtubeCommandId}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Header Overlay - SEMPRE VISIBILE */}
      <div className="relative z-20 flex items-center justify-between p-8 md:p-12">
        <div className="flex flex-col">
          <h1 className="text-5xl md:text-7xl font-black italic gold-gradient tracking-tighter">
            TORTUGA MUSIC QUIZ
          </h1>
          <p className="text-[var(--accent)] font-bold tracking-[0.4em] uppercase text-sm md:text-base">
            Buzzer Live Edition
          </p>
        </div>

        <div className="flex flex-col items-end">
          <div className="px-8 py-3 bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/30 rounded-full">
            <p className="text-3xl md:text-5xl font-black text-white italic">
              ROUND {gameState?.currentRound}
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-wave {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .wave-circle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(216,176,106,0.5) 0%, rgba(216,176,106,0) 70%);
          animation: pulse-wave 2s infinite cubic-bezier(0.1, 0.8, 0.3, 1);
        }
        .wave-circle:nth-child(2) { animation-delay: 0.6s; }
        .wave-circle:nth-child(3) { animation-delay: 1.2s; }
      `}} />

      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.1),transparent_70%)] transition-colors duration-1000" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(178,122,52,0.05),transparent_60%)] transition-colors duration-1000" />
      </div>

      <div className={`relative h-full flex-1 flex flex-col items-center justify-center z-10 w-full transition-all duration-700 ${(gameState?.youtubeStatus === 'playing' && !isResultScreen && !gameState?.leaderboardVisible) ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible'}`}>

        
        {isCountdown ? (
          <CountdownDisplay countdownStart={gameState?.countdownStart || 0} />
        ) : isResultScreen && gameState?.lastScoredEntry ? (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in fade-in duration-500">
            {gameState.lastScoredEntry.result === "correct" ? (
               <div className="text-center w-full relative z-10">
                 <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
                 <h2 className="text-7xl md:text-9xl font-black text-green-400 uppercase tracking-tighter drop-shadow-[0_0_40px_rgba(74,222,128,0.5)]">
                   RISPOSTA ESATTA!
                 </h2>
                 {gameState.youtubeVideoTitle && (
                   <div className="mt-8 mb-4 inline-block bg-black/60 border border-green-500/30 px-8 py-4 rounded-3xl backdrop-blur-md">
                     <p className="text-sm font-black text-green-400 uppercase tracking-widest mb-1">Il brano era</p>
                     <p className="text-2xl md:text-4xl font-bold text-white">{gameState.youtubeVideoTitle}</p>
                   </div>
                 )}
                 <p className="text-4xl md:text-5xl font-black text-white mt-4 uppercase drop-shadow-lg">
                   +{gameState.lastScoredEntry.scoreAwarded} PUNTI
                 </p>
               </div>
            ) : (
               <div className="text-center w-full">
                 <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
                 <h2 className="text-7xl md:text-9xl font-black text-red-500 uppercase tracking-tighter drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]">
                   AFFONDATI!
                 </h2>
                 <p className="text-4xl md:text-5xl font-black text-[var(--text-muted)] mt-4 uppercase">
                   -5 PUNTI
                 </p>
               </div>
            )}
          </div>
        ) : isPlaying ? null : currentResponder ? (
          <div className="text-center space-y-10 animate-in zoom-in fade-in duration-500 w-full">
             <div className="inline-block px-12 py-4 bg-[var(--accent-strong)]/20 border-2 border-[var(--accent-strong)] rounded-full shadow-[0_0_60px_rgba(216,176,106,0.4)]">
                <p className="text-4xl md:text-6xl font-black text-[var(--accent-strong)] uppercase tracking-widest">
                  STOP!
                </p>
             </div>
             
             <div className="space-y-6 pt-12 w-full max-w-5xl mx-auto">
               <p className="text-3xl md:text-5xl text-[var(--text-muted)] font-bold tracking-[0.2em] uppercase">Tavolo {currentResponder.tableNumber}</p>
               <h2 className="text-7xl md:text-[9rem] font-black leading-none uppercase text-white drop-shadow-2xl truncate px-4">
                 {currentResponder.nickname}
               </h2>
             </div>

             <div className="pt-16">
               <p className="text-7xl md:text-9xl font-mono font-black gold-gradient drop-shadow-[0_0_30px_rgba(216,176,106,0.4)]">
                 {(currentResponder.relativeTimeMs / 1000).toFixed(2)}s
               </p>
               <p className="text-2xl md:text-3xl text-[var(--accent)] font-bold tracking-[0.3em] uppercase mt-4">Tempo di Reazione</p>
             </div>
          </div>
        ) : isClosedWithoutResponder ? (
          <div className="text-center w-full h-full flex flex-col items-center justify-center animate-in zoom-in fade-in duration-500">
             <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full scale-150" />
             <h2 className="text-7xl md:text-9xl font-black text-red-500 uppercase tracking-tighter drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] relative z-10">
               TEMPO SCADUTO
             </h2>
             <p className="text-3xl md:text-5xl font-black text-[var(--text-muted)] mt-8 uppercase relative z-10">
               Nessuno ha indovinato!
             </p>
          </div>
        ) : (
          <div className="text-center w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-1000">
             <h2 className="text-5xl md:text-7xl font-black uppercase tracking-widest text-white mb-12 italic gold-gradient">
               {gameState?.leaderboardRevealStep !== null ? "Classifica Finale" : "Classifica Live"}
             </h2>
             <LeaderboardList 
               leaderboard={gameState?.leaderboard || []}
               revealStep={gameState?.leaderboardRevealStep ?? null}
             />
          </div>
        )}
      </div>
    </main>
  );
}
