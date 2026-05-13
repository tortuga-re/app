"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BuzzerStage } from "@/components/live-buzzer/BuzzerStage";
import { MatchDrinkStage } from "@/components/match-drink/MatchDrinkStage";
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

function StageShell({
  children,
  eyebrow,
  title,
  subtitle,
  overlay,
}: {
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  overlay?: LiveTvOverlay | null;
}) {
  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(181,138,77,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(181,138,77,0.08),transparent_48%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.65))]" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-10 py-12 md:px-16">
        {(eyebrow || title || subtitle) && (
          <header className="space-y-4 text-center">
            {eyebrow ? (
              <p className="text-xl font-black uppercase tracking-[0.5em] text-[var(--accent-strong)] md:text-2xl">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="text-[7vw] font-black uppercase tracking-tight text-white italic md:text-[5vw]">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mx-auto max-w-5xl text-2xl font-bold leading-tight text-white/78 md:text-4xl">
                {subtitle}
              </p>
            ) : null}
          </header>
        )}

        <div className="relative flex flex-1 items-center justify-center">{children}</div>
      </div>

      {overlay ? <OverlayBanner overlay={overlay} /> : null}
    </main>
  );
}

function LogoScreen({ overlay }: { overlay?: LiveTvOverlay | null }) {
  return (
    <StageShell
      eyebrow="Tortuga Live"
      title="TORTUGA"
      subtitle="EAT.DRINK.TORTUGA.REPEAT"
      overlay={overlay}
    >
      <div className="text-center">
        <p className="text-4xl font-black uppercase tracking-[0.35em] text-white/60 md:text-6xl">
          La serata e in onda
        </p>
      </div>
    </StageShell>
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

  if (!item.mediaUrl || mediaFailed) {
    return null;
  }

  return (
    <StageShell overlay={overlay}>
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.mediaUrl}
          alt={item.title || "Tortuga Live"}
          className="absolute inset-0 h-full w-full object-cover"
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
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setMediaFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.76))]" />
      <div className="relative z-10 mx-auto flex max-w-[1500px] flex-col items-start gap-6 self-end pb-14">
        {item.title ? (
          <p className="text-2xl font-black uppercase tracking-[0.45em] text-[var(--accent-strong)] md:text-3xl">
            Tortuga Live
          </p>
        ) : null}
        {item.title ? (
          <h1 className="max-w-[14ch] text-[7vw] font-black uppercase leading-[0.95] text-white italic">
            {item.title}
          </h1>
        ) : null}
        {item.body ? (
          <p className="max-w-5xl text-3xl font-bold leading-tight text-white/85 md:text-5xl">
            {item.body}
          </p>
        ) : null}
      </div>
    </StageShell>
  );
}

function RenderLiveTvItem({
  item,
  nextItem,
  overlay,
}: {
  item: LiveTvItem | null;
  nextItem?: LiveTvItem | null;
  overlay?: LiveTvOverlay | null;
}) {
  if (!item) {
    return <LogoScreen overlay={overlay} />;
  }

  if (item.type === "image" && item.mediaUrl) {
    return <MediaStageItem key={item.id} item={item} overlay={overlay} kind="image" />;
  }

  if (item.type === "video" && item.mediaUrl) {
    return <MediaStageItem key={item.id} item={item} overlay={overlay} kind="video" />;
  }

  if (item.type === "qr") {
    return (
      <StageShell
        eyebrow="Scansiona e sali a bordo"
        title={item.title || "Apri la Tortuga App"}
        subtitle={item.subtitle || item.body}
        overlay={overlay}
      >
        <div className="flex w-full max-w-[1500px] items-center justify-center gap-16">
          <QrBlock value={item.qrUrl || ""} label={item.qrLabel || item.title} />
          <div className="max-w-3xl space-y-6 text-left">
            {item.body ? (
              <p className="text-3xl font-bold leading-tight text-white/90 md:text-5xl">
                {item.body}
              </p>
            ) : null}
            {item.qrLabel ? (
              <p className="text-xl font-black uppercase tracking-[0.3em] text-[var(--accent-strong)] md:text-2xl">
                {item.qrLabel}
              </p>
            ) : null}
            {item.qrUrl ? (
              <p className="break-all text-lg font-semibold text-white/55 md:text-2xl">
                {item.qrUrl}
              </p>
            ) : null}
          </div>
        </div>
      </StageShell>
    );
  }

  if (item.type === "review") {
    return (
      <StageShell
        eyebrow="La ciurma dice di noi"
        title={item.title || "Recensione di bordo"}
        subtitle={item.subtitle}
        overlay={overlay}
      >
        <div className="mx-auto flex max-w-[1500px] flex-col items-center gap-8 rounded-[3rem] border border-white/10 bg-white/5 px-14 py-12 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <p className="text-5xl tracking-[0.5em] text-[var(--accent-strong)] md:text-7xl">★★★★★</p>
          <p className="max-w-6xl text-4xl font-black uppercase leading-[1.15] text-white italic md:text-6xl">
            “{item.body || "Serata potente, tavolo caldo, ciurma soddisfatta."}”
          </p>
          {item.subtitle ? (
            <p className="text-2xl font-black uppercase tracking-[0.28em] text-white/65 md:text-3xl">
              {item.subtitle}
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
          : item.type === "logo"
            ? "Tortuga Live"
            : "Tortuga Live";

  return (
    <StageShell
      eyebrow={eyebrow}
      title={item.title || "Tortuga Live"}
      subtitle={item.subtitle || (nextItem?.title ? `Tra poco: ${nextItem.title}` : undefined)}
      overlay={overlay}
    >
      <div className="mx-auto flex max-w-[1500px] flex-col items-center gap-8 text-center">
        {item.body ? (
          <p className="max-w-6xl text-4xl font-black uppercase leading-[1.15] text-white md:text-6xl">
            {item.body}
          </p>
        ) : null}

        {item.qrUrl ? (
          <div className="flex items-center gap-10 rounded-[2.4rem] border border-white/10 bg-white/5 px-8 py-7 shadow-2xl backdrop-blur-xl">
            <QrBlock value={item.qrUrl} label={item.qrLabel || item.title} />
            <div className="max-w-2xl text-left">
              <p className="text-2xl font-black uppercase tracking-[0.28em] text-[var(--accent-strong)] md:text-3xl">
                {item.qrLabel || "Scansiona ora"}
              </p>
              <p className="mt-4 text-2xl font-bold leading-tight text-white/80 md:text-4xl">
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
  const lastUpdateIdRef = useRef<number | string>(0);

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

  const nextItem = useMemo(() => {
    if (!stageState || stageState.nowPlayingOverride || enabledItems.length < 2) {
      return null;
    }

    return enabledItems[(stageState.currentItemIndex + 1) % enabledItems.length] ?? null;
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
    return <LogoScreen />;
  }

  const stageMode: StageMode = stageState?.stageMode || "logo";
  const overlayVisible =
    stageMode === "live_tv" || stageMode === "logo" ? stageState?.overlay || null : null;

  if (stageMode === "blackout") {
    return <BlackoutScreen />;
  }

  if (stageMode === "logo") {
    return <LogoScreen overlay={overlayVisible} />;
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
        eyebrow="Match & Drink"
        title="Stage in preparazione"
        subtitle="Nessuna sessione attiva trovata. Apri una sessione Match & Drink dalla plancia admin."
      />
    );
  }

  return <RenderLiveTvItem item={currentItem} nextItem={nextItem} overlay={overlayVisible} />;
}
