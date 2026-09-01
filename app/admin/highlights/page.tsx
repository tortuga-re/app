"use client";
import { useEffect, useState } from "react";
type Item = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
  detail_title: string | null;
  detail_text: string | null;
  starts_at: string;
  ends_at: string;
  background_image_url: string;
  overlay_color: string;
  priority: number;
  published: boolean;
};
type BackgroundAsset = {
  id: string;
  title: string;
  mediaUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
const blank: Item = {
  eyebrow: "",
  title: "",
  description: "",
  cta_label: "",
  cta_url: "",
  detail_title: "",
  detail_text: "",
  starts_at: "",
  ends_at: "",
  background_image_url: "",
  overlay_color: "rgba(15,18,16,.62)",
  priority: 0,
  published: false,
};
const getStatus = (item: Item) => {
  if (!item.published) return { label: "Bozza", className: "bg-white/10 text-white/60" };
  const now = Date.now();
  if (item.starts_at && Date.parse(item.starts_at) > now) return { label: "Programmato", className: "bg-amber-500/15 text-amber-200" };
  if (item.ends_at && Date.parse(item.ends_at) < now) return { label: "Scaduto", className: "bg-red-500/15 text-red-200" };
  return { label: "Live", className: "bg-emerald-500/15 text-emerald-200" };
};
const italianDateTimeForInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};
export default function HighlightsAdmin() {
  const [form, setForm] = useState(blank);
  const [items, setItems] = useState<Item[]>([]);
  const [backgroundAssets, setBackgroundAssets] = useState<BackgroundAsset[]>([]);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [detailPreviewOpen, setDetailPreviewOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () =>
    fetch("/api/highlights/admin")
      .then((r) => r.json())
      .then((b) => setItems(b.items || []));
  const loadBackgroundLibrary = () =>
    fetch("/api/highlights/admin/background-library", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setBackgroundAssets(b.assets || []));
  useEffect(() => {
    void load();
    void loadBackgroundLibrary();
  }, []);
  const uploadBackground = async (file: File | null) => {
    if (!file) return;
    setUploadingBackground(true);
    setMsg("");
    try {
      const formData = new FormData();
      formData.set("image", file);
      const response = await fetch("/api/highlights/admin/upload-background", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.mediaUrl) {
        throw new Error(body?.error || "Caricamento immagine non riuscito.");
      }
      setForm((current) => ({ ...current, background_image_url: body.mediaUrl }));
      setBackgroundAssets((current) => [
        body.asset,
        ...current.filter((asset) => asset.id !== body.asset.id),
      ]);
      setMsg("Immagine ottimizzata e pronta come sfondo.");
    } catch (error) {
      setMsg(error instanceof Error ? `Errore: ${error.message}` : "Errore durante il caricamento.");
    } finally {
      setUploadingBackground(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/highlights/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const b = await r.json();
    setMsg(r.ok ? "Salvato" : "Errore: " + (b.error || "impossibile salvare"));
    if (r.ok) {
      setForm(blank);
      void load();
    }
  };
  const duplicate = (item: Item) => {
    setForm({ ...item, id: undefined, title: `${item.title} (copia)`, published: false });
    setMsg("Copia pronta come bozza: controllala e salvala.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (item: Item) => {
    if (!item.id || !window.confirm(`Eliminare definitivamente “${item.title}”?`)) return;
    await fetch(`/api/highlights/admin?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (form.id === item.id) setForm(blank);
    await load();
  };
  return (
    <main className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-2xl font-black">Contenuti in evidenza</h1><p className="mt-1 text-xs text-white/50">Bozze, programmazione e anteprima reale della card mobile.</p></div><button type="button" onClick={() => setForm(blank)} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold">Nuovo</button></div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,42rem)_24rem]">
      <form onSubmit={save} className="grid gap-3">
        {(
          [
            ["eyebrow", "Eyebrow"],
            ["title", "Titolo"],
            ["description", "Descrizione"],
            ["cta_label", "Testo CTA"],
            ["cta_url", "Link CTA (URL o percorso libero)"],
            ["starts_at", "Dal"],
            ["ends_at", "Al"],
            ["background_image_url", "Immagine di sfondo (URL facoltativo)"],
            ["priority", "Priorità"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span>{label}</span>
            <input
              type={
                key === "priority"
                  ? "number"
                  : key.includes("_at")
                    ? "datetime-local"
                    : "text"
              }
              placeholder={
                key === "cta_url" ? "https://esempio.it oppure /pagina" : ""
              }
              value={
                key.includes("_at")
                  ? italianDateTimeForInput(String(form[key] ?? ""))
                  : String(form[key] ?? "")
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]:
                    key === "priority"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2"
            />
          </label>
        ))}
        <section className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm">Immagine di sfondo <em className="not-italic text-[var(--text-muted)]">(facoltativa)</em></span>{backgroundAssets.length ? <span className="text-xs text-white/50">{backgroundAssets.length} in galleria</span> : null}</div>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-bold ${uploadingBackground ? "cursor-wait opacity-60" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
              {uploadingBackground ? "Ottimizzazione…" : "Scegli file"}
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingBackground} onChange={(event) => { void uploadBackground(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
            </label>
            <button type="button" onClick={() => setGalleryOpen(true)} className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10">Scegli da galleria</button>
          </div>
          <small className="text-[var(--text-muted)]">JPG, PNG, WebP o GIF · massimo 20 MB · conversione automatica in WebP ottimizzato (1920×1080 max).</small>
        </section>
        <label className="grid gap-1 text-sm">
          <span>Titolo popup <em className="not-italic text-[var(--text-muted)]">(facoltativo)</em></span>
          <input value={form.detail_title ?? ""} onChange={(event) => setForm({ ...form, detail_title: event.target.value })} placeholder="Se vuoto usa il titolo della card." />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Approfondimento popup <em className="not-italic text-[var(--text-muted)]">(facoltativo)</em></span>
          <textarea value={form.detail_text ?? ""} onChange={(event) => setForm({ ...form, detail_text: event.target.value })} placeholder="Testo mostrato dopo “Scopri di più”." className="min-h-32 resize-y" />
        </label>
        <OverlayColorControl
          value={form.overlay_color}
          onChange={(overlay_color) => setForm({ ...form, overlay_color })}
        />
        <label>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />{" "}
          Pubblicato (visibile quando rientra nelle date)
        </label>
        <button className="rounded-lg bg-[var(--accent-strong)] px-4 py-3 font-bold">
          Salva contenuto
        </button>
        {msg && <p>{msg}</p>}
      </form>
      <aside className="xl:sticky xl:top-6 xl:self-start"><p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-white/50">Anteprima mobile reale</p><div className="mx-auto max-w-[390px] rounded-[2rem] bg-[#f5efe5] p-4"><article className="feature-slide editorial-slide" style={form.background_image_url ? { backgroundImage: `linear-gradient(${form.overlay_color}, ${form.overlay_color}), url(${form.background_image_url})` } : undefined}><p>{form.eyebrow || "Intestazione"}</p><h3>{form.title || "Titolo contenuto"}</h3><span>{form.description || "La descrizione apparirà qui."}</span>{form.cta_label && form.cta_url ? <a href={form.cta_url} onClick={(event) => event.preventDefault()}>{form.cta_label}</a> : null}{form.detail_text ? <button type="button" onClick={() => setDetailPreviewOpen((current) => !current)}>Scopri di più</button> : null}</article>{detailPreviewOpen && form.detail_text ? <div className="mt-4 rounded-[1.65rem] bg-black/25 p-3"><section className="editorial-details-preview" style={form.background_image_url ? { backgroundImage: `linear-gradient(${form.overlay_color}, ${form.overlay_color}), url(${form.background_image_url})` } : undefined}><button type="button" className="editorial-details-close" onClick={() => setDetailPreviewOpen(false)} aria-label="Chiudi anteprima"><span aria-hidden="true">×</span></button><h2>{form.detail_title?.trim() || form.title || "Titolo popup"}</h2><p className="whitespace-pre-wrap">{form.detail_text}</p>{form.cta_label && form.cta_url ? <button type="button" className="editorial-details-action">{form.cta_label}</button> : null}</section></div> : null}</div><div className="mt-3 text-center"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getStatus(form).className}`}>{getStatus(form).label}</span></div></aside>
      </div>
      <div className="mt-8 max-w-4xl space-y-2">
        {items.map((x) => (
          <div
            key={x.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 p-3"
          >
            <span className="min-w-0 flex-1 font-bold">{x.title}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${getStatus(x).className}`}>{getStatus(x).label}</span>
            <button
              onClick={() => setForm(x)}
              className="text-[var(--accent-strong)]"
            >
              Modifica
            </button>
            <button onClick={() => duplicate(x)} className="text-white/70">Duplica</button>
            <button
              onClick={() => void remove(x)}
              className="text-red-300"
            >
              Elimina
            </button>
          </div>
        ))}
      </div>
      {galleryOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Galleria sfondi"><section className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#171512] p-5 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="eyebrow">Contenuti in evidenza</p><h2 className="mt-1 text-xl font-black">Galleria sfondi</h2><p className="mt-1 text-sm text-white/60">Solo le immagini caricate da questa pagina.</p></div><button type="button" onClick={() => setGalleryOpen(false)} className="rounded-full border border-white/20 px-3 py-1.5 text-sm">Chiudi</button></div>{backgroundAssets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><button type="button" onClick={() => { setForm((current) => ({ ...current, background_image_url: "" })); setGalleryOpen(false); }} className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/30 text-sm text-white/60">Nessuno sfondo</button>{backgroundAssets.map((asset) => <button key={asset.id} type="button" onClick={() => { setForm((current) => ({ ...current, background_image_url: asset.mediaUrl })); setGalleryOpen(false); }} className={`overflow-hidden rounded-xl border text-left ${form.background_image_url === asset.mediaUrl ? "border-[var(--accent-strong)]" : "border-white/15"}`}><span aria-hidden="true" className="block aspect-video w-full bg-cover bg-center" style={{ backgroundImage: `url(${asset.mediaUrl})` }} /><span className="block truncate px-2 py-2 text-xs">{asset.title}</span></button>)}</div> : <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-white/60">Non hai ancora caricato immagini per i contenuti in evidenza.</div>}</section></div> : null}
    </main>
  );
}

function OverlayColorControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const match = value.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i,
  );
  const red = Number(match?.[1] ?? 15);
  const green = Number(match?.[2] ?? 18);
  const blue = Number(match?.[3] ?? 16);
  const alpha = Math.round(Number(match?.[4] ?? 0.62) * 100);
  const hex = `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  const update = (nextHex: string, nextAlpha: number) => {
    const clean = nextHex.replace("#", "");
    const parts = [0, 2, 4].map((offset) =>
      Number.parseInt(clean.slice(offset, offset + 2), 16),
    );
    onChange(
      `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${(nextAlpha / 100).toFixed(2)})`,
    );
  };
  return (
    <label className="grid gap-2 text-sm">
      <span>Colore overlay</span>
      <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
        <input
          aria-label="Colore overlay"
          type="color"
          value={hex}
          onChange={(event) => update(event.target.value, alpha)}
          className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          aria-label="Trasparenza overlay"
          type="range"
          min="0"
          max="100"
          value={alpha}
          onChange={(event) => update(hex, Number(event.target.value))}
          className="flex-1 accent-[var(--accent-strong)]"
        />
        <strong className="w-10 text-right text-xs">{alpha}%</strong>
      </div>
      <code className="text-xs text-white/60">{value}</code>
    </label>
  );
}
