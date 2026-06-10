import {
  ACTIVE_GAMES_CHANNEL,
  ACTIVE_GAMES_STATUS_EVENT,
  type ActiveGamesStatusPatch,
} from "@/lib/game/active-games-channel";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export const broadcastActiveGamesStatus = async (
  status: Omit<ActiveGamesStatusPatch, "updatedAt">,
) => {
  try {
    const admin = getSupabaseAdmin();

    await admin.channel(ACTIVE_GAMES_CHANNEL).httpSend(ACTIVE_GAMES_STATUS_EVENT, {
      ...status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Active games broadcast error:", error);
  }
};
