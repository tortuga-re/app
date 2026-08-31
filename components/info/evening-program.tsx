"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";

import { BrandedIframe } from "@/components/branded-iframe";
import { DragCarousel } from "@/components/drag-carousel";
import { tortugaInfoConfig } from "@/lib/config";

export function EveningProgram({ withHeading = true }: { withHeading?: boolean }) {
  const [detail, setDetail] = useState<{ title: string; url: string } | null>(null);

  return <>
    {withHeading ? <div className="info-section-heading"><p className="minimal-eyebrow">Programmazione serale</p></div> : null}
    <DragCarousel className="evening-program-slides" label="Programmazione settimanale Tortuga">
      {tortugaInfoConfig.eveningProgram.map((event) => <article key={event.id} className="evening-program-card">
        <div className="evening-program-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl} alt={event.title} loading="lazy" draggable={false} />
        </div>
        <div className="evening-program-copy">
          <p>{event.day}</p><h3>{event.title}</h3><span>{event.description}</span>
          {event.detailUrl ? <button type="button" onClick={() => setDetail({ title: event.title, url: event.detailUrl })}>Scopri di più <ExternalLink /></button> : null}
        </div>
      </article>)}
    </DragCarousel>
    {detail ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label={`Approfondimento ${detail.title}`}>
      <header><div><BookOpen size={19} /><span>{detail.title}</span></div><div className="flex gap-2"><a href={detail.url} target="_blank" rel="noreferrer" aria-label="Apri approfondimento nel browser"><ExternalLink size={19} /></a><button onClick={() => setDetail(null)} aria-label="Chiudi approfondimento"><X size={22} /></button></div></header>
      <BrandedIframe src={detail.url} title={detail.title} />
    </div> : null}
  </>;
}
