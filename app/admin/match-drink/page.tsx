"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";
import { MatchDrinkSession } from "@/lib/match-drink/types";

export default function MatchDrinkAdminPage() {
  const [pin, setPin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("match-drink.adminPin") || "";
    }
    return "";
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessions, setSessions] = useState<MatchDrinkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const fetchSessions = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      // Prima validiamo il PIN con l'endpoint centralizzato
      const valRes = await fetch("/api/admin/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });
      
      if (!valRes.ok) throw new Error("PIN non valido");

      // Se valido, carichiamo le sessioni
      const res = await fetch(`/api/match-drink/sessions?pin=${p}`);
      if (!res.ok) throw new Error("Errore nel caricamento sessioni");
      
      const data = await res.json();
      setSessions(data);
      setIsAuthorized(true);
      localStorage.setItem("match-drink.adminPin", p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di accesso");
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (pin && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchSessions(pin);
    }
  }, [pin, fetchSessions]);

  const handleCreate = async () => {
    if (!newTitle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match-drink/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, pin }),
      });
      if (!res.ok) throw new Error("Errore nella creazione");
      setNewTitle("");
      await fetchSessions(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center">
          <MatchDrinkCard className="w-full max-w-sm text-center">
            <h1 className="text-2xl font-bold text-white mb-6">Admin Match & Drink</h1>
            <div className="space-y-4">
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Inserisci PIN Admin"
                className="field text-center text-2xl tracking-[0.5em]"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <MatchDrinkButton 
                className="w-full" 
                onClick={() => fetchSessions(pin)}
                loading={loading}
              >
                ACCEDI
              </MatchDrinkButton>
            </div>
          </MatchDrinkCard>
        </div>
      </MatchDrinkShell>
    );
  }

  return (
    <MatchDrinkShell maxWidth="max-w-4xl">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dashboard Match & Drink</h1>
          <MatchDrinkButton variant="secondary" size="md" onClick={() => {
            localStorage.removeItem("match-drink.adminPin");
            setIsAuthorized(false);
            setPin("");
          }}>
            LOGOUT
          </MatchDrinkButton>
        </div>

        <MatchDrinkCard variant="accent">
          <h2 className="eyebrow mb-4">Crea Nuova Sessione</h2>
          <div className="flex gap-4">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titolo serata (es. Sabato 29 Aprile)"
              className="field flex-1"
            />
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
