"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";
import { MatchDrinkSession } from "@/lib/match-drink/types";
import { ChevronLeft } from "lucide-react";

export default function MatchDrinkAdminPage() {
  const [sessions, setSessions] = useState<MatchDrinkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(20);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/match-drink/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore nel caricamento sessioni");
      
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di accesso");
    } finally {
      setLoading(false);
    }
  }, []);

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchSessions().then(() => {
        // Attivazione automatica e push quando entriamo nella plancia
        void fetch("/api/match-drink/admin/activate", { method: "POST" });
      });
    }
  }, [fetchSessions]);

  const handleCreate = async () => {
    if (!newTitle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match-drink/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, questionCount }),
      });
      if (!res.ok) throw new Error("Errore nella creazione");
      setNewTitle("");
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MatchDrinkShell maxWidth="max-w-4xl">
      <Link 
        href="/ciurma" 
        className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline mb-6"
      >
        <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
      </Link>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dashboard Match & Drink</h1>
          <MatchDrinkButton variant="secondary" size="md" onClick={() => void fetchSessions()}>
            AGGIORNA
          </MatchDrinkButton>
        </div>

        {error ? (
          <MatchDrinkCard variant="muted">
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </MatchDrinkCard>
        ) : null}

        <MatchDrinkCard variant="accent">
          <h2 className="eyebrow mb-4">Crea Nuova Sessione</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titolo serata (es. Sabato 29 Aprile)"
              className="field flex-[2]"
            />
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs uppercase font-bold text-[var(--text-muted)] whitespace-nowrap">Domande:</label>
              <input
                type="number"
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value) || 20)}
                min={5}
                max={40}
                className="field w-20 text-center"
              />
            </div>
            <MatchDrinkButton onClick={handleCreate} loading={loading} disabled={!newTitle}>
              CREA
            </MatchDrinkButton>
          </div>
        </MatchDrinkCard>

        <div className="space-y-4">
          <h2 className="eyebrow">Sessioni Recenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(s => (
              <MatchDrinkCard key={s.id} variant="muted" className="hover:border-[var(--accent-strong)] transition-colors">
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold text-white">{s.title}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--accent-strong)]`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[var(--text-muted)] mt-1">CODE: {s.joinCode}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2 italic">Creata il {new Date(s.createdAt).toLocaleDateString("it-IT")}</p>
                  </div>
                  <Link href={`/admin/match-drink/session/${s.id}`} className="w-full">
                    <MatchDrinkButton variant="primary" className="w-full">
                      APRI GESTIONE
                    </MatchDrinkButton>
                  </Link>
                </div>
              </MatchDrinkCard>
            ))}
            {sessions.length === 0 && (
              <p className="text-[var(--text-muted)] italic py-8 text-center col-span-2">Nessuna sessione trovata.</p>
            )}
          </div>
        </div>
      </div>
    </MatchDrinkShell>
  );
}
