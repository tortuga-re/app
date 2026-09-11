export type HighlightContent = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
  detail_title: string | null;
  detail_text: string | null;
  starts_at: string;
  ends_at: string | null;
  background_image_url: string | null;
  overlay_color: string | null;
  priority: number;
};

const LOCAL_HIGHLIGHT_IMAGES: Record<string, string> = {
  "https://as2.ftcdn.net/v2/jpg/05/60/83/89/1000_F_560838952_SGcCdkg8FrKf5jUxrfqe7N2BDDJuyaiP.jpg":
    "/images/highlight-editorial.webp",
};

export const getHighlightImageUrl = (url: string | null | undefined) =>
  url ? (LOCAL_HIGHLIGHT_IMAGES[url] ?? url) : null;
