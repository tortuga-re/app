"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { getSupabase } from "@/lib/match-drink/supabase";
import { LIVE_TV_PRESETS } from "@/lib/live-tv/default-playlists";
import {
  LIVE_TV_ITEM_TYPES,
  type LiveTvCustomerSubmission,
  LIVE_TV_STYLE_VARIANTS,
  STAGE_MODE_VALUES,
  type LiveTvItem,
  type LiveTvMediaAsset,
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

type CustomerSubmissionsResponse = {
  submissions?: LiveTvCustomerSubmission[];
  error?: string;
} | null;

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
    body: item.body,
    mediaUrl: item.mediaUrl,
    qrUrl: item.qrUrl,
    qrLabel: item.qrLabel,
    durationSeconds: item.durationSeconds,
    enabled: item.enabled,
    order: item.order,
    styleVariant: item.styleVariant || "default",
  });
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel rounded-[1.8rem] p-0 overflow-hidden">
      {/* Header always visible, clickable to expand/collapse */}
      <div className="flex w-full items-center justify-between gap-3 p-5 text-left">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
              item.enabled
                ? "bg-green-500/20 text-green-300"
                : "bg-white/10 text-[var(--text-muted)]"
            }`}
          >
            {item.enabled ? "Attivo" : "Disattivo"}
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-left">
              #{item.order + 1} &bull; {itemTypeLabels[item.type]}
            </p>
            <h3 className="truncate text-base font-black text-white text-left">
              {item.title || "Elemento senza titolo"}
            </h3>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="button-secondary text-xs px-3 py-1"
            onClick={() => void onToggle(item)}
            disabled={busy}
          >
            {item.enabled ? "Disattiva" : "Attiva"}
          </button>
          <button
            type="button"
            className="button-secondary text-xs px-3 py-1"
            onClick={() => void onMoveUp(item.id)}
            disabled={busy}
          >
            &#8593;
          </button>
          <button
            type="button"
            className="button-secondary text-xs px-3 py-1"
            onClick={() => void onMoveDown(item.id)}
            disabled={busy}
          >
            &#8595;
          </button>
          <button
            type="button"
            className="text-[var(--text-muted)] text-sm"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? "Comprimi scheda" : "Espandi scheda"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 border-t border-white/10 p-5 pt-4">
          <ItemFields value={draft} onChange={setDraft} busy={busy} />
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
            <button className="button-primary text-xs" onClick={() => void onSave(item.id, draft)} disabled={busy}>
              Salva
            </button>
            <button className="button-secondary text-xs" onClick={() => void onSendNow(item)} disabled={busy}>
              In onda ora
            </button>
            <button className="button-secondary text-xs" onClick={() => void onDuplicate(item)} disabled={busy}>
              Duplica
            </button>
            <button className="button-secondary w-full border-[var(--danger-soft)] text-[var(--danger)] text-xs" onClick={() => void onDelete(item.id)} disabled={busy}>
              Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLiveTvPage() {
  const [state, setState] = useState<LiveTvPageState | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<LiveTvMediaAsset[]>([]);
  const [customerSubmissions, setCustomerSubmissions] = useState<LiveTvCustomerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sendNowDraft, setSendNowDraft] = useState<LiveTvUpsertItemInput>({
    ...createEmptyDraft(),
    type: "message",
    title: "Messaggio live",
    durationSeconds: 10,
  });
  const [sendNowAlsoAdd, setSendNowAlsoAdd] = useState(false);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<LiveTvScheduleEntry[]>([]);
  const [presetActionId, setPresetActionId] = useState<LiveTvPresetId | null>(null);
  const [sendNowExpanded, setSendNowExpanded] = useState(true);
  const [submissionsExpanded, setSubmissionsExpanded] = useState(false);
  const [mediaLibraryExpanded, setMediaLibraryExpanded] = useState(false);

  const orderedItems = useMemo(
    () => [...(state?.playlist || [])].sort((a, b) => a.order - b.order),
    [state?.playlist],
  );

  const enabledItems = useMemo(
    () => orderedItems.filter((item) => item.enabled),
    [orderedItems],
  );

  const pendingCustomerSubmissions = useMemo(
    () => customerSubmissions.filter((submission) => submission.status === "pending"),
    [customerSubmissions],
  );

  const reviewedCustomerSubmissions = useMemo(
    () =>
      customerSubmissions
        .filter((submission) => submission.status !== "pending")
        .slice(0, 6),
    [customerSubmissions],
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
    const [mediaResponse, dashboardResponse, submissionsResponse] = await Promise.all([
      fetch("/api/live-tv/admin/media-library", { cache: "no-store" }),
      fetch("/api/admin/dashboard", { cache: "no-store" }),
      fetch("/api/live-tv/admin/customer-submissions", { cache: "no-store" }),
    ]);

    const mediaBody = (await mediaResponse.json().catch(() => null)) as
      | { assets?: LiveTvMediaAsset[]; error?: string }
      | null;
    const dashboardBody = (await dashboardResponse.json().catch(() => null)) as
      | AdminDashboardResponse
      | { error?: string }
      | null;
    const submissionsBody = (await submissionsResponse.json().catch(() => null)) as CustomerSubmissionsResponse;

    if (mediaResponse.ok) {
      setMediaLibrary(mediaBody?.assets ?? []);
    }

    if (dashboardResponse.ok) {
      setDashboard(dashboardBody as AdminDashboardResponse);
    }

    if (submissionsResponse.ok) {
      setCustomerSubmissions(submissionsBody?.submissions ?? []);
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
    let pollInterval: NodeJS.Timeout | null = null;
    const supabase = getSupabase();
    let channel: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const startFallbackPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        void readLiveTvState()
          .then((nextState) => {
            if (cancelled) return;
            startTransition(() => {
              setState(nextState);
            });
          })
          .catch(() => {});
      }, 5000);
    };

    try {
      channel = supabase
        .channel("live-tv")
        .on("broadcast", { event: "state_update" }, (payload) => {
          if (cancelled || !payload || !payload.payload) return;
          const nextState = payload.payload as LiveTvPageState;
          startTransition(() => {
            setState(nextState);
            setAutoScheduleEnabled(Boolean(nextState.autoScheduleEnabled));
            setScheduleDraft(nextState.schedule ?? []);
          });
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED" && status !== "TIMED_OUT") {
            startFallbackPolling();
          }
        });
    } catch {
      startFallbackPolling();
    }

    const supportInterval = setInterval(() => {
      void loadSupportData().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
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

  const deleteMediaAsset = useCallback(
    async (asset: LiveTvMediaAsset) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm(`Eliminare definitivamente "${asset.title}" dalla libreria media?`)
      ) {
        return;
      }

      setBusy(true);
      try {
        const response = await fetch("/api/live-tv/admin/delete-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: asset.id }),
        });

        const body = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null;

        if (!response.ok || !body?.success) {
          throw new Error(body?.error || "Cancellazione file non riuscita.");
        }

        setMediaLibrary((current) =>
          current.filter((existingAsset) => existingAsset.id !== asset.id),
        );
        await loadSupportData();
        setError("");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Cancellazione file non riuscita.",
        );
      } finally {
        setBusy(false);
      }
    },
    [loadSupportData],
  );

  const moderateCustomerSubmission = useCallback(
    async (
      submission: LiveTvCustomerSubmission,
      action: "library" | "playlist" | "reject",
    ) => {
      const actionLabel =
        action === "library"
          ? "approvare il contributo e aggiungerlo alla libreria"
          : action === "playlist"
            ? "approvare il contributo e aggiungerlo alla scaletta"
            : "rifiutare il contributo";

      if (
        typeof window !== "undefined" &&
        !window.confirm(
          `Confermi di voler ${actionLabel} "${submission.title}"?`,
        )
      ) {
        return;
      }

      setBusy(true);
      try {
        const response = await fetch("/api/live-tv/admin/moderate-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: submission.id, action }),
        });

        const body = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string; state?: LiveTvPageState }
          | null;

        if (!response.ok || !body?.success) {
          throw new Error(body?.error || "Moderazione contributo non riuscita.");
        }

        if (body.state) {
          setState(body.state);
          setAutoScheduleEnabled(Boolean(body.state.autoScheduleEnabled));
          setScheduleDraft(body.state.schedule ?? []);
        }

        await loadSupportData();
        setError("");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Moderazione contributo non riuscita.",
        );
      } finally {
        setBusy(false);
      }
    },
    [loadSupportData],
  );

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

          <div className="panel rounded-[1.8rem] overflow-hidden">
            <div className="flex w-full items-center justify-between gap-3 p-5 text-left">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => setSendNowExpanded((prev) => !prev)}
              >
                <div>
                  <p className="eyebrow">Manda in onda ora</p>
                  <h3 className="text-lg font-black text-white">Override immediato</h3>
                </div>
              </button>
              <button
                type="button"
                className="text-sm font-black text-[var(--accent-strong)]"
                onClick={() => setSendNowExpanded((prev) => !prev)}
                aria-label={sendNowExpanded ? "Comprimi scheda" : "Espandi scheda"}
              >
                {sendNowExpanded ? "^" : "v"}
              </button>
            </div>
            {sendNowExpanded ? (
              <div className="space-y-4 border-t border-white/10 p-5 pt-4">
                <ItemFields value={sendNowDraft} onChange={setSendNowDraft} busy={busy} />
                <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={sendNowAlsoAdd}
                    onChange={(event) => setSendNowAlsoAdd(event.target.checked)}
                  />
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
                  <button
                    className="button-secondary text-xs"
                    onClick={() => void runAction("/api/live-tv/admin/clear-now")}
                    disabled={busy}
                  >
                    Riprendi rotazione
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="panel rounded-[1.8rem] overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-5 text-left"
              onClick={() => setSubmissionsExpanded((prev) => !prev)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="eyebrow">Foto Live</p>
                  <h3 className="text-lg font-black text-white">Foto inviate dalla ciurma</h3>
                </div>
                <span className="rounded-full border border-[var(--accent-strong)]/30 bg-[var(--accent-soft)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {pendingCustomerSubmissions.length} da valutare
                </span>
              </div>
              <span className="text-sm font-black text-[var(--accent-strong)]">
                {submissionsExpanded ? "^" : "v"}
              </span>
            </button>

            {submissionsExpanded ? (
              <div className="space-y-4 border-t border-white/10 p-5 pt-4">
                {pendingCustomerSubmissions.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pendingCustomerSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                      >
                        <div className="aspect-video overflow-hidden rounded-[1rem] bg-black/40">
                          {submission.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={submission.mediaUrl}
                              alt={submission.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <video
                              src={submission.mediaUrl}
                              className="h-full w-full object-cover"
                              muted
                            />
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                            Foto Live mandata in diretta
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {new Date(submission.createdAt).toLocaleString("it-IT")}
                          </p>
                        </div>
                        <div className="mt-4 grid gap-2">
                          <button
                            type="button"
                            className="button-primary text-[11px]"
                            onClick={() => void moderateCustomerSubmission(submission, "library")}
                            disabled={busy}
                          >
                            Salva in libreria
                          </button>
                          <button
                            type="button"
                            className="button-secondary text-[11px]"
                            onClick={() => void moderateCustomerSubmission(submission, "playlist")}
                            disabled={busy}
                          >
                            Aggiungi alla scaletta
                          </button>
                          <button
                            type="button"
                            className="button-secondary border-[var(--danger-soft)] text-[11px] text-[var(--danger)]"
                            onClick={() => void moderateCustomerSubmission(submission, "reject")}
                            disabled={busy}
                          >
                            Rifiuta
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nessuna Foto Live da valutare. Le foto vengono gia trasmesse per 10 secondi;
                    qui decidi solo quali conservare o aggiungere alla scaletta.
                  </p>
                )}

                {reviewedCustomerSubmissions.length ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                      Ultimi moderati
                    </p>
                    <div className="mt-3 space-y-2">
                      {reviewedCustomerSubmissions.map((submission) => (
                        <div
                          key={`${submission.id}-${submission.status}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{submission.title}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {submission.resolvedAt
                                ? new Date(submission.resolvedAt).toLocaleString("it-IT")
                                : new Date(submission.createdAt).toLocaleString("it-IT")}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                              submission.status === "approved"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-[var(--danger-soft)] text-[var(--danger)]"
                            }`}
                          >
                            {submission.status === "approved"
                              ? submission.resolution === "playlist"
                                ? "In scaletta"
                                : "In libreria"
                              : "Rifiutato"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="panel rounded-[1.8rem] overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-5 text-left"
              onClick={() => setMediaLibraryExpanded((prev) => !prev)}
            >
              <div>
                <p className="eyebrow">Libreria media</p>
                <h3 className="text-lg font-black text-white">File gia caricati</h3>
              </div>
              <span className="text-sm font-black text-[var(--accent-strong)]">
                {mediaLibraryExpanded ? "^" : "v"}
              </span>
            </button>
            {mediaLibraryExpanded ? (
              <div className="space-y-4 border-t border-white/10 p-5 pt-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {mediaLibrary.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 transition hover:border-[var(--accent-strong)]/40"
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() =>
                          setSendNowDraft((current) => ({
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
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          className="button-secondary text-[11px]"
                          onClick={() =>
                            setSendNowDraft((current) => ({
                              ...current,
                              type: asset.kind,
                              mediaUrl: asset.mediaUrl,
                              title: current.title || asset.title,
                            }))
                          }
                          disabled={busy}
                        >
                          Usa in Manda in onda
                        </button>
                        <button
                          type="button"
                          className="button-secondary border-[var(--danger-soft)] text-[11px] text-[var(--danger)]"
                          onClick={() => void deleteMediaAsset(asset)}
                          disabled={busy}
                        >
                          Elimina file
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {!mediaLibrary.length ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nessun file in libreria. Carica un media dagli item sopra e lo ritroverai qui.
                  </p>
                ) : null}
              </div>
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

