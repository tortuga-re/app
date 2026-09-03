import { type NextRequest, NextResponse } from "next/server";

import { getProfileData, upsertContactByEmail } from "@/lib/cooperto/service";
import { getTortugaCalendarDate, pirateSlotConfig } from "@/lib/pirate-slot/config";
import { attachCustomerSessionCookie, normalizeCustomerSessionIdentity } from "@/lib/session/customer-session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const welcomeChestCouponCode = "BAULE-DI-BENVENUTO";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; resetToday?: boolean } | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 400 });
  }

  try {
    const profileBeforeSlot = await getProfileData("email", email).catch(() => null);
    const wasExistingCustomer = Boolean(
      profileBeforeSlot?.source === "live" && profileBeforeSlot.contact?.CodiceContatto,
    );
    const contact = await upsertContactByEmail({
      firstName: name,
      email,
    });
    const contactCode = contact.CodiceContatto?.trim() ?? "";
    if (!contactCode) throw new Error("Cooperto non ha restituito il codice contatto.");

    const playDate = getTortugaCalendarDate();

    if (body?.resetToday || request.headers.get("x-demo-bypass-daily-limit") === "true") {
      await getSupabaseAdmin()
        .from("pirate_slot_daily_plays")
        .delete()
        .eq("customer_email", email)
        .eq("play_date", playDate);
    }

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
      const { data: existingPlay } = await getSupabaseAdmin()
        .from("pirate_slot_daily_plays")
        .select("status,attempts_used")
        .eq("customer_email", email)
        .eq("play_date", playDate)
        .maybeSingle<{ status: string; attempts_used: number }>();
      const exhausted = existingPlay?.status === "lost" ||
        (existingPlay?.attempts_used ?? 0) >= pirateSlotConfig.maxAttempts;
      const response = NextResponse.json({
        error: "Hai già giocato oggi. La Slot Pirata tornerà disponibile domani.",
        alreadyPlayed: true,
        exhausted,
        email,
        playDate,
        identity,
      }, { status: 409 });
      return identity ? attachCustomerSessionCookie(response, identity) : response;
    }
    if (playError || !play) throw playError ?? new Error("Tentativo Slot non disponibile.");

    // La Slot può creare il contatto per applicare il limite giornaliero, ma
    // non equivale mai a una presenza nel locale: le visite vengono registrate
    // esclusivamente dai flussi on-premise.
    const rewards = getSupabaseAdmin().from("welcome_chest_rewards");
    const { data: existingReward, error: rewardLookupError } = await rewards
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (rewardLookupError) throw rewardLookupError;
    if (!existingReward) {
      const { error: rewardInsertError } = await rewards.insert({
        email,
        status: "prepared",
        is_new_customer: !wasExistingCustomer,
        coupon_code: welcomeChestCouponCode,
      });
      if (rewardInsertError) throw rewardInsertError;
    }

    if (email) {
      const { unlockAchievement } = await import("@/lib/profile/achievement-service");
      await unlockAchievement(email, "slot-pirata").catch(() => undefined);
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
