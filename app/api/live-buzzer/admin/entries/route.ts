import { type NextRequest, NextResponse } from "next/server";
import { getBuzzerStore } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";
import { isAdmin } from "@/lib/live-buzzer/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCustomerSession(request);
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const store = getBuzzerStore();
  // Sort entries by relativeTimeMs
  const entries = [...store.entries].sort((a, b) => a.relativeTimeMs - b.relativeTimeMs);

  return NextResponse.json({ entries });
}
