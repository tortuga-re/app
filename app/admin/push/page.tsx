"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  CircleAlert,
  History,
  Search,
  Smartphone,
} from "lucide-react";

import { StatusBlock } from "@/components/status-block";
import { trackAppEvent } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/haptics";
import type {
  PushDiagnosticsResponse,
  PushHistoryResponseRecord,
  PushAudienceSegment,
  SavedPushCampaign,
  SavedPushSegment,
} from "@/lib/push/types";

type PushResult = {
  success?: boolean;
  error?: string;
  sent?: number;
  failed?: number;
  removed?: number;
  total?: number;
  errors?: Array<{ statusCode: number; message: string }>;
};

export default function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/ciurma");
  const [segment, setSegment] = useState<PushAudienceSegment>("all");
  const [email, setEmail] = useState("");
  const [savedSegments, setSavedSegments] = useState<SavedPushSegment[]>([]);
  const [savedCampaigns, setSavedCampaigns] = useState<SavedPushCampaign[]>([]);
  const [segmentName, setSegmentName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [diagnosticEmail, setDiagnosticEmail] = useState("");
  const [diagnostics, setDiagnostics] = useState<PushDiagnosticsResponse | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [history, setHistory] = useState<PushHistoryResponseRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/push/admin/history", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { history?: PushHistoryResponseRecord[] }
        | null;
      if (response.ok) setHistory(payload?.history ?? []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshLibrary = async () => {
    try {
      const response = await fetch("/api/push/admin/library", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { segments?: SavedPushSegment[]; campaigns?: SavedPushCampaign[] }
        | null;
      if (!response.ok) {
        return;
      }
      setSavedSegments(payload?.segments ?? []);
      setSavedCampaigns(payload?.campaigns ?? []);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      try {
        const response = await fetch("/api/push/admin/library", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { segments?: SavedPushSegment[]; campaigns?: SavedPushCampaign[] }
          | null;
        if (!response.ok || cancelled) {
          return;
        }
        setSavedSegments(payload?.segments ?? []);
        setSavedCampaigns(payload?.campaigns ?? []);
      } catch {
        // no-op
      }
    };

    const loadInitialHistory = async () => {
      try {
        const response = await fetch("/api/push/admin/history", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { history?: PushHistoryResponseRecord[] }
          | null;
        if (response.ok && !cancelled) {
          setHistory(payload?.history ?? []);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void loadLibrary();
    void loadInitialHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !body.trim()) {
      setResult({ error: "Compila titolo e messaggio prima di inviare la push." });
      return;
    }

    if (segment === "specific_email" && !email.trim()) {
      setResult({ error: "Inserisci l'email del destinatario per l'invio mirato." });
      return;
    }

    triggerHaptic();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          url,
          segment,
          email: segment === "specific_email" ? email.trim().toLowerCase() : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | PushResult
        | null;

      if (!response.ok) {
        setResult({ error: payload?.error || "Errore durante l'invio." });
        return;
      }

      setResult({
        success: true,
        sent: payload?.sent ?? 0,
        failed: payload?.failed ?? 0,
        removed: payload?.removed ?? 0,
        total: payload?.total ?? 0,
        errors: payload?.errors ?? [],
      });
      trackAppEvent("admin_push_sent", {
        app_section: "admin",
        push_segment: segment,
        push_sent: payload?.sent ?? 0,
        push_total: payload?.total ?? 0,
      });
      setTitle("");
      setBody("");
      setEmail("");
      await refreshHistory();
    } catch {
      setResult({ error: "Errore di connessione al server." });
    } finally {
      setSending(false);
    }
  };

  const runDiagnostics = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = diagnosticEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    setDiagnosticLoading(true);
    setDiagnosticError("");
    setDiagnostics(null);
    try {
      const params = new URLSearchParams({ email: normalizedEmail });
      const response = await fetch(`/api/push/admin/diagnostics?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (PushDiagnosticsResponse & { error?: string })
        | null;
      if (!response.ok) {
        setDiagnosticError(payload?.error || "Diagnostica non disponibile.");
        return;
      }
      setDiagnostics(payload);
    } catch {
      setDiagnosticError("Errore di connessione durante la diagnostica.");
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const saveCurrentSegment = async () => {
    if (!segmentName.trim()) {
      setResult({ error: "Dai un nome al segmento prima di salvarlo." });
      return;
    }

    const response = await fetch("/api/push/admin/save-segment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: segmentName,
        segment,
        email: segment === "specific_email" ? email.trim().toLowerCase() : undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setResult({ error: payload?.error || "Segmento non salvato." });
      return;
    }

    setSegmentName("");
    await refreshLibrary();
  };

  const saveCurrentCampaign = async () => {
    if (!campaignName.trim()) {
      setResult({ error: "Dai un nome alla campagna prima di salvarla." });
      return;
    }

    if (!title.trim() || !body.trim()) {
      setResult({ error: "Compila titolo e messaggio prima di salvare la campagna." });
      return;
    }

    const response = await fetch("/api/push/admin/save-campaign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: campaignName,
        title,
        body,
        url,
        segment,
        email: segment === "specific_email" ? email.trim().toLowerCase() : undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setResult({ error: payload?.error || "Campagna non salvata." });
      return;
    }

    setCampaignName("");
    await refreshLibrary();
  };

  return (
    <div className="admin-push-page mx-auto max-w-2xl space-y-8 p-5 md:p-8">
      <header className="space-y-2">
        <Link
          href="/ciurma"
          className="mb-4 flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline"
        >
          <ChevronLeft className="h-3 w-3" /> Torna alla Ciurma
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-[var(--text)]">
          Push marketing
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Invia notifiche istantanee a tutta la ciurma o a segmenti mirati della serata.
        </p>
      </header>

      <section className="panel space-y-5 rounded-[2rem] p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow text-[var(--accent-strong)]">Diagnostica cliente</p>
            <h2 className="text-xl font-bold text-[var(--text)]">Controlla i dispositivi registrati</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Cerca un’email per verificare subscription, iPhone, VAPID e ultimi invii.
            </p>
          </div>
        </div>

        <form onSubmit={runDiagnostics} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field flex-1"
            type="email"
            placeholder="cliente@email.it"
            value={diagnosticEmail}
            onChange={(event) => setDiagnosticEmail(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={diagnosticLoading}
            className="button-secondary inline-flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            {diagnosticLoading ? "Controllo..." : "Controlla"}
          </button>
        </form>

        {diagnosticError ? (
          <StatusBlock variant="error" title="Diagnostica non riuscita" description={diagnosticError} />
        ) : null}

        {diagnostics ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>{diagnostics.devices.length} {diagnostics.devices.length === 1 ? "dispositivo" : "dispositivi"}</span>
              <span>VAPID attuale: {diagnostics.currentVapidKeyVersion || "non configurata"}</span>
            </div>
            {!diagnostics.devices.length ? (
              <StatusBlock
                variant="info"
                title="Nessuna subscription associata"
                description="Il cliente deve riaprire l’app installata. Se il permesso è già attivo, l’associazione verrà ripristinata automaticamente."
              />
            ) : (
              diagnostics.devices.map((device) => (
                <PushDeviceCard key={device.id} device={device} />
              ))
            )}
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSend} className="space-y-6">
        <div className="panel space-y-4 rounded-[2rem] p-6 border-white/5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              Segmenti salvati
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedSegments.map((savedSegment) => (
                <button
                  key={savedSegment.id}
                  type="button"
                  className="button-secondary text-[10px]"
                  onClick={() => {
                    setSegment(savedSegment.segment);
                    setEmail(savedSegment.email || "");
                  }}
                >
                  {savedSegment.name}
                </button>
              ))}
              {!savedSegments.length ? (
                <span className="text-xs text-[var(--text-muted)]">Nessun segmento salvato.</span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              Campagne riutilizzabili
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  className="button-secondary text-[10px]"
                  onClick={() => {
                    setTitle(campaign.title);
                    setBody(campaign.body);
                    setUrl(campaign.url);
                    setSegment(campaign.segment);
                    setEmail(campaign.email || "");
                  }}
                >
                  {campaign.name}
                </button>
              ))}
              {!savedCampaigns.length ? (
                <span className="text-xs text-[var(--text-muted)]">Nessuna campagna salvata.</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel space-y-4 rounded-[2rem] p-6 border-white/5">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              Titolo notifica
            </span>
            <input
              className="field"
              placeholder="Es: Il Kantaquiz inizia ora!"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              Testo del messaggio
            </span>
            <textarea
              className="field min-h-24 resize-none"
              placeholder="Scrivi qui il contenuto della push..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              URL di destinazione
            </span>
            <input
              className="field"
              placeholder="/ciurma"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
              Segmento
            </span>
            <select
              className="field"
              value={segment}
              onChange={(event) => setSegment(event.target.value as PushAudienceSegment)}
            >
              <option value="all">Tutta la ciurma</option>
              <option value="venue_present">Solo presenti nel locale</option>
              <option value="installed_app">Solo chi ha installato la web app</option>
              <option value="identified_customers">Solo clienti riconosciuti</option>
              <option value="recent_visitors_30d">Visitatori ultimo mese</option>
              <option value="birthday_soon_14d">Compleanni in arrivo</option>
              <option value="vip_inactive_60d">VIP da riattivare</option>
              <option value="specific_email">Cliente specifico</option>
            </select>
          </label>

          {segment === "specific_email" ? (
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
                Email destinatario
              </span>
              <input
                className="field"
                type="email"
                placeholder="ciurma@tortuga.it"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
                Salva segmento
              </span>
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Es: Compleanni prossimi"
                  value={segmentName}
                  onChange={(event) => setSegmentName(event.target.value)}
                />
                <button type="button" className="button-secondary text-xs" onClick={() => void saveCurrentSegment()}>
                  Salva
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
                Salva campagna
              </span>
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Es: Ultima chiamata quiz"
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                />
                <button type="button" className="button-secondary text-xs" onClick={() => void saveCurrentCampaign()}>
                  Salva
                </button>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="button-primary w-full py-4 text-sm font-black uppercase tracking-[0.2em]"
        >
          {sending ? "Invio in corso..." : "Lancia la push"}
        </button>
      </form>

      {result?.success ? (
        <StatusBlock
          variant={result.sent ? (result.failed ? "info" : "success") : "error"}
          title={result.sent ? (result.failed ? "Consegna parziale" : "Bottino consegnato") : "Push non consegnata"}
          description={formatPushResult(result)}
        />
      ) : null}

      {result?.error ? (
        <StatusBlock
          variant="error"
          title="Assalto fallito"
          description={result.error}
        />
      ) : null}

      <section className="panel space-y-4 rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[var(--accent-strong)]" />
            <div>
              <p className="eyebrow text-[var(--accent-strong)]">Storico invii</p>
              <h2 className="text-xl font-bold text-[var(--text)]">Ultime campagne push</h2>
            </div>
          </div>
          <button
            type="button"
            className="button-secondary text-xs"
            onClick={() => void refreshHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? "Aggiorno..." : "Aggiorna"}
          </button>
        </div>

        {!historyLoading && !history.length ? (
          <p className="text-sm text-[var(--text-muted)]">Nessun invio registrato.</p>
        ) : null}

        <div className="space-y-3">
          {history.map((entry) => (
            <details key={entry.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--text)]">{entry.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatItalianDateTime(entry.createdAt)} · {entry.segment}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${entry.failed ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {entry.sent}/{entry.total} accettate
                  </span>
                </div>
              </summary>
              <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-xs">
                <p className="text-[var(--text-muted)]">{entry.body}</p>
                <p className="text-[var(--text-muted)]">
                  Fallite: {entry.failed} · Rimosse: {entry.removed} · Aperture registrate: {entry.targets.filter((target) => target.openedAt).length}
                </p>
                {entry.targets.map((target) => (
                  <div key={target.id} className="rounded-xl bg-[var(--surface)] px-3 py-2 text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text)]">{target.email || "Subscription anonima"}</span>
                    {` · ${target.platform || "Dispositivo sconosciuto"} · ${target.browser || "Browser sconosciuto"}`}
                    {target.error ? ` · Errore ${target.statusCode || ""}: ${target.error}` : ""}
                    {target.openedAt ? ` · Aperta ${formatItalianDateTime(target.openedAt)}` : ""}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function PushDeviceCard({ device }: { device: PushDiagnosticsResponse["devices"][number] }) {
  const statusLabel = device.vapidStatus === "current"
    ? "VAPID aggiornata"
    : device.vapidStatus === "outdated"
      ? "VAPID da rinnovare"
      : "VAPID non ancora rilevata";

  return (
    <article className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[var(--text)]">{device.platform} · {device.browser}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">ID dispositivo {device.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${device.vapidStatus === "outdated" ? "bg-red-100 text-red-800" : device.vapidStatus === "current" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {statusLabel}
        </span>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <DiagnosticRow label="Ultima sincronizzazione" value={formatItalianDateTime(device.lastSeenAt || device.updatedAt)} />
        <DiagnosticRow label="Prima iscrizione" value={formatItalianDateTime(device.createdAt)} />
        <DiagnosticRow label="Ultimo invio accettato" value={formatItalianDateTime(device.lastSuccessfulSendAt)} />
        <DiagnosticRow label="Ultima apertura" value={formatItalianDateTime(device.lastOpenedAt)} />
      </dl>

      {device.lastError ? (
        <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{device.lastError.statusCode ? `HTTP ${device.lastError.statusCode}: ` : ""}{device.lastError.message}</span>
        </div>
      ) : null}

      {device.iosChecks ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-muted)]">
          <p className="mb-2 font-bold uppercase tracking-wider text-[var(--accent-strong)]">Controllo iPhone</p>
          <p>App aperta dalla Home: {device.iosChecks.openedFromHome ? "sì" : "no"}</p>
          <p>Permesso notifiche: {device.iosChecks.permissionGranted ? "attivo" : "non attivo"}</p>
          <p>Subscription completa: {device.iosChecks.subscriptionPresent ? "sì" : "no"}</p>
          <p>Focus e Risparmio energetico: da verificare manualmente sull’iPhone</p>
        </div>
      ) : null}
    </article>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--text)]">{value}</dd>
    </div>
  );
}

function formatItalianDateTime(value?: string) {
  if (!value) return "Mai";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponibile";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatPushResult(result: PushResult) {
  const total = result.total ?? 0;
  const sent = result.sent ?? 0;
  const failed = result.failed ?? 0;
  if (!total) return "Nessuna subscription push corrisponde al segmento selezionato.";
  if (!failed) return `Consegna accettata dal servizio push per ${sent} ${sent === 1 ? "dispositivo" : "dispositivi"}.`;
  const detail = result.errors?.map((item) => `${item.statusCode ? `HTTP ${item.statusCode}: ` : ""}${item.message}`).join(" · ");
  return `${sent} inviati, ${failed} non consegnati${result.removed ? `, ${result.removed} subscription rimosse` : ""}.${detail ? ` Errore: ${detail}` : ""}`;
}
