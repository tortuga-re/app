import { type NextRequest, NextResponse } from "next/server";

import { coopertoConfig } from "@/lib/config";
import { getProfileData, registerContactVisit, upsertContactByEmail } from "@/lib/cooperto/service";
import { getTortugaCalendarDate } from "@/lib/pirate-slot/config";
import { attachCustomerSessionCookie, normalizeCustomerSessionIdentity } from "@/lib/session/customer-session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string } | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 400 });
  }

  try {
    const contact = await upsertContactByEmail({
      firstName: name,
      email,
    });
    const contactCode = contact.CodiceContatto?.trim() ?? "";
    if (!contactCode) throw new Error("Cooperto non ha restituito il codice contatto.");

    await registerContactVisit({
      contactCode,
      venueCode: coopertoConfig.sedeCode,
    });

    const playDate = getTortugaCalendarDate();
    const { data: play, error: playError } = await getSupabaseAdmin()
      .from("pirate_slot_daily_plays")
      .insert({ contact_code: contactCode, customer_email: email, play_date: playDate })
      .select("id")
      .single<{ id: string }>();

    const identity = normalizeCustomerSessionIdentity({
      email: contact.Email || email,
      firstName: contact.Nome || name,
      lastName: contact.Cognome || "",
      phone: contact.Telefono || "",
    });

    if (playError?.code === "23505") {
      const response = NextResponse.json({
        error: "Hai già giocato oggi. La Slot Pirata tornerà disponibile domani.",
        alreadyPlayed: true,
        email,
        playDate,
        identity,
      }, { status: 409 });
      return identity ? attachCustomerSessionCookie(response, identity) : response;
    }
    if (playError || !play) throw playError ?? new Error("Tentativo Slot non disponibile.");

    if (email) {
      const { recordCustomerVisit } = await import("@/lib/profile/achievement-service");
      await recordCustomerVisit(email, new Date().toISOString()).catch(() => undefined);
    }

    const profile = await getProfileData("contactCode", contactCode).catch(() => null);
    const response = NextResponse.json({
      playId: play.id,
      playDate,
      email,
      identity,
      profile,
    });
    return identity ? attachCustomerSessionCookie(response, identity) : response;
  } catch (error) {
    console.error("[Pirate slot] start failed", error);
    return NextResponse.json({
      error: "Non siamo riusciti a preparare la Slot Pirata. Riprova tra poco.",
    }, { status: 500 });
  }
}
