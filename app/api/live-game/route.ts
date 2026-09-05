import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { LiveGameState } from "@/lib/live-game";
import { deactivateAndResetSongVotingInState } from "@/lib/server/serata-live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("live_game_state")
      .select("active_game,activated_at,expires_at")
      .eq("id", true)
      .maybeSingle();

    const game = data as LiveGameState | null;

    if (error || !game?.active_game || !game.expires_at) {
      return NextResponse.json({ game: null });
    }

    const isExpired = Date.parse(game.expires_at) <= Date.now();

    if (isExpired) {
      // Quando il timer del gioco scade, disattiva in automatico sia il gioco che la votazione canzoni ed azzera i voti su Supabase
      try {
        await admin.from("live_game_state").upsert({
          id: true,
          active_game: null,
          activated_at: null,
          expires_at: null,
        });

        await deactivateAndResetSongVotingInState();
      } catch (resetErr) {
        console.warn("[LiveGame] Errore reset automatico gioco e voti canzoni:", resetErr);
      }

      return NextResponse.json({ game: null });
    }

    return NextResponse.json({ game });
  } catch (err) {
    console.error("[LiveGame] Errore API live-game:", err);
    return NextResponse.json({ game: null });
  }
}
