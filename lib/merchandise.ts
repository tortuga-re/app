import type { TortugaRankId } from "@/lib/loyalty-ranks";

export type MerchandiseProduct = {
  id: string;
  title: string | null;
  description: string | null;
  price_label: string | null;
  button_label: string | null;
  order_url: string | null;
  images: string[];
  required_rank: TortugaRankId | null;
  lock_text: string | null;
  position: number;
  published: boolean;
};

export const merchandiseFields =
  "id,title,description,price_label,button_label,order_url,images,required_rank,lock_text,position,published";

const ranks = new Set<TortugaRankId>(["mozzo", "corsaro", "capitano", "leggenda"]);

export const optionalText = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

export const readMerchandiseImages = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

export const readRequiredRank = (value: unknown): TortugaRankId | null =>
  typeof value === "string" && ranks.has(value as TortugaRankId)
    ? (value as TortugaRankId)
    : null;

export const normalizeMerchandiseProduct = (value: Record<string, unknown>) => ({
  title: optionalText(value.title),
  description: optionalText(value.description),
  price_label: optionalText(value.price_label),
  button_label: optionalText(value.button_label),
  order_url: optionalText(value.order_url),
  images: readMerchandiseImages(value.images),
  required_rank: readRequiredRank(value.required_rank),
  lock_text: optionalText(value.lock_text),
  position: Number.isFinite(Number(value.position)) ? Math.trunc(Number(value.position)) : 0,
  published: value.published === true,
});
