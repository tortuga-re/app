import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { isLiveGameId } from "@/lib/live-game";
import { recordAdminActivity } from "@/lib/admin/activity-log";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await getSupabaseAdmin()
    .from("live_game_state")
    .select("active_game,activated_at,expires_at")
    .eq("id", true)
    .maybeSingle();
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ game: data ?? null });
}
export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const now = new Date();
  const payload =
    body.game === null
      ? { id: true, active_game: null, activated_at: null, expires_at: null }
      : isLiveGameId(body.game)
        ? {
            id: true,
            active_game: body.game,
            activated_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 10800000).toISOString(),
          }
        : null;
  if (!payload)
    return NextResponse.json({ error: "Gioco non valido." }, { status: 400 });
  const { data, error } = await (getSupabaseAdmin()
    .from("live_game_state") as any)
    .upsert(payload)
    .select("active_game,activated_at,expires_at")
    .single();
  if (!error)
    await recordAdminActivity(
      body.game === null ? "Gioco disattivato" : "Gioco attivato",
      body.game === null ? "Nessun gioco live" : String(body.game),
    );
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ game: data });
}
