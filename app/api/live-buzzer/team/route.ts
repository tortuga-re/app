import { type NextRequest, NextResponse } from "next/server";
import { registerOrUpdateTeam } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCustomerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  try {
    const { nickname, tableNumber } = await request.json();

    if (!nickname?.trim() || !tableNumber?.trim()) {
      return NextResponse.json({ error: "Nickname e tavolo obbligatori" }, { status: 400 });
    }

    registerOrUpdateTeam(session.email, nickname.trim(), tableNumber.trim());
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
}
