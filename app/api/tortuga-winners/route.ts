import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("tortuga_winners")
    .select("id,team_name,evening,created_at")
    .order("created_at", { ascending: false })
    .limit(90);

  if (error) {
    console.error("Tortuga winners read error:", error);
    return NextResponse.json({ error: "Vincitori non disponibili." }, { status: 500 });
  }

  return NextResponse.json({ winners: data ?? [] });
}
