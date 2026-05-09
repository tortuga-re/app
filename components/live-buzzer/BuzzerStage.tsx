"use client";

import { useEffect, useState, useRef } from "react";
import type { BuzzerState, BuzzerEntry, Team } from "@/lib/live-buzzer/types";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
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

  const onStateChange = (event: { data: number; target: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Date.now() - lastCommandTimeRef.current < 3000) {
      if (event.data === 0 || event.data === 2) return;
    }

    if (event.data === -1 || event.data === 3) {
      const target = event.target;
      const videoId = target?.getVideoData?.()?.video_id || target?.getVideoUrl?.();
      if (videoId && videoId !== lastSeekedUrl.current) {
        target.mute();
      }
    }

    if (event.data === 1) {
      const target = event.target;
      const title = target?.getVideoData?.()?.title;
      const currentUrl = target?.getVideoUrl?.();
      const videoId = target?.getVideoData?.()?.video_id || currentUrl;
      
      if (videoId && videoId !== lastSeekedUrl.current) {
        lastSeekedUrl.current = videoId;
        target.mute();
        setTimeout(() => {
          if (target && typeof target.seekTo === 'function') {
            target.seekTo(25, true);
            setTimeout(() => {
              target.unMute();
              target.setVolume(100);
            }, 150);
          }
        }, 150);
      } else {
        target.unMute();
        target.setVolume(100);
      }
      
      const sendTitle = (t: string) => {
        void fetch("/api/live-buzzer/admin/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setStatus", status: "playing", title: t }),
        });
      };

      if (title && title !== "") {
        sendTitle(title);
      } else {
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
      void fetch("/api/live-buzzer/admin/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setStatus", status: "stopped" }),
      });
    }
  };

  useEffect(() => {
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
          onReady: (event: { target: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
  }, [playlistId, status]);

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
  // Modalità Sommario Finale (Top 10 in 2 colonne)
  if (revealStep === 999) {
    const top10 = leaderboard.slice(0, 10);
    const col1 = top10.slice(0, 5);
    const col2 = top10.slice(5, 10);

    return (
      <div className="w-full max-w-7xl mx-auto mt-8 animate-in fade-in zoom-in duration-1000">
        <div className="grid grid-cols-2 gap-12">
          {/* Prima Colonna (1-5) */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-[var(--accent-strong)] uppercase tracking-widest mb-6 border-b border-[var(--accent-strong)]/30 pb-2">Top 5</h3>
            {col1.map((team, i) => (
              <div key={team.email} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? "bg-[var(--accent-strong)]/20 border-[var(--accent-strong)] scale-105" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-4">
                  <span className="font-black text-3xl text-[var(--accent-strong)] w-8">{i + 1}</span>
                  <span className="font-black text-2xl text-white uppercase truncate max-w-[250px]">{team.nickname}</span>
                </div>
                <span className="text-3xl font-black italic text-white">{team.totalPoints}</span>
              </div>
            ))}
          </div>
          {/* Seconda Colonna (6-10) */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white/50 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Posizioni 6-10</h3>
            {col2.map((team, i) => (
              <div key={team.email} className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-4">
                  <span className="font-black text-2xl text-[var(--text-muted)] w-8">{i + 6}</span>
                  <span className="font-black text-xl text-white/80 uppercase truncate max-w-[250px]">{team.nickname}</span>
                </div>
                <span className="text-2xl font-black italic text-white/80">{team.totalPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const thresholdIndex = revealStep !== null 
    ? leaderboard.length - revealStep 
    : 0;

  // Se ci sono molte squadre, riduciamo leggermente l'altezza delle righe
  const rowHeight = leaderboard.length > 12 ? 65 : 80;
  const totalHeight = (leaderboard.length - (revealStep !== null ? thresholdIndex : 0)) * rowHeight;

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto mt-8 transition-all duration-500 flex flex-col items-center"
      style={{ height: `${Math.max(totalHeight, 400)}px` }}
    >
      {leaderboard.map((team, index) => {
        // In modalità reveal, mostriamo solo le squadre dal fondo fino allo step attuale
        if (revealStep !== null && index < thresholdIndex) return null;
        
        const visibleIndex = revealStep !== null ? index - thresholdIndex : index;
        const isWinner = revealStep !== null && index === 0 && revealStep >= leaderboard.length;

        return (
          <div 
            key={team.email} 
            className={`absolute w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-700 ease-out animate-in slide-in-from-bottom-12 fade-in ${
              isWinner 
                ? "bg-[var(--accent-strong)]/20 border-[var(--accent-strong)] shadow-[0_0_40px_rgba(216,176,106,0.4)] scale-110 z-50 ring-4 ring-[var(--accent-soft)]" 
                : "border-white/10 bg-white/5 backdrop-blur-md"
            }`}
            style={{ 
              top: `${visibleIndex * rowHeight}px`, 
              zIndex: 100 - index,
              transitionDelay: `${(index - thresholdIndex) * 50}ms`
            }}
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className={`font-black text-3xl ${isWinner ? "text-white" : "text-[var(--accent-strong)]"}`}>
                  {index + 1}
                </span>
              </div>
              <div className="flex flex-col">
                <p className={`font-black text-2xl leading-tight uppercase truncate max-w-[500px] ${isWinner ? "text-white" : "text-white/90"}`}>
                  {team.nickname}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tavolo {team.tableNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {team.totalPoints !== -999 && team.movement !== "same" && revealStep === null && (
                <span className={`text-xl font-black px-3 py-1 rounded-full ${team.movement === "up" ? "text-green-400 bg-green-500/20" : "text-red-400 bg-red-500/20"} animate-in zoom-in`}>
                  {team.movement === "up" ? "↑" : "↓"} {Math.abs(team.rankDelta)}
                </span>
              )}
              <p className={`text-4xl font-black italic min-w-[100px] text-right ${isWinner ? "text-white" : "text-white"}`}>
                {team.totalPoints === -999 ? "X" : team.totalPoints}
              </p>
            </div>
            {isWinner && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <span className="text-4xl">🏆</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BuzzerStage() {
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

      {/* Header Overlay */}
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
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
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
          <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in fade-in duration-500 p-8">
            {gameState.lastScoredEntry.result === "correct" ? (
               <div className="text-center w-full relative z-10 space-y-12">
                 <div className="absolute inset-0 bg-green-500/10 blur-[120px] rounded-full scale-150" />
                 
                 <div className="space-y-4 relative">
                   <h2 className="text-5xl md:text-7xl font-black text-green-400 uppercase tracking-[0.2em] drop-shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                     RISPOSTA ESATTA!
                   </h2>
                   <div className="h-2 w-48 bg-green-500/50 mx-auto rounded-full" />
                 </div>

                 <div className="space-y-2">
                   <p className="text-3xl md:text-4xl font-bold text-[var(--accent-strong)] uppercase tracking-[0.4em]">La squadra</p>
                   <h1 className="text-[10vw] md:text-[12vw] font-black leading-none uppercase text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] italic tracking-tighter">
                     {gameState.lastScoredEntry.nickname}
                   </h1>
                 </div>

                 {gameState.youtubeVideoTitle && (
                   <div className="inline-block bg-black/60 border-2 border-green-500/30 px-12 py-8 rounded-[3rem] backdrop-blur-xl shadow-2xl transform hover:scale-105 transition-transform">
                     <p className="text-2xl font-black text-green-400 uppercase tracking-widest mb-3">Il brano era</p>
                     <p className="text-5xl md:text-7xl font-black text-white leading-tight uppercase italic">{gameState.youtubeVideoTitle}</p>
                   </div>
                 )}

                 <div className="pt-8">
                   <p className="text-7xl md:text-[9rem] font-black text-white uppercase drop-shadow-[0_0_40px_rgba(216,176,106,0.6)] gold-gradient italic">
                     +{gameState.lastScoredEntry.scoreAwarded} PUNTI
                   </p>
                 </div>
               </div>
            ) : (
               <div className="text-center w-full space-y-12 relative">
                 <div className="absolute inset-0 bg-red-500/10 blur-[120px] rounded-full scale-150" />
                 <h2 className="text-[12vw] font-black text-red-500 uppercase tracking-tighter drop-shadow-[0_0_60px_rgba(239,68,68,0.6)] italic">
                   AFFONDATI!
                 </h2>
                 <div className="space-y-4">
                    <p className="text-4xl md:text-6xl font-black text-white uppercase italic">
                      {gameState.lastScoredEntry.nickname}
                    </p>
                    <p className="text-6xl md:text-8xl font-black text-[var(--text-muted)] uppercase tracking-widest">
                      -5 PUNTI
                    </p>
                 </div>
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
