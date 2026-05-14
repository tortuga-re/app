"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { StatusBlock } from "@/components/status-block";
import { trackAppEvent } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/haptics";
import type {
  PushAudienceSegment,
  SavedPushCampaign,
  SavedPushSegment,
} from "@/lib/push/types";

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
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

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

    void loadLibrary();

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
        | { error?: string; sent?: number; total?: number }
        | null;

      if (!response.ok) {
        setResult({ error: payload?.error || "Errore durante l'invio." });
        return;
      }

      setResult({ success: true });
      trackAppEvent("admin_push_sent", {
        app_section: "admin",
        push_segment: segment,
        push_sent: payload?.sent ?? 0,
        push_total: payload?.total ?? 0,
      });
      setTitle("");
      setBody("");
      setEmail("");
    } catch {
      setResult({ error: "Errore di connessione al server." });
    } finally {
      setSending(false);
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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <Link
          href="/ciurma"
          className="mb-4 flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline"
        >
          <ChevronLeft className="h-3 w-3" /> Torna alla Ciurma
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          Push marketing
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Invia notifiche istantanee a tutta la ciurma o a segmenti mirati della serata.
        </p>
      </header>

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
          variant="info"
          title="Bottino consegnato"
          description="La notifica è stata inviata correttamente al segmento selezionato."
        />
      ) : null}

      {result?.error ? (
        <StatusBlock
          variant="error"
          title="Assalto fallito"
          description={result.error}
        />
      ) : null}
    </div>
  );
}
