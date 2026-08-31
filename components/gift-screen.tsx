"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Gift, X } from "lucide-react";
import { DragCarousel } from "@/components/drag-carousel";
import { BrandedIframe } from "@/components/branded-iframe";

type GiftCard = { id: string; title: string; image: string; purchaseUrl: string | null };

const cards: Record<string, GiftCard> = {
  evening: { id: "evening", title: "Una serata al Tortuga", image: "/gift-cards/gift-una-serata-al-tortuga.webp", purchaseUrl: "https://gift.cooperto.it/in/f85dfad0-6a98-4f" },
  birthday: { id: "birthday", title: "Buon compleanno, pirata", image: "/gift-cards/gift-buon-compleanno-pirata.webp", purchaseUrl: "https://gift.cooperto.it/in/c73cd7f6-bdbb-4144-b057-2e45969b65d5" },
  crew: { id: "crew", title: "Per la tua ciurma", image: "/gift-cards/gift-per-la-tua-ciurma.webp", purchaseUrl: "https://gift.cooperto.it/in/8da4f7e8-ad73-47cf-a37e-db0a76118983" },
  special: { id: "special", title: "Un regalo speciale", image: "/gift-cards/gift-un-regalo-speciale.webp", purchaseUrl: "https://gift.cooperto.it/in/cb26a59f-fa66-465d-9264-adfa0f9bcc1b" },
  treat: { id: "treat", title: "Ti offro io", image: "/gift-cards/gift-ti-offro-io.webp", purchaseUrl: "https://gift.cooperto.it/in/f8533db9-22e0-4b6e-be58-b257ebc33a02" },
  thanks: { id: "thanks", title: "Grazie, Capitano", image: "/gift-cards/gift-grazie-capitano.webp", purchaseUrl: "https://gift.cooperto.it/in/b942ceef-a753-4f1f-9c6d-4bc279ca60a2" },
  mission: { id: "mission", title: "Missione compiuta", image: "/gift-cards/gift-missione-compiuta.webp", purchaseUrl: "https://gift.cooperto.it/in/91ddd944-7af2-4d95-bd7f-5607bf65fb3d" },
  toast: { id: "toast", title: "Brindiamo?", image: "/gift-cards/gift-brindiamo.webp", purchaseUrl: "https://gift.cooperto.it/in/7e670063-7629-4556-aec1-82ef457a390a" },
  couple: { id: "couple", title: "Una rotta per due", image: "/gift-cards/gift-una-rotta-per-due.webp", purchaseUrl: "https://gift.cooperto.it/in/728aa922-d49d-42c0-b1b7-42752eff62a8" },
  party: { id: "party", title: "Festa a bordo", image: "/gift-cards/gift-festa-a-bordo.webp", purchaseUrl: "https://gift.cooperto.it/in/6548a722-b909-4928-b638-0437a0200aaf" },
  round: { id: "round", title: "Offro un giro alla ciurma", image: "/gift-cards/gift-offro-un-giro-alla-ciurma.webp", purchaseUrl: "https://gift.cooperto.it/in/08373b55-10cc-41dd-bf88-1687fbe41413" },
  target: { id: "target", title: "Hai fatto centro", image: "/gift-cards/gift-hai-fatto-centro.webp", purchaseUrl: "https://gift.cooperto.it/in/07872e39-556c-430e-a33c-0c4229030961" },
};

const collections = [
  { title: "In evidenza", cards: [cards.evening, cards.special] },
  { title: "Compleanno", cards: [cards.birthday, cards.party] },
  { title: "Per la tua ciurma", cards: [cards.crew, cards.round] },
  { title: "Grazie", cards: [cards.thanks, cards.treat] },
  { title: "Celebrazioni", cards: [cards.mission, cards.target] },
  { title: "Per due", cards: [cards.couple, cards.toast] },
];

export function GiftScreen() {
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  return <section className="minimal-page minimal-overlap-sheet gift-catalog">
    <header className="overlap-sheet-intro gift-catalog-intro">
      <p className="minimal-eyebrow">Regala Tortuga</p>
      <h1>Una rotta per ogni occasione.</h1>
      <p>Scegli la copertina che racconta meglio il tuo regalo.</p>
    </header>
    <div id="gift-card" className="gift-collections hash-scroll-target">
      {collections.map((collection) => <section className="gift-collection" key={collection.title}>
        <header><h2>{collection.title}</h2></header>
        <DragCarousel className="gift-card-row" label={`Gift card ${collection.title}`}>
          {collection.cards.map((card) => <GiftCardCover card={card} key={card.id} onOpen={() => setSelectedCard(card)} />)}
        </DragCarousel>
      </section>)}
    </div>
    {selectedCard?.purchaseUrl && typeof document !== "undefined" ? createPortal(<div className="booking-overlay" role="dialog" aria-modal="true" aria-label={`Acquista ${selectedCard.title}`}>
      <header><div><Gift size={19} /><span>{selectedCard.title}</span></div><div className="flex gap-2"><a href={selectedCard.purchaseUrl} target="_blank" rel="noreferrer" aria-label="Apri l’acquisto nel browser"><ExternalLink size={19} /></a><button onClick={() => setSelectedCard(null)} aria-label="Chiudi acquisto"><X size={22} /></button></div></header>
      <BrandedIframe src={selectedCard.purchaseUrl} title={`Acquista ${selectedCard.title}`} allow="payment" />
    </div>, document.body) : null}
  </section>;
}

function GiftCardCover({ card, onOpen }: { card: GiftCard; onOpen: () => void }) {
  const artwork = <><Image src={card.image} alt={card.title} fill draggable={false} sizes="(max-width: 640px) 74vw, 340px" /><span className="sr-only">{card.title}</span></>;
  return card.purchaseUrl
    ? <button className="gift-card-cover" type="button" onClick={onOpen} aria-label={`Acquista: ${card.title}`}>{artwork}</button>
    : <article className="gift-card-cover" aria-label={`${card.title}. Acquisto disponibile a breve`}>{artwork}</article>;
}
