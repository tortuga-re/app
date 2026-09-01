import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { recordAdminActivity } from "@/lib/admin/activity-log";
export const dynamic = "force-dynamic";
const fields =
  "id,eyebrow,title,description,cta_label,cta_url,detail_title,detail_text,starts_at,ends_at,background_image_url,overlay_color,priority,published";
const italianDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const toItalianUtcDateTime = (value: unknown) => {
  if (typeof value !== "string") return value;

  const match = value.match(italianDateTimePattern);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  const wallClock = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(wallClock));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const displayedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
  );

  return new Date(wallClock - (displayedAsUtc - wallClock)).toISOString();
};
export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await getSupabaseAdmin()
    .from("highlight_contents")
    .select(fields)
    .order("priority", { ascending: false });
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ items: data ?? [] });
}
export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const item = {
    eyebrow: String(body.eyebrow ?? "").trim(),
    title: String(body.title ?? "").trim(),
    description: String(body.description ?? "").trim(),
    cta_label: String(body.cta_label ?? "").trim(),
    cta_url: String(body.cta_url ?? "").trim(),
    detail_title: String(body.detail_title ?? "").trim() || null,
    detail_text: String(body.detail_text ?? "").trim() || null,
    starts_at: toItalianUtcDateTime(body.starts_at),
    ends_at: body.ends_at ? toItalianUtcDateTime(body.ends_at) : null,
    background_image_url: body.background_image_url || null,
    overlay_color: body.overlay_color || null,
    priority: Number(body.priority ?? 0),
    published: body.published !== false,
  };
  if (
    !item.title ||
    !item.description ||
    !item.starts_at
  )
    return NextResponse.json(
      { error: "Compila tutti i campi obbligatori." },
      { status: 400 },
    );
  const query = body.id
    ? getSupabaseAdmin()
        .from("highlight_contents")
        .update(item)
        .eq("id", body.id)
    : getSupabaseAdmin().from("highlight_contents").insert(item);
  const { data, error } = await query.select(fields).single();
  if (!error)
    await recordAdminActivity(
      body.id ? "Contenuto aggiornato" : "Contenuto creato",
      item.title,
    );
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ item: data });
}
export async function DELETE(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });
  const { error } = await getSupabaseAdmin()
    .from("highlight_contents")
    .delete()
    .eq("id", id);
  if (!error) await recordAdminActivity("Contenuto eliminato", id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true });
}
