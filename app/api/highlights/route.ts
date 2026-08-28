import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/match-drink/supabase";
import type { HighlightContent } from "@/lib/highlight-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("highlight_contents")
    .select("id,eyebrow,title,description,cta_label,cta_url,starts_at,ends_at,background_image_url,overlay_color,priority")
    .eq("published", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("priority", { ascending: false })
    .order("starts_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ highlight: null });
  return NextResponse.json({ highlight: (data?.[0] ?? null) as HighlightContent | null });
}
