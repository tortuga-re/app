import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const evenings = new Set(["friday", "saturday", "sunday"]);

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;
  const { data, error } = await getSupabaseAdmin()
    .from("tortuga_winners")
    .select("id,team_name,evening,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Impossibile leggere i vincitori." }, { status: 500 });
  return NextResponse.json({ winners: data ?? [] });
}

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;
  const body = (await request.json().catch(() => null)) as { teamName?: string; evening?: string; date?: string } | null;
  const teamName = body?.teamName?.trim() ?? "";
  const evening = body?.evening ?? "";
  const date = body?.date?.trim() ?? "";
  if (!teamName || teamName.length > 120 || !evenings.has(evening)) {
    return NextResponse.json({ error: "Inserisci squadra e serata valide." }, { status: 400 });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin().from("tortuga_winners").insert({
    team_name: teamName,
    evening,
    created_at: date ? `${date}T12:00:00.000Z` : undefined,
  });
  if (error) return NextResponse.json({ error: "Impossibile salvare il vincitore." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Vincitore mancante." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("tortuga_winners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Impossibile eliminare il vincitore." }, { status: 500 });
  return NextResponse.json({ success: true });
}
