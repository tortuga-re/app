export type HighlightContent = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
  starts_at: string;
  ends_at: string | null;
  background_image_url: string | null;
  overlay_color: string | null;
  priority: number;
};
