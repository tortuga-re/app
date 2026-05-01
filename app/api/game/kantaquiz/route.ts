import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export const dynamic = "force-dynamic";

// Chiave per lo stato del Kantaquiz
const KANTAQUIZ_START_KEY = "kantaquiz_start_time";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("app_state")
      .select("value")
      .eq("key", KANTAQUIZ_START_KEY)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is 'no rows'
      throw error;
    }

    return NextResponse.json({ startTime: data?.value || null });
  } catch (error) {
    console.error("Error fetching kantaquiz status:", error);
    return NextResponse.json({ startTime: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    
    // Validazione PIN (riutilizziamo quella di Match & Drink per semplicità admin)
    const { validateAdminPin } = await import("@/lib/match-drink/storage");
    if (!validateAdminPin(pin || "")) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("app_state")
      .upsert({ key: KANTAQUIZ_START_KEY, value: now }, { onConflict: "key" });

    if (error) throw error;

    return NextResponse.json({ success: true, startTime: now });
  } catch (error) {
    console.error("Error starting kantaquiz:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
