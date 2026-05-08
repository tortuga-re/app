import { type NextRequest, NextResponse } from "next/server";
import { nextRound } from "@/lib/live-buzzer/store";


export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth rimosso per facilità d'uso su localhost
  if (false) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  nextRound();
  return NextResponse.json({ success: true });
}
