import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const SHOP_CODE = "c729beba";
const categories = [
  { id: "antipasti", label: "Antipasti", source: "APPETIZER E TAGLIERI" },
  { id: "hamburger", label: "Hamburger", source: "HAMBURGER" },
  { id: "steakhouse", label: "Steakhouse", source: "STEAKHOUSE" },
  { id: "dessert", label: "Dessert", source: "DESSERT" },
] as const;

const romeDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

let cachedClassifiche: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  if (cachedClassifiche && Date.now() - cachedClassifiche.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedClassifiche.data, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  }

  // Tilby Insight reports the last 30 completed business days, not today's partial service.
  const todayInRome = romeDate(new Date());
  const to = addDays(todayInRome, -1);
  const from = addDays(todayInRome, -30);
  const admin = getSupabaseAdmin();
  const { data: sales, error: salesError } = await admin
    .from("tilby_sales")
    .select("sale_uuid")
    .eq("shop_code", SHOP_CODE)
    .gte("business_date", from)
    .lte("business_date", to);

  if (salesError) {
    console.error("Leaderboard sales read error:", salesError);
    return NextResponse.json({ error: "Classifica piatti non disponibile." }, { status: 500 });
  }

  const saleIds = (sales ?? []).map((sale) => sale.sale_uuid).filter(Boolean);
  if (!saleIds.length) {
    const emptyPayload = { periodLabel: "Classifica piatti degli ultimi 7 giorni", categories: categories.map(({ id, label }) => ({ id, label, items: [] })) };
    cachedClassifiche = { data: emptyPayload, timestamp: Date.now() };
    return NextResponse.json(emptyPayload, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  }

  const [{ data: products, error: productsError }, { data: aliases }] = await Promise.all([
    admin.from("tilby_sale_products").select("product_key,product_name,category_name,quantity").eq("shop_code", SHOP_CODE).in("sale_uuid", saleIds).gt("quantity", 0),
    admin.from("tilby_product_aliases").select("source_product_key,target_product_key,target_product_name,target_category_name").eq("shop_code", SHOP_CODE),
  ]);
  if (productsError) {
    console.error("Leaderboard products read error:", productsError);
    return NextResponse.json({ error: "Classifica piatti non disponibile." }, { status: 500 });
  }

  const aliasByKey = new Map((aliases ?? []).map((alias) => [alias.source_product_key, alias]));
  const result = categories.map((category) => {
    const totals = new Map<string, { name: string; quantity: number }>();
    for (const product of products ?? []) {
      const alias = aliasByKey.get(product.product_key);
      const sourceCategory = String(alias?.target_category_name ?? product.category_name ?? "").trim().toUpperCase();
      if (sourceCategory !== category.source) continue;
      const key = alias?.target_product_key ?? product.product_key;
      const entry = totals.get(key) ?? { name: alias?.target_product_name ?? product.product_name ?? "Piatto Tortuga", quantity: 0 };
      entry.quantity += Number(product.quantity) || 0;
      totals.set(key, entry);
    }
    const items = [...totals.values()].sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name, "it")).slice(0, 3).map((item, index) => ({ position: index + 1, name: item.name, quantity: item.quantity }));
    return { id: category.id, label: category.label, items };
  });

  const payload = { periodLabel: "Classifica piatti degli ultimi 7 giorni", categories: result };
  cachedClassifiche = { data: payload, timestamp: Date.now() };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
