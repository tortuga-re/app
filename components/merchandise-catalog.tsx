"use client";

import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { DragCarousel } from "@/components/drag-carousel";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { getActiveRank, getRankIndex, tortugaRanks, type TortugaRankId } from "@/lib/loyalty-ranks";
import type { MerchandiseProduct } from "@/lib/merchandise";

const rankLabel = (rank: TortugaRankId) => tortugaRanks.find((item) => item.id === rank)?.label ?? rank;

// Solo per vedere il layout durante lo sviluppo locale: non viene salvato,
// inviato a Supabase o incluso nella build di produzione.
const localDemoProduct: MerchandiseProduct = {
  id: "local-demo-pirata-della-strada",
  title: "Pirata della Strada",
  description: "T-shirt bianca della Ciurma, per portare il Tortuga anche fuori rotta.",
  price_label: "29 €",
  button_label: "Ordina ora",
  order_url: "#demo-ordine",
  images: ["/images/merchandise-demo-pirata-della-strada.jpg"],
  required_rank: null,
  lock_text: null,
  position: 0,
  published: true,
};

export function MerchandiseCatalog() {
  const [products, setProducts] = useState<MerchandiseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchandise", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => setProducts(body.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts = products.length
    ? products
    : process.env.NODE_ENV === "development"
      ? [localDemoProduct]
      : [];
  if (loading || visibleProducts.length === 0) return null;
  return <section className="gift-collection merchandise-collection" aria-labelledby="merchandise-title">
    <header><p className="minimal-eyebrow">Merchandise</p><h2 id="merchandise-title">Porta il Tortuga con te.</h2></header>
    <DragCarousel className="gift-card-row merchandise-row" label="Prodotti merchandise Tortuga">
      {visibleProducts.map((product) => <MerchandiseCard key={product.id} product={product} />)}
    </DragCarousel>
  </section>;
}

function MerchandiseCard({ product }: { product: MerchandiseProduct }) {
  const customer = useCurrentCustomerStatus();
  const requiredRank = product.required_rank;
  const currentRank = getActiveRank(customer.visits, customer.points).id;
  const locked = Boolean(requiredRank && (!customer.hasProfile || getRankIndex(currentRank) < getRankIndex(requiredRank)));
  const lockMessage = product.lock_text?.trim() || (requiredRank ? `Riservato al rango ${rankLabel(requiredRank)}.` : "Prodotto riservato.");
  const canOrder = !locked && Boolean(product.button_label && product.order_url);
  const price = product.price_label?.replace(/€/g, "").trim();

  return <article className="merchandise-card">
    <MerchandiseImages images={product.images} title={product.title || "Prodotto Tortuga"} />
    {locked ? <div className="merchandise-lock"><LockKeyhole size={15} aria-hidden="true" /><span>{lockMessage}</span></div> : null}
    <div className="merchandise-card-copy">
      {product.title || (!locked && price) ? <div className="merchandise-title-row">{product.title ? <h3>{product.title}</h3> : <span />}{!locked && price ? <strong className="merchandise-price">{price}</strong> : null}</div> : null}
      {product.description ? <p>{product.description}</p> : null}
      {canOrder ? <a className="merchandise-order-button" href={product.order_url!} target="_blank" rel="noreferrer">{product.button_label}</a> : product.button_label && locked ? <button type="button" disabled className="merchandise-order-unavailable">{product.button_label}</button> : product.button_label ? <span className="merchandise-order-unavailable">{product.button_label}</span> : null}
    </div>
  </article>;
}

function MerchandiseImages({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % images.length), 4_000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  if (!images.length) return <div className="merchandise-image-placeholder" aria-label={`Immagine non disponibile: ${title}`} />;
  return <div className="merchandise-images" aria-label={`Foto di ${title}`}>
    {images.map((image, index) => <Image key={image} src={image} alt="" fill sizes="(max-width: 640px) 74vw, 340px" draggable={false} className={index === current ? "is-visible" : ""} />)}
  </div>;
}
