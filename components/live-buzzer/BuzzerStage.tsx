"use client";

import { useEffect, useRef, useState } from "react";

import type { BuzzerEntry, BuzzerState, Team } from "@/lib/live-buzzer/types";
import { getSupabase } from "@/lib/match-drink/supabase";

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

function YouTubePlayer({
  playlistId,
  status,
  commandId,
  commandType,
}: {
  playlistId: string;
  status: string;
  commandId: number;
  commandType?: string | null;
}) {
  const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCommandId = useRef(commandId);
  const lastCommandTimeRef = useRef<number>(0);
  const lastSeekedUrl = useRef<string>("");
  const latestPlaylistIdRef = useRef(playlistId);
  const latestStatusRef = useRef(status);
  const pausedTimeRef = useRef<number>(0);

  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    latestPlaylistIdRef.current = playlistId;
  }, [playlistId]);

  useEffect(() => {
    latestStatusRef.current = status;
  }, [status]);

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
          if (target && typeof target.seekTo === "function") {
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

      const sendTitle = (nextTitle: string) => {
        void fetch("/api/live-buzzer/admin/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setStatus", status: "playing", title: nextTitle }),
        });
      };

      if (title && title !== "") {
        sendTitle(title);
      } else if (currentUrl) {
        let cleanUrl = currentUrl;

        if (currentUrl.includes("watch?v=")) {
          cleanUrl = currentUrl.split("&")[0];
        } else if (currentUrl.includes("embed/")) {
          const videoIdFromUrl = currentUrl.split("embed/")[1].split("?")[0];
          cleanUrl = `https://www.youtube.com/watch?v=${videoIdFromUrl}`;
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
    } else if (event.data === 0) {
      void fetch("/api/live-buzzer/admin/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setStatus", status: "stopped" }),
      });
    }
  };

  useEffect(() => {
    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "100%",
          width: "100%",
          playerVars: {
            listType: "playlist",
            list: latestPlaylistIdRef.current,
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (event: { target: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              event.target.setShuffle(true);
              setIsPlayerReady(true);

              if (latestStatusRef.current === "playing") {
                setTimeout(() => {
                  event.target.playVideoAt(0);
                }, 200);
              }
            },
            onStateChange,
          },
        });
      } catch (err) {
        console.error("Error creating YT Player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const previousHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousHandler) previousHandler();
        initPlayer();
      };

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player && !playerRef.current) {
          initPlayer();
          clearInterval(checkInterval);
        }
      }, 500);

      return () => clearInterval(checkInterval);
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!playlistId || !isPlayerReady || !playerRef.current) return;

    try {
      lastSeekedUrl.current = "";
      pausedTimeRef.current = 0;

      playerRef.current.cuePlaylist({
        listType: "playlist",
        list: playlistId,
        index: 0,
        startSeconds: 0,
        suggestedQuality: "large",
      });
      playerRef.current.setShuffle(true);
    } catch (error) {
      console.error("Error cueing playlist", error);
    }
  }, [playlistId, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || !commandType) return;
    if (commandId <= lastCommandId.current) return;

    lastCommandId.current = commandId;
    lastCommandTimeRef.current = Date.now();

    void fetch("/api/live-buzzer/admin/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setStatus", status: "playing", title: "Caricamento brano..." }),
    });

    try {
      if (commandType === "shuffle") {
        playerRef.current.setShuffle(true);
        playerRef.current.playVideoAt(0);
      } else if (commandType === "next") {
        playerRef.current.nextVideo();
        setTimeout(() => playerRef.current?.playVideo?.(), 150);
      } else if (commandType === "prev") {
        playerRef.current.previousVideo();
        setTimeout(() => playerRef.current?.playVideo?.(), 150);
      }
    } catch (error) {
      console.error("Error calling youtube command", error);
    }
  }, [commandId, commandType, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || typeof playerRef.current.playVideo !== "function") return;

    if (status === "playing") {
      playerRef.current.setVolume?.(100);

      if (pausedTimeRef.current > 0) {
        playerRef.current.seekTo(pausedTimeRef.current, true);
        pausedTimeRef.current = 0;
      }

      playerRef.current.playVideo();
    } else if (status === "paused") {
      if (typeof playerRef.current.getCurrentTime === "function") {
        pausedTimeRef.current = playerRef.current.getCurrentTime() || 0;
      }

      playerRef.current.pauseVideo();
    } else if (status === "stopped") {
      pausedTimeRef.current = 0;
      playerRef.current.pauseVideo();

      if (typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(0, true);
      }
    }
  }, [playlistId, status, isPlayerReady]);

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
    <div className="flex h-full w-full flex-col items-center justify-center space-y-12 text-center animate-in zoom-in duration-500">
      <h2 className="text-5xl font-black uppercase tracking-widest text-[var(--accent-strong)] md:text-7xl">
        PREPARATE I BUZZER
      </h2>
      <div className="relative">
        <div className="absolute inset-0 bg-[var(--accent)] blur-[100px] opacity-40 animate-pulse" />
        <span className="relative text-[15rem] font-black leading-none uppercase text-white drop-shadow-2xl md:text-[20rem]">
          {timeLeft > 0 ? timeLeft : "GO!"}
        </span>
      </div>
    </div>
  );
}

function LeaderboardList({
  leaderboard,
  revealStep,
}: {
  leaderboard: Team[];
  revealStep: number | null;
}) {
  if (revealStep === 999) {
    const top10 = leaderboard.slice(0, 10);
    const col1 = top10.slice(0, 5);
    const col2 = top10.slice(5, 10);

    return (
      <div className="mx-auto mt-8 w-full max-w-[1700px] animate-in fade-in zoom-in duration-1000 px-10">
        <div className="grid grid-cols-2 gap-14">
          <div className="space-y-5">
            <h3 className="mb-8 border-b border-[var(--accent-strong)]/30 pb-4 text-4xl font-black uppercase tracking-[0.2em] text-[var(--accent-strong)] md:text-5xl">
              Top 5
            </h3>
            {col1.map((team, i) => (
              <div
                key={team.email}
                className={`flex items-center justify-between rounded-[2rem] border px-6 py-5 ${
                  i === 0
                    ? "scale-[1.02] border-[var(--accent-strong)] bg-[var(--accent-strong)]/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center gap-6">
                  <span className="w-14 text-center text-5xl font-black text-[var(--accent-strong)]">
                    {i + 1}
                  </span>
                  <span className="max-w-[480px] truncate text-4xl font-black uppercase text-white md:text-5xl">
                    {team.nickname}
                  </span>
                </div>
                <span className="text-5xl font-black italic text-white md:text-6xl">{team.totalPoints}</span>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <h3 className="mb-8 border-b border-white/10 pb-4 text-4xl font-black uppercase tracking-[0.2em] text-white/50 md:text-5xl">
              Posizioni 6-10
            </h3>
            {col2.map((team, i) => (
              <div
                key={team.email}
                className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5"
              >
                <div className="flex items-center gap-6">
                  <span className="w-14 text-center text-4xl font-black text-[var(--text-muted)]">
                    {i + 6}
                  </span>
                  <span className="max-w-[480px] truncate text-3xl font-black uppercase text-white/80 md:text-4xl">
                    {team.nickname}
                  </span>
                </div>
                <span className="text-4xl font-black italic text-white/80 md:text-5xl">{team.totalPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const thresholdIndex = revealStep !== null ? Math.max(leaderboard.length - revealStep, 0) : 0;
  const rowHeight = leaderboard.length > 12 ? 92 : 118;
  const totalHeight = (leaderboard.length - (revealStep !== null ? thresholdIndex : 0)) * rowHeight;

  return (
    <div
      className="relative mx-auto mt-8 flex w-full max-w-[1500px] flex-col items-center px-8 transition-all duration-500 overflow-hidden"
      style={{ height: `${Math.min(totalHeight, 700)}px`, maxHeight: "65vh" }}
    >
      {leaderboard.map((team, index) => {
        if (revealStep !== null && index < thresholdIndex) return null;

        const visibleIndex = revealStep !== null ? index - thresholdIndex : index;
        const isWinner = revealStep !== null && index === 0 && revealStep >= leaderboard.length;

        return (
          <div
            key={team.email}
            className={`absolute flex w-full items-center justify-between rounded-[2rem] border px-7 py-5 transition-all duration-700 ease-out animate-in slide-in-from-bottom-12 fade-in ${
              isWinner
                ? "z-50 scale-[1.03] border-[var(--accent-strong)] bg-[var(--accent-strong)]/20 ring-4 ring-[var(--accent-soft)] shadow-[0_0_40px_rgba(216,176,106,0.4)]"
                : "border-white/10 bg-white/5 backdrop-blur-md"
            }`}
            style={{
              top: `${visibleIndex * rowHeight}px`,
              zIndex: 100 - index,
              transitionDelay: `${(index - thresholdIndex) * 50}ms`,
            }}
          >
            <div className="flex min-w-0 items-center gap-7">
              <div className="flex w-16 shrink-0 flex-col items-center">
                <span className={`text-5xl font-black ${isWinner ? "text-white" : "text-[var(--accent-strong)]"}`}>
                  {index + 1}
                </span>
              </div>
              <div className="flex min-w-0 flex-col">
                <p
                  className={`max-w-[900px] truncate text-4xl font-black uppercase leading-tight md:text-5xl ${
                    isWinner ? "text-white" : "text-white/90"
                  }`}
                >
                  {team.nickname}
                </p>
                <p className="text-lg font-black uppercase tracking-[0.35em] text-[var(--text-muted)] md:text-2xl">
                  Tavolo {team.tableNumber}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-7">
              {team.totalPoints !== -999 && team.movement !== "same" && revealStep === null && (
                <span
                  className={`rounded-full px-4 py-2 text-2xl font-black animate-in zoom-in ${
                    team.movement === "up"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {team.movement === "up" ? "UP" : "DOWN"} {Math.abs(team.rankDelta)}
                </span>
              )}
              <p className={`min-w-[140px] text-right text-6xl font-black italic text-white md:text-7xl`}>
                {team.totalPoints === -999 ? "X" : team.totalPoints}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BuzzerStage() {
  const [gameState, setGameState] = useState<StageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideResultScreen, setHideResultScreen] = useState(false);
  const lastUpdateIdRef = useRef<number | string>(0);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    const supabase = getSupabase();
    let channel: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/live-buzzer/state?t=${Date.now()}`, { cache: "no-store" });

        if (res.ok && mounted) {
          const data = await res.json();
          const incomingId = Number(data.lastUpdateId) || 0;
          const currentId = Number(lastUpdateIdRef.current) || 0;

          if (incomingId >= currentId) {
            lastUpdateIdRef.current = incomingId;
            setGameState(data);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Stage fetch error", err);
      }
    };

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        void fetchState();
      }, 2000);
    };

    channel = supabase
      .channel("live-buzzer")
      .on("broadcast", { event: "state_update" }, ({ payload }: { payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!mounted || !payload) return;

        const incomingId = Number(payload.lastUpdateId) || 0;
        const currentId = Number(lastUpdateIdRef.current) || 0;

        if (incomingId >= currentId) {
          lastUpdateIdRef.current = incomingId;
          setGameState(payload);
          setLoading(false);
        }
      })
      .subscribe();

    void fetchState();
    startPolling();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Timer to auto-hide result screen after 10 seconds
  useEffect(() => {
    const isResult = gameState?.status === "result_screen";
    if (isResult) {
      const timer = setTimeout(() => {
        setHideResultScreen(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHideResultScreen(false);
    }
  }, [gameState?.status, gameState?.lastScoredEntry?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-black uppercase tracking-[0.5em] text-[var(--accent-strong)] animate-pulse">
          Tortuga Music Quiz
        </p>
      </div>
    );
  }

  const currentResponder = gameState?.currentResponder;
  const isPlaying = gameState?.status === "open";
  const isCountdown = gameState?.status === "countdown";
  const isResultScreen = gameState?.status === "result_screen";
  const isClosedWithoutResponder = gameState?.status === "closed" && !currentResponder;
  const isFinalEndedState = Boolean(gameState?.roundEnded && !gameState?.leaderboardVisible);
  const isFinalLeaderboardView = Boolean(gameState?.roundEnded || gameState?.leaderboardRevealStep !== null);

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-black text-white select-none p-[3vh] box-border">
      {gameState?.youtubePlaylistId && (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isPlaying ? "opacity-100" : "opacity-40"}`}>
          <YouTubePlayer
            playlistId={gameState.youtubePlaylistId}
            status={gameState.youtubeStatus}
            commandId={gameState.youtubeCommandId}
            commandType={gameState.youtubeCommandType}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div className="relative z-20 flex items-center justify-between px-8 py-4 md:px-12">
        <div className="flex flex-col">
          <h1 className="text-5xl font-black italic tracking-tighter gold-gradient md:text-7xl">
            TORTUGA MUSIC QUIZ
          </h1>
          <p className="text-xl font-bold uppercase tracking-[0.4em] text-[var(--accent)] md:text-3xl">
            Buzzer Live Edition
          </p>
        </div>

        <div className="flex flex-col items-end">
          <div className="rounded-full border border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/10 px-8 py-3">
            <p className="text-3xl font-black italic text-white md:text-5xl">ROUND {gameState?.currentRound}</p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.1),transparent_70%)] transition-colors duration-1000" />
        <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(178,122,52,0.05),transparent_60%)] transition-colors duration-1000" />
      </div>

      <div
        className={`relative z-10 flex h-full w-full flex-1 flex-col items-center justify-center transition-all duration-700 ${
          (gameState?.youtubeStatus === "playing" &&
          !isResultScreen &&
          !gameState?.leaderboardVisible &&
          !gameState?.roundEnded) ||
          (isResultScreen && hideResultScreen)
            ? "invisible opacity-0 pointer-events-none"
            : "visible opacity-100"
        }`}
      >
        {isCountdown ? (
          <CountdownDisplay countdownStart={gameState?.countdownStart || 0} />
        ) : gameState?.leaderboardVisible ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-center animate-in fade-in duration-1000">
            <h2 className="mb-12 text-5xl font-black uppercase tracking-widest text-white italic gold-gradient md:text-7xl">
              {isFinalLeaderboardView ? "Classifica Finale" : "Classifica Live"}
            </h2>
            <LeaderboardList
              leaderboard={gameState?.leaderboard || []}
              revealStep={gameState?.leaderboardRevealStep ?? null}
            />
          </div>
        ) : isFinalEndedState ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center animate-in zoom-in fade-in duration-500">
            <div className="absolute inset-0 scale-150 rounded-full bg-[var(--accent-strong)]/10 blur-[140px]" />
            <p className="relative z-10 text-2xl font-black uppercase tracking-[0.45em] text-[var(--accent)] md:text-4xl">
              Tortuga Music Quiz
            </p>
            <h2 className="relative z-10 mt-6 text-[9vw] font-black uppercase tracking-tight text-white italic drop-shadow-[0_0_50px_rgba(216,176,106,0.35)] md:text-[6.5vw]">
              Partita terminata
            </h2>
            <p className="relative z-10 mt-8 max-w-5xl text-3xl font-black uppercase tracking-[0.18em] text-[var(--accent-strong)] md:text-5xl">
              Capitano, avvia lo svelamento della classifica finale.
            </p>
            <p className="relative z-10 mt-6 max-w-5xl text-2xl font-bold text-white/75 md:text-4xl">
              La classifica comparirà una squadra alla volta, partendo dall&apos;ultima posizione.
            </p>
          </div>
        ) : isResultScreen && gameState?.lastScoredEntry ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 animate-in zoom-in fade-in duration-500">
            {gameState.lastScoredEntry.result === "correct" ? (
              <div className="relative z-10 flex max-h-full w-full flex-col justify-center space-y-2 text-center md:space-y-4">
                <div className="absolute inset-0 scale-150 rounded-full bg-green-500/10 blur-[120px]" />

                <div className="relative shrink-0">
                  <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.3)] md:text-5xl">
                    RISPOSTA ESATTA!
                  </h2>
                  <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-green-500/50" />
                </div>

                <div className="shrink-0">
                  <p className="mb-1 text-2xl font-bold uppercase tracking-[0.4em] text-[var(--accent-strong)] md:text-4xl">
                    La squadra
                  </p>
                  <h1 className="truncate px-4 text-[7vw] font-black uppercase leading-none tracking-tighter text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] italic md:text-[8vw]">
                    {gameState.lastScoredEntry.nickname}
                  </h1>
                </div>

                {gameState.youtubeVideoTitle && (
                  <div className="mx-auto inline-block max-w-[90%] shrink-0 rounded-[2rem] border-2 border-green-500/30 bg-black/60 px-6 py-4 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 md:px-10 md:py-6">
                    <p className="mb-1 text-xl font-black uppercase tracking-widest text-green-400 md:text-3xl">Il brano era</p>
                    <p className="truncate text-2xl font-black uppercase leading-tight text-white italic md:text-4xl lg:text-5xl">
                      {gameState.youtubeVideoTitle}
                    </p>
                  </div>
                )}

                <div className="shrink-0 pt-2">
                  <p className="text-5xl font-black uppercase leading-none text-white drop-shadow-[0_0_40px_rgba(216,176,106,0.6)] gold-gradient italic md:text-7xl lg:text-[8rem]">
                    +{gameState.lastScoredEntry.scoreAwarded} PUNTI
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative w-full space-y-8 text-center">
                <div className="absolute inset-0 scale-150 rounded-full bg-red-500/10 blur-[120px]" />
                <h2 className="text-[10vw] font-black uppercase tracking-tighter text-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.6)] italic">
                  AFFONDATI!
                </h2>
                <div className="space-y-2">
                  <p className="text-3xl font-black uppercase text-white italic md:text-5xl">
                    {gameState.lastScoredEntry.nickname}
                  </p>
                  <p className="text-5xl font-black uppercase tracking-widest text-[var(--text-muted)] md:text-7xl">
                    -5 PUNTI
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : isPlaying ? null : currentResponder ? (
          <div className="w-full space-y-6 text-center animate-in zoom-in fade-in duration-500">
            <div className="inline-block rounded-full border-2 border-[var(--accent-strong)] bg-[var(--accent-strong)]/20 px-10 py-3 shadow-[0_0_60px_rgba(216,176,106,0.4)]">
              <p className="text-3xl font-black uppercase tracking-widest text-[var(--accent-strong)] md:text-5xl">
                STOP!
              </p>
            </div>

            <div className="mx-auto w-full max-w-5xl space-y-4 pt-6">
              <p className="text-2xl font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] md:text-4xl">
                Tavolo {currentResponder.tableNumber}
              </p>
              <h2 className="truncate px-4 text-6xl font-black uppercase leading-none text-white drop-shadow-2xl md:text-[8vw]">
                {currentResponder.nickname}
              </h2>
            </div>

            <div className="pt-8">
              <p className="font-mono text-6xl font-black gold-gradient drop-shadow-[0_0_30px_rgba(216,176,106,0.4)] md:text-8xl">
                {(currentResponder.relativeTimeMs / 1000).toFixed(2)}s
              </p>
              <p className="mt-2 text-2xl font-bold uppercase tracking-[0.3em] text-[var(--accent)] md:text-4xl">
                Tempo di Reazione
              </p>
            </div>
          </div>
        ) : isClosedWithoutResponder ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-center animate-in zoom-in fade-in duration-500">
            <div className="absolute inset-0 scale-150 rounded-full bg-red-500/10 blur-3xl" />
            <h2 className="relative z-10 text-7xl font-black uppercase tracking-tighter text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] md:text-9xl">
              TEMPO SCADUTO
            </h2>
            <p className="relative z-10 mt-8 text-3xl font-black uppercase text-[var(--text-muted)] md:text-5xl">
              Nessuno ha indovinato!
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
