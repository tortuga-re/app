import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/client";
import { merchandiseFields, readMerchandiseImages, type MerchandiseProduct } from "@/lib/merchandise";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("merchandise_products")
    .select(merchandiseFields)
    .eq("published", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ products: [] });
  const products = (data ?? []).map((item) => ({ ...item, images: readMerchandiseImages(item.images) })) as MerchandiseProduct[];
  return NextResponse.json({ products });
}
