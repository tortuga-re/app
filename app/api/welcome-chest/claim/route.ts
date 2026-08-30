import { NextRequest, NextResponse } from "next/server";

import {
  activateFidelityCard,
  addPointsToContact,
  generateContactCoupon,
  getProfileData,
} from "@/lib/cooperto/service";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { unlockAchievement } from "@/lib/profile/achievement-service";
import {
  attachCustomerSessionCookie,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";
import { readWelcomeChestStart } from "@/lib/session/welcome-chest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COUPON_CODE = "BAULE-DI-BENVENUTO";
const WELCOME_POINTS = 5;
const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const cleanText = (value?: string) => value?.trim() ?? "";
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type RewardRow = {
  status: "processing" | "completed" | "failed";
  is_new_customer: boolean;
  coupon_contact_code: string | null;
  coupon_expires_at: string | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; firstName?: string; marketingConsent?: boolean }
    | null;
  const start = readWelcomeChestStart(request);
  const email = normalizeEmail(start?.email ?? body?.email);
  const firstName = cleanText(start?.firstName ?? body?.firstName);
  const rewardTier = start?.rewardTier ?? "basic";

  if (!isValidEmail(email) || !firstName) {
    return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 400 });
  }

  const currentProfile = await getProfileData("email", email);
  const existingContact = currentProfile.source === "live" && Boolean(currentProfile.contact?.CodiceContatto);
  const rewards = getSupabaseAdmin().from("welcome_chest_rewards");
  const { data: existingReward, error: readError } = await rewards
    .select("status,is_new_customer,coupon_contact_code,coupon_expires_at")
    .eq("email", email)
    .maybeSingle<RewardRow>();

  if (readError) {
    console.error("[Welcome chest] reward lookup failed", readError);
    return NextResponse.json({ error: "Impossibile preparare il Baule." }, { status: 500 });
  }

  if (existingReward?.status === "completed") {
    const profile = await getProfileData("email", email);
    const coupon = profile.coupons.find((item) => item.CodiceCoupon === COUPON_CODE) ?? {
      CodiceCoupon: COUPON_CODE,
      DataScadenza: existingReward.coupon_expires_at ?? undefined,
    };
    return NextResponse.json({
      profile,
      coupon,
      pointsAwarded: 0,
      alreadyClaimed: true,
      couponCode: COUPON_CODE,
      couponExpiresAt: existingReward.coupon_expires_at,
    });
  }

  if (existingReward?.status === "processing") {
    return NextResponse.json({ error: "Il tuo Baule si sta già aprendo. Attendi qualche secondo." }, { status: 409 });
  }

  const isNewCustomer = !existingContact;
  const { error: createError } = existingReward?.status === "failed"
    ? await rewards.update({ status: "processing", updated_at: new Date().toISOString() }).eq("email", email)
    : await rewards.insert({
      email,
      status: "processing",
      is_new_customer: isNewCustomer,
      coupon_code: COUPON_CODE,
    });

  if (createError) {
    return NextResponse.json({ error: "Il Baule è già in preparazione." }, { status: 409 });
  }

  try {
    const now = new Date().toISOString();
    const coupon = await generateContactCoupon({
      Nome: firstName,
      Email: email,
      CodiceCoupon: COUPON_CODE,
      DataPrivacy: now,
      DataMarketing: body?.marketingConsent ? now : undefined,
    });
    let profile = await getProfileData("email", email);
    const contactCode = profile.contact?.CodiceContatto?.trim();

    if (!contactCode) {
      throw new Error("Cooperto non ha restituito il contatto associato al Baule.");
    }

    if (rewardTier === "full" && !profile.contact?.CodiceCard) {
      await activateFidelityCard({ contactCode });
      profile = await getProfileData("contactCode", contactCode);
    }

    await addPointsToContact({
      codiceContatto: contactCode,
      punti: WELCOME_POINTS,
      note: "Baule di benvenuto Tortuga",
    });

    if (rewardTier === "full") {
      await Promise.all([
        unlockAchievement(email, "primo-approdo"),
        unlockAchievement(email, "mozzo-di-bordo"),
      ]);
    }

    profile = await getProfileData("email", email);
    const welcomeCoupon = profile.coupons.find((item) => item.CodiceCoupon === COUPON_CODE);
    const { error: completeError } = await rewards
      .update({
        status: "completed",
        coupon_contact_code: welcomeCoupon?.CodiceCouponContatto ?? null,
        coupon_expires_at: coupon.DataScadenza ?? welcomeCoupon?.DataScadenza ?? null,
        completed_at: now,
        updated_at: now,
      })
      .eq("email", email);
    if (completeError) throw completeError;

    const identity = normalizeCustomerSessionIdentity({
      email,
      firstName: profile.contact?.Nome || firstName,
      lastName: profile.contact?.Cognome || "",
      phone: profile.contact?.Telefono || "",
      marketingConsent: body?.marketingConsent,
    });
    const response = NextResponse.json({
      profile,
      coupon: welcomeCoupon ?? { CodiceCoupon: COUPON_CODE, DataScadenza: coupon.DataScadenza },
      isNewCustomer,
      pointsAwarded: WELCOME_POINTS,
    });

    return identity ? attachCustomerSessionCookie(response, identity) : response;
  } catch (error) {
    await rewards.update({ status: "failed", updated_at: new Date().toISOString() }).eq("email", email);
    console.error("[Welcome chest] claim failed", error);
    return NextResponse.json({ error: "Non siamo riusciti ad aprire il Baule. Riprova tra poco." }, { status: 500 });
  }
}
