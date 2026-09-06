"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";

import { TORTUGA_LIVE_LOGO_URL } from "@/lib/live-tv/default-playlists";
import type { LiveTvItem, LiveTvOverlay, LiveTvState, StageMode } from "@/lib/live-tv/types";
import { tortugaInfoConfig } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";
import { useLiveTvMediaCache } from "@/hooks/use-live-tv-media-cache";

type LiveTvStageResponse = LiveTvState;

function resolveLiveTvMediaUrl(url?: string | null): string {
  if (!url) return TORTUGA_LIVE_LOGO_URL;
  if (url.includes("LOGO-TORTUGA-2.png")) return "/images/LOGO-TORTUGA-2.png";
  if (url.includes("cropped-TORTUGA-FAVICON-SMALL.png")) return "/images/cropped-TORTUGA-FAVICON-SMALL.png";
  if (url.includes("TOP-3-TRIPADVISOR.png")) return "/images/TOP-3-TRIPADVISOR.png";
  if (url.startsWith("https://tortugabay.it/wp-content/uploads/")) {
    return url;
  }
  return url;
}

function QrBlock({ value, label }: { value: string; label?: string }) {
  const [svgMarkup, setSvgMarkup] = useState("");

  useEffect(() => {
    let cancelled = false;

    void import("qrcode")
      .then((qrCode) =>
        qrCode.toString(value, {
          type: "svg",
          margin: 1,
          width: 360,
          color: {
            dark: "#0b0907",
            light: "#f8f1df",
          },
        }),
      )
      .then((markup) => {
        if (!cancelled) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="live-tv-pulse-glow flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[2.8rem] border-2 border-[var(--accent-strong)]/60 bg-[rgba(16,13,10,0.88)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
      <div className="relative w-full rounded-[2.2rem] bg-[#f8f1df] p-5 shadow-[inset_0_0_0_2px_rgba(181,138,77,0.3),0_12px_40px_rgba(0,0,0,0.5)]">
        {svgMarkup ? (
          <div
            aria-label={label || value}
            className="aspect-square w-full overflow-hidden rounded-[1.6rem] border border-black/10 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-[1.6rem] border border-black/10 text-xl font-black uppercase text-black/60">
            QR in arrivo
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--accent-strong)]">✦</span>
        <p className="live-tv-text-sheen text-center text-base font-black uppercase tracking-[0.26em]">
          {label || "Scansiona ora"}
        </p>
        <span className="text-sm text-[var(--accent-strong)]">✦</span>
      </div>
    </div>
  );
}

function OverlayBanner({ overlay }: { overlay: LiveTvOverlay }) {
  const classes =
    overlay.variant === "urgent"
      ? "border-red-400/50 bg-red-500/25 text-red-100"
      : overlay.variant === "success"
        ? "border-green-400/40 bg-green-500/20 text-green-50"
        : overlay.variant === "captain"
          ? "border-[var(--accent-strong)]/70 bg-[rgba(181,138,77,0.25)] text-white"
          : "border-white/20 bg-black/60 text-white";

  return (
    <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 w-[min(94vw,1400px)] -translate-x-1/2">
      <div className={`rounded-[2.2rem] border px-10 py-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl ${classes}`}>
        <p className="text-[clamp(1.8rem,3.4vw,4.2rem)] font-black uppercase tracking-[0.2em] leading-tight">
          {overlay.message}
        </p>
      </div>
    </div>
  );
}

export type CustomerGreeting = {
  id: string;
  nickname: string;
  tableNumber: number;
  messageType?: "brindisi" | "saluto" | "compleanno";
  customMessage?: string | null;
  createdAt: number;
};

function GreetingBanner({ greeting }: { greeting: CustomerGreeting }) {
  const isBirthday = greeting.messageType === "compleanno";
  const isSaluto = greeting.messageType === "saluto";

  const icon = isBirthday ? "🎂" : isSaluto ? "🎉" : "🍻";
  const headline = isBirthday
    ? "FESTA DI COMPLEANNO A BORDO!"
    : isSaluto
      ? "SALUTO DALLA CIURMA!"
      : "BRINDISI AL TORTUGA!";

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 bg-black/85 backdrop-blur-lg animate-in zoom-in-95 fade-in duration-300"
    >
      <div className="relative overflow-hidden rounded-[3.8rem] border-4 border-[#f0c970] bg-[#0e0c0a]/98 px-8 py-10 sm:px-16 sm:py-14 text-center shadow-[0_0_180px_rgba(240,201,112,0.75)] backdrop-blur-3xl max-w-6xl w-full live-tv-pulse-glow">
        {/* Spotlight radiale dorato */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(240,201,112,0.45),transparent_75%)]" />
        {/* Fasci di luce dall'alto */}
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,230,150,0.3),transparent)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-7">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <span className="text-[clamp(3.5rem,6.5vw,7rem)] animate-bounce drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">{icon}</span>
            <span className="live-tv-text-sheen text-[clamp(1.8rem,3.4vw,3.6rem)] font-black uppercase tracking-[0.25em] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {headline}
            </span>
            <span className="text-[clamp(3.5rem,6.5vw,7rem)] animate-bounce drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">{icon}</span>
          </div>

          <p className="text-[clamp(2.8rem,5.6vw,6.2rem)] font-black uppercase leading-[1.05] text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]">
            {greeting.nickname} <span className="text-[#f0c970] whitespace-nowrap drop-shadow-[0_0_24px_rgba(240,201,112,0.6)]">DAL TAVOLO {greeting.tableNumber}</span>
          </p>

          {greeting.customMessage ? (
            <div className="w-full max-w-4xl rounded-[2.4rem] border-2 border-[#f0c970]/50 bg-black/75 px-8 py-5 sm:px-12 sm:py-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <p className="text-[clamp(1.8rem,3.2vw,3.8rem)] font-extrabold italic text-[#fff8e7] leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                &ldquo;{greeting.customMessage}&rdquo;
              </p>
            </div>
          ) : null}

          <p className="text-[clamp(1.2rem,2vw,2.2rem)] font-black uppercase tracking-[0.24em] text-[#fffdf8] mt-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {isBirthday
              ? "🎂 TANTI AUGURI DALLA CIURMA DEL TORTUGA! 🎂"
              : isSaluto
                ? "🎉 MANDA UN CALOROSO SALUTO A TUTTA LA SALA! 🎉"
                : "🍻 OFFRE IDEALMENTE UN BOCCALE A TUTTA LA CIURMA! 🍻"}
          </p>
        </div>
      </div>
    </aside>
  );
}

function StageBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[#070605]" />
      {/* Mappa nautica con overlay dorato */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nautical-map.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
      />
      {/* Bussola nautica animata lenta sul fondo */}
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[560px] w-[560px] opacity-15 mix-blend-screen select-none live-tv-radar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nautical-map.png" alt="" className="h-full w-full object-contain filter invert sepia hue-rotate-15" />
      </div>
      {/* Fasci di luce atmosferici da taverna pirata */}
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(240,195,110,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,176,106,0.22),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(181,138,77,0.14),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(181,138,77,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.75))]" />
      
      {/* Scanline CRT ultra-sottile e cinematica */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.18)_4px)] opacity-40" />
    </>
  );
}

function LiveTvOnAirBadge() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute top-6 right-8 z-40 flex items-center gap-4 rounded-full border-2 border-[var(--accent-strong)]/80 bg-black/85 px-6 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(240,201,112,0.35)] backdrop-blur-2xl md:top-8 md:right-12 md:px-8 md:py-3.5">
      <span className="relative flex h-4 w-4 md:h-5 md:w-5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
        <span className="relative inline-flex h-4 w-4 md:h-5 md:w-5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981,0_0_24px_#10b981]" />
      </span>
      <span className="text-sm sm:text-base md:text-xl font-black uppercase tracking-[0.25em] text-[#ffd67a] drop-shadow-[0_0_12px_rgba(255,214,122,0.6)]">
        TORTUGA ON AIR
      </span>
      {time ? (
        <span className="border-l-2 border-[#ffd67a]/40 pl-4 font-mono text-base sm:text-lg md:text-2xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {time}
        </span>
      ) : null}
    </div>
  );
}

function LiveTvTransitionOverlay({ variantIndex }: { variantIndex: number }) {
  const variant = Math.abs(variantIndex) % 4;

  if (variant === 0) {
    // 1. Diagonal Golden Blades Wipe (1.45s)
    return (
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
        <div className="live-tv-fx-blades-flash absolute inset-0 bg-gradient-to-r from-transparent via-[#ffd67a]/40 to-transparent" />
        <div className="live-tv-fx-blades absolute -top-[50%] -left-[40%] flex h-[220%] w-[200%] rotate-[-28deg] items-stretch gap-8">
          <div className="w-[18%] bg-gradient-to-r from-transparent via-[#ffd67a]/80 to-transparent shadow-[0_0_50px_#ffd67a]" />
          <div className="w-[8%] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_60px_#fff]" />
          <div className="w-[30%] bg-gradient-to-r from-transparent via-[#d8b06a] to-transparent shadow-[0_0_80px_#d8b06a]" />
          <div className="w-[12%] bg-gradient-to-r from-transparent via-[#ffd67a] to-transparent shadow-[0_0_40px_#ffd67a]" />
          <div className="w-[22%] bg-gradient-to-r from-transparent via-[#f0c970]/90 to-transparent shadow-[0_0_60px_#f0c970]" />
        </div>
      </div>
    );
  }

  if (variant === 1) {
    // 2. Golden Smoke & Nebula Blast (1.45s)
    return (
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <div className="live-tv-fx-smoke absolute h-[140vw] w-[140vw] rounded-full bg-[radial-gradient(circle,rgba(255,225,140,0.92)_0%,rgba(216,176,106,0.85)_35%,rgba(140,95,30,0.5)_60%,transparent_75%)]" />
        <div className="live-tv-fx-smoke absolute h-[110vw] w-[110vw] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,rgba(255,214,122,0.6)_30%,transparent_70%)] [animation-delay:120ms]" />
      </div>
    );
  }

  if (variant === 2) {
    // 3. Portali del Forziere / Vault Slam & Open (1.45s)
    return (
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
        <div className="live-tv-fx-vault-l absolute top-0 left-0 h-full w-1/2 border-r-4 border-[#ffd67a] bg-[linear-gradient(135deg,#1c150e_0%,#2e2213_50%,#0e0a07_100%)] shadow-[inset_-20px_0_40px_rgba(255,214,122,0.3),10px_0_50px_rgba(0,0,0,0.9)]" />
        <div className="live-tv-fx-vault-r absolute top-0 right-0 h-full w-1/2 border-l-4 border-[#ffd67a] bg-[linear-gradient(-135deg,#1c150e_0%,#2e2213_50%,#0e0a07_100%)] shadow-[inset_20px_0_40px_rgba(255,214,122,0.3),-10px_0_50px_rgba(0,0,0,0.9)]" />
        <div className="live-tv-fx-vault-spark absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#ffffff_0%,#ffd67a_40%,transparent_70%)] shadow-[0_0_120px_#ffd67a]" />
      </div>
    );
  }

  // 4. Fulmine Pirata & Shockwave Blast (1.45s)
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="live-tv-fx-thunder absolute inset-0 bg-[#ffd67a]/40" />
      <div className="live-tv-fx-ring absolute h-40 w-40 rounded-full border-amber-300 shadow-[0_0_60px_#ffd67a]" />
    </div>
  );
}

function StageShell({
  children,
  title,
  overlay,
  scale = 1,
  transitionIndex = 0,
  transitionKey,
  isVideo = false,
}: {
  children?: React.ReactNode;
  title?: string;
  overlay?: LiveTvOverlay | null;
  scale?: number;
  transitionIndex?: number;
  transitionKey?: string | number;
  isVideo?: boolean;
}) {
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-0 overflow-hidden">
        <StageBackdrop />
      </div>

      <LiveTvOnAirBadge />

      {transitionKey !== undefined ? (
        <LiveTvTransitionOverlay key={`fx-${transitionKey}`} variantIndex={transitionIndex} />
      ) : null}

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-8 py-10 md:px-16 md:py-12">
        {title ? (
          <header className="shrink-0 text-center">
            <h1 className="live-tv-text-sheen text-[clamp(2.2rem,5vw,4.8rem)] font-black uppercase tracking-tight italic drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              {title}
            </h1>
          </header>
        ) : null}

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden w-full">
          <div
            key={`content-${transitionKey ?? "static"}`}
            className={`flex w-full items-center justify-center ${isVideo ? "transition-opacity duration-300" : "live-tv-card-enter"}`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {overlay ? <OverlayBanner overlay={overlay} /> : null}
    </main>
  );
}

type MediaOrientation = "portrait" | "landscape";

function useMediaOrientation() {
  const [orientation, setOrientation] = useState<MediaOrientation | null>(null);

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setOrientation(naturalHeight > naturalWidth ? "portrait" : "landscape");
  };

  const handleVideoLoaded = (event: SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget;
    if (!videoWidth || !videoHeight) return;
    setOrientation(videoHeight > videoWidth ? "portrait" : "landscape");
  };

  return {
    orientation,
    handleImageLoad,
    handleVideoLoaded,
  };
}

const normalizeDisplayText = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const shouldHideDuplicateTitle = (eyebrow: string, title?: string | null) =>
  Boolean(title) && normalizeDisplayText(title) === normalizeDisplayText(eyebrow);

const getAdaptiveBodyStyle = (body?: string | null) => {
  const length = body?.trim().length ?? 0;

  if (length > 220) {
    return "text-[clamp(1rem,1.55vw,1.7rem)] max-w-[36rem]";
  }

  if (length > 120) {
    return "text-[clamp(1.05rem,1.75vw,1.9rem)] max-w-[40rem]";
  }

  return "text-[clamp(1.1rem,1.9vw,2.15rem)] max-w-[44rem]";
};

const CUSTOMER_MESSAGE_BODY_CLASS =
  "max-w-[92vw] text-[clamp(2.6rem,4.6vw,5.6rem)] font-black uppercase leading-[1.02] text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]";

const CUSTOMER_QR_BODY_CLASS =
  "text-[clamp(2.4rem,3.8vw,4.8rem)] font-black leading-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]";

const CUSTOMER_QR_LABEL_CLASS =
  "text-[clamp(1.8rem,2.5vw,3.2rem)] font-black uppercase tracking-[0.25em] text-[var(--accent-strong)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]";

const CUSTOMER_QR_URL_CLASS =
  "break-all text-[clamp(1.5rem,2vw,2.4rem)] font-bold text-white/80";

function RotateOverlay() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/92 px-8 text-center text-white backdrop-blur-sm md:hidden">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-[1.6rem] border-[6px] border-white/90" />
          <div className="absolute left-1/2 top-1/2 h-14 w-8 -translate-x-1/2 -translate-y-1/2 rounded-[0.7rem] bg-white/92" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
          <div className="absolute -left-2 top-2 h-10 w-10 rounded-full border-2 border-white/90 border-r-transparent border-b-transparent rotate-45" />
        </div>
        <p className="text-2xl font-black uppercase tracking-[0.18em]">
          Ruota lo schermo
        </p>
        <p className="max-w-sm text-sm leading-6 text-white/72">
          La plancia Tortuga rende meglio in orizzontale. Ruota il telefono per continuare.
        </p>
      </div>
    </div>
  );
}

function LogoScreen({ overlay, scale = 1 }: { overlay?: LiveTvOverlay | null; scale?: number }) {
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-0 overflow-hidden">
        <StageBackdrop />
      </div>
      <div
        className="relative z-10 flex h-full items-center justify-center px-8 py-10 md:px-16 md:py-12"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TORTUGA_LIVE_LOGO_URL}
          alt="Logo Tortuga"
          onError={(e) => {
            if (e.currentTarget.src !== "/images/LOGO-TORTUGA-2.png") {
              e.currentTarget.src = "/images/LOGO-TORTUGA-2.png";
            }
          }}
          className="max-h-[72vh] w-auto max-w-[72vw] object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        />
      </div>
      {overlay ? <OverlayBanner overlay={overlay} /> : null}
    </main>
  );
}

function BlackoutScreen() {
  return <main className="h-[100dvh] w-screen bg-black" />;
}

function MediaStageItem({
  item,
  overlay,
  kind,
  getCachedUrl,
  transitionIndex = 0,
}: {
  item: LiveTvItem;
  overlay?: LiveTvOverlay | null;
  kind: "image" | "video";
  getCachedUrl?: (url?: string | null) => string | null;
  transitionIndex?: number;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const { orientation, handleImageLoad, handleVideoLoaded } = useMediaOrientation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rawMediaUrl = resolveLiveTvMediaUrl(item.mediaUrl);
  const effectiveMediaUrl = getCachedUrl?.(item.mediaUrl) || getCachedUrl?.(rawMediaUrl) || rawMediaUrl;

  useEffect(() => {
    if (kind === "video" && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [kind, effectiveMediaUrl]);

  if (!item.mediaUrl || mediaFailed) {
    return <LogoScreen overlay={overlay} />;
  }
  const title = item.title || "Tortuga Live";
  const isPortrait = orientation === "portrait";

  const isVideo = kind === "video";

  return (
    <StageShell
      overlay={overlay}
      transitionIndex={transitionIndex}
      transitionKey={item.id}
      isVideo={isVideo}
    >
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col items-center justify-center p-2 md:p-4">
        <div
          className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2.6rem] border-2 border-[var(--accent-strong)]/50 bg-black/60 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.85)] ${
            isVideo ? "" : "backdrop-blur-md"
          } ${isPortrait ? "max-w-[58vw]" : "max-w-[94vw]"}`}
        >
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectiveMediaUrl}
              alt={title}
              className={`max-h-[88vh] max-w-full object-contain live-tv-ken-burns transition-opacity duration-500 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={(e) => {
                setMediaLoaded(true);
                handleImageLoad(e);
              }}
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <video
              ref={videoRef}
              key={item.id}
              src={effectiveMediaUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="max-h-[88vh] max-w-full object-contain"
              onLoadedMetadata={(e) => {
                setMediaLoaded(true);
                handleVideoLoaded(e);
                e.currentTarget.play().catch(() => {});
              }}
              onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
              onWaiting={(e) => {
                // Se il buffer si svuota momentaneamente, ritenta il play appena possibile
                e.currentTarget.play().catch(() => {});
              }}
              onPlaying={() => setMediaLoaded(true)}
              onError={(e) => {
                const video = e.currentTarget;
                // Se c'è un errore transitorio, tenta un reload prima di dichiarare fallimento
                if (video && !video.dataset.retried) {
                  video.dataset.retried = "true";
                  video.load();
                  video.play().catch(() => setMediaFailed(true));
                } else {
                  setMediaFailed(true);
                }
              }}
            />
          )}
          {!orientation ? (
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.18))]" />
          ) : null}
        </div>
      </div>
    </StageShell>
  );
}

function MediaPreloader({ item }: { item: LiveTvItem | null }) {
  const mediaUrl = resolveLiveTvMediaUrl(item?.mediaUrl);
  if (!mediaUrl) return null;

  if (item?.type === "video") {
    return (
      <div className="hidden" aria-hidden="true">
        <video src={mediaUrl} preload="metadata" muted playsInline onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>
    );
  }

  if (item?.type === "image") {
    return (
      <div className="hidden" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl} alt="" fetchPriority="high" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>
    );
  }

  return null;
}

function RenderLiveTvItem({
  item,
  overlay,
  scale = 1,
  itemIndex = 0,
  getCachedUrl,
}: {
  item: LiveTvItem | null;
  overlay?: LiveTvOverlay | null;
  scale?: number;
  itemIndex?: number;
  getCachedUrl?: (url?: string | null) => string | null;
}) {
  if (!item) {
    return <LogoScreen overlay={overlay} scale={scale} />;
  }

  if (item.type === "image" && item.mediaUrl) {
    return (
      <MediaStageItem
        key={item.id}
        item={item}
        overlay={overlay}
        kind="image"
        getCachedUrl={getCachedUrl}
        transitionIndex={itemIndex}
      />
    );
  }

  if (item.type === "video" && item.mediaUrl) {
    return (
      <MediaStageItem
        key={item.id}
        item={item}
        overlay={overlay}
        kind="video"
        getCachedUrl={getCachedUrl}
        transitionIndex={itemIndex}
      />
    );
  }

  if (item.type === "qr") {
    const qrTitle = item.title || "Apri la Tortuga App";
    const hideQrTitle = shouldHideDuplicateTitle("Scansiona e sali a bordo", qrTitle);

    return (
      <StageShell
        title={hideQrTitle ? undefined : qrTitle}
        overlay={overlay}
        scale={scale}
        transitionIndex={itemIndex}
        transitionKey={item.id}
      >
        <div className="flex w-full max-w-none items-center justify-between gap-12 px-8 lg:gap-20 lg:px-16">
          <QrBlock value={item.qrUrl || ""} label={item.qrLabel || item.title} />
          <div className="max-w-[48vw] space-y-6 text-center lg:text-left">
            {item.body ? (
              <p className={CUSTOMER_QR_BODY_CLASS}>
                {item.body}
              </p>
            ) : null}
            {item.qrLabel ? (
              <div className="inline-flex items-center gap-3 rounded-full border border-[var(--accent-strong)]/40 bg-[rgba(181,138,77,0.12)] px-6 py-2">
                <span className="text-xl text-[var(--accent-strong)]">✦</span>
                <p className={CUSTOMER_QR_LABEL_CLASS}>
                  {item.qrLabel}
                </p>
              </div>
            ) : null}
            {item.qrUrl ? (
              <p className={CUSTOMER_QR_URL_CLASS}>
                {item.qrUrl}
              </p>
            ) : null}
          </div>
        </div>
      </StageShell>
    );
  }

  if (item.type === "review") {
    const reviewTitle = item.title || "Recensione di bordo";
    const hideReviewTitle = shouldHideDuplicateTitle("La ciurma dice di noi", reviewTitle);

    const matchedReview = tortugaInfoConfig.reviews.find(
      (r) => r.text.trim() === item.body?.trim() || item.body?.includes(r.author)
    );
    const authorName = matchedReview?.author || item.qrLabel || "Ciurma Tortuga";
    const sourceName = matchedReview?.source || "Google & TripAdvisor";

    return (
      <StageShell
        title={hideReviewTitle ? undefined : reviewTitle}
        overlay={overlay}
        scale={scale}
        transitionIndex={itemIndex}
        transitionKey={item.id}
      >
        <div className="live-tv-pulse-glow relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 rounded-[3.5rem] border-2 border-[#f0c970]/60 bg-[radial-gradient(ellipse_at_top,rgba(36,26,16,0.96),rgba(12,10,8,0.98))] px-10 py-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(240,201,112,0.2)] backdrop-blur-2xl md:px-16 md:py-12">
          {/* Corner golden ornaments */}
          <span className="pointer-events-none absolute top-5 left-6 text-xl text-[#f0c970]/50 select-none">✦</span>
          <span className="pointer-events-none absolute top-5 right-6 text-xl text-[#f0c970]/50 select-none">✦</span>
          <span className="pointer-events-none absolute bottom-5 left-6 text-xl text-[#f0c970]/50 select-none">✦</span>
          <span className="pointer-events-none absolute bottom-5 right-6 text-xl text-[#f0c970]/50 select-none">✦</span>

          {/* Top 5 Golden Stars */}
          <div className="flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-3xl sm:text-4xl md:text-5xl text-[#ffd67a] drop-shadow-[0_0_20px_rgba(255,214,122,0.9)]">
                ★
              </span>
            ))}
          </div>

          {/* Golden Big Quotes & Text */}
          <div className="relative max-w-4xl px-4">
            <span className="pointer-events-none absolute -top-8 -left-3 font-serif text-6xl text-[#f0c970]/30 select-none md:-left-6 md:text-7xl">
              “
            </span>
            <p className="font-sans text-[clamp(1.35rem,2.1vw,2.3rem)] font-medium leading-[1.5] tracking-wide text-[#fffdf2] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {item.body || "Atmosfera fantastica e personale super accogliente! Gli hamburger sono spettacolari e le serate a tema con il karaoke rendono ogni cena un'esperienza divertente."}
            </p>
            <span className="pointer-events-none absolute -bottom-10 -right-2 font-serif text-6xl text-[#f0c970]/30 select-none md:-right-4 md:text-7xl">
              ”
            </span>
          </div>

          {/* Author attribution badge */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 rounded-full border border-[#f0c970]/40 bg-black/65 px-8 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <p className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-[#ffd67a]">
              {authorName}
            </p>
            <span className="h-4 w-px bg-white/25" />
            <p className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-white/80">
              Recensione Verificata • {sourceName}
            </p>
          </div>
        </div>
      </StageShell>
    );
  }

  if (item.type === "logo") {
    const logoTitle = item.title || "Tortuga Live";
    const hideLogoTitle = shouldHideDuplicateTitle("Tortuga Live", logoTitle);

    return (
      <StageShell
        title={hideLogoTitle ? undefined : logoTitle}
        overlay={overlay}
        scale={scale}
        transitionIndex={itemIndex}
        transitionKey={item.id}
      >
        <div className="flex w-full max-w-[1500px] flex-col items-center gap-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCachedUrl?.(item.mediaUrl) || resolveLiveTvMediaUrl(item.mediaUrl) || TORTUGA_LIVE_LOGO_URL}
            alt={item.title || "Logo Tortuga"}
            onError={(e) => {
              if (e.currentTarget.src !== "/images/LOGO-TORTUGA-2.png") {
                e.currentTarget.src = "/images/LOGO-TORTUGA-2.png";
              }
            }}
            className="h-auto w-full max-w-[clamp(20rem,46vw,50rem)] object-contain drop-shadow-[0_24px_90px_rgba(0,0,0,0.85)] filter brightness-105"
          />
          {item.body ? (
            <p className={`font-black uppercase leading-[1.12] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] ${getAdaptiveBodyStyle(item.body)}`}>
              {item.body}
            </p>
          ) : null}
        </div>
      </StageShell>
    );
  }

  const eyebrow =
    item.type === "event"
      ? "Prossima rotta"
      : item.type === "promo"
        ? "Promo in onda"
        : item.type === "message"
          ? "Messaggio dal Capitano"
          : "Tortuga Live";
  const genericTitle = item.title || "Tortuga Live";
  const displayTitle =
    item.type === "message" && item.title?.trim() ? item.title : "Messaggio dal Capitano";
  const hideGenericTitle = shouldHideDuplicateTitle(eyebrow, genericTitle);

  return (
    <StageShell
      title={hideGenericTitle ? undefined : displayTitle}
      overlay={overlay}
      scale={scale}
      transitionIndex={itemIndex}
      transitionKey={item.id}
    >
      <div className="mx-auto flex w-full max-w-none flex-col items-center gap-6 px-8 text-center md:px-16">
        {item.type === "message" ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--accent-strong)]/40 bg-[rgba(181,138,77,0.15)] px-6 py-2">
            <span className="text-lg text-[var(--accent-strong)]">⚓</span>
            <p className="live-tv-text-sheen text-[clamp(1.1rem,1.8vw,2rem)] font-black uppercase tracking-[0.34em]">
              Messaggio dal Capitano
            </p>
            <span className="text-lg text-[var(--accent-strong)]">⚓</span>
          </div>
        ) : null}
        {item.body ? (
          <p className={CUSTOMER_MESSAGE_BODY_CLASS}>
            {item.body}
          </p>
        ) : null}

        {item.qrUrl ? (
          <div className="mt-4 flex flex-col items-center gap-8 rounded-[2.8rem] border-2 border-[var(--accent-strong)]/40 bg-[rgba(16,13,10,0.85)] px-8 py-6 shadow-2xl backdrop-blur-2xl lg:flex-row">
            <QrBlock value={item.qrUrl} label={item.qrLabel || item.title} />
            <div className="max-w-2xl text-center lg:text-left">
              <p className={CUSTOMER_QR_LABEL_CLASS}>
                {item.qrLabel || "Scansiona ora"}
              </p>
              <p className={`mt-4 ${CUSTOMER_QR_URL_CLASS}`}>
                {item.qrUrl}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </StageShell>
  );
}

export function LiveTvStageController() {
  const [stageState, setStageState] = useState<LiveTvStageResponse | null>(null);
  const [greetingQueue, setGreetingQueue] = useState<CustomerGreeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const lastUpdateIdRef = useRef<number | string>(0);

  const { getCachedUrl } = useLiveTvMediaCache(
    stageState?.playlist || []
  );

  const activeGreeting = greetingQueue[0] ?? null;
  const activeGreetingId = activeGreeting?.id;

  // Timer per il saluto attivo: 12 secondi esatti a schermo, poi avanza la coda
  useEffect(() => {
    if (!activeGreetingId) return;

    const timer = window.setTimeout(() => {
      setGreetingQueue((prev) => prev.slice(1));
    }, 12_000);

    return () => window.clearTimeout(timer);
  }, [activeGreetingId]);

  const enqueueGreeting = useCallback((greeting: CustomerGreeting) => {
    if (!greeting || !greeting.id) return;
    setGreetingQueue((prev) => {
      if (prev.some((g) => g.id === greeting.id)) return prev;
      return [...prev, greeting];
    });
  }, []);

  useEffect(() => {
    const handleLocalGreeting = (e: Event) => {
      const custom = e as CustomEvent<CustomerGreeting>;
      if (custom.detail) {
        enqueueGreeting(custom.detail);
      }
    };
    window.addEventListener("tortuga_demo_greeting", handleLocalGreeting);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("tortuga_live_greetings");
      bc.onmessage = (event) => {
        if (event.data) {
          enqueueGreeting(event.data as CustomerGreeting);
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "tortuga_last_demo_greeting" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as CustomerGreeting;
          if (parsed && parsed.id) {
            enqueueGreeting(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("tortuga_demo_greeting", handleLocalGreeting);
      window.removeEventListener("storage", handleStorage);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [enqueueGreeting]);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === "undefined") {
        return;
      }

      const widthScale = window.innerWidth / 1600;
      const heightScale = window.innerHeight / 900;
      const nextScale = Math.min(1, Math.min(widthScale, heightScale));
      setScale(nextScale);
      setIsPortraitMobile(
        window.matchMedia("(max-width: 767px) and (orientation: portrait)").matches,
      );
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let pollTimeout: number | null = null;
    let requestTimeout: number | null = null;
    let requestAbortController: AbortController | null = null;
    let requestInFlight = false;
    const supabase = getSupabase();
    let channel: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const clearFallbackPoll = () => {
      if (pollTimeout) window.clearTimeout(pollTimeout);
      pollTimeout = null;
    };

    const fetchState = async () => {
      if (!mounted || document.visibilityState === "hidden" || requestInFlight) {
        return;
      }

      requestInFlight = true;
      const controller = new AbortController();
      requestAbortController = controller;
      requestTimeout = window.setTimeout(() => controller.abort(), 8_000);

      try {
        const response = await fetch("/api/live-tv/state", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok || !mounted) {
          return;
        }

        const body = (await response.json()) as LiveTvStageResponse;
        const incomingId = Number(body.lastUpdateId) || 0;
        const currentId = Number(lastUpdateIdRef.current) || 0;

        if (incomingId >= currentId) {
          lastUpdateIdRef.current = incomingId;
          setStageState(body);
          setLoading(false);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Live TV stage fetch error:", error);
        }
      } finally {
        if (requestTimeout) window.clearTimeout(requestTimeout);
        requestTimeout = null;
        if (requestAbortController === controller) requestAbortController = null;
        requestInFlight = false;
      }
    };

    const scheduleFallbackPoll = () => {
      clearFallbackPoll();
      if (!mounted || document.visibilityState === "hidden") return;

      pollTimeout = window.setTimeout(async () => {
        await fetchState();
        scheduleFallbackPoll();
      }, 30_000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearFallbackPoll();
        requestAbortController?.abort();
        return;
      }

      void fetchState();
      scheduleFallbackPoll();
    };

    channel = supabase
      .channel("live-tv")
      .on("broadcast", { event: "state_update" }, ({ payload }: { payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!mounted || !payload) return;

        const incomingId = Number(payload.lastUpdateId) || 0;
        const currentId = Number(lastUpdateIdRef.current) || 0;

        if (incomingId >= currentId) {
          lastUpdateIdRef.current = incomingId;
          setStageState((previous) => ({
            ...(previous || {}),
            ...payload,
          }));
          setLoading(false);
          void fetchState();
        }
      })
      .on("broadcast", { event: "customer_greeting" }, ({ payload }: { payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!mounted || !payload) return;
        enqueueGreeting(payload as CustomerGreeting);
      })
      .subscribe();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void fetchState();
    scheduleFallbackPoll();

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearFallbackPoll();
      requestAbortController?.abort();
      if (requestTimeout) window.clearTimeout(requestTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [enqueueGreeting]);

  const enabledItems = useMemo(() => {
    if (!stageState) return [];
    return [...stageState.playlist]
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
      .filter((item) => item.enabled);
  }, [stageState]);

  const currentItem = useMemo(() => {
    if (!stageState) return null;
    if (stageState.nowPlayingOverride) return stageState.nowPlayingOverride;
    if (!enabledItems.length) return null;
    return enabledItems[stageState.currentItemIndex] ?? enabledItems[0] ?? null;
  }, [enabledItems, stageState]);

  const nextItem = useMemo(() => {
    if (!stageState || !enabledItems.length) return null;
    const nextIndex = (stageState.currentItemIndex + 1) % enabledItems.length;
    return enabledItems[nextIndex] ?? null;
  }, [enabledItems, stageState]);

  useEffect(() => {
    if (!stageState || stageState.stageMode !== "live_tv" || !currentItem) {
      return;
    }

    const referenceTime = stageState.nowPlayingOverride
      ? stageState.nowPlayingStartedAt
      : stageState.currentItemStartedAt;

    if (!referenceTime) {
      return;
    }

    const remainingMs =
      new Date(referenceTime).getTime() + currentItem.durationSeconds * 1000 - Date.now();

    const timeout = setTimeout(() => {
      void fetch("/api/live-tv/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedIndex: stageState.currentItemIndex,
          expectedStartedAt: stageState.currentItemStartedAt,
          expectedOverrideStartedAt: stageState.nowPlayingStartedAt,
        }),
      })
        .then(async (response) => {
          if (!response.ok) return;
          const body = (await response.json()) as { state?: LiveTvStageResponse };
          if (body.state) {
            setStageState(body.state);
          }
        })
        .catch((error) => {
          console.error("Live TV advance error:", error);
        });
    }, Math.max(remainingMs, 400));

    return () => clearTimeout(timeout);
  }, [currentItem, stageState]);

  if (loading) {
    return (
      <>
        <LogoScreen scale={scale} />
        {activeGreeting ? <GreetingBanner greeting={activeGreeting} /> : null}
        {isPortraitMobile ? <RotateOverlay /> : null}
      </>
    );
  }

  const stageMode: StageMode = stageState?.stageMode || "logo";
  const overlayVisible =
    stageMode === "live_tv" || stageMode === "logo" ? stageState?.overlay || null : null;
  if (stageMode === "blackout") {
    return (
      <>
        <BlackoutScreen />
        {activeGreeting ? <GreetingBanner greeting={activeGreeting} /> : null}
        {isPortraitMobile ? <RotateOverlay /> : null}
      </>
    );
  }

  if (stageMode === "logo") {
    return (
      <>
        <LogoScreen overlay={overlayVisible} scale={scale} />
        {activeGreeting ? <GreetingBanner greeting={activeGreeting} /> : null}
        {isPortraitMobile ? <RotateOverlay /> : null}
      </>
    );
  }

  return (
    <>
      <RenderLiveTvItem
        item={currentItem}
        overlay={overlayVisible}
        scale={scale}
        itemIndex={stageState?.currentItemIndex ?? 0}
        getCachedUrl={getCachedUrl}
      />
      <MediaPreloader item={nextItem} />
      {activeGreeting ? <GreetingBanner greeting={activeGreeting} /> : null}
      {isPortraitMobile ? <RotateOverlay /> : null}
    </>
  );
}


