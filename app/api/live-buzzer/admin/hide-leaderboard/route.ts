import { type NextRequest, NextResponse } from "next/server";
import { hideLeaderboard } from "@/lib/live-buzzer/store";


export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  // Auth rimosso per facilità d'uso su localhost
  if (false) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  hideLeaderboard();
  return NextResponse.json({ success: true });
}
