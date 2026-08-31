"use client";
import { useEffect, useState } from "react";
type Item = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
  starts_at: string;
  ends_at: string;
  background_image_url: string;
  overlay_color: string;
  priority: number;
  published: boolean;
};
const blank: Item = {
  eyebrow: "",
  title: "",
  description: "",
  cta_label: "Prenota",
  cta_url: "",
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
  const [msg, setMsg] = useState("");
  const load = () =>
    fetch("/api/highlights/admin")
      .then((r) => r.json())
      .then((b) => setItems(b.items || []));
  useEffect(() => {
    void load();
  }, []);
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
            ["background_image_url", "Immagine di sfondo"],
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
      <aside className="xl:sticky xl:top-6 xl:self-start"><p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-white/50">Anteprima mobile reale</p><div className="mx-auto max-w-[390px] rounded-[2rem] bg-[#f5efe5] p-4"><article className="feature-slide editorial-slide" style={form.background_image_url ? { backgroundImage: `linear-gradient(${form.overlay_color}, ${form.overlay_color}), url(${form.background_image_url})` } : undefined}><p>{form.eyebrow || "Intestazione"}</p><h3>{form.title || "Titolo contenuto"}</h3><span>{form.description || "La descrizione apparirà qui."}</span><a href={form.cta_url || "#"} onClick={(event) => event.preventDefault()}>{form.cta_label || "CTA"}</a></article></div><div className="mt-3 text-center"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getStatus(form).className}`}>{getStatus(form).label}</span></div></aside>
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
