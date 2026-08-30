"use client";

import { useEffect, useState } from "react";

type Winner = { id: string; team_name: string; evening: "friday" | "saturday" | "sunday"; created_at: string };
const labels = { friday: "Venerdi", saturday: "Sabato", sunday: "Domenica" };

export default function WinnersAdminPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [teamName, setTeamName] = useState("");
  const [evening, setEvening] = useState<Winner["evening"]>("friday");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }));
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/tortuga-winners/admin").then((response) => response.json()).then((body) => setWinners(body.winners ?? []));
  useEffect(() => { void load(); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/tortuga-winners/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamName, evening, date }) });
    const body = await response.json().catch(() => null);
    if (!response.ok) { setMessage(body?.error ?? "Impossibile salvare."); return; }
    setTeamName(""); setMessage("Vincitore salvato."); void load();
  };
  return <main className="min-h-screen bg-[#0a0a0a] p-6 text-white"><div className="max-w-2xl"><p className="eyebrow">Cose da fare stasera</p><h1 className="mt-2 text-3xl font-black">Vincitori del Tortuga</h1><p className="mt-2 text-sm text-white/60">La data è precompilata su oggi, ma puoi modificarla prima di salvare.</p><form onSubmit={save} className="mt-8 grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"><label className="grid gap-1 text-sm">Nome squadra<input value={teamName} onChange={(event) => setTeamName(event.target.value)} required maxLength={120} className="rounded-xl border border-white/15 bg-black/20 px-3 py-3" /></label><label className="grid gap-1 text-sm">Serata<select value={evening} onChange={(event) => setEvening(event.target.value as Winner["evening"])} className="rounded-xl border border-white/15 bg-black/20 px-3 py-3">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="rounded-xl border border-white/15 bg-black/20 px-3 py-3" /></label><button className="button-primary">Aggiungi vincitore</button>{message ? <p className="text-sm text-[var(--accent-strong)]">{message}</p> : null}</form><div className="mt-8 space-y-2">{winners.map((winner) => <div key={winner.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div><p className="font-black">{winner.team_name}</p><p className="text-xs text-white/55">{labels[winner.evening]} · {new Date(winner.created_at).toLocaleDateString("it-IT")}</p></div><button onClick={() => fetch(`/api/tortuga-winners/admin?id=${winner.id}`, { method: "DELETE" }).then(load)} className="text-sm font-bold text-red-300">Elimina</button></div>)}</div></div></main>;
}
