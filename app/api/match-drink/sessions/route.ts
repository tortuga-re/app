import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export async function GET(req: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const admin = getSupabaseAdmin();
    
    // Verifica configurazione
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      return NextResponse.json({ error: "Configurazione Supabase mancante nel file .env" }, { status: 500 });
    }

    const { data, error } = await admin
      .from("match_drink_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error listing sessions:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
