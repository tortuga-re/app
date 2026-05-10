import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { createBottleMessage, updateStageMode, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { pin, message } = await req.json();
    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    if (!message) {
      return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
    }

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
