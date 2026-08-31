import { MapPin } from "lucide-react";

import { tortugaInfoConfig } from "@/lib/config";

export function DirectionsCard({ compact = false }: { compact?: boolean }) {
  return <section className={compact ? "loyalty-summary space-y-4" : "panel info-clean-panel rounded-[2rem] p-5"}>
    <div className="flex items-center gap-2"><MapPin size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Indicazioni</p>{compact ? <h2 className="tonight-section-title">Raggiungi il Tortuga</h2> : null}</div></div>
    <p className="text-sm text-[var(--text-muted)]">{tortugaInfoConfig.address}</p>
    <div className="overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-black/20">
      <iframe title="Mappa Tortuga Bay" src={tortugaInfoConfig.mapsEmbedUrl} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
    <a href={tortugaInfoConfig.mapsUrl} target="_blank" rel="noreferrer" className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm">Ottieni indicazioni</a>
  </section>;
}
