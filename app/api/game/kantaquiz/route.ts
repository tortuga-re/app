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
    
    // Automazione #2: Allerta Kantaquiz
    const { sendPushNotification } = await import("@/lib/push/send");
    void sendPushNotification({
      title: "Il Kantaquiz inizia ora! 🎤",
      body: "Scaldate la voce: stiamo per iniziare. Entra nell'app per partecipare alla sfida!",
      url: "/info", // Mandiamo alla tab INFO dove c'è la card con le istruzioni
      onlyVenuePresent: true,
    });

    return NextResponse.json({ success: true, startTime: now });
  } catch (error: unknown) {
    console.error("Error starting kantaquiz:", error);
    const errMessage = error instanceof Error ? error.message : "";
    const errCode = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : null;
    
    if (errCode === "PGRST116" || errMessage?.includes("relation \"public.app_state\" does not exist")) {
      return NextResponse.json({ error: "La tabella 'app_state' non esiste su Supabase. Per favore creala usando il codice SQL fornito." }, { status: 500 });
    }
    return NextResponse.json({ error: "Errore interno: " + (errMessage || "Sconosciuto") }, { status: 500 });
  }
}
