import { NextRequest, NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/session/customer-session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RewardStatus = "prepared" | "processing" | "completed" | "failed";

/**
 * Restores a pending welcome chest from the signed customer session. This keeps
 * the Safari-to-installed-PWA hand-off independent of browser localStorage.
 */
export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  if (!session) return NextResponse.json({ pending: false }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("welcome_chest_rewards")
    .select("status")
    .eq("email", session.email)
    .maybeSingle<{ status: RewardStatus }>();

  if (error) {
    console.error("[Welcome chest] status lookup failed", error);
    return NextResponse.json({ error: "Impossibile verificare il Baule." }, { status: 500 });
  }

  return NextResponse.json({
    pending: data?.status === "prepared" || data?.status === "failed",
    status: data?.status ?? null,
    identity: {
      email: session.email,
      firstName: session.firstName,
    },
  });
}
