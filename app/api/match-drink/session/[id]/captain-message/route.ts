import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { createBottleMessage, updateStageMode } from "@/lib/match-drink/storage";
import { expectString, readJsonBody } from "@/lib/validation/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }
    const payload = await readJsonBody<{ message?: string }>(req);
    const message = expectString(payload.message, "Messaggio Capitano", {
      minLength: 1,
      maxLength: 500,
    });


    const supabase = getSupabaseAdmin();

    // Ensure a hidden system player exists for technical messages
    const { data: playersResult, error: playersError } = await supabase
      .from("match_drink_players")
      .select("id")
      .eq("session_id", sessionId)
      .eq("nickname", "_SYSTEM_")
      .limit(1);

    let players = playersResult;

    if (playersError) throw playersError;

    // If the system player is missing (e.g., older session), create it on the fly
    if (!players || players.length === 0) {
      const { data: sysPlayer, error: sysError } = await supabase
        .from("match_drink_players")
        .insert({
          session_id: sessionId,
          nickname: "_SYSTEM_",
          age_range: "preferisco_non_dirlo",
          gender: "preferisco_non_dirlo",
          relationship_status: "solo_per_ridere",
          looking_for: "amicizie",
          public_consent: false,
        })
        .select()
        .single();
      if (sysError) throw sysError;
      players = [{ id: sysPlayer.id }];
    }

    const playerId = players[0].id;
    const isCountdown = message.startsWith("COUNTDOWN:");

    const newMessage = await createBottleMessage({
      sessionId,
      playerId,
      message,
      displayMode: "captain",
      status: "approved",
    });

    if (!isCountdown) {
      await updateStageMode(sessionId, "message", newMessage.id);
    }

    return NextResponse.json({ success: true, messageId: newMessage.id });
  } catch (error) {
    console.error("Captain message error:", error);
    return NextResponse.json({ error: "Errore invio messaggio capitano" }, { status: 500 });
  }
}
