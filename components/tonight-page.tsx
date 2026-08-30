"use client";

import Link from "next/link";
import { Camera, ChevronLeft, Send, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCustomerIdentity } from "@/lib/customer-identity";

type Evening = "friday" | "saturday" | "sunday";
type Winner = { id: string; team_name: string; evening: Evening; created_at: string };
const eveningLabels: Record<Evening, string> = { friday: "Venerdi", saturday: "Sabato", sunday: "Domenica" };

export function TonightPage() {
  const { hasIdentity, updateIdentity } = useCustomerIdentity();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [evening, setEvening] = useState<Evening>("friday");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/tortuga-winners").then((response) => response.json()).then((body) => setWinners(body.winners ?? [])).catch(() => setWinners([])); }, []);

  const submitPhoto = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) { setMessage("Scegli una foto da inviare."); return; }
    setLoading(true); setMessage("");
    const body = new FormData();
    body.set("media", file);
    if (!hasIdentity) { body.set("uploaderName", name); body.set("uploaderEmail", email); }
    const response = await fetch("/api/live-tv/customer-upload", { method: "POST", body });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) { setMessage(result?.error ?? "Non siamo riusciti a inviare la foto."); return; }
    if (!hasIdentity) updateIdentity({ firstName: name, email, lastName: "", phone: "", marketingConsent: false });
    setFile(null); if (inputRef.current) inputRef.current.value = "";
    setMessage("Foto inviata in diretta per 5 secondi. Grazie, ciurma!");
  };

  const visibleWinners = winners.filter((winner) => winner.evening === evening);
  return <main className="minimal-page pb-28"><div className="minimal-shell space-y-7 pt-6"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent-strong)]"><ChevronLeft size={17} /> Torna alla plancia</Link><header><p className="minimal-eyebrow">Cose da fare stasera</p><h1 className="mt-2 text-4xl font-black italic tracking-tight text-[var(--text)]">Al Tortuga si gioca sul serio.</h1><p className="mt-3 leading-relaxed text-[var(--text-muted)]">Partecipa ai giochi live, manda una foto in diretta e scopri le squadre che hanno conquistato la serata.</p></header>
    <section className="loyalty-summary space-y-4"><p className="minimal-eyebrow">Giochi live</p><h2 className="text-2xl font-black italic text-[var(--text)]">La ciurma e pronta?</h2><div className="space-y-3 text-sm leading-relaxed text-[var(--text-muted)]"><p><strong className="text-[var(--text)]">1. Scegli la tua squadra.</strong> Segui il Capitano e preparati alle sfide sullo schermo.</p><p><strong className="text-[var(--text)]">2. Gioca dal telefono.</strong> Quando parte un gioco, entra con il QR mostrato in sala.</p><p><strong className="text-[var(--text)]">3. Punta al bottino.</strong> I vincitori della serata finiscono nella plancia qui sotto.</p></div></section>
    <section className="loyalty-summary space-y-4"><div className="flex items-center gap-2"><Camera size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Foto Live</p><h2 className="text-2xl font-black italic text-[var(--text)]">Vai in onda per 5 secondi</h2></div></div><p className="text-sm leading-relaxed text-[var(--text-muted)]">La foto viene trasmessa subito sullo schermo del locale. Inviandola autorizzi Tortuga a mostrarla durante la serata.</p><form onSubmit={submitPhoto} className="space-y-3">{!hasIdentity ? <><label className="grid gap-1 text-sm font-bold text-[var(--text)]">Nome<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="welcome-chest-input" /></label><label className="grid gap-1 text-sm font-bold text-[var(--text)]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="welcome-chest-input" /></label><p className="text-xs leading-relaxed text-[var(--text-muted)]">Ci servono solo per registrarti nella Ciurma e poterti ricontattare se necessario. Non attiviamo comunicazioni marketing.</p></> : <p className="text-sm text-[var(--text-muted)]">La tua identita di ciurma e gia pronta: scegli la foto e mandala in onda.</p>}<label className="grid gap-1 text-sm font-bold text-[var(--text)]">La tua foto<input ref={inputRef} required type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm text-[var(--text-muted)]" /></label><button type="submit" disabled={loading} className="minimal-primary w-full">{loading ? "Invio in corso..." : <><Send size={17} /> Invia Foto Live</>}</button>{message ? <p className={`text-sm ${message.startsWith("Foto") ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"}`}>{message}</p> : null}</form></section>
    <section className="loyalty-summary"><div className="flex items-center gap-2"><Trophy size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Vincitori del Tortuga</p><h2 className="text-2xl font-black italic text-[var(--text)]">Onore alla ciurma</h2></div></div><div className="mt-5 grid grid-cols-3 gap-2">{(Object.keys(eveningLabels) as Evening[]).map((key) => <button key={key} type="button" onClick={() => setEvening(key)} className={evening === key ? "minimal-primary py-2 text-xs" : "profile-edit-trigger py-2 text-xs"}>{eveningLabels[key]}</button>)}</div><div className="mt-4 space-y-2">{visibleWinners.length ? visibleWinners.map((winner) => <article key={winner.id} className="rank-route"><p className="minimal-eyebrow">{new Date(winner.created_at).toLocaleDateString("it-IT")}</p><h3 className="mt-1 text-lg font-black italic text-[var(--text)]">{winner.team_name}</h3><span className="text-sm text-[var(--text-muted)]">Squadra vincitrice della serata</span></article>) : <p className="py-4 text-center text-sm text-[var(--text-muted)]">La prossima squadra vincitrice sara qui.</p>}</div></section></div></main>;
}
