import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { isLiveGameId } from "@/lib/live-game";
import { recordAdminActivity } from "@/lib/admin/activity-log";
import { activateSongVotingInState, deactivateAndResetSongVotingInState } from "@/lib/server/serata-live";

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
  type LiveGamePayload = {
    id: boolean;
    active_game: string | null;
    activated_at: string | null;
    expires_at: string | null;
  };
  const payload: LiveGamePayload | null =
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

  const { data, error } = await getSupabaseAdmin()
    .from("live_game_state")
    .upsert(payload)
    .select("active_game,activated_at,expires_at")
    .single();

  if (!error) {
    await recordAdminActivity(
      body.game === null ? "Gioco disattivato" : "Gioco attivato",
      body.game === null ? "Nessun gioco live" : String(body.game),
    );

    if (body.game === null) {
      await deactivateAndResetSongVotingInState().catch((err) =>
        console.warn("[AdminLiveGame] Errore disattivazione e reset voti:", err),
      );
    } else {
      await activateSongVotingInState().catch((err) =>
        console.warn("[AdminLiveGame] Errore attivazione voti canzoni:", err),
      );
    }
  }

  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ game: data });
}
