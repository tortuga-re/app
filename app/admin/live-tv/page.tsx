"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { LIVE_TV_PRESETS } from "@/lib/live-tv/default-playlists";
import {
  LIVE_TV_ITEM_TYPES,
  LIVE_TV_OVERLAY_VARIANTS,
  LIVE_TV_STYLE_VARIANTS,
  STAGE_MODE_VALUES,
  type LiveTvItem,
  type LiveTvMediaAsset,
  type LiveTvOverlayVariant,
  type LiveTvPresetId,
  type LiveTvScheduleEntry,
  type LiveTvState,
  type LiveTvStyleVariant,
  type LiveTvUpsertItemInput,
  type StageMode,
} from "@/lib/live-tv/types";

type LiveTvPageState = LiveTvState & {
  activeMatchDrinkSessionId?: string | null;
};

type AdminDashboardResponse = {
  receiptsPending: number;
  pushSubscriptions: number;
  liveBuzzerActive: boolean;
  matchDrinkActive: boolean;
  latestMatchDrinkTitle: string | null;
  liveTvMode: StageMode;
  liveTvScheduleEnabled: boolean;
  liveTvMediaAssets: number;
  savedPushSegments: number;
  savedPushCampaigns: number;
  matchDrinkAnalytics?: {
    signups?: number;
    matchesCalculated?: number;
    acceptedMatches?: number;
    drinksRedeemed?: number;
  } | null;
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
] as const;

const createEmptyScheduleEntry = (): LiveTvScheduleEntry => ({
  id: crypto.randomUUID(),
  label: "",
  startTime: "18:00",
  endTime: "20:00",
  daysOfWeek: [4],
  stageMode: "live_tv",
  presetId: "generica",
  enabled: true,
});

const stageModeLabels: Record<StageMode, string> = {
  live_tv: "Live TV",
  buzzer: "Tortuga Music Quiz",
  match_drink: "Match & Drink",
  blackout: "Blackout",
  logo: "Logo fisso",
};

const itemTypeLabels: Record<(typeof LIVE_TV_ITEM_TYPES)[number], string> = {
  logo: "Logo",
  message: "Messaggio",
  qr: "QR",
  image: "Immagine",
  video: "Video",
  event: "Evento",
  promo: "Promo",
  review: "Review",
};

const createEmptyDraft = (): LiveTvUpsertItemInput => ({
  type: "message",
  title: "",
  subtitle: "",
  body: "",
  mediaUrl: "",
  qrUrl: "",
  qrLabel: "",
  durationSeconds: 12,
  enabled: true,
  styleVariant: "default",
});

function ItemFields({
  value,
  onChange,
  busy = false,
}: {
  value: LiveTvUpsertItemInput;
  onChange: (next: LiveTvUpsertItemInput) => void;
  busy?: boolean;
}) {
  const [uploadError, setUploadError] = useState("");

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    const formData = new FormData();
    formData.append("media", file);

    try {
      const response = await fetch("/api/live-tv/admin/upload-media", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as
        | { mediaUrl?: string; mediaKind?: "image" | "video"; error?: string }
        | null;

      if (!response.ok || !body?.mediaUrl) {
        throw new Error(body?.error || "Upload non riuscito.");
      }

      onChange({
        ...value,
        mediaUrl: body.mediaUrl,
        type:
          value.type === "image" || value.type === "video"
            ? value.type
            : body.mediaKind === "video"
              ? "video"
              : "image",
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload non riuscito.");
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Tipo
        </span>
        <select
          value={value.type}
          onChange={(event) => onChange({ ...value, type: event.target.value as LiveTvUpsertItemInput["type"] })}
          className="field"
        >
          {LIVE_TV_ITEM_TYPES.map((type) => (
            <option key={type} value={type}>
              {itemTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Durata secondi
        </span>
        <input
          type="number"
          min={5}
          max={240}
          value={value.durationSeconds}
          onChange={(event) =>
            onChange({
              ...value,
              durationSeconds: Number(event.target.value) || 12,
            })}
          className="field"
        />
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Titolo
        </span>
        <input
          value={value.title || ""}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          className="field"
        />
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Sottotitolo
        </span>
        <input
          value={value.subtitle || ""}
          onChange={(event) => onChange({ ...value, subtitle: event.target.value })}
          className="field"
        />
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Testo
        </span>
        <textarea
          value={value.body || ""}
          onChange={(event) => onChange({ ...value, body: event.target.value })}
          rows={4}
          className="field min-h-28"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Media URL
        </span>
        <input
          value={value.mediaUrl || ""}
          onChange={(event) => onChange({ ...value, mediaUrl: event.target.value })}
          className="field"
          placeholder="https://..."
        />
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          File locale
        </span>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
          className="field file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-strong)] file:px-4 file:py-2 file:text-xs file:font-black file:text-black"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileUpload(file);
            }
            event.currentTarget.value = "";
          }}
        />
        <p className="text-[10px] text-[var(--text-muted)]">
          Carica un file dal PC e lo useremo come media dell&apos;item.
        </p>
        {uploadError ? <p className="text-[10px] text-[var(--danger)]">{uploadError}</p> : null}
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          QR URL
        </span>
        <input
          value={value.qrUrl || ""}
          onChange={(event) => onChange({ ...value, qrUrl: event.target.value })}
          className="field"
          placeholder="https://..."
        />
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          QR Label
        </span>
        <input
          value={value.qrLabel || ""}
          onChange={(event) => onChange({ ...value, qrLabel: event.target.value })}
          className="field"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Variante
        </span>
        <select
          value={value.styleVariant || "default"}
          onChange={(event) =>
            onChange({
              ...value,
              styleVariant: event.target.value as LiveTvStyleVariant,
            })}
          className="field"
        >
          {LIVE_TV_STYLE_VARIANTS.map((variant) => (
            <option key={variant} value={variant}>
              {variant}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 md:col-span-2">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
        />
        <span className="text-sm font-bold text-white">Elemento attivo in scaletta</span>
      </label>
    </div>
  );
}

function PlaylistItemEditor({
  item,
  onSave,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSendNow,
  onDuplicate,
  busy,
}: {
  item: LiveTvItem;
  onSave: (id: string, draft: LiveTvUpsertItemInput) => Promise<void>;
  onToggle: (item: LiveTvItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: (id: string) => Promise<void>;
  onMoveDown: (id: string) => Promise<void>;
  onSendNow: (item: LiveTvItem) => Promise<void>;
  onDuplicate: (item: LiveTvItem) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<LiveTvUpsertItemInput>({
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    body: item.body,
    mediaUrl: item.mediaUrl,
    qrUrl: item.qrUrl,
    qrLabel: item.qrLabel,
    durationSeconds: item.durationSeconds,
    enabled: item.enabled,
    order: item.order,
    styleVariant: item.styleVariant || "default",
  });

  return (
    <div className="panel space-y-4 rounded-[1.8rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">
            #{item.order + 1} • {itemTypeLabels[item.type]}
          </p>
          <h3 className="text-lg font-black text-white">
            {item.title || "Elemento senza titolo"}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
            item.enabled
              ? "bg-green-500/20 text-green-300"
              : "bg-white/10 text-[var(--text-muted)]"
          }`}
        >
          {item.enabled ? "Attivo" : "Disattivo"}
        </span>
      </div>

      <ItemFields value={draft} onChange={setDraft} busy={busy} />

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <button className="button-primary text-xs" onClick={() => void onSave(item.id, draft)} disabled={busy}>
          Salva
        </button>
        <button className="button-secondary text-xs" onClick={() => void onToggle(item)} disabled={busy}>
          {item.enabled ? "Disattiva" : "Attiva"}
        </button>
        <button className="button-secondary text-xs" onClick={() => void onMoveUp(item.id)} disabled={busy}>
          Su
        </button>
        <button className="button-secondary text-xs" onClick={() => void onMoveDown(item.id)} disabled={busy}>
          Giu
        </button>
        <button className="button-secondary text-xs" onClick={() => void onSendNow(item)} disabled={busy}>
          In onda ora
        </button>
        <button className="button-secondary text-xs" onClick={() => void onDuplicate(item)} disabled={busy}>
          Duplica
        </button>
      </div>

      <button className="button-secondary w-full border-[var(--danger-soft)] text-[var(--danger)] text-xs" onClick={() => void onDelete(item.id)} disabled={busy}>
        Elimina elemento
      </button>
    </div>
  );
}

export default function AdminLiveTvPage() {
  const [state, setState] = useState<LiveTvPageState | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<LiveTvMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addDraft, setAddDraft] = useState<LiveTvUpsertItemInput>(createEmptyDraft());
  const [sendNowDraft, setSendNowDraft] = useState<LiveTvUpsertItemInput>({
    ...createEmptyDraft(),
    type: "message",
    title: "Messaggio live",
    durationSeconds: 10,
  });
  const [sendNowAlsoAdd, setSendNowAlsoAdd] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlayVariant, setOverlayVariant] = useState<LiveTvOverlayVariant>("captain");
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<LiveTvScheduleEntry[]>([]);

  const orderedItems = useMemo(
    () => [...(state?.playlist || [])].sort((a, b) => a.order - b.order),
    [state?.playlist],
  );

  const enabledItems = useMemo(
    () => orderedItems.filter((item) => item.enabled),
    [orderedItems],
  );

  const currentItem = useMemo(() => {
    if (!state) return null;
    if (state.nowPlayingOverride) return state.nowPlayingOverride;
    if (!enabledItems.length) return null;
    return enabledItems[state.currentItemIndex] ?? enabledItems[0] ?? null;
  }, [enabledItems, state]);

  const nextItem = useMemo(() => {
    if (!state || state.nowPlayingOverride || enabledItems.length < 2) {
      return null;
    }
    return enabledItems[(state.currentItemIndex + 1) % enabledItems.length] ?? null;
  }, [enabledItems, state]);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/live-tv/state", { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | LiveTvPageState
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(body && "error" in body ? body.error : "Plancia Live TV non disponibile.");
    }

    const nextState = body as LiveTvPageState;
    setState(nextState);
    setAutoScheduleEnabled(Boolean(nextState.autoScheduleEnabled));
    setScheduleDraft(nextState.schedule ?? []);
    setOverlayMessage(nextState.overlay?.message || "");
    setOverlayVariant((nextState.overlay?.variant as LiveTvOverlayVariant) || "captain");
    setError("");
  }, []);

  const readLiveTvState = useCallback(async () => {
    const response = await fetch("/api/live-tv/state", { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | LiveTvPageState
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(body && "error" in body ? body.error : "Plancia Live TV non disponibile.");
    }

    return body as LiveTvPageState;
  }, []);

  const loadSupportData = useCallback(async () => {
    const [mediaResponse, dashboardResponse] = await Promise.all([
      fetch("/api/live-tv/admin/media-library", { cache: "no-store" }),
      fetch("/api/admin/dashboard", { cache: "no-store" }),
    ]);

    const mediaBody = (await mediaResponse.json().catch(() => null)) as
      | { assets?: LiveTvMediaAsset[]; error?: string }
      | null;
    const dashboardBody = (await dashboardResponse.json().catch(() => null)) as
      | AdminDashboardResponse
      | { error?: string }
      | null;

    if (mediaResponse.ok) {
      setMediaLibrary(mediaBody?.assets ?? []);
    }

    if (dashboardResponse.ok) {
      setDashboard(dashboardBody as AdminDashboardResponse);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const nextState = await readLiveTvState();
        await loadSupportData();
        if (cancelled) return;
        startTransition(() => {
          setState(nextState);
          setAutoScheduleEnabled(Boolean(nextState.autoScheduleEnabled));
          setScheduleDraft(nextState.schedule ?? []);
          setOverlayMessage(nextState.overlay?.message || "");
          setOverlayVariant((nextState.overlay?.variant as LiveTvOverlayVariant) || "captain");
          setError("");
          setLoading(false);
        });
      } catch (loadError) {
        if (cancelled) return;
        startTransition(() => {
          setError(loadError instanceof Error ? loadError.message : "Errore plancia Live TV.");
          setLoading(false);
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadSupportData, readLiveTvState]);

  useEffect(() => {
    if (loading) {
      return;
    }

    let cancelled = false;
    const interval = setInterval(() => {
      void readLiveTvState()
        .then((nextState) => {
          if (cancelled) return;
          startTransition(() => {
            setState(nextState);
          });
        })
        .catch(() => {});
    }, 3000);

    const supportInterval = setInterval(() => {
      void loadSupportData().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(supportInterval);
    };
  }, [loadSupportData, loading, readLiveTvState]);

  const runAction = useCallback(async (url: string, payload?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });

      const body = (await response.json().catch(() => null)) as
        | { state?: LiveTvPageState; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Operazione non riuscita.");
      }

      if (body?.state) {
        setState(body.state);
        setAutoScheduleEnabled(Boolean(body.state.autoScheduleEnabled));
        setScheduleDraft(body.state.schedule ?? []);
      } else {
        await loadState();
      }

      await loadSupportData();
      setError("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Operazione non riuscita.");
      throw actionError;
    } finally {
      setBusy(false);
    }
  }, [loadState, loadSupportData]);

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    const index = orderedItems.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
    const nextIds = [...orderedItems.map((item) => item.id)];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    await runAction("/api/live-tv/admin/reorder", { ids: nextIds });
  };

  const updateScheduleEntry = (
    scheduleEntryId: string,
    patch: Partial<LiveTvScheduleEntry>,
  ) => {
    setScheduleDraft((current) =>
      current.map((entry) =>
        entry.id === scheduleEntryId
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      ),
    );
  };

  const toggleScheduleDay = (scheduleEntryId: string, dayValue: number) => {
    setScheduleDraft((current) =>
      current.map((entry) => {
        if (entry.id !== scheduleEntryId) {
          return entry;
        }

        return {
          ...entry,
          daysOfWeek: entry.daysOfWeek.includes(dayValue)
            ? entry.daysOfWeek.filter((day) => day !== dayValue)
            : [...entry.daysOfWeek, dayValue].sort(),
        };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="panel rounded-[2rem] p-6">
        <p className="eyebrow">Stage Control</p>
        <h2 className="text-2xl font-black uppercase italic text-white">
          Tortuga Live TV
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Una sola plancia per decidere cosa vede la TV del locale: Live TV a rotazione, stage fisso del quiz, Match & Drink, logo o blackout.
        </p>
      </div>

      {error ? (
        <StatusBlock variant="error" title="Plancia Live TV parziale" description={error} />
      ) : null}

      {loading ? (
        <StatusBlock
          variant="loading"
          title="Sto preparando la TV del locale"
          description="Recupero stage mode, scaletta, overlay e stato corrente del palco."
        />
      ) : null}

      {state ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="panel rounded-[1.8rem] p-5">
              <p className="eyebrow">Quadro operativo</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Ricevute in attesa
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">{dashboard?.receiptsPending ?? 0}</p>
                </div>
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Push registrate
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">{dashboard?.pushSubscriptions ?? 0}</p>
                </div>
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Media in libreria
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">{dashboard?.liveTvMediaAssets ?? mediaLibrary.length}</p>
                </div>
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Buzzer
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {dashboard?.liveBuzzerActive ? "LIVE" : "Spento"}
                  </p>
                </div>
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Match & Drink
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {dashboard?.matchDrinkActive ? "ATTIVO" : "Spento"}
                  </p>
                  {dashboard?.latestMatchDrinkTitle ? (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{dashboard.latestMatchDrinkTitle}</p>
                  ) : null}
                </div>
                <div className="panel-muted rounded-[1.35rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Campagne push
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {dashboard?.savedPushCampaigns ?? 0} template
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Segmenti salvati: {dashboard?.savedPushSegments ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="panel rounded-[1.8rem] p-5">
              <p className="eyebrow">Accessi rapidi</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link href="/admin/buzzer" className="button-secondary text-center text-xs">
                  Apri Buzzer
                </Link>
                <Link href="/admin/match-drink" className="button-secondary text-center text-xs">
                  Apri Match & Drink
                </Link>
                <Link href="/admin/scontrini" className="button-secondary text-center text-xs">
                  Apri Scontrini
                </Link>
                <Link href="/admin/push" className="button-secondary text-center text-xs">
                  Apri Push
                </Link>
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-muted)]">
                La plancia Live TV ora funge anche da cabina di regia della serata: stato palco, media, palinsesto e collegamenti rapidi alle altre console.
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="panel rounded-[1.8rem] p-5">
              <p className="eyebrow">Modalita stage</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {STAGE_MODE_VALUES.map((mode) => (
                  <button
                    key={mode}
                    className={
                      mode === state.stageMode
                        ? "button-primary min-h-14 text-xs"
                        : "button-secondary min-h-14 text-xs"
                    }
                    onClick={() => void runAction("/api/live-tv/admin/set-stage-mode", { stageMode: mode })}
                    disabled={busy}
                  >
                    {stageModeLabels[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel rounded-[1.8rem] p-5">
              <p className="eyebrow">Stato attuale</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                <p>
                  <span className="font-black text-white">Mode:</span> {stageModeLabels[state.stageMode]}
                </p>
                <p>
                  <span className="font-black text-white">Preset:</span> {state.activePresetId || "custom"}
                </p>
                <p>
                  <span className="font-black text-white">Palinsesto:</span> {state.autoScheduleEnabled ? "attivo" : "manuale"}
                </p>
                <p>
                  <span className="font-black text-white">Ora in onda:</span> {currentItem?.title || "Logo fallback"}
                </p>
                <p>
                  <span className="font-black text-white">Prossimo:</span> {nextItem?.title || "Nessuno"}
                </p>
                <p>
                  <span className="font-black text-white">Ultimo update:</span> {new Date(state.updatedAt).toLocaleString("it-IT")}
                </p>
              </div>
            </div>
          </div>

          <div className="panel rounded-[1.8rem] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Palinsesto serata</p>
                <h3 className="text-lg font-black text-white">Auto-switch per fasce orarie</h3>
              </div>
              <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                <input
                  type="checkbox"
                  checked={autoScheduleEnabled}
                  onChange={(event) => setAutoScheduleEnabled(event.target.checked)}
                />
                Auto palinsesto
              </label>
            </div>

            <div className="space-y-3">
              {scheduleDraft.map((entry) => (
                <div key={entry.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input
                      className="field"
                      value={entry.label}
                      placeholder="Nome fascia"
                      onChange={(event) => updateScheduleEntry(entry.id, { label: event.target.value })}
                    />
                    <input
                      className="field"
                      type="time"
                      value={entry.startTime}
                      onChange={(event) => updateScheduleEntry(entry.id, { startTime: event.target.value })}
                    />
                    <input
                      className="field"
                      type="time"
                      value={entry.endTime}
                      onChange={(event) => updateScheduleEntry(entry.id, { endTime: event.target.value })}
                    />
                    <select
                      className="field"
                      value={entry.stageMode}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, {
                          stageMode: event.target.value as StageMode,
                          presetId:
                            event.target.value === "live_tv"
                              ? (entry.presetId || "generica")
                              : null,
                        })
                      }
                    >
                      {STAGE_MODE_VALUES.map((mode) => (
                        <option key={mode} value={mode}>
                          {stageModeLabels[mode]}
                        </option>
                      ))}
                    </select>
                    <select
                      className="field"
                      value={entry.presetId || "generica"}
                      disabled={entry.stageMode !== "live_tv"}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, {
                          presetId: event.target.value as LiveTvPresetId,
                        })
                      }
                    >
                      {LIVE_TV_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-xs text-white">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(event) => updateScheduleEntry(entry.id, { enabled: event.target.checked })}
                      />
                      Attivo
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        className={
                          entry.daysOfWeek.includes(day.value)
                            ? "button-primary px-3 py-2 text-[10px]"
                            : "button-secondary px-3 py-2 text-[10px]"
                        }
                        onClick={() => toggleScheduleDay(entry.id, day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="button-secondary ml-auto px-3 py-2 text-[10px]"
                      onClick={() =>
                        setScheduleDraft((current) =>
                          current.filter((candidate) => candidate.id !== entry.id),
                        )
                      }
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="button-secondary text-xs"
                onClick={() =>
                  setScheduleDraft((current) => [...current, createEmptyScheduleEntry()])
                }
                disabled={busy}
              >
                Aggiungi fascia
              </button>
              <button
                className="button-primary text-xs"
                onClick={() =>
                  void runAction("/api/live-tv/admin/set-schedule", {
                    autoScheduleEnabled,
                    schedule: scheduleDraft,
                  })
                }
                disabled={busy}
              >
                Salva palinsesto
              </button>
            </div>
          </div>

          <div className="panel rounded-[1.8rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Preset serata</p>
                <h3 className="text-lg font-black text-white">Carica una scaletta pronta</h3>
              </div>
              <button className="button-secondary text-xs" onClick={() => void runAction("/api/live-tv/admin/reset-defaults")} disabled={busy}>
                Ripristina default
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {LIVE_TV_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={preset.id === state.activePresetId ? "panel rounded-[1.4rem] border-[var(--accent-strong)] bg-[var(--accent-soft)]/10 p-4 text-left" : "panel rounded-[1.4rem] p-4 text-left"}
                  onClick={() => void runAction("/api/live-tv/admin/set-active-preset", { presetId: preset.id })}
                  disabled={busy}
                >
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                    {preset.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="panel rounded-[1.8rem] p-5 space-y-4">
              <div>
                <p className="eyebrow">Manda in onda ora</p>
                <h3 className="text-lg font-black text-white">Override immediato</h3>
              </div>
              <ItemFields value={sendNowDraft} onChange={setSendNowDraft} busy={busy} />
              <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                <input type="checkbox" checked={sendNowAlsoAdd} onChange={(event) => setSendNowAlsoAdd(event.target.checked)} />
                <span className="text-sm font-bold text-white">Aggiungi anche alla scaletta</span>
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <button
                  className="button-primary text-xs"
                  onClick={() =>
                    void runAction("/api/live-tv/admin/send-now", {
                      ...sendNowDraft,
                      addToPlaylist: sendNowAlsoAdd,
                    })
                  }
                  disabled={busy}
                >
                  Manda in onda ora
                </button>
                <button className="button-secondary text-xs" onClick={() => void runAction("/api/live-tv/admin/clear-now")} disabled={busy}>
                  Riprendi rotazione
                </button>
              </div>
            </div>

            <div className="panel rounded-[1.8rem] p-5 space-y-4">
              <div>
                <p className="eyebrow">Overlay live</p>
                <h3 className="text-lg font-black text-white">Messaggio sopra la TV</h3>
              </div>
              <label className="space-y-2 block">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                  Messaggio
                </span>
                <textarea
                  value={overlayMessage}
                  onChange={(event) => setOverlayMessage(event.target.value)}
                  rows={4}
                  className="field min-h-28"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                  Variante
                </span>
                <select
                  value={overlayVariant}
                  onChange={(event) => setOverlayVariant(event.target.value as LiveTvOverlayVariant)}
                  className="field"
                >
                  {LIVE_TV_OVERLAY_VARIANTS.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <button
                  className="button-primary text-xs"
                  onClick={() =>
                    void runAction("/api/live-tv/admin/set-overlay", {
                      message: overlayMessage,
                      variant: overlayVariant,
                    })
                  }
                  disabled={busy || !overlayMessage.trim()}
                >
                  Mostra overlay
                </button>
                <button className="button-secondary text-xs" onClick={() => void runAction("/api/live-tv/admin/clear-overlay")} disabled={busy}>
                  Rimuovi overlay
                </button>
              </div>
            </div>
          </div>

          <div className="panel rounded-[1.8rem] p-5 space-y-4">
            <div>
              <p className="eyebrow">Aggiungi item</p>
              <h3 className="text-lg font-black text-white">Nuovo blocco Live TV</h3>
            </div>
            <ItemFields value={addDraft} onChange={setAddDraft} busy={busy} />
            <button
              className="button-primary text-xs"
              onClick={async () => {
                await runAction("/api/live-tv/admin/add-item", addDraft);
                setAddDraft(createEmptyDraft());
              }}
              disabled={busy}
            >
              Aggiungi alla scaletta
            </button>
          </div>

          <div className="panel rounded-[1.8rem] p-5 space-y-4">
            <div>
              <p className="eyebrow">Libreria media</p>
              <h3 className="text-lg font-black text-white">File gia caricati</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {mediaLibrary.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-[var(--accent-strong)]/40"
                  onClick={() =>
                    setAddDraft((current) => ({
                      ...current,
                      type: asset.kind,
                      mediaUrl: asset.mediaUrl,
                      title: current.title || asset.title,
                    }))
                  }
                >
                  <div className="aspect-video overflow-hidden rounded-[1rem] bg-black/40">
                    {asset.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.mediaUrl} alt={asset.title} className="h-full w-full object-cover" />
                    ) : (
                      <video src={asset.mediaUrl} className="h-full w-full object-cover" muted />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-black text-white">{asset.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {asset.storageMode === "external" ? "Storage esterno" : "Storage locale fallback"}
                  </p>
                </button>
              ))}
            </div>
            {!mediaLibrary.length ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nessun file in libreria. Carica un media dagli item sopra e lo ritroverai qui.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {orderedItems.map((item) => (
              <PlaylistItemEditor
                key={`${item.id}-${item.updatedAt}`}
                item={item}
                busy={busy}
                onSave={(id, draft) => runAction("/api/live-tv/admin/update-item", { id, ...draft })}
                onToggle={(current) =>
                  runAction("/api/live-tv/admin/toggle-item", {
                    id: current.id,
                    enabled: !current.enabled,
                  })
                }
                onDelete={(id) => runAction("/api/live-tv/admin/delete-item", { id })}
                onMoveUp={(id) => moveItem(id, -1)}
                onMoveDown={(id) => moveItem(id, 1)}
                onSendNow={(current) =>
                  runAction("/api/live-tv/admin/send-now", {
                    type: current.type,
                    title: current.title,
                    subtitle: current.subtitle,
                    body: current.body,
                    mediaUrl: current.mediaUrl,
                    qrUrl: current.qrUrl,
                    qrLabel: current.qrLabel,
                    durationSeconds: current.durationSeconds,
                    enabled: true,
                    styleVariant: current.styleVariant,
                    addToPlaylist: false,
                  })
                }
                onDuplicate={(current) =>
                  runAction("/api/live-tv/admin/add-item", {
                    type: current.type,
                    title: current.title,
                    subtitle: current.subtitle,
                    body: current.body,
                    mediaUrl: current.mediaUrl,
                    qrUrl: current.qrUrl,
                    qrLabel: current.qrLabel,
                    durationSeconds: current.durationSeconds,
                    enabled: current.enabled,
                    styleVariant: current.styleVariant,
                  })
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
