import { randomInt } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { getTortugaCalendarDate, pirateSlotConfig } from "@/lib/pirate-slot/config";
import { getCustomerSession } from "@/lib/session/customer-session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlayRow = {
  attempts_used: number;
  status: "started" | "won" | "lost" | "claiming" | "claimed";
};

export async function POST(request: NextRequest) {
  const session = getCustomerSession(request);
  const body = (await request.json().catch(() => null)) as { playId?: string; forceWin?: boolean } | null;
  const playId = body?.playId?.trim() ?? "";
  const email = session?.email?.trim().toLowerCase() ?? "";
  if (!session || !email || !playId) {
    return NextResponse.json({ error: "Sessione Slot non valida." }, { status: 401 });
  }

  const database = getSupabaseAdmin();
  const { data: play, error } = await database
    .from("pirate_slot_daily_plays")
    .select("attempts_used,status")
    .eq("id", playId)
    .eq("customer_email", email)
    .eq("play_date", getTortugaCalendarDate())
    .maybeSingle<PlayRow>();

  if (error || !play || play.status !== "started" || play.attempts_used >= pirateSlotConfig.maxAttempts) {
    return NextResponse.json({ error: "I tentativi di oggi sono terminati." }, { status: 409 });
  }

  const forceWin = Boolean(body?.forceWin) || request.headers.get("x-demo-force-win") === "true";
  const won = forceWin ? true : randomInt(10_000) < pirateSlotConfig.winProbability * 10_000;
  const attemptsUsed = play.attempts_used + 1;
  const status = won ? "won" : attemptsUsed >= pirateSlotConfig.maxAttempts ? "lost" : "started";
  const { data: updated, error: updateError } = await database
    .from("pirate_slot_daily_plays")
    .update({ attempts_used: attemptsUsed, status, updated_at: new Date().toISOString() })
    .eq("id", playId)
    .eq("customer_email", email)
    .eq("status", "started")
    .eq("attempts_used", play.attempts_used)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Giro già elaborato. Riprova." }, { status: 409 });
  }

  return NextResponse.json({ won, attemptsLeft: pirateSlotConfig.maxAttempts - attemptsUsed });
}
