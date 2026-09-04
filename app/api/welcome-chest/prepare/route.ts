import { NextRequest, NextResponse } from "next/server";

import { getProfileData, updateProfileContact } from "@/lib/cooperto/service";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
  attachCustomerSessionCookie,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COUPON_LABEL = "BAULE-DI-BENVENUTO";
const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const cleanText = (value?: string) => value?.trim() ?? "";
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type RewardRow = {
  status: "prepared" | "processing" | "completed" | "failed";
  is_new_customer: boolean;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; firstName?: string; phone?: string; marketingConsent?: boolean }
    | null;
  const email = normalizeEmail(body?.email);
  const firstName = cleanText(body?.firstName);
  const phone = cleanText(body?.phone);

  if (!isValidEmail(email) || !firstName) {
    return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 400 });
  }

  const rewards = getSupabaseAdmin().from("welcome_chest_rewards");
  const { data: existingReward, error: readError } = await rewards
    .select("status,is_new_customer")
    .eq("email", email)
    .maybeSingle<RewardRow>();

  if (readError) {
    console.error("[Welcome chest] preparation lookup failed", readError);
    return NextResponse.json({ error: "Impossibile preparare il Baule." }, { status: 500 });
  }

  if (existingReward?.status === "completed") {
    try {
      const profile = await getProfileData("email", email);
      const identity = normalizeCustomerSessionIdentity({
        email,
        firstName: profile.contact?.Nome || firstName,
        lastName: profile.contact?.Cognome || "",
        phone: profile.contact?.Telefono || phone,
        marketingConsent: Boolean(body?.marketingConsent),
      });
      const response = NextResponse.json({
        profile,
        alreadyClaimed: true,
        isNewCustomer: false,
        message: "Bentornato a bordo!",
      });
      return identity ? attachCustomerSessionCookie(response, identity) : response;
    } catch {
      return NextResponse.json({ error: "Questo Baule e gia stato aperto." }, { status: 409 });
    }
  }

  try {
    let profile = await getProfileData("email", email);
    const existingContact = profile.source === "live" && Boolean(profile.contact?.CodiceContatto);

    if (!existingContact) {
      profile = await updateProfileContact({
        firstName,
        lastName: "",
        email,
        phone,
        marketingConsent: Boolean(body?.marketingConsent),
      });
    }

    if (!profile.contact?.CodiceContatto) {
      throw new Error("Cooperto non ha restituito il contatto associato al Baule.");
    }

    const isNewCustomer = existingReward?.is_new_customer ?? !existingContact;
    const { error: saveError } = existingReward
      ? await rewards
        .update({ status: "prepared", is_new_customer: isNewCustomer, updated_at: new Date().toISOString() })
        .eq("email", email)
      : await rewards.insert({
        email,
        status: "prepared",
        is_new_customer: isNewCustomer,
        coupon_code: COUPON_LABEL,
      });

    if (saveError) throw saveError;

    const identity = normalizeCustomerSessionIdentity({
      email,
      firstName: profile.contact.Nome || firstName,
      lastName: profile.contact.Cognome || "",
      phone: profile.contact.Telefono || phone,
      marketingConsent: Boolean(body?.marketingConsent),
    });
    const response = NextResponse.json({ profile, isNewCustomer });
    return identity ? attachCustomerSessionCookie(response, identity) : response;
  } catch (error) {
    console.error("[Welcome chest] preparation failed", error);
    return NextResponse.json({ error: "Non siamo riusciti a preparare il Baule. Riprova tra poco." }, { status: 500 });
  }
}
