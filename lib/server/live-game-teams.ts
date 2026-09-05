import "server-only";

import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";
import { isSubmissionInCurrentEvening } from "@/lib/live-tv/evening-window";

const LIVE_GAME_TEAMS_KEY = "live_game_team_clicks";

export interface LiveGameTeamClick {
  id: string;
  deviceId: string;
  gameId: string;
  createdAt: number;
}

export async function getLiveGameTeamsCount(now: Date = new Date()): Promise<number> {
  try {
    const rawClicks = await getAppStateJson<LiveGameTeamClick[]>(LIVE_GAME_TEAMS_KEY, []);
    const activeClicks = rawClicks.filter((click) => isSubmissionInCurrentEvening(click.createdAt, now));
    const uniqueDevices = new Set(activeClicks.map((c) => c.deviceId || c.id));
    return uniqueDevices.size;
  } catch {
    return 0;
  }
}

export async function recordLiveGameTeamClick(deviceId: string, gameId: string): Promise<number> {
  try {
    const now = new Date();
    const rawClicks = await getAppStateJson<LiveGameTeamClick[]>(LIVE_GAME_TEAMS_KEY, []);
    
    // Clean up clicks older than active evening session
    const activeClicks = rawClicks.filter((click) => isSubmissionInCurrentEvening(click.createdAt, now));
    
    const newClick: LiveGameTeamClick = {
      id: crypto.randomUUID(),
      deviceId: deviceId || `device_${Math.random().toString(36).substring(2)}`,
      gameId: gameId || "unknown",
      createdAt: Date.now(),
    };

    const updatedClicks = [newClick, ...activeClicks].slice(0, 500);
    await setAppStateJson(LIVE_GAME_TEAMS_KEY, updatedClicks);

    const uniqueDevices = new Set(updatedClicks.map((c) => c.deviceId || c.id));
    return uniqueDevices.size;
  } catch (error) {
    console.error("[LiveGameTeams] Errore registrazione click squadra:", error);
    return await getLiveGameTeamsCount();
  }
}
