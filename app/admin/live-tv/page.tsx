"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { LIVE_TV_PRESETS } from "@/lib/live-tv/default-playlists";
import {
  LIVE_TV_ITEM_TYPES,
  LIVE_TV_OVERLAY_VARIANTS,
  LIVE_TV_STYLE_VARIANTS,
  STAGE_MODE_VALUES,
  type LiveTvItem,
  type LiveTvOverlayVariant,
  type LiveTvState,
  type LiveTvStyleVariant,
  type LiveTvUpsertItemInput,
  type StageMode,
} from "@/lib/live-tv/types";

type LiveTvPageState = LiveTvState & {
  activeMatchDrinkSessionId?: string | null;
};

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
}: {
  value: LiveTvUpsertItemInput;
  onChange: (next: LiveTvUpsertItemInput) => void;
}) {
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

      <ItemFields value={draft} onChange={setDraft} />

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

  const loadState = async () => {
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
    setOverlayMessage(nextState.overlay?.message || "");
    setOverlayVariant((nextState.overlay?.variant as LiveTvOverlayVariant) || "captain");
    setError("");
  };

  const readLiveTvState = async () => {
    const response = await fetch("/api/live-tv/state", { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | LiveTvPageState
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(body && "error" in body ? body.error : "Plancia Live TV non disponibile.");
    }

    return body as LiveTvPageState;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const nextState = await readLiveTvState();
        if (cancelled) return;
        startTransition(() => {
          setState(nextState);
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
  }, []);

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

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loading]);

  const runAction = async (url: string, payload?: Record<string, unknown>) => {
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
      } else {
        await loadState();
      }

      setError("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Operazione non riuscita.");
      throw actionError;
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    const index = orderedItems.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
    const nextIds = [...orderedItems.map((item) => item.id)];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    await runAction("/api/live-tv/admin/reorder", { ids: nextIds });
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
              <ItemFields value={sendNowDraft} onChange={setSendNowDraft} />
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
            <ItemFields value={addDraft} onChange={setAddDraft} />
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
