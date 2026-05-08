"use client";

import { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPushPage() {
  const { identity } = useCustomerIdentity();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/ciurma");
  const [onlyVenuePresent, setOnlyVenuePresent] = useState(false);
  const [pin, setPin] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  if (!isAdmin(identity.email)) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-500">Accesso Negato</h1>
        <p className="mt-4 text-gray-400">Solo i capitani possono accedere a questa plancia.</p>
        <Link href="/" className="mt-6 inline-block button-secondary px-6 py-2">Torna alla Home</Link>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body || !pin) {
      setResult({ error: "Compila tutti i campi obbligatori e inserisci il PIN." });
      return;
    }

    triggerHaptic();
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-push-admin-token": pin, // Using pin as the admin token for simplicity in this dashboard
        },
        body: JSON.stringify({
          title,
          body,
          url,
          onlyVenuePresent,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true });
        setTitle("");
        setBody("");
      } else {
        setResult({ error: data.error || "Errore durante l'invio." });
      }
    } catch {
      setResult({ error: "Errore di connessione al server." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-8">
      <header className="space-y-2">
        <Link 
          href="/ciurma" 
          className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
        </Link>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Plancia Push Capitano</h1>
        <p className="text-sm text-[var(--text-muted)]">Invia messaggi istantanei a tutta la ciurma o solo ai presenti.</p>
      </header>

      <form onSubmit={handleSend} className="space-y-6">
        <div className="space-y-4 panel rounded-[2rem] p-6 border-white/5">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">Titolo Notifica</span>
            <input
              className="field"
              placeholder="Es: Il Kantaquiz inizia ora!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">Testo del Messaggio</span>
            <textarea
              className="field min-h-24 resize-none"
              placeholder="Scrivi qui il contenuto della push..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">URL di Destinazione</span>
            <input
              className="field"
              placeholder="/ciurma"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              className="w-5 h-5 accent-[var(--accent-strong)]"
              checked={onlyVenuePresent}
              onChange={(e) => setOnlyVenuePresent(e.target.checked)}
            />
            <span className="text-sm font-semibold text-white">Invia solo a chi è nel locale</span>
          </label>
        </div>

        <div className="space-y-4 panel rounded-[2rem] p-6 border-[var(--accent-strong)]/20 bg-[var(--accent-soft)]/5">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)] text-center block">Autorizzazione Capitano (PIN)</span>
            <input
              type="password"
              className="field text-center text-xl tracking-[0.5em]"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="button-primary w-full py-4 text-sm font-black uppercase tracking-[0.2em]"
          >
            {sending ? "Invio in corso..." : "Lancia la Push 🏴‍☠️"}
          </button>
        </div>
      </form>

      {result?.success && (
        <StatusBlock
          variant="info"
          title="Bottino consegnato!"
          description="La notifica è stata inviata correttamente a tutti i destinatari selezionati."
        />
      )}

      {result?.error && (
        <StatusBlock
          variant="error"
          title="Assalto fallito"
          description={result.error}
        />
      )}
    </div>
  );
}
