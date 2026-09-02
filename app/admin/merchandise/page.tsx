"use client";

import Image from "next/image";
import { LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { tortugaRanks, type TortugaRankId } from "@/lib/loyalty-ranks";
import type { MerchandiseProduct } from "@/lib/merchandise";

type FormProduct = Omit<MerchandiseProduct, "id"> & { id?: string };
const blank: FormProduct = { title: "", description: "", price_label: "", button_label: "", order_url: "", images: [], required_rank: null, lock_text: "", position: 0, published: false };

export default function MerchandiseAdminPage() {
  const [form, setForm] = useState<FormProduct>(blank);
  const [products, setProducts] = useState<MerchandiseProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => { const response = await fetch("/api/merchandise/admin", { cache: "no-store" }); const body = await response.json(); if (response.ok) setProducts(body.products ?? []); };
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/merchandise/admin", { cache: "no-store" })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => { if (!cancelled && response.ok) setProducts(body.products ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true); setMessage("");
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const data = new FormData(); data.set("image", file);
        const response = await fetch("/api/merchandise/admin/upload", { method: "POST", body: data });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.mediaUrl) throw new Error(body?.error || "Caricamento non riuscito.");
        added.push(body.mediaUrl);
      }
      setForm((current) => ({ ...current, images: [...current.images, ...added] }));
      setMessage(`${added.length} foto ottimizzata${added.length === 1 ? "" : "e"} e aggiunta.`);
    } catch (error) { setMessage(error instanceof Error ? `Errore: ${error.message}` : "Errore durante il caricamento."); }
    finally { setUploading(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/merchandise/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json(); if (!response.ok) throw new Error(body?.error || "Salvataggio non riuscito.");
      setMessage("Prodotto salvato."); setForm(blank); await load();
    } catch (error) { setMessage(error instanceof Error ? `Errore: ${error.message}` : "Errore durante il salvataggio."); }
    finally { setSaving(false); }
  };
  const remove = async (product: MerchandiseProduct) => {
    if (!window.confirm(`Eliminare definitivamente “${product.title || "questo prodotto"}”?`)) return;
    const response = await fetch(`/api/merchandise/admin?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    if (response.ok) { if (form.id === product.id) setForm(blank); await load(); }
  };
  return <main className="min-h-screen bg-[#f4efe5] px-4 py-8 text-[var(--text)] sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="minimal-eyebrow">Regala il Tortuga</p><h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl">Merchandise</h1><p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">Prodotti su ordinazione, con accessi riservati ai ranghi della Ciurma.</p></div><button type="button" onClick={() => { setForm(blank); setMessage(""); }} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-bold text-white"><Plus size={17} />Nuovo prodotto</button></header>
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]"><form onSubmit={save} className="rounded-[1.7rem] border border-[var(--border)] bg-[#fffdf8] p-5 shadow-sm sm:p-7"><div className="mb-5"><h2 className="font-[family-name:var(--font-display)] text-2xl">{form.id ? "Modifica prodotto" : "Prepara un prodotto"}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Tutti i campi sono facoltativi: nell’app si vedranno solo quelli compilati.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Titolo"><input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es. Felpa Capitano" /></Field><Field label="Prezzo"><input value={form.price_label ?? ""} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="Es. 45 €" /></Field><Field label="Testo pulsante"><input value={form.button_label ?? ""} onChange={(e) => setForm({ ...form, button_label: e.target.value })} placeholder="Es. Ordina ora" /></Field><Field label="Link per ordinare"><input type="url" value={form.order_url ?? ""} onChange={(e) => setForm({ ...form, order_url: e.target.value })} placeholder="https://…" /></Field><Field label="Ordine nel carosello"><input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></Field><Field label="Accesso riservato"><select value={form.required_rank ?? ""} onChange={(e) => setForm({ ...form, required_rank: (e.target.value || null) as TortugaRankId | null })}><option value="">Per tutti</option>{tortugaRanks.map((rank) => <option key={rank.id} value={rank.id}>{rank.label} o superiore</option>)}</select></Field></div>
      <Field label="Descrizione" className="mt-4"><textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Racconta il prodotto, se serve." rows={4} /></Field>{form.required_rank ? <Field label="Testo del blocco" className="mt-4"><input value={form.lock_text ?? ""} onChange={(e) => setForm({ ...form, lock_text: e.target.value })} placeholder={`Es. Riservato al rango ${tortugaRanks.find((rank) => rank.id === form.required_rank)?.label}.`} /><small>Se vuoto, l’app usa automaticamente il testo del rango richiesto.</small></Field> : null}
      <section className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[#f6f0e5] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Foto del prodotto</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Scorrono in loop, una ogni 4 secondi. L’originale non viene salvato: resta solo il WebP ottimizzato.</p></div><label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent)] ${uploading ? "pointer-events-none opacity-60" : ""}`}><Upload size={16} />{uploading ? "Ottimizzazione…" : "Aggiungi foto"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => { void uploadImages(e.target.files); e.currentTarget.value = ""; }} /></label></div>{form.images.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{form.images.map((image, index) => <figure className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)] bg-white" key={image}><Image src={image} alt="" fill className="object-cover" sizes="180px" /><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, itemIndex) => itemIndex !== index) })} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label={`Rimuovi foto ${index + 1}`}><Trash2 size={14} /></button></figure>)}</div> : <p className="mt-4 text-sm text-[var(--text-muted)]">Nessuna foto: la card mostrerà un riquadro neutro.</p>}</section>
      <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#f6f0e5] px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Pubblicato: visibile nell’app</label><button disabled={saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={18} /> : null}{saving ? "Salvataggio…" : "Salva prodotto"}</button>{message ? <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p> : null}</form>
      <aside className="rounded-[1.7rem] border border-[var(--border)] bg-[#fffdf8] p-5 shadow-sm lg:sticky lg:top-5 lg:self-start"><p className="minimal-eyebrow">Catalogo</p><h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">{products.length} prodotti</h2><div className="mt-4 space-y-3">{products.length ? products.map((product) => <article key={product.id} className="rounded-2xl border border-[var(--border)] p-3"><div className="flex gap-3"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#eee5d6]">{product.images[0] ? <Image src={product.images[0]} alt="" fill sizes="56px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{product.title || "Senza titolo"}</strong><p className="mt-1 text-xs text-[var(--text-muted)]">{product.published ? "Live" : "Bozza"}{product.required_rank ? ` · ${tortugaRanks.find((rank) => rank.id === product.required_rank)?.label}+` : ""}</p></div></div><div className="mt-3 flex gap-3 text-sm font-bold"><button type="button" className="text-[var(--accent)]" onClick={() => { setForm(product); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Modifica</button><button type="button" className="text-red-600" onClick={() => void remove(product)}>Elimina</button></div></article>) : <p className="rounded-xl bg-[#f6f0e5] p-4 text-sm text-[var(--text-muted)]">Il catalogo è vuoto.</p>}</div></aside>
    </div></div></main>;
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`grid gap-1.5 text-sm font-semibold ${className}`}><span>{label}</span>{children}</label>; }
