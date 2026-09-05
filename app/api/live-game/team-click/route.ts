import { NextRequest, NextResponse } from "next/server";
import { recordLiveGameTeamClick, getLiveGameTeamsCount } from "@/lib/server/live-game-teams";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const teamsCount = await getLiveGameTeamsCount();
    return NextResponse.json({ success: true, teamsCount }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ success: true, teamsCount: 0 }, { headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { deviceId, gameId } = body || {};

    const teamsCount = await recordLiveGameTeamClick(deviceId || "", gameId || "");

    return NextResponse.json(
      {
        success: true,
        teamsCount,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[LiveGameTeamClickAPI] Errore salvataggio click:", error);
    return NextResponse.json(
      { error: "Impossibile registrare il click della squadra." },
      { status: 500, headers: corsHeaders },
    );
  }
}
