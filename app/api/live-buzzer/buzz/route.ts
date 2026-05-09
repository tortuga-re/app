import { type NextRequest, NextResponse } from "next/server";
import { addBuzzerEntry, getState } from "@/lib/live-buzzer/store";
import { getCustomerSession } from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getCustomerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const state = await getState();
  if (state.status !== "open") {
    return NextResponse.json({ error: "Il buzzer è chiuso o in pausa" }, { status: 403 });
  }

  const success = await addBuzzerEntry(session.email);
  if (!success) {
    const current = await getState();
    let reason = "Errore sconosciuto";
    if (current.status !== "open") reason = "Buzzer non aperto";
    else if (!current.leaderboard.find(t => t.email === session.email)) reason = "Squadra non registrata (prova a ricaricare la pagina)";
    else if (current.entries.some(e => e.email === session.email)) reason = "Hai già prenotato in questo round";
    return NextResponse.json({ error: `Prenotazione non riuscita: ${reason}` }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
