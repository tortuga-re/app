import { type NextRequest, NextResponse } from "next/server";

import { generateContactCoupon, getProfileData } from "@/lib/cooperto/service";
import type { CoopertoCoupon } from "@/lib/cooperto/types";
import { getTortugaCalendarDate, pirateSlotConfig } from "@/lib/pirate-slot/config";
import { getCustomerSession } from "@/lib/session/customer-session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ClaimRow = {
  contact_code: string;
  status: "started" | "won" | "lost" | "claiming" | "claimed";
  coupon_contact_code: string | null;
  coupon_qr_value: string | null;
  coupon_expires_at: string | null;
};

const couponResponse = (row: ClaimRow) => ({
  code: row.coupon_contact_code || pirateSlotConfig.couponCode,
  qrValue: row.coupon_qr_value || row.coupon_contact_code || pirateSlotConfig.couponCode,
  expiresAt: row.coupon_expires_at,
});

export async function POST(request: NextRequest) {
  const session = getCustomerSession(request);
  const body = (await request.json().catch(() => null)) as { playId?: string } | null;
  const playId = body?.playId?.trim() ?? "";
  const email = session?.email?.trim().toLowerCase() ?? "";
  if (!session || !email || !playId) {
    return NextResponse.json({ error: "Sessione premio non valida." }, { status: 401 });
  }

  const database = getSupabaseAdmin();
  const baseQuery = () => database
    .from("pirate_slot_daily_plays")
    .select("contact_code,status,coupon_contact_code,coupon_qr_value,coupon_expires_at")
    .eq("id", playId)
    .eq("customer_email", email)
    .eq("play_date", getTortugaCalendarDate());
  const { data: play, error } = await baseQuery().maybeSingle<ClaimRow>();

  if (error || !play) return NextResponse.json({ error: "Vincita non trovata." }, { status: 404 });
  if (play.status === "claimed") return NextResponse.json({ coupon: couponResponse(play) });
  if (play.status !== "won") return NextResponse.json({ error: "Il premio non è ancora disponibile." }, { status: 409 });

  const { data: claimedLock, error: lockError } = await database
    .from("pirate_slot_daily_plays")
    .update({ status: "claiming", updated_at: new Date().toISOString() })
    .eq("id", playId)
    .eq("customer_email", email)
    .eq("status", "won")
    .select("id")
    .maybeSingle();
  if (lockError || !claimedLock) return NextResponse.json({ error: "Premio in preparazione." }, { status: 409 });

  try {
    const generated = await generateContactCoupon({
      Nome: session.firstName,
      Cognome: session.lastName,
      Email: email,
      CodiceCoupon: pirateSlotConfig.couponCode,
      DataPrivacy: new Date().toISOString(),
    });
    const profile = await getProfileData("contactCode", play.contact_code);
    const coupon = profile.coupons
      .filter((item) => item.CodiceCoupon === pirateSlotConfig.couponCode)
      .sort((a, b) => Date.parse(b.DataCreazione ?? "") - Date.parse(a.DataCreazione ?? ""))[0] as CoopertoCoupon | undefined;
    const couponContactCode = coupon?.CodiceCouponContatto?.trim() || null;
    const qrValue = couponContactCode || generated.UrlQRCode?.trim() || null;
    const expiresAt = coupon?.DataScadenza || generated.DataScadenza || null;

    const { data: completed, error: completeError } = await database
      .from("pirate_slot_daily_plays")
      .update({
        status: "claimed",
        coupon_code: pirateSlotConfig.couponCode,
        coupon_contact_code: couponContactCode,
        coupon_qr_value: qrValue,
        coupon_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playId)
      .eq("customer_email", email)
      .eq("status", "claiming")
      .select("contact_code,status,coupon_contact_code,coupon_qr_value,coupon_expires_at")
      .single<ClaimRow>();
    if (completeError || !completed) throw completeError ?? new Error("Salvataggio coupon fallito.");
    return NextResponse.json({ coupon: couponResponse(completed) });
  } catch (claimError) {
    await database.from("pirate_slot_daily_plays")
      .update({ status: "won", updated_at: new Date().toISOString() })
      .eq("id", playId)
      .eq("customer_email", email)
      .eq("status", "claiming");
    console.error("[Pirate slot] coupon claim failed", claimError);
    return NextResponse.json({ error: "Il coupon sta impiegando più del previsto. Riprova." }, { status: 500 });
  }
}
