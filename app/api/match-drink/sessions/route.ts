import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { validateAdminPin } from "@/lib/match-drink/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    if (!validateAdminPin(pin || "")) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
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
