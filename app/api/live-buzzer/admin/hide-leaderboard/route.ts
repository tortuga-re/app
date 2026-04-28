import { type NextRequest, NextResponse } from "next/server";
import { hideLeaderboard } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";
import { isAdmin } from "@/lib/live-buzzer/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCustomerSession(request);
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  hideLeaderboard();
  return NextResponse.json({ success: true });
}
