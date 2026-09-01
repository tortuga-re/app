import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const KANTAQUIZ_START_KEY = "kantaquiz_start_time";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("app_state")
      .select("value")
      .eq("key", KANTAQUIZ_START_KEY)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ startTime: data?.value || null });
  } catch (error) {
    console.error("Error fetching kantaquiz status:", error);
    return NextResponse.json({ startTime: null });
  }
}

export async function POST(req: NextRequest) {
  const adminRequest = requireAdminRequest(req, "captain");
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("app_state")
      .upsert({ key: KANTAQUIZ_START_KEY, value: now }, { onConflict: "key" });

    if (error) throw error;

    const { sendPushNotification } = await import("@/lib/push/send");
    void sendPushNotification({
      title: "Il Kantaquiz inizia ora! 🎤",
      body:
        "Scaldate la voce: stiamo per iniziare. Entra nell'app per partecipare alla sfida!",
      url: "/info",
      onlyVenuePresent: true,
      segment: "venue_present",
    });

    return NextResponse.json({ success: true, startTime: now });
  } catch (error: unknown) {
    console.error("Error starting kantaquiz:", error);
    const errMessage = error instanceof Error ? error.message : "";
    const errCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code: unknown }).code
        : null;

    if (
      errCode === "PGRST116" ||
      errMessage?.includes('relation "public.app_state" does not exist')
    ) {
      return NextResponse.json(
        {
          error:
            "La tabella 'app_state' non esiste su Supabase. Per favore creala usando il codice SQL fornito.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: `Errore interno: ${errMessage || "Sconosciuto"}` },
      { status: 500 },
    );
  }
}
