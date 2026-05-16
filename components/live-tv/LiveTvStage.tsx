"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";

import { BuzzerStage } from "@/components/live-buzzer/BuzzerStage";
import { MatchDrinkStage } from "@/components/match-drink/MatchDrinkStage";
import { TORTUGA_LIVE_LOGO_URL } from "@/lib/live-tv/default-playlists";
import type { LiveTvItem, LiveTvOverlay, LiveTvState, StageMode } from "@/lib/live-tv/types";
import { getSupabase } from "@/lib/match-drink/supabase";

type LiveTvStageResponse = LiveTvState & {
  activeMatchDrinkSessionId?: string | null;
};

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
    <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[2.6rem] border border-[var(--accent-strong)]/30 bg-[rgba(12,10,8,0.82)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
      <div className="w-full rounded-[2rem] bg-[#f8f1df] p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
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
      <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-[var(--accent-strong)]">
        {label || "Scansiona ora"}
      </p>
    </div>
  );
}

function OverlayBanner({ overlay }: { overlay: LiveTvOverlay }) {
  const classes =
    overlay.variant === "urgent"
      ? "border-red-400/50 bg-red-500/20 text-red-100"
      : overlay.variant === "success"
        ? "border-green-400/40 bg-green-500/15 text-green-50"
        : overlay.variant === "captain"
          ? "border-[var(--accent-strong)]/60 bg-[rgba(181,138,77,0.18)] text-white"
          : "border-white/15 bg-black/45 text-white";

  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-30 w-[min(92vw,1200px)] -translate-x-1/2">
      <div className={`rounded-[1.8rem] border px-8 py-5 text-center shadow-2xl backdrop-blur-xl ${classes}`}>
        <p className="text-2xl font-black uppercase tracking-[0.2em] md:text-4xl">
          {overlay.message}
        </p>
      </div>
    </div>
  );
}

function StageBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nautical-map.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
      />
      <div className="absolute inset-x-0 top-20 h-32 bg-[linear-gradient(180deg,rgba(216,176,106,0.06),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(181,138,77,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(181,138,77,0.08),transparent_48%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.65))]" />
    </>
  );
}

function StageShell({
  children,
  title,
  overlay,
  scale = 1,
}: {
  children?: React.ReactNode;
  title?: string;
  overlay?: LiveTvOverlay | null;
  scale?: number;
}) {
  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-0 overflow-hidden">
        <StageBackdrop />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-8 py-10 md:px-16 md:py-12">
        {title ? (
          <header className="shrink-0 text-center">
            <h1 className="text-[clamp(2rem,4.8vw,4.4rem)] font-black uppercase tracking-tight text-white italic">
              {title}
            </h1>
          </header>
        ) : null}

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div
            className="w-full"
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
  "max-w-[88vw] text-[clamp(2.1rem,3.4vw,4.2rem)] font-black uppercase leading-[1.04] text-white";

const CUSTOMER_QR_BODY_CLASS =
  "text-[clamp(2rem,3.2vw,4.2rem)] font-bold leading-tight text-white/90";

const CUSTOMER_QR_LABEL_CLASS =
  "text-[clamp(1.6rem,2.2vw,2.4rem)] font-black uppercase tracking-[0.3em] text-[var(--accent-strong)]";

const CUSTOMER_QR_URL_CLASS =
  "break-all text-[clamp(1.4rem,1.7vw,1.95rem)] font-semibold text-white/70";

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
    <main className="relative flex h-screen flex-col overflow-hidden bg-black text-white select-none">
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
          className="max-h-[72vh] w-auto max-w-[72vw] object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        />
      </div>
      {overlay ? <OverlayBanner overlay={overlay} /> : null}
    </main>
  );
}

function BlackoutScreen() {
  return <main className="h-screen w-screen bg-black" />;
}

function MediaStageItem({
  item,
  overlay,
  kind,
}: {
  item: LiveTvItem;
  overlay?: LiveTvOverlay | null;
  kind: "image" | "video";
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const { orientation, handleImageLoad, handleVideoLoaded } = useMediaOrientation();

  if (!item.mediaUrl || mediaFailed) {
    return null;
  }
  const title = item.title || "Tortuga Live";
  const titleClass = title.length > 34
    ? "text-[clamp(2rem,4vw,3.5rem)]"
    : "text-[clamp(2.5rem,5vw,4.8rem)]";
  const bodyClass = getAdaptiveBodyStyle(item.body);
  const isPortrait = orientation === "portrait";

  return (
    <StageShell overlay={overlay}>
      <div className="relative z-10 grid h-full min-h-0 w-full grid-rows-[auto_1fr] gap-6 px-8 py-8 md:px-14 md:py-12">
        <div className="space-y-3 text-center">
          <p className="text-[clamp(0.95rem,1.4vw,1.45rem)] font-black uppercase tracking-[0.34em] text-[var(--accent-strong)]">
            {kind === "image" ? "Immagine live" : "Video live"}
          </p>
          <h1 className={`${titleClass} font-black uppercase leading-[0.95] text-white italic`}>
            {title}
          </h1>
          {item.body ? (
            <p className={`mx-auto font-bold leading-tight text-white/85 ${bodyClass}`}>
              {item.body}
            </p>
          ) : null}
        </div>

        <div className="flex min-h-0 items-center justify-center overflow-hidden">
          <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/30 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.4)] ${isPortrait ? "max-w-[58vw]" : "max-w-[84vw]"}`}>
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.mediaUrl}
                alt={title}
                className="max-h-full max-w-full object-contain"
                onLoad={handleImageLoad}
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <video
                key={item.id}
                src={item.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="max-h-full max-w-full object-contain"
                onLoadedMetadata={handleVideoLoaded}
                onError={() => setMediaFailed(true)}
              />
            )}
            {!orientation ? (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.3))]" />
            ) : null}
          </div>
        </div>
      </div>
    </StageShell>
  );
}

function RenderLiveTvItem({
  item,
  overlay,
  scale = 1,
}: {
  item: LiveTvItem | null;
  overlay?: LiveTvOverlay | null;
  scale?: number;
}) {
  if (!item) {
    return <LogoScreen overlay={overlay} scale={scale} />;
  }

  if (item.type === "image" && item.mediaUrl) {
    return <MediaStageItem key={item.id} item={item} overlay={overlay} kind="image" />;
  }

  if (item.type === "video" && item.mediaUrl) {
    return <MediaStageItem key={item.id} item={item} overlay={overlay} kind="video" />;
  }

  if (item.type === "qr") {
    const qrTitle = item.title || "Apri la Tortuga App";
    const hideQrTitle = shouldHideDuplicateTitle("Scansiona e sali a bordo", qrTitle);

    return (
      <StageShell
        title={hideQrTitle ? undefined : qrTitle}
        overlay={overlay}
        scale={scale}
      >
        <div className="flex w-full max-w-none items-center justify-between gap-12 px-8 lg:gap-20 lg:px-16">
          <QrBlock value={item.qrUrl || ""} label={item.qrLabel || item.title} />
          <div className="max-w-[48vw] space-y-5 text-center lg:text-left">
            {item.body ? (
              <p className={CUSTOMER_QR_BODY_CLASS}>
                {item.body}
              </p>
            ) : null}
            {item.qrLabel ? (
              <p className={CUSTOMER_QR_LABEL_CLASS}>
                {item.qrLabel}
              </p>
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

    return (
      <StageShell
        title={hideReviewTitle ? undefined : reviewTitle}
        overlay={overlay}
        scale={scale}
      >
        <div className="mx-auto flex w-full max-w-none flex-col items-center gap-6 rounded-[3rem] border border-white/10 bg-white/5 px-12 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl md:px-16 md:py-12">
          <p className="text-[clamp(2.4rem,4vw,5.4rem)] tracking-[0.38em] text-[var(--accent-strong)]">★★★★★</p>
          <p className="max-w-[88vw] text-[clamp(1.8rem,3.2vw,4.6rem)] font-black uppercase leading-[1.02] text-white italic">
            “{item.body || "Serata potente, tavolo caldo, ciurma soddisfatta."}”
          </p>
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
      >
        <div className="flex w-full max-w-[1500px] flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.mediaUrl || TORTUGA_LIVE_LOGO_URL}
            alt={item.title || "Logo Tortuga"}
            className="h-auto w-full max-w-[clamp(18rem,42vw,46rem)] object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          />
          {item.body ? (
            <p className={`font-black uppercase leading-[1.12] text-white ${getAdaptiveBodyStyle(item.body)}`}>
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
    >
      <div className="mx-auto flex w-full max-w-none flex-col items-center gap-5 px-8 text-center md:px-16">
        {item.type === "message" ? (
          <p className="text-[clamp(1.1rem,1.8vw,2rem)] font-black uppercase tracking-[0.34em] text-[var(--accent-strong)]">
            Messaggio dal Capitano
          </p>
        ) : null}
        {item.body ? (
          <p className={CUSTOMER_MESSAGE_BODY_CLASS}>
            {item.body}
          </p>
        ) : null}

        {item.qrUrl ? (
          <div className="flex flex-col items-center gap-8 rounded-[2.4rem] border border-white/10 bg-white/5 px-7 py-5 shadow-2xl backdrop-blur-xl lg:flex-row">
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
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const lastUpdateIdRef = useRef<number | string>(0);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === "undefined") {
        return;
      }

      const widthScale = window.innerWidth / 1600;
      const heightScale = window.innerHeight / 900;
      const nextScale = Math.min(1, Math.max(0.72, Math.min(widthScale, heightScale)));
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
    let pollInterval: NodeJS.Timeout | null = null;
    const supabase = getSupabase();
    let channel: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const fetchState = async () => {
      try {
        const response = await fetch(`/api/live-tv/state?t=${Date.now()}`, {
          cache: "no-store",
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
        console.error("Live TV stage fetch error:", error);
      }
    };

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        void fetchState();
      }, 2000);
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
            activeMatchDrinkSessionId: previous?.activeMatchDrinkSessionId ?? null,
          }));
          setLoading(false);
          void fetchState();
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
        {isPortraitMobile ? <RotateOverlay /> : null}
      </>
    );
  }

  if (stageMode === "logo") {
    return (
      <>
        <LogoScreen overlay={overlayVisible} scale={scale} />
        {isPortraitMobile ? <RotateOverlay /> : null}
      </>
    );
  }

  if (stageMode === "buzzer") {
    return <BuzzerStage />;
  }

  if (stageMode === "match_drink") {
    if (stageState?.activeMatchDrinkSessionId) {
      return <MatchDrinkStage sessionId={stageState.activeMatchDrinkSessionId} />;
    }

    return (
      <StageShell
        title="Stage in preparazione"
        scale={scale}
      />
    );
  }

  return (
    <>
      <RenderLiveTvItem
        item={currentItem}
        overlay={overlayVisible}
        scale={scale}
      />
      {isPortraitMobile ? <RotateOverlay /> : null}
    </>
  );
}


