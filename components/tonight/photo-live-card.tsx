"use client";

import { useRef, useState } from "react";
import { Camera, Send } from "lucide-react";

import { useCustomerIdentity } from "@/lib/customer-identity";

export function PhotoLiveCard() {
  const { hasIdentity, updateIdentity } = useCustomerIdentity();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setMessage("Foto inviata in diretta per 10 secondi. Grazie, ciurma!");
  };

  return <section className="loyalty-summary space-y-4"><div className="flex items-center gap-2"><Camera size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Foto Live</p><h2 className="tonight-section-title">Vai in onda per 10 secondi</h2></div></div><form onSubmit={submitPhoto} className="space-y-3">{!hasIdentity ? <><label className="block w-full text-[.73rem] font-bold text-[var(--text)]">Nome<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-4 py-3 text-[var(--text)] outline-none focus:border-[rgba(165,43,43,.52)] focus:ring-4 focus:ring-[rgba(165,43,43,.1)]" /></label><label className="block w-full text-[.73rem] font-bold text-[var(--text)]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-4 py-3 text-[var(--text)] outline-none focus:border-[rgba(165,43,43,.52)] focus:ring-4 focus:ring-[rgba(165,43,43,.1)]" /></label><p className="text-xs leading-relaxed text-[var(--text-muted)]">Ci servono solo per poterti ricontattare se la tua foto sarà votata come la più bella del mese.</p></> : <p className="text-sm text-[var(--text-muted)]">La tua identità di ciurma è già pronta: scegli la foto e mandala in onda.</p>}<label className="block w-full text-[.73rem] font-bold text-[var(--text)]">La tua foto<input ref={inputRef} required type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-3 py-3 text-[var(--text)]" /></label><button type="submit" disabled={loading} className="minimal-primary w-full">{loading ? "Invio in corso..." : <><Send size={17} /> Invia Foto Live</>}</button>{message ? <p className={`text-sm ${message.startsWith("Foto") ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"}`}>{message}</p> : null}</form></section>;
}
