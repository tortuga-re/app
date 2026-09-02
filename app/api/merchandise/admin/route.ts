import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { recordAdminActivity } from "@/lib/admin/activity-log";
import { normalizeMerchandiseProduct, merchandiseFields, readMerchandiseImages } from "@/lib/merchandise";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await getSupabaseAdmin().from("merchandise_products").select(merchandiseFields).order("position", { ascending: true }).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: (data ?? []).map((item) => ({ ...item, images: readMerchandiseImages(item.images) })) });
}

export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const product = normalizeMerchandiseProduct(body);
  const query = typeof body.id === "string" && body.id
    ? getSupabaseAdmin().from("merchandise_products").update(product).eq("id", body.id)
    : getSupabaseAdmin().from("merchandise_products").insert(product);
  const { data, error } = await query.select(merchandiseFields).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAdminActivity(body.id ? "Merchandise aggiornato" : "Merchandise creato", product.title ?? "Prodotto senza titolo");
  return NextResponse.json({ product: { ...data, images: readMerchandiseImages(data.images) } });
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("merchandise_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAdminActivity("Merchandise eliminato", id);
  return NextResponse.json({ success: true });
}
